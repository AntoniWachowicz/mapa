// Development setup script. Run this once to:
//   1. Create a superadmin account
//   2. Create a first tenant + admin user for that tenant
//   3. Migrate any existing objects/settings to belong to that tenant
//
// Usage:
//   MONGODB_URI=<uri> node scripts/seed-dev.js
//
// Credentials created:
//   Superadmin:  admin@platform.local  /  superadmin123456
//   Tenant admin: user@tenant.local    /  tenantadmin123456
//
// After running, log in at http://localhost:5173/login as user@tenant.local

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI environment variable is required'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

const now = new Date();
const tenantId = new ObjectId().toString(); // Generate a stable tenantId for the first tenant

// ─── Superadmin ───────────────────────────────────────────────────────────────
const superadminHash = await bcrypt.hash('superadmin123456', 12);
await db.collection('users').updateOne(
  { email: 'admin@platform.local' },
  { $set: { email: 'admin@platform.local', passwordHash: superadminHash, role: 'superadmin', tenantId: null, status: 'active', activationKey: null, createdAt: now, activatedAt: now, plan: 'superadmin', paidUntil: null, companyName: 'Platform Admin' } },
  { upsert: true }
);
console.log('✓ Superadmin:    admin@platform.local  /  superadmin123456');

// ─── Tenant admin ─────────────────────────────────────────────────────────────
const adminHash = await bcrypt.hash('tenantadmin123456', 12);
await db.collection('users').updateOne(
  { email: 'user@tenant.local' },
  { $set: { email: 'user@tenant.local', passwordHash: adminHash, role: 'admin', tenantId, status: 'active', activationKey: null, createdAt: now, activatedAt: now, plan: 'dev', paidUntil: null, companyName: 'Dev Tenant' } },
  { upsert: true }
);
console.log(`✓ Tenant admin:  user@tenant.local     /  tenantadmin123456  (tenantId: ${tenantId})`);

// ─── Migrate existing data ────────────────────────────────────────────────────
// Stamp tenantId onto any documents that don't already have one.
// This adopts all pre-existing objects and settings into the dev tenant.

const objectsResult = await db.collection('objects').updateMany(
  { tenantId: { $exists: false } },
  { $set: { tenantId } }
);
console.log(`✓ Migrated ${objectsResult.modifiedCount} existing objects → tenantId: ${tenantId}`);

const settingsResult = await db.collection('settings').updateMany(
  { tenantId: { $exists: false } },
  { $set: { tenantId } }
);
console.log(`✓ Migrated ${settingsResult.modifiedCount} existing settings documents → tenantId: ${tenantId}`);

console.log('\nDone. Log in at http://localhost:5173/login');
console.log('Use user@tenant.local / tenantadmin123456 to see your data.');

await client.close();
