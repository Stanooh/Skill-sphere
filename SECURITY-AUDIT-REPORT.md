# SkillSphere Security and Production Readiness Audit

**Audit date:** 2026-11-18  
**Project:** `Stanooh/Skill-sphere`  
**Supabase project:** `cvajffkwidhgmguzzzee`  
**Stage:** Stage 1 read-only audit

## 1. Executive Summary

SkillSphere has a reachable, healthy Supabase production project and a functioning Supabase Auth integration, but it is not production-ready.

The highest-risk findings are:

- Mentor evidence can be changed after submission.
- Mentor approval does not require identity verification.
- Production schema and application queries disagree on profile columns.
- The application expects an `avatars` bucket that does not exist in production.
- Production schema objects are not represented by tracked migrations.
- Most domain data remains browser-controlled `localStorage`.
- Anonymous and authenticated database grants are broader than necessary.

No application files, migrations, production database objects, Storage buckets, policies, or production data were modified during this audit.

## 2. Inspection Completed

### Repository and application

Inspected:

- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.mjs`
- `proxy.ts`
- `.env` and `.env.local` key names and Supabase URL targets, without exposing keys
- `app/`
- `src/`
- `public/`
- `supabase/`
- `migration-archive-20261118/`
- `supabase-audit.zip`

Supabase integration files inspected:

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/supabase/authorization.ts`
- `app/auth/callback/route.ts`
- `app/admin/layout.tsx`
- `src/context/AuthContext.tsx`
- `src/services/authService.ts`
- `src/services/avatarService.ts`
- `src/services/passwordResetService.ts`
- `src/services/mentorVerificationService.ts`
- `src/services/dataService.ts`
- References in account, contact-request, recommendation, verification, talent, admin, and route-guard code.

### Supabase files

- `supabase/config.toml`
- `supabase/production_public_schema.sql`
- `supabase/remote_schema.sql`
- `supabase/migrations/` — no tracked migration files
- `migration-archive-20261118/20261113000000_auth_profiles_storage.sql`
- `migration-archive-20261118/20261116000000_harden_profile_authorization.sql`
- `migration-archive-20261118/20261116000001_mentor_verification.sql`

### Supabase CLI operations

Executed read-only:

```text
supabase --version
supabase status --output json
supabase projects list --output json
supabase migration list --linked
supabase migration list --remote
supabase db dump --remote --schema public,storage,auth
supabase db dump --remote --data-only --schema storage
supabase inspect db table-record-counts --remote
supabase inspect db role-stats --remote
```

Results:

- CLI version: `3.2.0`
- Project: `Skillsphere`
- Reference: `cvajffkwidhgmguzzzee`
- Status: `ACTIVE_HEALTHY`
- Region: `eu-west-3`
- PostgreSQL: `17.11.0.019`
- Remote migration history: empty
- Tracked `supabase/migrations` files: none

### Live API checks

Read-only requests were made to:

- `/auth/v1/settings`
- `/auth/v1/health`
- `/storage/v1/bucket`
- `/rest/v1/profiles?select=id&limit=1`
- `/rest/v1/mentor_applications?select=id&limit=1`

Results:

- Auth health: HTTP 200.
- Auth settings: HTTP 200.
- Storage buckets: `[]`.
- Anonymous REST reads returned no rows under current RLS behavior.

No write requests were made.

### Validation

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: failed due to one error in `src/components/profile/ProfilePictureUpload.tsx:36` and one unused-import warning in `src/views/VerifyEmailView.tsx`.

## 3. Production Database Findings

### Verified production project

The linked production project is healthy:

```text
Project: Skillsphere
Reference: cvajffkwidhgmguzzzee
Status: ACTIVE_HEALTHY
Region: eu-west-3
PostgreSQL: 17.11.0.019
```

### Production public tables

Verified:

- `public.profiles`
- `public.mentor_applications`
- `public.mentor_application_skills`
- `public.mentor_verification_history`

### Production profile schema

`public.profiles` contains:

- `id uuid`
- `full_name text`
- `email text`
- `role text`
- `created_at timestamptz`
- `updated_at timestamptz`

It does not contain `name` or `avatar_url`.

### Production functions

Verified:

- `public.admin_approve_mentor_application(uuid)`
- `public.handle_new_user()`
- `public.is_admin()`
- `public.protect_mentor_application_changes()`
- `public.protect_mentor_application_skill_changes()`
- `public.record_mentor_verification_history()`
- `public.rls_auto_enable()`
- `public.submit_mentor_application(uuid)`

