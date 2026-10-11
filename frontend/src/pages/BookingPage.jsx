import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Info, MapPin, ShieldCheck, Store, Truck } from 'lucide-react';
import { api, errorMessage, fieldErrors, unwrap } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { defaultWindow, formatRange, money } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, EmptyState, ErrorState, PageLoader, Skeleton } from '../components/ui/index.jsx';
import { ProductImage } from '../components/product/index.jsx';

const STEPS = ['period', 'price', 'confirm'];

function Stepper({ step }) {
  const { t } = useTranslation();
  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              i < step ? 'bg-accent text-white' : i === step ? 'bg-primary text-white' : 'bg-sand text-muted'
            }`}
          >
            {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`hidden text-sm font-semibold sm:inline ${i === step ? 'text-ink' : 'text-muted'}`}>{t(`booking.step_${s}`)}</span>
          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

function PriceBreakdown({ quote }) {
  const { t } = useTranslation();
  const Row = ({ label, value, strong, muted }) => (
    <div className={`flex items-center justify-between py-2 ${strong ? 'text-base font-extrabold' : 'text-sm'} ${muted ? 'text-muted' : ''}`}>
      <span>{label}</span>
      <span className={strong ? 'text-primary' : 'font-semibold'}>{value}</span>
    </div>
  );
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white px-4">
      <div className="py-2">
        {quote.lines.map((l) => (
          <Row key={l.unit} label={t(`booking.line_${l.unit}`, { qty: l.quantity, price: money(l.unitPrice) })} value={money(l.amount)} muted />
        ))}
      </div>
      <Row label={t('booking.rentalCost')} value={money(quote.rentalCost)} />
      {quote.deliveryFee > 0 && <Row label={t('booking.deliveryFee')} value={money(quote.deliveryFee)} />}
      <Row label={t('booking.serviceFee')} value={quote.serviceFee ? money(quote.serviceFee) : t('booking.free')} />
      <Row label={t('booking.total')} value={money(quote.total)} strong />
      <Row label={t('booking.deposit')} value={money(quote.deposit)} />
      <Row label={t('booking.dueAtPickup')} value={money(quote.dueAtPickup)} strong />
    </div>
  );
}

export default function BookingPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const productReq = useApi(() => api.get(`/products/${id}`), [id]);

  const initial = defaultWindow();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    start: params.get('start') || initial.start,
    end: params.get('end') || initial.end,
    deliveryMethod: 'pickup',
    deliveryAddress: '',
    message: '',
    acceptTerms: false,
  });
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const product = productReq.data?.product;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (product && product.delivery?.pickup === false) set('deliveryMethod', 'delivery');
  }, [product]);

  // Server-side quote whenever the period or method changes.
  useEffect(() => {
    if (!product) return undefined;
    if (new Date(form.end) <= new Date(form.start)) {
      setQuote(null);
      setQuoteErr(t('booking.invalidPeriod'));
      return undefined;
    }
    setQuoting(true);
    const timer = setTimeout(() => {
      unwrap(
        api.post('/bookings/quote', {
          productId: product._id,
          startAt: new Date(form.start).toISOString(),
          endAt: new Date(form.end).toISOString(),
          deliveryMethod: form.deliveryMethod,
        }),
      )
        .then((d) => {
          setQuote(d.quote);
          setQuoteErr(d.quote.available ? '' : t('product.datesUnavailable'));
        })
        .catch((err) => {
          setQuote(null);
          setQuoteErr(errorMessage(err));
        })
        .finally(() => setQuoting(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [product, form.start, form.end, form.deliveryMethod, t]);

  if (productReq.loading) return <PageLoader />;
  if (productReq.error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={errorMessage(productReq.error)} onRetry={productReq.reload} />
      </div>
    );
  }

  if (product.isOwner) {
    return (
      <div className="container-page max-w-xl py-16">
        <EmptyState icon={Info} title={t('booking.ownYourItem')} action={<Button to={`/products/${id}`}>{t('booking.backToProduct')}</Button>} />
      </div>
    );
  }

  if (user.verificationStatus !== 'verified') {
    const next = location.pathname + location.search;
    return (
      <div className="container-page max-w-xl py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">{t('booking.verificationNeeded')}</h1>
          <p className="mt-2 text-muted">{t('booking.verificationNeededText')}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button to={`/verification?next=${encodeURIComponent(next)}`}>{t('booking.verifyNow')}</Button>
            <Button to={`/products/${id}`} variant="outline">{t('booking.backToProduct')}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page max-w-xl py-16">
        <div className="card animate-slide-up p-8 text-center">
          <span className="relative mx-auto flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-accent text-white [animation-delay:150ms]">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 [animation-iteration-count:2]" />
            <CheckCircle2 className="relative h-9 w-9" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">{t('booking.successTitle')}</h1>
          <p className="mt-2 text-muted">{t('booking.successText')}</p>
          <div className="mt-6 rounded-2xl bg-cream p-4 text-left text-sm">
            <p className="font-bold">{done.productSnapshot.title}</p>
            <p className="mt-1 text-muted">{formatRange(done.startAt, done.endAt)}</p>
            <p className="mt-1 font-semibold text-primary">{money(done.pricing.total)}</p>
          </div>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button to="/dashboard/requests">{t('booking.goToRequests')}</Button>
            <Button to={`/products/${id}`} variant="outline">{t('booking.backToProduct')}</Button>
          </div>
        </div>
      </div>
    );
  }

  const validateStep0 = () => {
    const e = {};
    if (form.deliveryMethod === 'delivery' && form.deliveryAddress.trim().length < 5) e.deliveryAddress = t('validation.required');
    setErrors(e);
    return Object.keys(e).length === 0 && quote && !quoteErr;
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitErr('');
    try {
      const d = await unwrap(
        api.post('/bookings', {
          productId: product._id,
          startAt: new Date(form.start).toISOString(),
          endAt: new Date(form.end).toISOString(),
          deliveryMethod: form.deliveryMethod,
          deliveryAddress: form.deliveryAddress,
          message: form.message,
          acceptTerms: form.acceptTerms,
        }),
      );
      setDone(d.booking);
    } catch (err) {
      setSubmitErr(errorMessage(err));
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
    } finally {
      setSubmitting(false);
    }
  };

  const cover = product.images[product.coverIndex] || product.images[0];

  return (
    <div className="container-page max-w-5xl py-8">
      <Link to={`/products/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> {t('booking.backToProduct')}
      </Link>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t('booking.title')}</h1>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <Stepper step={step} />

          {step === 0 && (
            <div className="card animate-fade-in space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">{t('product.start')}</span>
                  <input type="datetime-local" className="input" value={form.start} onChange={(e) => set('start', e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">{t('product.end')}</span>
                  <input type="datetime-local" className="input" value={form.end} min={form.start} onChange={(e) => set('end', e.target.value)} />
                </label>
              </div>

              <fieldset>
                <legend className="label">{t('booking.method')}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { v: 'pickup', icon: Store, label: t('booking.pickup'), enabled: product.delivery.pickup !== false, extra: product.location.city },
                    {
                      v: 'delivery',
                      icon: Truck,
                      label: t('booking.delivery'),
                      enabled: product.delivery.delivery,
                      extra: product.delivery.deliveryFee ? money(product.delivery.deliveryFee) : t('booking.free'),
                    },
                  ]
                    .filter((o) => o.enabled)
                    .map((o) => (
                      <label
                        key={o.v}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition ${
                          form.deliveryMethod === o.v ? 'border-primary bg-primary-soft/50' : 'border-line hover:border-primary/40'
                        }`}
                      >
                        <input type="radio" name="method" className="sr-only" checked={form.deliveryMethod === o.v} onChange={() => set('deliveryMethod', o.v)} />
                        <o.icon className="h-5 w-5 text-primary" />
                        <span>
                          <span className="block font-bold">{o.label}</span>
                          <span className="text-xs text-muted">{o.extra}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>

              {form.deliveryMethod === 'delivery' && (
                <label className="block">
                  <span className="label">{t('booking.deliveryAddress')}</span>
                  <input
                    className={`input ${errors.deliveryAddress ? 'input-error' : ''}`}
                    placeholder={t('booking.deliveryAddressPh')}
                    value={form.deliveryAddress}
                    onChange={(e) => set('deliveryAddress', e.target.value)}
                  />
                  {errors.deliveryAddress && <p className="error-text">{errors.deliveryAddress}</p>}
                </label>
              )}

              <label className="block">
                <span className="label">
                  {t('booking.message')} <span className="font-normal text-muted">({t('common.optional')})</span>
                </span>
                <textarea rows={3} maxLength={1000} className="input" placeholder={t('booking.messagePh')} value={form.message} onChange={(e) => set('message', e.target.value)} />
              </label>

              {quoteErr && <p className="error-text">{quoteErr}</p>}
              <div className="flex justify-end">
                <Button onClick={() => validateStep0() && setStep(1)} disabled={quoting || !quote || Boolean(quoteErr)}>
                  {t('common.next')} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && quote && (
            <div className="animate-fade-in space-y-5">
              <div className="card p-5 sm:p-6">
                <h2 className="mb-3 font-extrabold">{t('booking.priceBreakdown')}</h2>
                <PriceBreakdown quote={quote} />
                <p className="mt-3 flex items-start gap-2 text-xs text-muted">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('booking.noPaymentNote')}
                </p>
              </div>
              <div className="card space-y-4 p-5 sm:p-6">
                <h2 className="font-extrabold">{t('booking.terms')}</h2>
                <div>
                  <p className="text-sm font-bold">{t('booking.rentalTerms')}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{product.rentalTerms || t('booking.noTerms')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{t('booking.damagePolicy')}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{product.damagePolicy || t('booking.noTerms')}</p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4 text-sm font-semibold">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-primary" checked={form.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} />
                  {t('booking.acceptTerms')}
                </label>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                </Button>
                <Button disabled={!form.acceptTerms} onClick={() => setStep(2)}>
                  {t('common.next')} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && quote && (
            <div className="card animate-fade-in p-5 sm:p-6">
              <h2 className="text-xl font-extrabold">{t('booking.confirmTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{t('booking.confirmText')}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <dt className="text-muted">{t('booking.period')}</dt>
                    <dd className="font-semibold">
                      {formatRange(form.start, form.end)} · {t('booking.durationHours', { count: quote.hours })}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {form.deliveryMethod === 'delivery' ? <Truck className="mt-0.5 h-4 w-4 text-primary" /> : <MapPin className="mt-0.5 h-4 w-4 text-primary" />}
                  <div>
                    <dt className="text-muted">{t('booking.method')}</dt>
                    <dd className="font-semibold">
                      {form.deliveryMethod === 'delivery' ? `${t('booking.delivery')}: ${form.deliveryAddress}` : `${t('booking.pickup')} · ${product.location.city}`}
                    </dd>
                  </div>
                </div>
                {form.message && (
                  <div className="rounded-xl bg-cream p-3">
                    <dt className="text-muted">{t('booking.message')}</dt>
                    <dd className="mt-0.5">{form.message}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-5">
                <PriceBreakdown quote={quote} />
              </div>
              {submitErr && <p className="error-text mt-3 text-sm">{submitErr}</p>}
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                </Button>
                <Button onClick={submit} loading={submitting}>
                  {submitting ? t('booking.submitting') : t('booking.submit')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <ProductImage src={cover?.url} alt={product.title} className="aspect-[16/10] w-full" />
            <div className="p-5">
              <p className="font-extrabold leading-snug">{product.title}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-4 w-4" /> {product.location.city}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-cream px-4 py-3">
                <span className="text-sm text-muted">{t('booking.total')}</span>
                {quoting ? <Skeleton className="h-6 w-24" /> : <span className="text-lg font-extrabold text-primary">{quote ? money(quote.total) : '—'}</span>}
              </div>
              {quote?.deposit > 0 && (
                <p className="mt-2 text-xs text-muted">
                  + {t('booking.deposit')}: {money(quote.deposit)}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
