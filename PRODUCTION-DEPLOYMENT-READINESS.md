# SkillSphere Production Deployment Readiness

Date: 2026-11-18

## Executive summary

The four local migrations are structurally compatible with the checked-in production schema exports for the application-owned tables, mentor workflow objects, and existing `profiles.full_name` model. They were applied and tested successfully in a disposable local Supabase environment, including fresh-schema, existing-data, RLS, workflow, and Storage API tests.

Production was not modified. No `supabase db push`, remote migration repair, production SQL, Storage change, Auth change, or deployment was executed.

**Final decision: READY AFTER SPECIFIC FIXES.**

One local migration cleanup fix was required and has been made: production contains the policy `"Users can view own profile"`, while the authorization migration previously dropped only differently named policies. The migration now drops the exact production policy name before creating the replacement policy.

## Four-migration review

### `20261118000000_skill_sphere_baseline.sql`

**Purpose:** Define the application-owned baseline for fresh/local databases.

**Objects:** `profiles`, `mentor_applications`, `mentor_application_skills`, `mentor_verification_history`; primary keys, foreign keys, uniqueness, checks, defaults, and RLS enablement.

**Production dependencies:** Existing `auth.users`, `gen_random_uuid()`, and the four existing application tables.

**Data impact:** No data changes. `CREATE TABLE IF NOT EXISTS` does not recreate existing tables.

**Production safety:** Safe only as a migration-history baseline after verifying schema equivalence. It must not be replayed against production as ordinary DDL. It does not create application functions, triggers, or policies.

**Dependency:** Must be marked applied before migrations `000001`–`000003`.

### `20261118000001_skill_sphere_authorization.sql`

**Purpose:** Harden profile authorization, role changes, RLS policies, table grants, and Auth profile creation.

**Objects:** Replaces `public.is_admin()`, `public.handle_new_user()`, and `public.prevent_non_admin_role_change()`; recreates the Auth profile trigger; replaces application RLS policies; changes application table grants.

**Production dependencies:** Existing `profiles`, application tables, `auth.users`, `auth.uid()`, and existing policy names. The exact production policy-name mismatch was corrected locally.

**Data impact:** No row data changes. Existing profile rows remain intact. Role changes are restricted to administrators.

**Production safety:** Safe after baseline synchronization and schema verification. It intentionally removes excessive anonymous/authenticated table privileges and preserves authenticated `profiles.full_name` updates through a column grant.

**Dependency:** Requires the baseline tables.

### `20261118000002_skill_sphere_mentor_workflow.sql`

**Purpose:** Protect mentor review fields and submitted evidence; enforce submission and approval workflow.

**Objects:** Replaces verification-history, application-protection, skill-protection, submission, and approval functions; recreates four mentor triggers; grants only required RPC execution.

**Production dependencies:** Existing mentor tables, `public.is_admin()`, `auth.uid()`, and existing trigger names.

**Data impact:** No row data changes. Existing applications and history are preserved. Future unauthorized changes are rejected.

**Production safety:** Compatible with the exported production columns and triggers. Approval now requires administrator authorization, `pending_admin_approval`, identity verification, competency verification, and `admin_approved = false`.

**Dependency:** Requires migrations `000000` and `000001`.

### `20261118000003_skill_sphere_storage.sql`

**Purpose:** Create/configure avatar and private mentor-verification buckets and Storage object policies.

**Objects:** `avatars` public bucket; `mentor-verification` private bucket; Storage object policies for read, insert, update, and delete.

**Production dependencies:** Supabase-managed `storage.buckets`, `storage.objects`, `storage.foldername()`, application mentor tables, and `public.is_admin()`.

**Data impact:** Creates buckets only. It does not modify existing application rows. Production audit exports showed no existing live buckets, so bucket creation is expected.

**Production safety:** Safe after the authorization and workflow functions exist. It must be executed by a role authorized to manage Storage metadata. The migration intentionally does not alter Supabase-managed Storage triggers or disable Storage RLS.

**Dependency:** Requires migrations `000000`–`000002`.

## Baseline synchronization assessment

The production exports show matching application-owned tables:

- `profiles` uses `full_name`, not `name`, and has no `avatar_url`.
- `mentor_applications` has the same status values and review columns.
- `mentor_application_skills` has the same evidence and review columns.
- `mentor_verification_history` has the same audit columns.
- Existing production triggers match the baseline object names.

The baseline uses `CREATE TABLE IF NOT EXISTS`, but that is not sufficient by itself as a production safety mechanism: it would skip existing tables and would not prove column, constraint, or data equivalence. The correct procedure is:

1. Back up production.
2. Verify the live schema against the checked-in production export and the baseline.
3. Mark only `20261118000000` as applied in remote migration history.
4. Apply only `20261118000001` through `20261118000003`.

