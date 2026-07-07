import { forwardRef, InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const rid = id || `input-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={rid} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={rid}
          className={`w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-brand-500'
          } ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
