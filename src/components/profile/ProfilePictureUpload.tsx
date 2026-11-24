'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Camera, Trash2, Upload, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { validateAvatarFile, createAvatarPreview } from '@/services/avatarService';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  userName: string;
  onFileSelect?: (file: File | null) => void;
  onSave?: (file: File) => Promise<{ success: boolean; error?: string }>;
  onRemove?: () => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
  showSaveButton?: boolean;
  autoUpload?: boolean;
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  userName,
  onFileSelect,
  onSave,
  onRemove,
  disabled = false,
  showSaveButton = false,
  autoUpload = false,
}: ProfilePictureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = selectedPreviewUrl ?? currentAvatarUrl;

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const preview = createAvatarPreview(file);
    setSelectedPreviewUrl(preview);

    if (onFileSelect) {
      onFileSelect(file);
    }

    if (autoUpload && onSave) {
      setIsUploading(true);
      try {
        const res = await onSave(file);
        if (!res.success) {
          setError(res.error || 'Failed to upload profile picture.');
        } else {
          setSelectedFile(null);
          setSelectedPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleTriggerUpload = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleSaveImmediate = async () => {
    if (!selectedFile || !onSave) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await onSave(selectedFile);
      if (!res.success) {
        setError(res.error || 'Failed to save profile picture.');
      } else {
        setSelectedFile(null);
        setSelectedPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (disabled || isUploading) return;
    setError(null);

    // If there's an unsaved local file selection, just clear it
    if (selectedFile) {
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onFileSelect) onFileSelect(null);
      return;
    }

    // If there is an existing saved avatar on the profile, call onRemove
    if (onRemove && previewUrl) {
      setIsUploading(true);
      try {
        const res = await onRemove();
        if (!res.success) {
          setError(res.error || 'Failed to remove profile picture.');
        } else {
          setSelectedPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (onFileSelect) onFileSelect(null);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Avatar Preview */}
        <div className="relative group">
          <Avatar
            src={previewUrl}
            name={userName || 'User'}
            size="xl"
            className="ring-2 ring-ink-100 ring-offset-2"
          />
          <button
            type="button"
            onClick={handleTriggerUpload}
            disabled={disabled || isUploading}
            aria-label="Upload new profile picture"
            className="absolute inset-0 bg-ink-950/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || isUploading}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTriggerUpload}
              disabled={disabled || isUploading}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {isUploading ? 'Uploading...' : previewUrl ? 'Change Picture' : 'Upload Picture'}
            </Button>

            {(previewUrl || selectedFile) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-400">
            JPG, PNG or WebP. Maximum size 5 MB.
          </p>
        </div>
      </div>

      {showSaveButton && selectedFile && onSave && (
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            onClick={handleSaveImmediate}
            disabled={disabled || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Save New Picture'}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

