import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'teal' | 'danger' | 'danger-subtle' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  title?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-xs focus:ring-brand-500 border border-transparent font-medium',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-xs focus:ring-slate-600 border border-transparent font-medium',
  outline:
    'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 shadow-xs focus:ring-brand-500 font-medium',
  teal:
    'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-xs focus:ring-teal-500 border border-transparent font-medium',
  danger:
    'bg-emergency-600 text-white hover:bg-emergency-700 active:bg-emergency-800 shadow-xs focus:ring-emergency-500 border border-transparent font-medium',
  'danger-subtle':
    'border border-emergency-200 dark:border-emergency-800/60 bg-emergency-50/70 dark:bg-emergency-950/40 text-emergency-700 dark:text-emergency-300 hover:bg-emergency-100 focus:ring-emergency-400 font-medium',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus:ring-slate-300 font-medium',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-medium rounded-xl gap-2.5',
};

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  fullWidth,
  loading = false,
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 select-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4 shrink-0 text-current" />}
      {children}
    </button>
  );
}

type InputProps = {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  icon?: ReactNode;
  error?: string;
  helper?: string;
  helperText?: string;
  autoComplete?: string;
};

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
  className,
  icon,
  error,
  helper,
  helperText,
  autoComplete,
}: InputProps) {
  const displayHelper = helperText || helper;
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>
            {label} {required && <span className="text-emergency-500 font-bold">*</span>}
          </span>
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          autoComplete={autoComplete}
          className={cn(
            'w-full rounded-lg border bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-xs transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600',
            error
              ? 'border-emergency-300 dark:border-emergency-500 focus:border-emergency-500 focus:ring-emergency-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
            icon && 'pl-9',
          )}
        />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-emergency-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {!error && displayHelper && <p className="mt-1 text-xs text-slate-500">{displayHelper}</p>}
    </div>
  );
}

type SelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  icon?: ReactNode;
};

export function Select({ label, value, onChange, options, placeholder, required, className, error, icon }: SelectProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>
            {label} {required && <span className="text-emergency-500 font-bold">*</span>}
          </span>
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            'w-full appearance-none rounded-lg border bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-xs transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 cursor-pointer',
            error
              ? 'border-emergency-300 dark:border-emergency-500 focus:border-emergency-500 focus:ring-emergency-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
            icon && 'pl-9',
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-emergency-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

type BadgeVariant = 'red' | 'green' | 'yellow' | 'blue' | 'teal' | 'gray' | 'purple';

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
};

const badgeVariants: Record<BadgeVariant, { container: string; dot: string }> = {
  red: {
    container: 'bg-emergency-50 dark:bg-emergency-950/60 text-emergency-700 dark:text-emergency-300 border-emergency-200/70 dark:border-emergency-800/60',
    dot: 'bg-emergency-500',
  },
  green: {
    container: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  yellow: {
    container: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },
  blue: {
    container: 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-200/70 dark:border-brand-800/60',
    dot: 'bg-brand-500',
  },
  teal: {
    container: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60',
    dot: 'bg-teal-500',
  },
  gray: {
    container: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
  purple: {
    container: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/60',
    dot: 'bg-purple-500',
  },
};

export function Badge({ children, variant = 'gray', dot = false, className }: BadgeProps) {
  const styles = badgeVariants[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        styles.container,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', styles.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card transition-all duration-200 text-slate-900 dark:text-slate-100',
        hover && 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elevated',
        className,
      )}
    >
      {children}
    </div>
  );
}

type ModalProps = {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  maxWidth?: string;
};

export function Modal({ children, open, onClose, title, description, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-elevated transition-all duration-200 my-auto text-slate-900 dark:text-slate-100',
          maxWidth,
        )}
      >
        {title && (
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[calc(85vh-6rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin text-brand-600', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50/80 dark:bg-brand-950/60 border border-brand-100 dark:border-brand-900/60 text-brand-600 dark:text-brand-400 shadow-xs">
        {icon}
      </div>
      <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800', className)} />;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