### Production triggers

Verified:

- `on_auth_user_created`
- `mentor_application_history`
- `mentor_application_skill_history`
- `protect_mentor_application_changes`
- `protect_mentor_application_skill_changes`

### Production RLS policies

`public.profiles`:

- `Admins can view all profiles`
- `Users can update own profile`
- `Users can view own profile`

`public.mentor_applications`:

- `Applicants and admins can update mentor applications`
- `Applicants and admins can view mentor applications`
- `Users can create their own mentor application`

`public.mentor_application_skills`:

- `Applicants and admins can update application skills`
- `Applicants and admins can view application skills`
- `Applicants can create application skills`

`public.mentor_verification_history`:

- `Applicants and admins can view verification history`

RLS is enabled on all four tables.

### Production grants

Verified broad grants including:

- `GRANT ALL ON TABLE public.mentor_application_skills TO anon`
- `GRANT ALL ON TABLE public.mentor_application_skills TO authenticated`
- `GRANT ALL ON TABLE public.mentor_applications TO anon`
- `GRANT ALL ON TABLE public.mentor_applications TO authenticated`
- `GRANT ALL ON TABLE public.mentor_verification_history TO anon`
- `GRANT ALL ON TABLE public.mentor_verification_history TO authenticated`
- `GRANT ALL ON TABLE public.profiles TO anon`
- Broad function execution grants to `anon`, `authenticated`, and `service_role`

RLS currently limits access, but the grants violate least privilege.

### Production Storage

Verified:

- Storage schema exists.
- `storage.objects` RLS is enabled.
- Live bucket listing returned no buckets.
- No production `avatars` bucket exists.
- No application Storage policies for the archived avatar bucket were present in the live schema dump.

### Production Auth settings

The live Auth settings endpoint reported:

```json
{
  "external": {
    "anonymous_users": false,
    "email": true,
    "phone": false,
    "github": false,
    "google": false
  },
  "disable_signup": false,
  "mailer_autoconfirm": false,
  "phone_autoconfirm": false,
  "saml_enabled": false,
  "passkeys_enabled": false
}
```

SMTP, password complexity, MFA enforcement, exact redirect allowlists, dashboard settings, and production network restrictions were not available through the inspected read-only endpoints.

## 4. Security Vulnerabilities

### Critical: Submitted mentor evidence is mutable

Affected object:

```text
public.protect_mentor_application_skill_changes()
```

Source:

`migration-archive-20261118/20261116000001_mentor_verification.sql:282-299`

The trigger protects application identity, review fields, and selected status changes, but does not freeze `evidence_data` or `skill_name`. The applicant update policy permits updates to their own skill rows.

**Impact:** An applicant can alter evidence after submission without renewed review.

### High: Approval does not require identity verification

Affected object:

```text
public.admin_approve_mentor_application(uuid)
```

Source:

`migration-archive-20261118/20261116000001_mentor_verification.sql:371-396`

The function checks `competency_verified = true` but not `identity_verified = true`.

**Impact:** An application can be approved without completed identity verification.

### High: Profile column mismatch

Affected application code:

`src/services/mentorVerificationService.ts:250-258`

The application selects `profiles.name`, while production exposes `profiles.full_name`.

**Impact:** Admin application listing fails or applicant names become `"Unknown"`.

### High: Avatar Storage is absent

Affected application code:

`src/services/avatarService.ts:52-84`

The application uses `storage.from('avatars')`, but production has no buckets and no `profiles.avatar_url`.

**Impact:** Avatar upload and cleanup cannot work in production.

### High: Production schema is unversioned

Production contains application objects, but remote migration history is empty and no tracked migration files exist.

**Impact:** The production database cannot be reliably reproduced, reviewed, rolled back, or safely deployed to.

### High: Core domain data is client-controlled

Affected file:

`src/services/dataService.ts:31,63-83`

Users, profiles, sessions, workshops, roadmaps, notifications, recommendations, and related data are stored in browser `localStorage`.

**Impact:** Data is tamperable, not shared across devices, and not protected by database authorization.

### Medium: Excessive database grants

Affected schema:

`supabase/production_public_schema.sql:611-635`

Application tables and functions have broad `anon` and `authenticated` grants.

**Impact:** A future RLS or query mistake could expose or modify more data than intended.

### Medium: Local and production Auth mismatch

Affected configuration:

`supabase/config.toml:164-190`

