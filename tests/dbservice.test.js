/**
 * Database Service & Supabase Layer Automated Tests
 */

const assert = require('assert');
const dbService = require('../services/dbService');

async function testDbService() {
  console.log('----------------------------------------------------');
  console.log('🧪 Testing Database Service Layer (Supabase PostgreSQL)');
  console.log('----------------------------------------------------');

  // 1. User lookup with credentials
  const user = await dbService.findUserWithCredentials('alex.chen@university.edu');
  assert(user, 'User alex.chen should be found');
  assert.strictEqual(user.name, 'Alex Chen');
  assert(user.passwordHash, 'Password hash should be retrieved from auth_credentials');
  console.log('  ✓ findUserWithCredentials retrieved profile and auth credentials');

  // 2. User creation (profile + auth_credentials)
  const newUser = await dbService.createUser({
    name: 'Emily Watson',
    email: 'emily.w@university.edu',
    passwordHash: '$2a$10$fakehashforunittest1234567890',
    role: 'student'
  });
  assert(newUser && newUser.email === 'emily.w@university.edu');
  assert.strictEqual(newUser.passwordHash, undefined, 'Password hash should NOT be stored in profile');
  console.log('  ✓ createUser created profile without exposing password in profile record');

  // 3. Profiles retrieval
  const profiles = await dbService.getAllProfiles();
  assert(profiles.length >= 3, 'Should retrieve profiles');
  console.log(`  ✓ getAllProfiles retrieved ${profiles.length} profiles`);

  // 4. Get Items & Filter
  const allItems = await dbService.getItems({ limit: 10 });
  assert(allItems.items.length > 0, 'Items list should not be empty');
  console.log(`  ✓ getItems returned ${allItems.items.length} items with pagination`);

  const electronics = await dbService.getItems({ category: 'electronics' });
  assert(electronics.items.every(i => i.category === 'electronics'), 'All filtered items must be electronics');
  console.log('  ✓ getItems correctly filtered by category');

  // 5. Create Item
  const createdItem = await dbService.createItem({
    title: 'Blue Hydro Flask',
    description: 'Found at tennis court',
    type: 'found',
    category: 'accessories',
    location: 'Sports Complex',
    reportedBy: user
  });
  assert(createdItem && createdItem.title === 'Blue Hydro Flask');
  console.log('  ✓ createItem added new item');

  // 6. Update Status
  const updatedItem = await dbService.updateItemStatus(createdItem.id, 'claimed');
  assert.strictEqual(updatedItem.status, 'claimed');
  console.log('  ✓ updateItemStatus transitioned status to claimed');

  // 7. Claim workflow
  const claim = await dbService.createClaim({
    itemId: createdItem.id,
    claimedBy: newUser,
    message: 'I dropped it during tennis drills',
    proofDescription: 'Has tennis sticker and dent on bottom rim'
  });
  assert(claim && claim.status === 'pending');
  console.log('  ✓ createClaim created claim with pending status');

  const approvedClaim = await dbService.updateClaimStatus(claim.id, 'approved');
  assert.strictEqual(approvedClaim.status, 'approved');
  console.log('  ✓ updateClaimStatus approved claim');

  // 8. Notifications
  const notif = await dbService.createNotification({
    userId: user.id,
    type: 'claim_status',
    message: 'Test notification'
  });
  assert(notif && notif.isRead === false);
  console.log('  ✓ createNotification created unread notification');

  await dbService.markNotificationsRead(user.id);
  console.log('  ✓ markNotificationsRead updated notifications');

  console.log('----------------------------------------------------');
  console.log('🎉 ALL SUPABASE DB SERVICE TESTS PASSED!');
  console.log('----------------------------------------------------\n');
}

testDbService().catch(err => {
  console.error(err);
  process.exit(1);
});
