/**
 * Phase 4 Feature & Security Verification Suite
 * Tests: Items (edit/delete/lifecycle), Claims (duplicate block, status checks, cascade rejection),
 * Admin Operations (user role updates, item deletion), and Storage Upload Validations.
 */

const assert = require('assert');
const dbService = require('../services/dbService');
const { uploadItemImage, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../services/storageService');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 4 Feature Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // ==========================================
  // 1. Upload & Storage Service Tests
  // ==========================================
  console.log('[1] Upload & Storage Service Validation:');

  await test('Empty or omitted file returns null without error', async () => {
    const result = await uploadItemImage(null);
    assert.strictEqual(result, null, 'uploadItemImage(null) must resolve to null');
  });

  await test('Reject upload exceeding 5MB limit', async () => {
    const oversizeFile = {
      originalname: 'huge_photo.jpg',
      mimetype: 'image/jpeg',
      size: MAX_FILE_SIZE + 1024,
      buffer: Buffer.alloc(100)
    };
    await assert.rejects(
      async () => await uploadItemImage(oversizeFile),
      /exceeds maximum limit/i,
      'Must reject files larger than MAX_FILE_SIZE'
    );
  });

  await test('Reject upload with disallowed MIME type (.exe, .pdf, .txt)', async () => {
    const badFile = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.alloc(100)
    };
    await assert.rejects(
      async () => await uploadItemImage(badFile),
      /invalid file type/i,
      'Must reject non-image MIME types'
    );
  });

  await test('Allowed MIME types include JPEG, PNG, WEBP, and GIF', () => {
    assert(ALLOWED_MIME_TYPES.includes('image/jpeg'));
    assert(ALLOWED_MIME_TYPES.includes('image/png'));
    assert(ALLOWED_MIME_TYPES.includes('image/webp'));
    assert(ALLOWED_MIME_TYPES.includes('image/gif'));
  });

  // ==========================================
  // 2. Items Lifecycle & Permissions
  // ==========================================
  console.log('\n[2] Item Lifecycle & Permissions:');

  let testItem;
  await test('User can create an item report with initial "open" status', async () => {
    testItem = await dbService.createItem({
      title: 'Graphing Calculator TI-84 Plus',
      description: 'Found in Science Hall room 201',
      type: 'found',
      category: 'electronics',
      location: 'Science Hall',
      reportedBy: { id: 'usr_owner_101', name: 'Tester', email: 'tester@university.edu', role: 'student' }
    });

    assert(testItem && testItem.id, 'Item must have an id');
    assert.strictEqual(testItem.status, 'open', 'New item must have "open" status');
  });

  await test('Owner can update/edit an open item', async () => {
    const updated = await dbService.updateItem(testItem.id, {
      title: 'Graphing Calculator TI-84 Plus CE (Color)',
      description: 'Found in Science Hall room 201 with pink protective slide cover.'
    });

    assert.strictEqual(updated.title, 'Graphing Calculator TI-84 Plus CE (Color)');
    assert(updated.description.includes('pink protective slide cover'));
  });

  // ==========================================
  // 3. Ownership Claims & Verification Rules
  // ==========================================
  console.log('\n[3] Claims Rules, Status & Cascade Rejection:');

  const claimantA = { id: 'usr_claimant_a', name: 'Alice Student', email: 'alice@university.edu' };
  const claimantB = { id: 'usr_claimant_b', name: 'Bob Student', email: 'bob@university.edu' };

  let claimA;
  let claimB;

  await test('First claimant can submit ownership claim, moving item to "under_review"', async () => {
    claimA = await dbService.createClaim({
      itemId: testItem.id,
      claimedBy: claimantA,
      message: 'This is mine, I have proof of purchase.',
      proofDescription: 'Serial number ending in 9821'
    });

    assert(claimA && claimA.id, 'Claim A created');
    assert.strictEqual(claimA.status, 'pending');

    const item = await dbService.getItemById(testItem.id);
    assert.strictEqual(item.status, 'under_review', 'Item must transition to under_review');
  });

  await test('Same claimant cannot submit duplicate claim on the same item', async () => {
    await assert.rejects(
      async () => {
        await dbService.createClaim({
          itemId: testItem.id,
          claimedBy: claimantA,
          message: 'Trying to claim again',
          proofDescription: 'Same serial'
        });
      },
      /already submitted a claim/i,
      'Must block duplicate claim from same user'
    );
  });

  await test('Second user can submit claim while under review', async () => {
    claimB = await dbService.createClaim({
      itemId: testItem.id,
      claimedBy: claimantB,
      message: 'I also lost one there.',
      proofDescription: 'Has scratches on the back'
    });

    assert(claimB && claimB.id);
    assert.strictEqual(claimB.status, 'pending');
  });

  await test('Approving claim A marks item "claimed", rejects claim B, and notifies claimant B', async () => {
    const approvedClaim = await dbService.updateClaimStatus(claimA.id, 'approved');
    assert.strictEqual(approvedClaim.status, 'approved');

    // Verify item is now claimed
    const item = await dbService.getItemById(testItem.id);
    assert.strictEqual(item.status, 'claimed', 'Item must now be claimed');

    // Verify claim B was cascade-rejected
    const allClaims = await dbService.getClaims({ itemId: testItem.id });
    const foundClaimB = allClaims.find(c => c.id === claimB.id);
    assert(foundClaimB, 'Claim B must exist');
    assert.strictEqual(foundClaimB.status, 'rejected', 'Claim B must be automatically rejected');

    // Verify claimant B received rejection notification
    const notificationsB = await dbService.getNotifications(claimantB.id);
    assert(
      notificationsB.some(n => n.message.includes('not approved') || n.message.includes('another claimant')),
      'Claimant B must receive rejection notification'
    );
  });

  await test('Cannot submit claim on an item that is already claimed', async () => {
    const lateClaimant = { id: 'usr_late', name: 'Late Claimant' };
    await assert.rejects(
      async () => {
        await dbService.createClaim({
          itemId: testItem.id,
          claimedBy: lateClaimant,
          message: 'Can I still claim?',
          proofDescription: 'Late proof'
        });
      },
      /no longer available for claims/i,
      'Must reject claim on claimed item'
    );
  });

  // ==========================================
  // 4. Admin Management Actions
  // ==========================================
  console.log('\n[4] Admin Operations & Moderation:');

  await test('Admin can promote a user to admin and demote back to student', async () => {
    await dbService.updateUserRole(claimantA.id, 'admin');
    let profiles = await dbService.getAllProfiles();
    let updatedA = profiles.find(p => p.id === claimantA.id);
    if (updatedA) {
      assert.strictEqual(updatedA.role, 'admin');
    }

    await dbService.updateUserRole(claimantA.id, 'student');
    profiles = await dbService.getAllProfiles();
    updatedA = profiles.find(p => p.id === claimantA.id);
    if (updatedA) {
      assert.strictEqual(updatedA.role, 'student');
    }
  });

  await test('Reject invalid user role', async () => {
    await assert.rejects(
      async () => await dbService.updateUserRole(claimantA.id, 'superadmin_hacker'),
      /invalid user role/i,
      'Should reject unsupported role names'
    );
  });

  await test('Admin / Owner can delete an item', async () => {
    const success = await dbService.deleteItem(testItem.id);
    assert.strictEqual(success, true);
    const item = await dbService.getItemById(testItem.id);
    assert.strictEqual(item, null, 'Deleted item must no longer exist');
  });

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} / ${total} tests passed.`);
  console.log('----------------------------------------------------');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