Local configuration uses email confirmations disabled, six-character passwords, no password complexity, and disabled secure password changes, while production requires email confirmation.

**Impact:** Local testing does not accurately represent production authentication behavior.

### Medium: Open local database network configuration

Affected configuration:

`supabase/config.toml:78-84`

Local configuration allows all IPv4 and IPv6 CIDRs.

**Impact:** Dangerous if reused in an exposed or hosted environment.

### Low: Lint failure

Affected file:

`src/components/profile/ProfilePictureUpload.tsx:36`

`npm run lint` fails due to a state update inside an effect.

## 5. Mentor Verification Workflow

### Learner

Authenticated users can create an application where `user_id = auth.uid()`. The insert policy does not require a particular profile role. Whether learners are intentionally allowed to become mentors was not documented.

### Pending mentor

Applicants can view their own application, skills, and history; insert skill evidence; update their own application; and submit through `submit_mentor_application(uuid)`.

The evidence mutation issue allows changes after submission.

### Rejected mentor

The trigger allows editing and resubmission from `not_applied` and `verification_failed`. The submission function does not accept permanently `rejected` applications.

### Approved mentor

Admin approval changes the application status, approval flag, timestamps, reviewer, and profile role.

The approval function does not require identity verification.

### Suspended mentor

The approval function excludes suspended applications and application-level access checks deny suspended access.

Database policies do not provide a complete independent suspended-user restriction, and much of the mentor product remains localStorage-backed.

### Admin

Admin access is checked through:

- `proxy.ts`
- `app/admin/layout.tsx`
- `getAuthenticatedProfile()`
- `public.is_admin()`
- Admin RLS branches
- Security-definer approval function

The layered checks are reasonable, but grants are too broad and the profile schema mismatch affects admin display.

## 6. Storage Security

### Current production state

- No Storage buckets exist.
- `storage.objects` RLS is enabled.
- No production `avatars` bucket exists.
- No production avatar policy was found in the live dump.

### Archived avatar migration

`migration-archive-20261118/20261113000000_auth_profiles_storage.sql` defines:

- Public `avatars` bucket.
- 5 MB limit.
- JPEG, PNG, and WebP MIME types.
- Public read policy.
- Authenticated insert/update/delete policies scoped to the first path segment matching `auth.uid()`.

This migration is not in production migration history.

### Proposed private mentor-verification Storage

No private verification bucket currently exists.

A future private bucket should:

- Be non-public.
- Use paths such as `{user_id}/{application_id}/{document_id}`.
- Allow applicants to upload only to their own pending application.
- Allow applicants to read only their own files.
- Allow authorized admins/reviewers to read through short-lived signed URLs.
- Enforce size and MIME limits.
- Avoid public URLs.

## 7. Authentication and Authorization

### Signup roles

`authService.ts` maps registration roles so only `learner` and `mentor` can be selected. Admin cannot be selected through the public registration function.

The production signup trigger also restricts profile roles to valid values and uses a learner fallback.

### Profile creation

`public.handle_new_user()` creates a profile after Auth user creation using `full_name`, `email`, and `role`.

The application uses `name` metadata and expects a different profile-column shape.

### Sessions

Inspected:

- Browser Supabase client.
- Server Supabase client.
- SSR cookie handling.
- `proxy.ts`.
- Auth callback.
- Auth context.

The proxy calls `supabase.auth.getUser()`, redirects unauthenticated users, redirects unconfirmed users, and checks the profile role before allowing admin routes.

### Admin authorization

Admin authorization is checked in middleware/proxy, server layout logic, database RLS, `public.is_admin()`, and the security-definer approval function.

The main issues are broad grants, missing identity-verification enforcement, and profile schema mismatch.

### Account deletion

Account deletion was not executed. A complete production deletion workflow was not verified for:

- Auth user deletion.
- Profile/application cascading.
- Storage cleanup.
- Recent-authentication requirements.
- Local cache cleanup.

## 8. Migration and Production Alignment

Production contains tables, functions, triggers, policies, and grants, but no recognized migration history.

The repository contains:

- Schema snapshots.
- An untracked migration archive.
- No tracked `supabase/migrations` files.

### Known differences

Production `profiles` uses `full_name`; application code uses `name`.

Production has no `avatars` bucket; application code assumes one.

### Baseline strategy

The safe strategy is to:

1. Capture the live application-owned public schema.
2. Reconcile profile naming first.
3. Exclude managed Supabase Auth and Storage internals from application migrations.
4. Preserve existing rows and constraints.
5. Add reviewed security migrations.
6. Validate against a fresh local project.
7. Compare local and production schemas before deployment.

