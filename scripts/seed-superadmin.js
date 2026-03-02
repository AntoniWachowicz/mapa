// One-time script to create the superadmin account.
// Run BEFORE deploying the multi-tenancy update:
//   MONGODB_URI=<uri> node scripts/seed-superadmin.js <email> <password>
//
// The superadmin account has role='superadmin' and tenantId=null.
// It cannot be created through the UI — this script is the only way.

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI environment variable is required'); process.exit(1); }

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: MONGODB_URI=<uri> node scripts/seed-superadmin.js <email> <password>');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Password must be at least 12 characters');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const passwordHash = await bcrypt.hash(password, 12);
const now = new Date();

await db.collection('users').updateOne(
  { email: email.toLowerCase() },
  {
    $set: {
      email: email.toLowerCase(),
      passwordHash,
      role: 'superadmin',
      tenantId: null,
      status: 'active',
      activationKey: null,
      createdAt: now,
      activatedAt: now,
      plan: 'superadmin',
      paidUntil: null,
      companyName: 'Platform Admin'
    }
  },
  { upsert: true }
);

console.log(`✓ Superadmin account created/updated: ${email}`);
await client.close();
