import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { LuX, LuLoaderCircle, LuCircleAlert, LuCircleCheck, LuTriangleAlert, LuInfo } from 'react-icons/lu';

const cx = (...classes) => classes.filter(Boolean).join(' ');
export { cx };

// --- Brand ---

// The mark is a filled answer bubble with a check, as on an exam answer sheet.
// Same geometry as public/favicon.svg and the PNG icons (32-unit grid).
export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cx('shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-brand" />
      {/* A row of answer bubbles, the third one filled in */}
      {[6.5, 12.83, 19.17, 25.5].map((x, i) => (i === 2
        ? <circle key={x} cx={x} cy="16" r="3.1" className="fill-on-brand" />
        : <circle key={x} cx={x} cy="16" r="2.45" fill="none" strokeWidth="1.7" className="stroke-on-brand" />))}
    </svg>
  );
}

export function Logo({ compact = false, size = 28, className }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {!compact && <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Fairpaper</span>}
    </span>
  );
}

// --- Buttons ---

// Full class names, not built from parts: Tailwind only keeps classes it finds written out in the source
const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'danger-ghost': 'btn-danger-ghost',
};
const BUTTON_SIZES = { sm: 'btn-sm', lg: 'btn-lg' };

export const Button = forwardRef(function Button(
  { variant = 'primary', size, icon: Icon, iconRight: IconRight, loading = false, className, children, type = 'button', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx('btn', BUTTON_VARIANTS[variant], BUTTON_SIZES[size], !children && 'btn-icon', className)}
      {...props}
    >
      {loading ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4 shrink-0" />}
    </button>
  );
});

// --- Form controls ---

export function Field({ label, hint, error, htmlFor, children, className, optional }) {
  const { t } = useI18n();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {optional && <span className="ms-1.5 font-normal text-muted">{t('optional')}</span>}
        </label>
      )}
      {children}
      {error ? <p className="hint !text-danger">{error}</p> : hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx('input', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx('input', className)} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx('input', className)} {...props} />;
});

// An on/off setting with a label and an explanation
export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-disabled:opacity-50" />
        <span className="absolute start-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
    </label>
  );
}

export function Checkbox({ checked, onChange, children, className }) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-2.5 text-sm text-ink', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-line accent-[rgb(var(--brand))]"
      />
      {children}
    </label>
  );
}

// --- Surfaces ---

export function Card({ className, children, ...props }) {
  return (
    <div className={cx('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: 'badge-neutral',
  brand: 'badge-brand',
  danger: 'badge-danger',
  warn: 'badge-warn',
  info: 'badge-info',
};

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cx('badge', BADGE_TONES[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

const ALERT_STYLES = {
  info: ['bg-info-soft text-info-ink', LuInfo],
  success: ['bg-brand-soft text-brand-ink', LuCircleCheck],
  warn: ['bg-warn-soft text-warn-ink', LuTriangleAlert],
  danger: ['bg-danger-soft text-danger-ink', LuCircleAlert],
};

export function Alert({ tone = 'info', title, children, onClose, className }) {
  const { t } = useI18n();
  const [style, Icon] = ALERT_STYLES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-lg px-4 py-3 text-sm', style, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx('leading-relaxed', title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label={t('Dismiss')}>
          <LuX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-sunken text-muted">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return <LuLoaderCircle className={cx('h-5 w-5 animate-spin text-muted', className)} />;
}

export function PageLoader({ label }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted">
      <Spinner />
      {label || t('Loading…')}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.025em]">{title}</h1>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('tabular mt-1 text-2xl font-semibold tracking-tight', tone === 'danger' && 'text-danger', tone === 'brand' && 'text-brand')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cx('flex gap-1 border-b border-line', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cx(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors',
            value === tab.value ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tabular rounded-full bg-sunken px-1.5 text-xs text-muted">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// --- Dialogs ---

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const { t } = useI18n();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('relative flex max-h-[90vh] w-full animate-rise-in flex-col rounded-xl border border-line bg-surface shadow-pop focus:outline-none', width)}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="-me-1 rounded-md p-1 text-muted hover:bg-sunken hover:text-ink" aria-label={t('Close')}>
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>
        {children && <div className="overflow-y-auto px-5 py-3">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

// Promise-based confirmation: `if (await confirm({ title, ... })) doIt();`
export function useConfirm() {
  const { t } = useI18n();
  const [state, setState] = useState(null);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setState({ ...options, resolve })),
    [],
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      description={state?.description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>{t('Cancel')}</Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {state?.confirmLabel || t('Confirm')}
          </Button>
        </>
      }
    />
  );

  return [dialog, confirm];
}
