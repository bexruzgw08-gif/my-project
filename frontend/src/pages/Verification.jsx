import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Clock, FlaskConical, Lock, ShieldCheck, ShieldX } from 'lucide-react';
import { api, errorMessage, unwrap } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { formatDateTime } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, ErrorState, Field, PageLoader } from '../components/ui/index.jsx';

const STATUS_UI = {
  not_started: { icon: ShieldCheck, tone: 'gray' },
  pending: { icon: Clock, tone: 'amber' },
  verified: { icon: BadgeCheck, tone: 'green' },
  rejected: { icon: ShieldX, tone: 'red' },
};

/** Only allow internal redirect targets. */
const safeNext = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : null);

export default function Verification() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { data, error, loading, reload, setData } = useApi(() => api.get('/verification/me'), []);
  const [reviewing, setReviewing] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { documentType: 'passport', documentLast4: '', fullNameOnDocument: '', birthYear: '', consent: false } });

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="container-page max-w-xl py-16">
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      </div>
    );
  }

  const v = data.verification;
  const ui = STATUS_UI[v.status];

  const submit = async (values) => {
    try {
      const d = await unwrap(api.post('/verification/submit', { ...values, birthYear: Number(values.birthYear) }));
      setData(d);
      await refresh();
      toast.success(t('verification.submitted'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const demoReview = async (decision) => {
    setReviewing(decision);
    try {
      const d = await unwrap(api.post('/verification/demo-review', { decision }));
      setData(d);
      await refresh();
      toast[decision === 'approve' ? 'success' : 'info'](t(`verification.status_${d.verification.status}`));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReviewing(null);
    }
  };

  const maxYear = new Date().getFullYear() - 16;

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('verification.title')}</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold tracking-wide text-amber-800">
          <FlaskConical className="h-3.5 w-3.5" /> {t('verification.demoBadge')}
        </span>
      </div>
      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t('verification.demoExplain')}</p>

      <div className="card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ui.icon className="h-6 w-6" />
          </span>
          <div>
            <Badge tone={ui.tone}>{t(`verification.status_${v.status}`)}</Badge>
            {v.submittedAt && <p className="mt-1 text-xs text-muted">{formatDateTime(v.submittedAt)}</p>}
          </div>
        </div>
        {v.status === 'verified' && next && <Button to={next}>{t('verification.continueTo')}</Button>}
      </div>

      {v.status === 'verified' && <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 font-semibold text-primary">{t('verification.verifiedText')}</p>}

      {v.status === 'pending' && (
        <div className="card mt-4 p-5">
          <p className="text-[15px]">{t('verification.pendingText')}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => demoReview('approve')} loading={reviewing === 'approve'} disabled={Boolean(reviewing) || !v.demoReviewEnabled}>
              <BadgeCheck className="h-4 w-4" /> {t('verification.demoApprove')}
            </Button>
            <Button variant="danger-outline" onClick={() => demoReview('reject')} loading={reviewing === 'reject'} disabled={Boolean(reviewing) || !v.demoReviewEnabled}>
              {t('verification.demoReject')}
            </Button>
          </div>
        </div>
      )}

      {(v.status === 'not_started' || v.status === 'rejected') && (
        <form onSubmit={handleSubmit(submit)} className="card mt-4 space-y-4 p-5 sm:p-6" noValidate>
          {v.status === 'rejected' && <p className="rounded-xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{t('verification.rejectedText')}</p>}
          <Field label={t('verification.documentType')}>
            {(id) => (
              <select id={id} className="input" {...register('documentType')}>
                {['passport', 'id_card', 'driver_license'].map((d) => (
                  <option key={d} value={d}>
                    {t(`verification.doc_${d}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('verification.last4')} error={errors.documentLast4?.message}>
              {(id) => (
                <input
                  id={id}
                  maxLength={4}
                  autoComplete="off"
                  className={`input uppercase tracking-[0.3em] ${errors.documentLast4 ? 'input-error' : ''}`}
                  {...register('documentLast4', { required: t('validation.required'), pattern: { value: /^[A-Za-z0-9]{4}$/, message: t('validation.last4') } })}
                />
              )}
            </Field>
            <Field label={t('verification.birthYear')} error={errors.birthYear?.message}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1900}
                  max={maxYear}
                  className={`input ${errors.birthYear ? 'input-error' : ''}`}
                  {...register('birthYear', { required: t('validation.required'), min: { value: 1900, message: '1900+' }, max: { value: maxYear, message: `≤ ${maxYear}` } })}
                />
              )}
            </Field>
          </div>
          <Field label={t('verification.nameOnDoc')} error={errors.fullNameOnDocument?.message}>
            {(id) => (
              <input
                id={id}
                className={`input ${errors.fullNameOnDocument ? 'input-error' : ''}`}
                {...register('fullNameOnDocument', { required: t('validation.required'), minLength: { value: 2, message: t('validation.minLength', { n: 2 }) } })}
              />
            )}
          </Field>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-primary" {...register('consent', { validate: (x) => x || t('validation.required') })} />
            {t('verification.consent')}
          </label>
          {errors.consent && <p className="error-text">{errors.consent.message}</p>}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" /> {t('verification.privacyNote')}
          </p>
          <Button type="submit" loading={isSubmitting}>
            {t('verification.submit')}
          </Button>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-5">
          <p className="font-bold">{t('verification.whyTitle')}</p>
          <p className="mt-1 text-sm text-muted">{t('verification.whyText')}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-5">
          <p className="font-bold">{t('common.demo')}</p>
          <p className="mt-1 text-sm text-muted">{t('verification.realLater')}</p>
        </div>
      </div>
    </div>
  );
}