No baseline or migration was created during this audit.

## 9. Proposed Remediation Plan

### Phase 0: Security-critical database fixes

1. Freeze submitted mentor evidence.
   - Objects: `mentor_application_skills`, `protect_mentor_application_skill_changes`, related RLS policy.
   - Production impact: yes.

2. Require identity and competency verification for approval.
   - Object: `admin_approve_mentor_application`.
   - Production impact: yes.

3. Add database tests for unauthorized workflow transitions.
   - Production impact: no if executed locally.

4. Reduce anonymous and unnecessary authenticated grants.
   - Objects: public tables, functions, default privileges.
   - Production impact: yes.

### Phase 1: Correctness and deployment alignment

5. Standardize the profile name column.
   - Files/objects: `mentorVerificationService.ts`, `public.profiles`, `handle_new_user`.
   - Production impact: potentially yes.

6. Establish a tracked migration baseline.
   - Directory: `supabase/migrations/`.
   - Production impact: deployment requires separate approval.

7. Configure avatar Storage.
   - Objects: `storage.buckets`, `storage.objects` policies, avatar metadata.
   - Production impact: yes.

8. Align Auth settings.
   - Files/config: `supabase/config.toml`, hosted Auth configuration, SMTP, redirects.
   - Production impact: yes.

### Phase 2: Architecture

9. Move authoritative domain data from localStorage to Supabase.
   - Affected services: `dataService.ts` and related domain services.
   - Production impact: yes.

10. Design and implement secure account deletion.
    - Affected areas: Auth, profiles, applications, Storage, local cache.
    - Production impact: yes.

### Phase 3: Quality

11. Fix lint errors and warnings.
    - Production impact: no direct production impact.

12. Add integration, RLS, privilege-escalation, Auth, Storage, and migration tests.
    - Production impact: no if isolated locally.

## 10. Testing Strategy

### RLS and authorization

Test as anonymous, learner, pending applicant, rejected applicant, approved mentor, suspended mentor, and admin.

Verify that:

- Users cannot read another user’s application.
- Users cannot alter another user’s evidence.
- Applicants cannot alter submitted evidence.
- Applicants cannot set review flags.
- Applicants cannot approve themselves.
- Suspended users cannot perform mentor operations.
- Admins can review but cannot bypass workflow requirements.

### Privilege escalation

Attempt:

- Role changes as a learner.
- Changing application ownership.
- Setting identity or competency verification as an applicant.
- Setting approval flags as an applicant.
- Calling approval RPC as anonymous or non-admin.
- Approval without identity verification.
- Editing evidence after submission.
- Editing verified evidence.

### Storage

Test anonymous upload/read, cross-user access, applicant path restrictions, admin review access, suspended access, file limits, signed URL expiry, and deletion ownership.

### Auth

Test learner and mentor signup, attempted admin signup, unconfirmed login, confirmed login, password reset, redirect validation, session refresh, admin route access, role mutation, and account deletion.

### Migrations

Test fresh local migration, migration against existing data, constraints, RLS policies, foreign keys, schema diffs, and preservation of existing rows.

## 11. Outstanding Issues

Not fully verified:

1. Production SMTP configuration.
2. Exact production redirect allowlist.
3. Production password complexity and MFA enforcement.
4. Production dashboard/network restrictions.
5. Complete account deletion behavior.
6. Authenticated production RLS attack tests.
7. Production Storage write/delete behavior.
8. Full production row counts and row contents.
9. Whether learners are intentionally allowed to apply as mentors.
10. Whether avatars should be public or private.

These were not fabricated or inferred as confirmed production facts.

## 12. Implementation Approval Checklist

Approval is required before Stage 2:

- [ ] Freeze mentor evidence after submission.
- [ ] Require identity and competency verification before approval.
- [ ] Add mentor workflow security tests.
- [ ] Reduce anonymous and unnecessary grants.
- [ ] Approve the canonical profile name column.
- [ ] Approve a production migration baseline.
- [ ] Approve avatar Storage behavior.
- [ ] Approve production Auth configuration changes.
- [ ] Approve separate local and production environments.
- [ ] Approve moving authoritative domain data from localStorage to Supabase.
- [ ] Approve account deletion design.
- [ ] Approve private mentor-verification Storage.
- [ ] Approve RLS and privilege-escalation tests.
- [ ] Approve lint fixes.

**Stage 2 has not started.**
