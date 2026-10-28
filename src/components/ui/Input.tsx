import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div>
        {label && <label htmlFor={inputId} className="label">{label}</label>}
        <input ref={ref} id={inputId} className={`input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-950' : ''} ${className}`} {...props} />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1 text-sm text-ink-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div>
        {label && <label htmlFor={textareaId} className="label">{label}</label>}
        <textarea ref={ref} id={textareaId} className={`input resize-none ${className}`} {...props} />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', id, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div>
        {label && <label htmlFor={selectId} className="label">{label}</label>}
        <select ref={ref} id={selectId} className={`input ${className}`} {...props}>
          {children}
        </select>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
