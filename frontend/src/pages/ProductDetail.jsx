import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  Eye,
  Info,
  MapPin,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import { api, errorMessage, unwrap } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { catName, defaultWindow, formatDate, formatRange, money } from '../lib/format.js';
import { Avatar, Badge, Button, EmptyState, ErrorState, Skeleton } from '../components/ui/index.jsx';
import { CategoryIcon, FavoriteButton, ImageGallery, ProductGrid } from '../components/product/index.jsx';
import { LocationMap } from '../components/map/index.jsx';

function Section({ title, icon: Icon, children }) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        {Icon && <Icon className="h-5 w-5 text-primary" />} {title}
      </h2>
      {children}
    </section>
  );
}

function PriceTile({ label, value, unit, highlight }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-0.5 font-extrabold ${highlight ? 'text-lg text-primary' : 'text-ink'}`}>{money(value)}</p>
      {unit && <p className="text-[11px] text-muted">/ {unit}</p>}
    </div>
  );
}

/** Live price estimate — always computed by the server from the listing's own prices. */
function RentalPanel({ product }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [win, setWin] = useState(defaultWindow);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [busy, setBusy] = useState(false);
  const deliveryMethod = product.delivery?.pickup === false ? 'delivery' : 'pickup';

  useEffect(() => {
    if (!win.start || !win.end) return undefined;
    if (new Date(win.end) <= new Date(win.start)) {
      setQuote(null);
      setQuoteError(t('booking.invalidPeriod'));
      return undefined;
    }
    setBusy(true);
    const timer = setTimeout(() => {
      unwrap(
        api.post('/bookings/quote', {
          productId: product._id,
          startAt: new Date(win.start).toISOString(),
          endAt: new Date(win.end).toISOString(),
          deliveryMethod,
        }),
      )
        .then((d) => {
          setQuote(d.quote);
          setQuoteError(d.quote.available ? '' : t('product.datesUnavailable'));
        })
        .catch((err) => {
          setQuote(null);
          setQuoteError(errorMessage(err));
        })
        .finally(() => setBusy(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [win, product._id, deliveryMethod, t]);

  const request = () => {
    const qs = new URLSearchParams({ start: win.start, end: win.end });
    navigate(`/products/${product._id}/book?${qs}`);
  };

  const unavailable = !product.availability?.isAvailable;

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 font-extrabold">
        <CalendarDays className="h-5 w-5 text-primary" /> {t('product.selectPeriod')}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="block">
          <span className="label">{t('product.start')}</span>
          <input type="datetime-local" className="input" value={win.start} onChange={(e) => setWin((w) => ({ ...w, start: e.target.value }))} />
        </label>
        <label className="block">
          <span className="label">{t('product.end')}</span>
          <input type="datetime-local" className="input" value={win.end} min={win.start} onChange={(e) => setWin((w) => ({ ...w, end: e.target.value }))} />
        </label>
      </div>

      <div className="mt-4 rounded-2xl bg-cream p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted">{t('product.estimatedTotal')}</span>
          {busy ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <span className="text-xl font-extrabold text-primary">{quote ? money(quote.rentalCost) : '—'}</span>
          )}
        </div>
        {quote && !busy && (
          <div className="mt-1 space-y-0.5 text-xs text-muted">
            {quote.lines.map((l) => (
              <p key={l.unit}>{t(`booking.line_${l.unit}`, { qty: l.quantity, price: money(l.unitPrice) })}</p>
            ))}
            {quote.deposit > 0 && (
              <p>
                + {t('product.deposit')}: {money(quote.deposit)}
              </p>
            )}
          </div>
        )}
        {quoteError && <p className="error-text mt-2">{quoteError}</p>}
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={request} disabled={unavailable || Boolean(quoteError) || !quote}>
        {t('product.requestRental')}
      </Button>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('booking.noPaymentNote')}
      </p>
    </div>
  );
}

function OwnerCard({ owner }) {
  const { t } = useTranslation();
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{t('product.owner')}</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={owner.fullName} src={owner.avatarUrl} size={48} />
        <div className="min-w-0">
          <p className="truncate font-bold">{owner.fullName}</p>
          <p className="text-xs text-muted">{t('product.memberSince', { date: formatDate(owner.memberSince, { month: 'long', year: 'numeric' }) })}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {owner.verified ? (
          <Badge tone="green">
            <BadgeCheck className="h-3.5 w-3.5" /> {t('product.verifiedOwner')}
          </Badge>
        ) : (
          <Badge tone="gray">{t('product.notVerified')}</Badge>
        )}
        {owner.city && (
          <Badge tone="gray">
            <MapPin className="h-3.5 w-3.5" /> {owner.city}
          </Badge>
        )}
        <Badge tone="gray">{t('product.activeListings', { count: owner.activeListings ?? 0 })}</Badge>
      </div>
      <Link to={`/users/${owner._id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        {t('product.ownerProfile')} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data, error, loading, reload } = useApi(() => api.get(`/products/${id}`), [id]);
  const similar = useApi(() => api.get(`/products/${id}/similar`), [id]);
  const booked = useApi(() => api.get(`/products/${id}/booked`), [id]);

  if (loading) {
    return (
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-page py-16">
        {error.response?.status === 404 ? (
          <EmptyState icon={Store} title={t('product.notFound')} action={<Button to="/catalog">{t('nav.catalog')}</Button>} />
        ) : (
          <ErrorState message={errorMessage(error)} onRetry={reload} />
        )}
      </div>
    );
  }

  const p = data.product;
  const { prices, availability: av, delivery } = p;

  return (
    <div className="container-page py-6 sm:py-8">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">{t('nav.home')}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/catalog" className="hover:text-primary">{t('nav.catalog')}</Link>
        {p.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/catalog?category=${p.category.slug}`} className="hover:text-primary">{catName(p.category)}</Link>
          </>
        )}
      </nav>

      {p.isOwner && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-primary">
            {t('product.yourListing')}
            {p.status === 'draft' && ` · ${t('product.statusDraft')}`}
            {p.status === 'paused' && ` · ${t('product.statusPaused')}`}
          </p>
          <div className="flex gap-2">
            <Button to={`/listings/${p._id}/edit`} size="sm">
              <Pencil className="h-4 w-4" /> {t('product.editListing')}
            </Button>
            <Button to="/dashboard/listings" size="sm" variant="outline">{t('product.manageListing')}</Button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column */}
        <div className="min-w-0">
          <ImageGallery
            images={p.images}
            title={p.title}
            initialIndex={p.coverIndex}
            badges={p.isDemo ? <Badge tone="dark">{t('common.demoListing')}</Badge> : null}
          />

          {/* Title block on mobile */}
          <div className="mt-6 lg:hidden">
            <TitleBlock p={p} />
          </div>

          <div className="card mt-6 p-5 sm:p-7">
            <Section title={t('product.description')}>
              <p className="whitespace-pre-line leading-relaxed text-ink/85">{p.description}</p>
              {p.isDemo && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-cream px-3 py-2.5 text-sm text-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t('product.demoNotice')}
                </p>
              )}
            </Section>

            {p.specifications?.length > 0 && (
              <Section title={t('product.specs')}>
                <dl className="overflow-hidden rounded-2xl border border-line">
                  <div className="flex border-b border-line bg-cream/60 px-4 py-2.5 text-sm last:border-0">
                    <dt className="w-1/2 text-muted">{t('product.condition')}</dt>
                    <dd className="w-1/2 font-semibold">{t(`product.cond_${p.condition}`)}</dd>
                  </div>
                  {p.specifications.map((s, i) => (
                    <div key={`${s.key}-${i}`} className="flex border-b border-line px-4 py-2.5 text-sm odd:bg-cream/60 last:border-0">
                      <dt className="w-1/2 text-muted">{s.key}</dt>
                      <dd className="w-1/2 font-semibold">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {p.usageInfo && (
              <Section title={t('product.usage')} icon={Info}>
                <p className="whitespace-pre-line leading-relaxed text-ink/85">{p.usageInfo}</p>
              </Section>
            )}

            {p.accessories?.length > 0 && (
              <Section title={t('product.accessories')} icon={PackageCheck}>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {p.accessories.map((a) => (
                    <li key={a} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {a}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t('product.location')} icon={MapPin}>
              <p className="mb-3 font-semibold">
                {p.location.city}
                {p.location.region && <span className="font-normal text-muted"> · {p.location.region}</span>}
              </p>
              {p.location.pickupInstructions && (
                <div className="mb-3 rounded-xl bg-cream px-4 py-3 text-sm">
                  <p className="font-bold">{t('product.pickupInstructions')}</p>
                  <p className="mt-1 text-ink/80">{p.location.pickupInstructions}</p>
                </div>
              )}
              <LocationMap lat={p.location.lat} lng={p.location.lng} approximate={!p.isOwner} />
              {!p.isOwner && <p className="help mt-2">{t('product.approxLocation')}</p>}
            </Section>

            {booked.data?.items?.length > 0 && (
              <Section title={t('product.bookedPeriods')} icon={CalendarDays}>
                <ul className="space-y-1.5 text-sm">
                  {booked.data.items.map((b) => (
                    <li key={b.startAt} className="rounded-xl bg-amber-50 px-3 py-2 font-medium text-amber-800">
                      {formatRange(b.startAt, b.endAt)}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {p.imageCredits?.length > 0 && (
              <Section title={t('product.imageCredits')}>
                <ul className="space-y-1 text-xs text-muted">
                  {p.imageCredits.map((c, i) => (
                    <li key={i}>
                      {t('product.photo', { n: i + 1 })}: {c.creator} ·{' '}
                      <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline hover:text-primary">
                        {c.license}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>

        {/* Right column */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">
            <TitleBlock p={p} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-extrabold">{t('product.prices')}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {prices.hourly ? <PriceTile label={t('product.hourly')} value={prices.hourly} unit={t('common.perHour')} /> : null}
              <PriceTile label={t('product.daily')} value={prices.daily} unit={t('common.perDay')} highlight />
              {prices.weekly ? <PriceTile label={t('product.weekly')} value={prices.weekly} unit={t('common.perWeek')} /> : null}
              <div className="rounded-2xl border border-dashed border-line p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t('product.deposit')}
                </p>
                <p className="mt-0.5 font-extrabold">{prices.deposit ? money(prices.deposit) : '0'}</p>
                <p className="text-[11px] text-muted">{prices.deposit ? t('product.depositHint') : t('product.noDeposit')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p className={`flex items-center gap-2 font-semibold ${av.isAvailable ? 'text-primary' : 'text-warn'}`}>
                <Clock className="h-4 w-4" />
                {av.isAvailable ? t('product.available') : t('product.unavailable')}
                {av.availableFrom && <span className="font-normal text-muted">{t('product.availableFrom', { date: formatDate(av.availableFrom) })}</span>}
                {av.availableTo && <span className="font-normal text-muted">{t('product.availableUntil', { date: formatDate(av.availableTo) })}</span>}
              </p>
              {delivery.pickup && (
                <p className="flex items-center gap-2 text-ink/80">
                  <Store className="h-4 w-4 text-primary" /> {t('product.pickupAvailable')}
                </p>
              )}
              {delivery.delivery && (
                <p className="flex items-center gap-2 text-ink/80">
                  <Truck className="h-4 w-4 text-primary" />
                  {delivery.deliveryFee ? t('product.deliveryAvailable', { fee: money(delivery.deliveryFee) }) : t('product.deliveryFree')}
                  {delivery.note && <span className="text-muted">· {delivery.note}</span>}
                </p>
              )}
            </div>
          </div>

          {!p.isOwner && p.status === 'active' && <RentalPanel product={p} />}
          {p.owner && <OwnerCard owner={p.owner} />}
        </aside>
      </div>

      {(similar.loading || similar.data?.items?.length > 0) && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold">{t('product.similar')}</h2>
          <ProductGrid products={similar.data?.items?.slice(0, 4) || []} loading={similar.loading} skeletons={4} />
        </section>
      )}
    </div>
  );
}

function TitleBlock({ p }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          {p.category && (
            <Link to={`/catalog?category=${p.category.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
              <CategoryIcon name={p.category.icon} className="h-4 w-4" /> {catName(p.category)}
            </Link>
          )}
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{p.title}</h1>
        </div>
        {!p.isOwner && <FavoriteButton productId={p._id} size="lg" className="shrink-0 border-line" />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge tone="green">{t(`product.cond_${p.condition}`)}</Badge>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-4 w-4" /> {p.location.city}
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="h-4 w-4" /> {t('product.views', { count: p.views })}
        </span>
      </div>
    </div>
  );
}
