import { connectToDatabase } from './database.js';
import { ObjectId } from 'mongodb';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import type { AuthUser, UserRole, UserStatus } from '../types.js';

// Internal DB document shape — not exported outside this module
interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  tenantId: ObjectId | null; // null for superadmin
  status: UserStatus;
  activationKey: string | null; // random token sent to client; cleared on activation
  createdAt: Date;
  activatedAt: Date | null;
  plan: string;
  paidUntil: Date | null;
  companyName: string;
}

// Maps DB document to the public AuthUser shape used in JWTs and App.Locals
function toAuthUser(doc: UserDoc): AuthUser {
  return {
    userId: doc._id.toString(),
    tenantId: doc.tenantId?.toString() ?? null,
    role: doc.role,
    email: doc.email
  };
}

// Validate email + plaintext password against the DB.
// Returns AuthUser if credentials are valid and account is active; null otherwise.
export async function validateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = await connectToDatabase();
  const doc = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase() });
  if (!doc || doc.status !== 'active') return null;
  const valid = await bcrypt.compare(password, doc.passwordHash);
  return valid ? toAuthUser(doc) : null;
}

// Find a pending account by activation key — used by the /activate route to
// verify the key before showing the password-set form.
export async function findPendingByKey(key: string): Promise<{ userId: string; email: string } | null> {
  const db = await connectToDatabase();
  const doc = await db.collection<UserDoc>('users').findOne({ activationKey: key, status: 'pending' });
  if (!doc) return null;
  return { userId: doc._id.toString(), email: doc.email };
}

// Hash password, mark account active, clear the activation key.
// Called after the user submits the activation form.
export async function activateUser(userId: string, password: string): Promise<void> {
  const db = await connectToDatabase();
  const hash = await bcrypt.hash(password, 12);
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { passwordHash: hash, status: 'active', activationKey: null, activatedAt: new Date() } }
  );
}

// ─── Superadmin operations ────────────────────────────────────────────────────

// Public shape returned to the superadmin panel — no password hashes exposed
export interface TenantRecord {
  userId: string;
  email: string;
  companyName: string;
  status: UserStatus;
  plan: string;
  paidUntil: Date | null;
  createdAt: Date;
  activatedAt: Date | null;
  tenantId: string;
}

// All tenant accounts (role=admin), newest first
export async function getAllTenants(): Promise<TenantRecord[]> {
  const db = await connectToDatabase();
  const docs = await db.collection<UserDoc>('users')
    .find({ role: 'admin' })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(doc => ({
    userId: doc._id.toString(),
    email: doc.email,
    companyName: doc.companyName,
    status: doc.status,
    plan: doc.plan,
    paidUntil: doc.paidUntil,
    createdAt: doc.createdAt,
    activatedAt: doc.activatedAt,
    tenantId: doc.tenantId?.toString() ?? ''
  }));
}

// Create a new pending tenant account. Returns the activation key to send to the client.
// tenantId is generated here and stored — all future objects for this client use it.
export async function createTenantUser(email: string, companyName: string): Promise<{ activationKey: string; tenantId: string }> {
  const db = await connectToDatabase();
  const tenantId = new ObjectId().toString();
  const activationKey = randomBytes(32).toString('hex'); // 64-char hex, cryptographically secure

  await db.collection('users').insertOne({
    email: email.toLowerCase(),
    passwordHash: '',
    role: 'admin',
    tenantId,
    status: 'pending',
    activationKey,
    createdAt: new Date(),
    activatedAt: null,
    plan: 'basic',
    paidUntil: null,
    companyName
  });

  return { activationKey, tenantId };
}

// Flip a tenant's status — used to suspend non-paying clients or reactivate them
export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const db = await connectToDatabase();
  await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { status } });
}

// Update editable tenant metadata from the superadmin panel
export async function updateTenantMetadata(
  userId: string,
  data: { companyName?: string; plan?: string; paidUntil?: Date | null }
): Promise<void> {
  const db = await connectToDatabase();
  await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: data });
}

// ─── Phase 3 additions ────────────────────────────────────────────────────────

// Lightweight status check — used by hooks on every protected request to enforce suspension.
// Returns null if user no longer exists in DB (deleted account).
export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  const db = await connectToDatabase();
  const doc = await db.collection<UserDoc>('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { status: 1 } }
  );
  return doc?.status ?? null;
}

// Full tenant record for a single user — used by /account page.
export async function getTenantById(userId: string): Promise<TenantRecord | null> {
  const db = await connectToDatabase();
  const doc = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(userId) });
  if (!doc) return null;
  return {
    userId: doc._id.toString(),
    email: doc.email,
    companyName: doc.companyName,
    status: doc.status,
    plan: doc.plan,
    paidUntil: doc.paidUntil,
    createdAt: doc.createdAt,
    activatedAt: doc.activatedAt,
    tenantId: doc.tenantId?.toString() ?? ''
  };
}

// Pin count per tenantId — for superadmin usage stats.
export async function getTenantPinCounts(): Promise<Record<string, number>> {
  const db = await connectToDatabase();
  const rows = await db.collection('objects').aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$tenantId', count: { $sum: 1 } } }
  ]).toArray();
  return Object.fromEntries(rows.map(r => [r._id, r.count]));
}

// Idempotent index creation — call once at server startup.
export async function ensureIndexes(): Promise<void> {
  const db = await connectToDatabase();
  await Promise.all([
    db.collection('objects').createIndex({ tenantId: 1 }),
    db.collection('settings').createIndex({ tenantId: 1 }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('users').createIndex({ activationKey: 1 }, { sparse: true }),
  ]);
}
