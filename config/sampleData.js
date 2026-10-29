/**
 * Realistic Mock Data for Phase 1 Frontend Showcase
 */

const sampleUsers = [
  {
    _id: 'usr_001',
    name: 'Alex Chen',
    email: 'alex.chen@university.edu',
    role: 'student',
    createdAt: new Date('2026-09-01T08:00:00Z')
  },
  {
    _id: 'usr_002',
    name: 'Sarah Jenkins',
    email: 'sarah.j@university.edu',
    role: 'student',
    createdAt: new Date('2026-09-15T10:30:00Z')
  },
  {
    _id: 'usr_admin',
    name: 'Officer Marcus Vance',
    email: 'admin@university.edu',
    role: 'admin',
    createdAt: new Date('2026-08-01T09:00:00Z')
  }
];

const sampleItems = [
  {
    _id: 'item_101',
    title: 'Apple AirPods Pro (2nd Gen) with White Case',
    description: 'Found on the 2nd floor silent study area near desk 14. White charging case with a small scratch near the hinge and a tiny navy blue lanyard loop attached.',
    type: 'found',
    category: 'electronics',
    location: 'Main Library',
    dateLostOrFound: new Date('2026-10-27T14:30:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[1],
    status: 'open',
    createdAt: new Date('2026-10-27T15:00:00Z')
  },
  {
    _id: 'item_102',
    title: 'Casio FX-991EX ClassWiz Calculator',
    description: 'Left in Engineering Lecture Hall B after the 11 AM calculus midterm. Calculator has a matte black sliding cover with a small yellow periodic table sticker on the back.',
    type: 'lost',
    category: 'electronics',
    location: 'Engineering Quad',
    dateLostOrFound: new Date('2026-10-28T11:45:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[0],
    status: 'open',
    createdAt: new Date('2026-10-28T12:15:00Z')
  },
  {
    _id: 'item_103',
    title: 'Brown Leather Fossil Bifold Wallet',
    description: 'Found under a booth table in the cafeteria dining hall during lunch rush. Contains cards and receipts. Handed over to Campus Security Desk for safe custody.',
    type: 'found',
    category: 'keys_wallets',
    location: 'Central Cafeteria',
    dateLostOrFound: new Date('2026-10-28T13:00:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[2],
    status: 'under_review',
    createdAt: new Date('2026-10-28T13:20:00Z')
  },
  {
    _id: 'item_104',
    title: 'Student ID Card & Dorm Key Lanyard',
    description: 'University blue lanyard with student ID card and Dorm A room key attached. Found on the concrete steps near Student Union Building.',
    type: 'found',
    category: 'id_cards',
    location: 'Student Center',
    dateLostOrFound: new Date('2026-10-26T16:15:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[1],
    status: 'open',
    createdAt: new Date('2026-10-26T17:00:00Z')
  },
  {
    _id: 'item_105',
    title: 'Hydro Flask 32oz Water Bottle (Cobalt Blue)',
    description: 'Lost during basketball practice on Court 2. Cobalt blue with a black flex sip lid and several national park stickers around the base.',
    type: 'lost',
    category: 'accessories',
    location: 'Sports Complex',
    dateLostOrFound: new Date('2026-10-25T18:00:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[0],
    status: 'open',
    createdAt: new Date('2026-10-25T19:30:00Z')
  },
  {
    _id: 'item_106',
    title: 'North Face Recon Backpack (Navy / Charcoal)',
    description: 'Found placed beside the vending machines on the ground floor of Science Block. Checked by security for hazardous items and safely cataloged.',
    type: 'found',
    category: 'bags_backpacks',
    location: 'Science Block',
    dateLostOrFound: new Date('2026-10-24T09:20:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[2],
    status: 'claimed',
    createdAt: new Date('2026-10-24T10:00:00Z')
  },
  {
    _id: 'item_107',
    title: 'TI-84 Plus CE Color Graphing Calculator',
    description: 'Rose gold casing. Found in Math Lab 108. Claim was verified and calculator was returned to student on Oct 26.',
    type: 'found',
    category: 'electronics',
    location: 'Science Block',
    dateLostOrFound: new Date('2026-10-23T10:00:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[2],
    status: 'returned',
    createdAt: new Date('2026-10-23T11:00:00Z')
  },
  {
    _id: 'item_108',
    title: 'Silver Keychain with Car & Dorm Keys',
    description: 'Lost around the main campus shuttle turnaround shelter. Has a miniature silver carabiner and a Subaru remote key fob.',
    type: 'lost',
    category: 'keys_wallets',
    location: 'Campus Shuttle Stop',
    dateLostOrFound: new Date('2026-10-28T08:15:00Z'),
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
    reportedBy: sampleUsers[1],
    status: 'open',
    createdAt: new Date('2026-10-28T09:00:00Z')
  }
];

const sampleClaims = [
  {
    _id: 'clm_501',
    itemId: 'item_103',
    item: sampleItems[2],
    claimedBy: sampleUsers[0],
    proofDescription: 'Inside slot has my student ID card with photo and a debit card ending in 4821. There is also a coffee loyalty stamp card with 4 stamps.',
    message: 'I lost it while eating lunch with study partners around 12:45 PM. Can pick up anytime after 2 PM.',
    status: 'pending',
    createdAt: new Date('2026-10-28T14:10:00Z')
  },
  {
    _id: 'clm_502',
    itemId: 'item_106',
    item: sampleItems[5],
    claimedBy: sampleUsers[1],
    proofDescription: 'Main pocket contains a spiral notebook labeled "Bio 201 - Sarah Jenkins" and an orange stainless steel water bottle in the left mesh pocket.',
    message: 'Thank you so much to whoever handed it in! I was panicking about my lab notes.',
    status: 'approved',
    createdAt: new Date('2026-10-24T12:00:00Z')
  }
];

const sampleNotifications = [
  {
    _id: 'notif_01',
    userId: 'usr_001',
    type: 'claim_status',
    message: 'Your claim on "Brown Leather Fossil Bifold Wallet" is under active review by campus security staff.',
    isRead: false,
    createdAt: new Date('2026-10-28T14:15:00Z')
  },
  {
    _id: 'notif_02',
    userId: 'usr_001',
    type: 'item_status',
    message: 'Notice: A found item resembling your lost "Casio FX-991EX Calculator" was reported in Engineering Quad.',
    isRead: false,
    createdAt: new Date('2026-10-28T13:00:00Z')
  },
  {
    _id: 'notif_03',
    userId: 'usr_001',
    type: 'system',
    message: 'Welcome to the Campus Lost & Found recovery network. Review your account profile anytime in the dashboard.',
    isRead: true,
    createdAt: new Date('2026-10-20T09:00:00Z')
  }
];

module.exports = {
  sampleUsers,
  sampleItems,
  sampleClaims,
  sampleNotifications
};
