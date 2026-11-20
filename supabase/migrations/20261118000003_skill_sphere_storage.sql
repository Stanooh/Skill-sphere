INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'mentor-verification',
  'mentor-verification',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "mentor_verification_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "mentor_verification_authorized_read" ON storage.objects;
DROP POLICY IF EXISTS "mentor_verification_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "mentor_verification_authorized_delete" ON storage.objects;

CREATE POLICY "mentor_verification_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.mentor_applications AS ma
    WHERE ma.id::text = (storage.foldername(name))[2]
      AND ma.user_id = auth.uid()
      AND ma.status IN ('not_applied', 'verification_failed', 'pending_verification')
  )
);

CREATE POLICY "mentor_verification_authorized_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentor-verification'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1
        FROM public.mentor_applications AS ma
        WHERE ma.id::text = (storage.foldername(name))[2]
          AND ma.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "mentor_verification_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mentor-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.mentor_applications AS ma
    WHERE ma.id::text = (storage.foldername(name))[2]
      AND ma.user_id = auth.uid()
      AND ma.status IN ('not_applied', 'verification_failed', 'pending_verification')
  )
)
WITH CHECK (
  bucket_id = 'mentor-verification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "mentor_verification_authorized_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mentor-verification'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (
        SELECT 1
        FROM public.mentor_applications AS ma
        WHERE ma.id::text = (storage.foldername(name))[2]
          AND ma.user_id = auth.uid()
          AND ma.status IN ('not_applied', 'verification_failed')
      )
    )
  )
);

