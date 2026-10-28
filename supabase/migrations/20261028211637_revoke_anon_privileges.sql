-- Revoke all privileges from anon role on mentor verification tables
-- The anon role should not have any access to these tables
REVOKE ALL ON mentor_applications FROM anon;
REVOKE ALL ON mentor_skill_verifications FROM anon;
REVOKE ALL ON mentor_verification_history FROM anon;
REVOKE ALL ON profiles FROM anon;
