import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

const apiUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55421';
const anonKey = process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function client() {
  return createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function signUp(email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user || !data.session) throw new Error(`sign-up failed: ${error?.message ?? 'no session'}`);
  return { supabase, id: data.user.id };
}

async function removeObject(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  return { data: data ?? [], error };
}

const password = 'TestPassword123!';
const userA = await signUp(`storage-a-${suffix}@example.test`, password);
const userB = await signUp(`storage-b-${suffix}@example.test`, password);
const admin = await signUp(`storage-admin-${suffix}@example.test`, password);

const adminId = admin.id.replace(/'/g, "''");
execFileSync('docker', [
  'exec',
  'supabase_db_skillsphere-disposable',
  'psql',
  '-U',
  'postgres',
  '-d',
  'postgres',
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  `ALTER TABLE public.profiles DISABLE TRIGGER prevent_non_admin_profile_role_change; UPDATE public.profiles SET role = 'admin' WHERE id = '${adminId}'; ALTER TABLE public.profiles ENABLE TRIGGER prevent_non_admin_profile_role_change;`,
], { stdio: 'inherit' });

const adminSession = await admin.supabase.auth.signInWithPassword({
  email: `storage-admin-${suffix}@example.test`,
  password,
});
if (adminSession.error) throw new Error(`admin sign-in failed: ${adminSession.error.message}`);

const applicationA = crypto.randomUUID();
const applicationB = crypto.randomUUID();
for (const [supabase, id, applicationId] of [
  [userA.supabase, userA.id, applicationA],
  [userB.supabase, userB.id, applicationB],
]) {
  const { error } = await supabase.from('mentor_applications').insert({
    id: applicationId,
    user_id: id,
    professional_headline: 'Storage test',
    biography: 'Storage test',
    location: 'Local',
  });
  if (error) throw new Error(`application setup failed: ${error.message}`);
}

const avatarA = `${userA.id}/storage-test-a.png`;
const avatarB = `${userB.id}/storage-test-b.png`;
const evidenceA = `${userA.id}/${applicationA}/evidence-a.pdf`;
const evidenceB = `${userB.id}/${applicationB}/evidence-b.pdf`;
const image = new Blob(['avatar'], { type: 'image/png' });
const evidence = new Blob(['evidence'], { type: 'application/pdf' });

for (const [supabase, path, body, contentType] of [
  [userA.supabase, avatarA, image, 'image/png'],
  [userB.supabase, avatarB, image, 'image/png'],
  [userA.supabase, evidenceA, evidence, 'application/pdf'],
  [userB.supabase, evidenceB, evidence, 'application/pdf'],
]) {
  const { error } = await supabase.storage.from(path.includes('evidence') ? 'mentor-verification' : 'avatars').upload(path, body, {
    contentType,
  });
  if (error) throw new Error(`upload setup failed: ${error.message}`);
}

const ownAvatarDelete = await removeObject(userA.supabase, 'avatars', avatarA);
assert(!ownAvatarDelete.error && ownAvatarDelete.data.length === 1, 'User A could not delete own avatar');
const crossAvatarDelete = await removeObject(userA.supabase, 'avatars', avatarB);
assert(!crossAvatarDelete.error && crossAvatarDelete.data.length === 0, 'User A deleted User B avatar');
const anonymousAvatarDelete = await removeObject(client(), 'avatars', avatarB);
assert(!anonymousAvatarDelete.error && anonymousAvatarDelete.data.length === 0, 'Anonymous user deleted User B avatar');
const crossEvidenceDelete = await removeObject(userA.supabase, 'mentor-verification', evidenceB);
assert(!crossEvidenceDelete.error && crossEvidenceDelete.data.length === 0, 'Applicant A deleted Applicant B evidence');
const adminEvidenceDelete = await removeObject(admin.supabase, 'mentor-verification', evidenceB);
assert(!adminEvidenceDelete.error && adminEvidenceDelete.data.length === 1, 'Administrator could not delete verification evidence');
const adminAvatarDelete = await removeObject(admin.supabase, 'avatars', avatarB);
assert(!adminAvatarDelete.error && adminAvatarDelete.data.length === 0, 'Administrator deleted an avatar outside intended permission');

const { data: avatarBData, error: avatarBError } = await userB.supabase.storage.from('avatars').download(avatarB);
assert(avatarBData && !avatarBError, 'Unauthorized avatar deletion changed User B object');
const { data: evidenceAData, error: evidenceAError } = await userA.supabase.storage.from('mentor-verification').download(evidenceA);
assert(evidenceAData && !evidenceAError, 'Applicant A evidence was unexpectedly deleted');
const { data: evidenceBData } = await userB.supabase.storage.from('mentor-verification').download(evidenceB);
assert(!evidenceBData, 'Administrator deletion did not remove Applicant B evidence');

const cleanupAvatar = await removeObject(userB.supabase, 'avatars', avatarB);
assert(!cleanupAvatar.error && cleanupAvatar.data.length === 1, 'Cleanup failed for User B avatar');
const cleanupEvidence = await removeObject(userA.supabase, 'mentor-verification', evidenceA);
assert(!cleanupEvidence.error && cleanupEvidence.data.length === 1, 'Cleanup failed for Applicant A evidence');

console.log('Storage API tests passed: owner deletion, cross-owner denial, anonymous denial, applicant evidence isolation, admin evidence deletion, and avatar restriction.');
