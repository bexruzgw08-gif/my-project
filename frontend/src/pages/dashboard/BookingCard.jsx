import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Lock, Mail, MapPin, MessageSquare, Phone, Truck } from 'lucide-react';
import { api, errorMessage, unwrap } from '../../lib/api.js';
import { formatDateTime, formatRange, money } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Avatar, Button, ConfirmDialog, StatusBadge } from '../../components/ui/index.jsx';
import { ProductImage } from '../../components/product/index.jsx';

const ACTION_STYLE = {
  accept: 'primary',
  reject: 'danger-outline',
  cancel: 'danger-outline',
  activate: 'accent',
  complete: 'primary',
};

/** One booking, seen either by the renter or by the owner. Actions come from the server. */
export default function BookingCard({ booking, onChanged }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const b = booking;
  const isOwner = b.viewerRole === 'owner';
  const cp = b.counterpart;

  const run = async () => {
    setBusy(true);
    try {
      const d = await unwrap(api.patch(`/bookings/${b._id}/status`, { action: pending }));
      toast.success(t('actions.done'));
      onChanged?.(d.booking);
    } catch (err) {
      toast.error(errorMessage(err));
      onChanged?.();
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <Link to={`/products/${b.product}`} className="shrink-0">
          <ProductImage src={b.productSnapshot?.image} alt={b.productSnapshot?.title} className="h-28 w-full rounded-xl sm:h-24 sm:w-32" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to={`/products/${b.product}`} className="font-bold leading-snug hover:text-primary">
              {b.productSnapshot?.title}
            </Link>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-2 space-y-1 text-sm text-ink/80">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" /> {formatRange(b.startAt, b.endAt)}
            </p>
            <p className="flex items-center gap-2">
              {b.deliveryMethod === 'delivery' ? <Truck className="h-4 w-4 shrink-0 text-primary" /> : <MapPin className="h-4 w-4 shrink-0 text-primary" />}
              {b.deliveryMethod === 'delivery' ? t('dashboard.deliveryTo', { address: b.deliveryAddress }) : `${t('booking.pickup')} · ${b.productSnapshot?.city || ''}`}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              {t('booking.total')}: <b className="text-primary">{money(b.pricing.total)}</b>
            </span>
            {b.pricing.deposit > 0 && (
              <span className="text-muted">
                {t('booking.deposit')}: {money(b.pricing.deposit)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-line bg-cream/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          {cp && <Avatar name={cp.fullName} src={cp.avatarUrl} size={36} />}
          <div className="min-w-0 text-sm">
            <p className="font-semibold">
              <span className="text-muted">{isOwner ? t('dashboard.renter') : t('dashboard.owner')}:</span> {cp?.fullName}
            </p>
            {b.contactVisible ? (
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-ink/80">
                {cp.phone ? (
                  <a href={`tel:${cp.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3.5 w-3.5" /> {cp.phone}
                  </a>
                ) : (
                  <span className="text-muted">{t('dashboard.noPhone')}</span>
                )}
                <a href={`mailto:${cp.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                  <Mail className="h-3.5 w-3.5" /> {cp.email}
                </a>
              </div>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                <Lock className="h-3 w-3" /> {t('dashboard.contactHidden')}
              </p>
            )}
            {b.message && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" /> “{b.message}”
              </p>
            )}
            <p className="mt-1 text-xs text-muted">{t('dashboard.requestedAt', { date: formatDateTime(b.createdAt) })}</p>
          </div>
        </div>
        {b.allowedActions?.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {b.allowedActions.map((a) => (
              <Button key={a} size="sm" variant={ACTION_STYLE[a]} onClick={() => setPending(a)}>
                {t(`actions.${a}`)}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? t(`actions.${pending}`) : ''}
        text={pending ? t(`actions.${pending}_confirm`) : ''}
        confirmLabel={pending ? t(`actions.${pending}`) : ''}
        tone={pending === 'reject' || pending === 'cancel' ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={run}
        onClose={() => setPending(null)}
      />
    </article>
  );
}
