'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface WorkshopCoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function WorkshopCoverImage({ src, alt, className = '' }: WorkshopCoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmed = src?.trim() || '';
  const showImage = isValidImageUrl(trimmed) && failedSrc !== trimmed;

  return (
    <div className={`relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand/20 via-ink-100 to-ink-200 ${className}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(trimmed)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-ink-400">
          <div className="w-11 h-11 rounded-xl bg-brand/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand" />
          </div>
          <span className="text-xs font-medium text-ink-400">SkillSphere Workshop</span>
        </div>
      )}
    </div>
  );
}