The baseline synchronization command must not be executed without explicit production approval.

## Production compatibility findings

### Compatible

- `profiles.full_name` is consistent between production, migration, Auth trigger, and frontend compatibility code.
- Avatar URLs remain in Auth user metadata; no `profiles.avatar_url` column is introduced.
- Mentor table columns, status checks, foreign keys, triggers, and history structure match the exports.
- Existing application and skill rows are preserved by the later migrations.
- Existing `pending_admin_approval` workflow output is produced by the application’s competency-verification path.

### Intentional security changes

- Production currently grants broad table privileges to `anon` and `authenticated`; authorization migration narrows these.
- Production functions currently expose broader execution grants and use `search_path = 'public'`; later migrations revoke client execution where unnecessary and use `SET search_path = ''`.
- Production approval currently checks competency and non-suspended status but does not require the exact `pending_admin_approval` status or identity verification; workflow migration corrects this.
- Production has no live Storage buckets according to the completed audit; Storage migration creates the two required buckets.

### Remaining limitation

`supabase db diff` was not completed because the disposable shadow database health check timed out. The readiness review therefore relies on the checked-in production schema exports, migration inspection, and already completed disposable fresh/existing-data tests.

## Backup requirements

Before any production action:

1. Create a fresh Supabase database backup/export.
2. Preserve the existing schema exports and migration archive.
3. Record row counts for `profiles`, `mentor_applications`, `mentor_application_skills`, and `mentor_verification_history`.
4. Record current function definitions, trigger definitions, policies, grants, and migration history.
5. Confirm the backup can be downloaded and inspected before proceeding.

## Exact deployment procedure

These commands are specified only; none were executed.

From the repository root:

```powershell
supabase link --project-ref cvajffkwidhgmguzzzee
supabase db dump --linked --schema public -f production_public_schema_predeploy.sql
supabase migration list --linked
```

After explicit approval and schema verification, synchronize the baseline without replaying its DDL:

```powershell
supabase migration repair 20261118000000 --status applied --remote cvajffkwidhgmguzzzee
```

Then apply the security migrations:

```powershell
supabase db push --linked
```

Verify migration history:

```powershell
supabase migration list --linked
```

The expected history is:

```text
20261118000000 applied
20261118000001 applied
20261118000002 applied
20261118000003 applied
```

## Post-deployment verification checklist

Verify production read-only:

- Function definitions and `proconfig` show `search_path = ''` for security-definer functions.
- Mentor triggers exist with the expected names.
- RLS is enabled on all four application tables.
- Anonymous table access is absent.
- Authenticated `profiles.full_name` update remains available.
- RPC execution is present only for required authenticated functions.
- `avatars` is public, limited to image MIME types and 5 MB.
- `mentor-verification` is private, limited to approved evidence MIME types and 10 MB.
- Storage policies enforce user/application ownership.
- Row counts and sample IDs are unchanged.
- Existing profiles, applications, skills, and verification history remain intact.

Application smoke tests:

1. Sign in as an existing learner.
2. Update `profiles.full_name`.
3. Upload and remove an own avatar.
4. Submit a mentor application.
5. Confirm unauthorized evidence replacement/deletion fails.
6. Confirm an administrator can review evidence.
7. Confirm approval fails before identity/competency verification and succeeds only from `pending_admin_approval`.

## Rollback and forward-fix strategy

- **Baseline:** Do not roll back by deleting objects. If schema verification fails, stop before synchronization. Restore from backup or issue a reviewed forward migration.
- **Authorization:** Revert with a reviewed forward migration restoring only necessary grants/policies; do not restore broad anonymous privileges without security review.
- **Mentor workflow:** Use a forward-fix migration to correct function logic or trigger behavior. Existing data and history should remain preserved.
- **Storage:** Remove or correct policies with a forward migration. Do not delete user objects or buckets as an emergency rollback. Restore Storage metadata/data from the verified backup if necessary.

Any rollback or forward fix requires separate production approval.

## Outstanding risks and limitations

- The baseline is safe only after schema equivalence verification; migration-history synchronization is not a substitute for that verification.
- The production export is a snapshot, not a live post-deployment confirmation.
- `supabase db diff` shadow-database validation remains incomplete.
- Storage API tests passed locally, but production bucket creation and policy verification remain unperformed.
- No production deployment or remote migration-history change has occurred.

## Final readiness decision

**READY AFTER SPECIFIC FIXES**

Required fix completed locally:

1. Drop the exact production policy name `"Users can view own profile"` in `20261118000001_skill_sphere_authorization.sql`.

Before deployment, obtain explicit approval for the backup, baseline synchronization, and subsequent migration commands above.
