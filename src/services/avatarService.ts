import { createClient } from '@/lib/supabase/client';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Validates file type and size.
 */
export function validateAvatarFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a valid image file (JPG, PNG, or WebP).',
    };
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size exceeds 5 MB. Please choose a smaller image.',
    };
  }

  return { isValid: true };
}

/**
 * Converts a File into a temporary object URL for immediate browser preview.
 */
export function createAvatarPreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Uploads user profile picture to Supabase Storage in bucket `avatars`.
 * Predictable path based on user UUID: `${userId}/profile_${Date.now()}.${ext}`.
 * Stores the avatar URL in Supabase Auth user metadata and returns the public URL.
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<AvatarUploadResult> {
  const validation = validateAvatarFile(file);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${userId}/profile_${Date.now()}.${ext}`;

    // Clean up old avatar files in user's directory first if any
    try {
      const { data: existingFiles } = await supabase.storage.from('avatars').list(userId);
      if (existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(pathsToRemove);
      }
    } catch {
      // Ignore directory cleanup error if bucket/folder doesn't exist yet
    }

    // Upload new image
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      return { success: false, error: uploadError.message || 'Failed to upload profile picture to storage.' };
    }

    // Get public URL from avatars bucket
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl;

    // Persist into user's profile metadata in Supabase Auth and public.profiles
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });

    if (updateAuthError) {
      return { success: false, error: 'Picture uploaded but failed to update user profile.' };
    }

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);

    return { success: true, avatarUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during avatar upload.';
    return { success: false, error: message };
  }
}

/**
 * Removes user avatar from storage and clears avatar_url on the user record.
 */
export async function removeUserAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // List and delete user files
    try {
      const { data: existingFiles } = await supabase.storage.from('avatars').list(userId);
      if (existingFiles && existingFiles.length > 0) {
        const pathsToRemove = existingFiles.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(pathsToRemove);
      }
    } catch {
      // ignore
    }

    // Clear avatar_url in Auth user metadata and public.profiles.
    await supabase.auth.updateUser({
      data: { avatar_url: '' },
    });

    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove avatar.';
    return { success: false, error: message };
  }
}

