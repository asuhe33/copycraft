import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, options, error, className = '', id, ...rest }, ref) => {
    const rid = id || `select-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={rid} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={rid}
          className={`w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-brand-500'
          } ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
