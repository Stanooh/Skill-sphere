'use client';

import { useState, forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || props.name || 'password-input';

    const toggleVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent form submission or accidental blur
      e.preventDefault();
      e.stopPropagation();
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="relative">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={`input pr-10 ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-950' : ''
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={toggleVisibility}
            onMouseDown={(e) => e.preventDefault()} // Keeps input focus
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200 transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-ink-400">{hint}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

