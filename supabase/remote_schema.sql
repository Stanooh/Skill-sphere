


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      applicant_id UUID;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF NOT public.is_admin() THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            RAISE EXCEPTION 'Administrator access required';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                SELECT user_id INTO applicant_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  FROM public.mentor_applications
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    WHERE id = application_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        AND competency_verified = true
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            AND status <> 'suspended'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              FOR UPDATE;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                IF applicant_id IS NULL THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RAISE EXCEPTION 'Application not found or competency verification has not passed';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        UPDATE public.mentor_applications
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          SET status = 'approved',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                admin_approved = true,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      approved_at = timezone('utc'::text, now()),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            reviewed_by = auth.uid(),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  updated_at = timezone('utc'::text, now())
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    WHERE id = application_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      UPDATE public.profiles
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        SET role = 'mentor',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              updated_at = timezone('utc'::text, now())
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHERE id = applicant_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                $$;


ALTER FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
                                                                        DECLARE
                                                                            selected_role TEXT;
                                                                            BEGIN
                                                                                selected_role := COALESCE(
                                                                                        NEW.raw_user_meta_data ->> 'role',
                                                                                                'learner'
                                                                                                    );

                                                                                                        -- Never allow public signup to create an Admin.
                                                                                                            IF selected_role NOT IN ('learner', 'mentor') THEN
                                                                                                                    selected_role := 'learner';
                                                                                                                        END IF;

                                                                                                                            INSERT INTO public.profiles (
                                                                                                                                    id,
                                                                                                                                            full_name,
                                                                                                                                                    email,
                                                                                                                                                            role
                                                                                                                                                                )
                                                                                                                                                                    VALUES (
                                                                                                                                                                            NEW.id,
                                                                                                                                                                                    COALESCE(
                                                                                                                                                                                                NEW.raw_user_meta_data ->> 'full_name',
                                                                                                                                                                                                            NEW.raw_user_meta_data ->> 'name'
                                                                                                                                                                                                                    ),
                                                                                                                                                                                                                            NEW.email,
                                                                                                                                                                                                                                    selected_role
                                                                                                                                                                                                                                        );

                                                                                                                                                                                                                                            RETURN NEW;
                                                                                                                                                                                                                                            END;
                                                                                                                                                                                                                                            $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
                                    SELECT EXISTS (
                                            SELECT 1
                                                    FROM public.profiles
                                                            WHERE id = (SELECT auth.uid())
                                                                    AND role = 'admin'
                                                                        );
                                                                        $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_mentor_application_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                  IF public.is_admin() THEN
                                                                                                                                                                                                                                                                                                                                                                                                                      RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                        END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                          IF OLD.user_id IS DISTINCT FROM NEW.user_id
                                                                                                                                                                                                                                                                                                                                                                                                                              OR OLD.identity_verified IS DISTINCT FROM NEW.identity_verified
                                                                                                                                                                                                                                                                                                                                                                                                                                  OR OLD.competency_verified IS DISTINCT FROM NEW.competency_verified
                                                                                                                                                                                                                                                                                                                                                                                                                                      OR OLD.admin_approved IS DISTINCT FROM NEW.admin_approved
                                                                                                                                                                                                                                                                                                                                                                                                                                          OR OLD.created_at IS DISTINCT FROM NEW.created_at
                                                                                                                                                                                                                                                                                                                                                                                                                                              OR (
                                                                                                                                                                                                                                                                                                                                                                                                                                                    OLD.submitted_at IS DISTINCT FROM NEW.submitted_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                          AND NOT (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  OLD.status IN ('not_applied', 'verification_failed')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          AND NEW.status = 'pending_verification'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RAISE EXCEPTION 'Only an administrator can change mentor review fields';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF OLD.status IS DISTINCT FROM NEW.status
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            AND NOT (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  OLD.status IN ('not_applied', 'verification_failed')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        AND NEW.status = 'pending_verification'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              AND NEW.submitted_at IS NOT NULL
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      RAISE EXCEPTION 'Invalid mentor application status transition';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          IF OLD.status NOT IN ('not_applied', 'verification_failed')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              AND (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    OLD.professional_headline IS DISTINCT FROM NEW.professional_headline
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          OR OLD.biography IS DISTINCT FROM NEW.biography
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                OR OLD.location IS DISTINCT FROM NEW.location
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      OR OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            OR OLD.github_url IS DISTINCT FROM NEW.github_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  OR OLD.portfolio_url IS DISTINCT FROM NEW.portfolio_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          RAISE EXCEPTION 'This mentor application is no longer editable';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              $$;


ALTER FUNCTION "public"."protect_mentor_application_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_mentor_application_skill_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                IF public.is_admin() THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF OLD.status = 'verified' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            RAISE EXCEPTION 'Verified mentor skill evidence cannot be changed by an applicant';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                IF OLD.application_id IS DISTINCT FROM NEW.application_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    OR OLD.skill_id IS DISTINCT FROM NEW.skill_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            RAISE EXCEPTION 'Only an administrator can move mentor skill records';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                IF OLD.status IS DISTINCT FROM NEW.status
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    AND NEW.status <> 'pending' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RAISE EXCEPTION 'Only an administrator can review mentor skill evidence';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            IF OLD.feedback IS DISTINCT FROM NEW.feedback
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RAISE EXCEPTION 'Only an administrator can change mentor skill review fields';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        $$;


ALTER FUNCTION "public"."protect_mentor_application_skill_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_mentor_verification_history"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                                                                                                                                                  DECLARE
                                                                                                                                                                                                                                                                    action_text TEXT;
                                                                                                                                                                                                                                                                      action_note TEXT;
                                                                                                                                                                                                                                                                        actor UUID := auth.uid();
                                                                                                                                                                                                                                                                        BEGIN
                                                                                                                                                                                                                                                                          IF TG_TABLE_NAME = 'mentor_applications' THEN
                                                                                                                                                                                                                                                                              IF TG_OP = 'INSERT' THEN
                                                                                                                                                                                                                                                                                    action_text := 'Application created';
                                                                                                                                                                                                                                                                                        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
                                                                                                                                                                                                                                                                                              action_text := 'Application status changed to ' || replace(NEW.status, '_', ' ');
                                                                                                                                                                                                                                                                                                    action_note := NEW.rejection_reason;
                                                                                                                                                                                                                                                                                                        ELSIF OLD.identity_verified IS DISTINCT FROM NEW.identity_verified THEN
                                                                                                                                                                                                                                                                                                              action_text := CASE WHEN NEW.identity_verified THEN 'Identity verified' ELSE 'Identity verification failed' END;
                                                                                                                                                                                                                                                                                                                    action_note := NEW.rejection_reason;
                                                                                                                                                                                                                                                                                                                        ELSIF OLD.competency_verified IS DISTINCT FROM NEW.competency_verified THEN
                                                                                                                                                                                                                                                                                                                              action_text := CASE WHEN NEW.competency_verified THEN 'Competency verification passed' ELSE 'Competency verification failed' END;
                                                                                                                                                                                                                                                                                                                                    action_note := NEW.rejection_reason;
                                                                                                                                                                                                                                                                                                                                        ELSE
                                                                                                                                                                                                                                                                                                                                              RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                  END IF;
                                                                                                                                                                                                                                                                                                                                                      INSERT INTO public.mentor_verification_history (application_id, action, actor_id, note)
                                                                                                                                                                                                                                                                                                                                                          VALUES (NEW.id, action_text, actor, action_note);
                                                                                                                                                                                                                                                                                                                                                            ELSE
                                                                                                                                                                                                                                                                                                                                                                IF TG_OP = 'INSERT' THEN
                                                                                                                                                                                                                                                                                                                                                                      action_text := 'Skill evidence submitted';
                                                                                                                                                                                                                                                                                                                                                                          ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
                                                                                                                                                                                                                                                                                                                                                                                action_text := 'Skill "' || NEW.skill_name || '" marked ' || replace(NEW.status, '-', ' ');
                                                                                                                                                                                                                                                                                                                                                                                      action_note := NEW.feedback;
                                                                                                                                                                                                                                                                                                                                                                                          ELSE
                                                                                                                                                                                                                                                                                                                                                                                                RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                    END IF;
                                                                                                                                                                                                                                                                                                                                                                                                        INSERT INTO public.mentor_verification_history (application_id, action, actor_id, note)
                                                                                                                                                                                                                                                                                                                                                                                                            VALUES (NEW.application_id, action_text, actor, action_note);
                                                                                                                                                                                                                                                                                                                                                                                                              END IF;
                                                                                                                                                                                                                                                                                                                                                                                                                RETURN NEW;
                                                                                                                                                                                                                                                                                                                                                                                                                END;
                                                                                                                                                                                                                                                                                                                                                                                                                $$;


ALTER FUNCTION "public"."record_mentor_verification_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_mentor_application"("application_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          IF NOT EXISTS (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              SELECT 1
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  FROM public.mentor_applications
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      WHERE id = application_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            AND user_id = auth.uid()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  AND status IN ('not_applied', 'verification_failed')
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RAISE EXCEPTION 'Application not found or cannot be submitted';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            IF NOT EXISTS (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                SELECT 1
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    FROM public.mentor_application_skills
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        WHERE mentor_application_skills.application_id = submit_mentor_application.application_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              AND jsonb_array_length(evidence_data) > 0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ) THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RAISE EXCEPTION 'At least one skill must include evidence';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        UPDATE public.mentor_applications
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          SET status = 'pending_verification',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                identity_verified = false,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      competency_verified = false,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            admin_approved = false,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  rejection_reason = NULL,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        submitted_at = timezone('utc'::text, now()),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              updated_at = timezone('utc'::text, now())
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHERE id = submit_mentor_application.application_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    AND user_id = auth.uid();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    $$;


ALTER FUNCTION "public"."submit_mentor_application"("application_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."mentor_application_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "skill_id" "text" NOT NULL,
    "skill_name" "text" NOT NULL,
    "evidence_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "feedback" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "mentor_application_skills_status_check" CHECK (("status" = ANY (ARRAY['not-submitted'::"text", 'pending'::"text", 'verified'::"text", 'rejected'::"text", 'needs-evidence'::"text"])))
);


ALTER TABLE "public"."mentor_application_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentor_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_applied'::"text" NOT NULL,
    "professional_headline" "text" DEFAULT ''::"text" NOT NULL,
    "biography" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "linkedin_url" "text",
    "github_url" "text",
    "portfolio_url" "text",
    "identity_verified" boolean DEFAULT false NOT NULL,
    "competency_verified" boolean DEFAULT false NOT NULL,
    "admin_approved" boolean DEFAULT false NOT NULL,
    "rejection_reason" "text",
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "mentor_applications_status_check" CHECK (("status" = ANY (ARRAY['not_applied'::"text", 'pending_verification'::"text", 'verification_failed'::"text", 'pending_admin_approval'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."mentor_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentor_verification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."mentor_verification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "role" "text" DEFAULT 'learner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['learner'::"text", 'mentor'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."mentor_application_skills"
    ADD CONSTRAINT "mentor_application_skills_application_id_skill_id_key" UNIQUE ("application_id", "skill_id");



ALTER TABLE ONLY "public"."mentor_application_skills"
    ADD CONSTRAINT "mentor_application_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentor_applications"
    ADD CONSTRAINT "mentor_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentor_applications"
    ADD CONSTRAINT "mentor_applications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."mentor_verification_history"
    ADD CONSTRAINT "mentor_verification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "mentor_application_history" AFTER INSERT OR UPDATE ON "public"."mentor_applications" FOR EACH ROW EXECUTE FUNCTION "public"."record_mentor_verification_history"();



CREATE OR REPLACE TRIGGER "mentor_application_skill_history" AFTER INSERT OR UPDATE ON "public"."mentor_application_skills" FOR EACH ROW EXECUTE FUNCTION "public"."record_mentor_verification_history"();



CREATE OR REPLACE TRIGGER "protect_mentor_application_changes" BEFORE UPDATE ON "public"."mentor_applications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_mentor_application_changes"();



CREATE OR REPLACE TRIGGER "protect_mentor_application_skill_changes" BEFORE UPDATE ON "public"."mentor_application_skills" FOR EACH ROW EXECUTE FUNCTION "public"."protect_mentor_application_skill_changes"();



ALTER TABLE ONLY "public"."mentor_application_skills"
    ADD CONSTRAINT "mentor_application_skills_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."mentor_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentor_applications"
    ADD CONSTRAINT "mentor_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mentor_applications"
    ADD CONSTRAINT "mentor_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentor_verification_history"
    ADD CONSTRAINT "mentor_verification_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mentor_verification_history"
    ADD CONSTRAINT "mentor_verification_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."mentor_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Applicants and admins can update application skills" ON "public"."mentor_application_skills" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."mentor_applications" "application"
  WHERE (("application"."id" = "mentor_application_skills"."application_id") AND ("application"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."mentor_applications" "application"
  WHERE (("application"."id" = "mentor_application_skills"."application_id") AND ("application"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Applicants and admins can update mentor applications" ON "public"."mentor_applications" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Applicants and admins can view application skills" ON "public"."mentor_application_skills" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."mentor_applications" "application"
  WHERE (("application"."id" = "mentor_application_skills"."application_id") AND ("application"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Applicants and admins can view mentor applications" ON "public"."mentor_applications" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Applicants and admins can view verification history" ON "public"."mentor_verification_history" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."mentor_applications" "application"
  WHERE (("application"."id" = "mentor_verification_history"."application_id") AND ("application"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Applicants can create application skills" ON "public"."mentor_application_skills" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'pending'::"text") AND ("feedback" IS NULL) AND ("reviewed_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."mentor_applications" "application"
  WHERE (("application"."id" = "mentor_application_skills"."application_id") AND ("application"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their own mentor application" ON "public"."mentor_applications" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'not_applied'::"text") AND ("identity_verified" = false) AND ("competency_verified" = false) AND ("admin_approved" = false)));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."mentor_application_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentor_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentor_verification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_approve_mentor_application"("application_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_mentor_application_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_mentor_application_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_mentor_application_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_mentor_application_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_mentor_application_skill_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_mentor_application_skill_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_mentor_application_skill_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_mentor_application_skill_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_mentor_verification_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_mentor_verification_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_mentor_verification_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_mentor_verification_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_mentor_application"("application_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_mentor_application"("application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_mentor_application"("application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_mentor_application"("application_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."mentor_application_skills" TO "anon";
GRANT ALL ON TABLE "public"."mentor_application_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_application_skills" TO "service_role";



GRANT ALL ON TABLE "public"."mentor_applications" TO "anon";
GRANT ALL ON TABLE "public"."mentor_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_applications" TO "service_role";



GRANT ALL ON TABLE "public"."mentor_verification_history" TO "anon";
GRANT ALL ON TABLE "public"."mentor_verification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."mentor_verification_history" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































