import { useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initials } from '../../lib/format.js';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
  accent: 'bg-accent text-white hover:brightness-95 shadow-sm',
  outline: 'border border-line bg-white text-ink hover:border-primary/50 hover:text-primary',
  ghost: 'text-ink hover:bg-sand',
  soft: 'bg-primary-soft text-primary hover:bg-accent-soft',
  danger: 'bg-danger text-white hover:brightness-95',
  'danger-outline': 'border border-danger/30 bg-white text-danger hover:bg-danger/5',
  white: 'bg-white text-primary hover:bg-cream shadow-sm',
};
const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
};

export function Button({ as, to, variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }) {
  const cls = `inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {content}
      </Link>
    );
  }
  const Comp = as || 'button';
  return (
    <Comp className={cls} disabled={disabled || loading} {...(Comp === 'button' ? { type: 'button' } : {})} {...props}>
      {content}
    </Comp>
  );
}

/** Label + control + help/error text. Pass a render function to receive the generated id. */
export function Field({ label, error, help, optional, children, className = '' }) {
  const id = useId();
  const { t } = useTranslation();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {error ? <p className="error-text">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <LoaderCircle className={`h-5 w-5 animate-spin text-primary ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-6 text-center">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

const BADGE_TONES = {
  green: 'bg-accent-soft text-primary',
  gray: 'bg-sand text-muted',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-danger',
  blue: 'bg-sky-50 text-sky-700',
  dark: 'bg-ink/80 text-white backdrop-blur',
};

export function Badge({ tone = 'green', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

const STATUS_TONES = { pending: 'amber', accepted: 'blue', active: 'green', completed: 'gray', rejected: 'red', cancelled: 'gray' };
export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <Badge tone={STATUS_TONES[status] || 'gray'}>{t(`status.${status}`)}</Badge>;
}

export function Avatar({ name, src, size = 40, className = '' }) {
  if (src) return <img src={src} alt="" className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${width} animate-slide-up rounded-t-3xl bg-white p-6 shadow-pop sm:rounded-3xl`}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-sand hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-[15px] text-ink/85">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, tone = 'primary', loading, onConfirm, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      {text}
    </Modal>
  );
}

export function Logo({ className = '', light = false }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="KerakBo‘lsa">
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#fff' : '#146B50'} />
        <path d="M20 16v32M20 33l16-17M25 28l13 20" stroke={light ? '#146B50' : '#fff'} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="46" cy="44" r="5" fill="#27AE80" />
      </svg>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Kerak<span className={light ? 'text-accent-soft' : 'text-primary'}>Bo‘lsa</span>
      </span>
    </Link>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
