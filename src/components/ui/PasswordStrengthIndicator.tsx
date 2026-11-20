'use client';

import { Check, X, ShieldAlert } from 'lucide-react';
import type { PasswordStrength } from '@/utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  showDetails?: boolean;
}

export function PasswordStrengthIndicator({
  strength,
  showDetails = true,
}: PasswordStrengthIndicatorProps) {
  const { score, label, criteria, recommendations } = strength;

  const barColors = [
    'bg-ink-200', // 0
    'bg-red-500', // 1 Weak
    'bg-amber-500', // 2 Fair
    'bg-emerald-500', // 3 Strong
    'bg-teal-400', // 4 Very Strong
  ];

  const labelColors = {
    'Too Weak': 'text-ink-400',
    Weak: 'text-red-400',
    Fair: 'text-amber-400',
    Strong: 'text-emerald-400',
    'Very Strong': 'text-teal-400',
  };

  const criteriaItems = [
    { key: 'minLength', text: 'At least 12 characters' },
    { key: 'hasUppercase', text: 'One uppercase letter (A-Z)' },
    { key: 'hasLowercase', text: 'One lowercase letter (a-z)' },
    { key: 'hasNumber', text: 'One number (0-9)' },
    { key: 'hasSpecial', text: 'One special character (!@#$%^&*)' },
    { key: 'notEmailOrName', text: 'No parts of your name or email' },
    { key: 'noCommonPattern', text: 'No common or sequential patterns' },
  ] as const;

  return (
    <div className="space-y-2 mt-2 pt-1">
      {/* Strength meter bars */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-400 font-medium">Password strength:</span>
          <span className={`font-semibold ${labelColors[label]}`}>{label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`rounded-full transition-colors duration-300 ${
                score >= step ? barColors[score] : 'bg-ink-100'
              }`}
            />
          ))}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 pt-1">
          {/* Criteria checklist */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            {criteriaItems.map((item) => {
              const satisfied = criteria[item.key];
              return (
                <li
                  key={item.key}
                  className={`flex items-center gap-1.5 transition-colors ${
                    satisfied ? 'text-emerald-600 font-medium' : 'text-ink-400'
                  }`}
                >
                  {satisfied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                  )}
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Recommendations if weak */}
          {recommendations.length > 0 && score < 3 && (
            <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-900 space-y-1 mt-2">
              <div className="flex items-center gap-1.5 font-semibold text-brand-800">
                <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                <span>Security Recommendations</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-600">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

