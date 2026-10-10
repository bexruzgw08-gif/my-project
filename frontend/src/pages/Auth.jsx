import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LANGUAGES } from '../i18n/index.js';
import { api, errorMessage, fieldErrors, unwrap } from '../lib/api.js';
import { Button, Field, Logo, PageLoader } from '../components/ui/index.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthShell({ title, subtitle, children }) {
  const { t } = useTranslation();
  return (
    <div className="container-page grid min-h-[calc(100vh-72px)] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[32px] bg-primary p-10 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <Logo light />
          <h2 className="relative mt-10 text-3xl font-extrabold leading-tight">{t('auth.sideTitle')}</h2>
          <ul className="relative mt-6 space-y-3">
            {['sidePoint1', 'sidePoint2', 'sidePoint3'].map((k) => (
              <li key={k} className="flex items-center gap-3 text-lg">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {t(`auth.${k}`)}
              </li>
            ))}
          </ul>
          <div className="relative mt-10 grid grid-cols-3 gap-3">
            {['projector-1', 'bike-1', 'eventtent-1'].map((img) => (
              <img key={img} src={`/seed-images/${img}.jpg`} alt="" className="h-28 w-full rounded-2xl object-cover" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function PasswordInput({ id, error, register, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} className={`input pr-11 ${error ? 'input-error' : ''}`} {...register} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const { t } = useTranslation();
  const { login, isAuthed, ready } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [serverError, setServerError] = useState('');
  const authingRef = useRef(false);
  const [demoAvailable, setDemoAvailable] = useState(false);
  useEffect(() => {
    unwrap(api.get('/health'))
      .then((d) => setDemoAvailable(Boolean(d.demoAccounts)))
      .catch(() => {});
  }, []);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  if (!ready) return <PageLoader />;
  if (isAuthed && !authingRef.current) return <Navigate to={from} replace />;

  const onSubmit = async (values) => {
    setServerError('');
    authingRef.current = true;
    try {
      const user = await login(values);
      toast.success(t('auth.welcomeBack', { name: user.fullName }));
      navigate(from, { replace: true });
    } catch (err) {
      authingRef.current = false;
      setServerError(errorMessage(err));
    }
  };

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {location.state?.reason === 'login' && (
        <p className="mb-5 flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-primary">
          <Info className="h-4 w-4 shrink-0" /> {t('auth.loginRequired')}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={t('auth.email')} error={errors.email?.message}>
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              {...register('email', { required: t('validation.required'), pattern: { value: EMAIL_RE, message: t('validation.email') } })}
            />
          )}
        </Field>
        <Field label={t('auth.password')} error={errors.password?.message}>
          {(id) => (
            <PasswordInput id={id} autoComplete="current-password" error={errors.password} register={register('password', { required: t('validation.required') })} />
          )}
        </Field>
        {serverError && <p className="rounded-xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {t('auth.loginBtn')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" state={location.state} className="font-bold text-primary hover:underline">
          {t('nav.register')}
        </Link>
      </p>
      {demoAvailable && (
      <button
        type="button"
        onClick={() => {
          setValue('email', 'aziz.demo@kerakbolsa.uz');
          setValue('password', 'Demo12345');
        }}
        className="mt-6 w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-xs text-muted transition hover:border-accent hover:bg-white"
      >
        <span className="font-bold text-ink">{t('auth.demoHint')}</span> aziz.demo@kerakbolsa.uz / Demo12345
      </button>
      )}
    </AuthShell>
  );
}

export function Register() {
  const { t } = useTranslation();
  const { register: registerUser, isAuthed, ready } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const authingRef = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false } });

  if (!ready) return <PageLoader />;
  if (isAuthed && !authingRef.current) return <Navigate to="/" replace />;

  const onSubmit = async (values) => {
    setServerError('');
    authingRef.current = true;
    try {
      await registerUser(values);
      toast.success(t('auth.registered'));
      navigate('/welcome/language', { replace: true, state: { from: location.state?.from || '/dashboard' } });
    } catch (err) {
      const fe = fieldErrors(err);
      Object.entries(fe).forEach(([field, message]) => setError(field, { message }));
      authingRef.current = false;
      setServerError(errorMessage(err));
    }
  };

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={t('auth.fullName')} error={errors.fullName?.message}>
          {(id) => (
            <input
              id={id}
              autoComplete="name"
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              {...register('fullName', { required: t('validation.required'), minLength: { value: 2, message: t('validation.minLength', { n: 2 }) } })}
            />
          )}
        </Field>
        <Field label={t('auth.email')} error={errors.email?.message}>
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              {...register('email', { required: t('validation.required'), pattern: { value: EMAIL_RE, message: t('validation.email') } })}
            />
          )}
        </Field>
        <Field label={t('auth.password')} error={errors.password?.message} help={t('auth.passwordHint')}>
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              error={errors.password}
              register={register('password', {
                required: t('validation.required'),
                validate: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || t('validation.password'),
              })}
            />
          )}
        </Field>
        <Field label={t('auth.confirmPassword')} error={errors.confirmPassword?.message}>
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              error={errors.confirmPassword}
              register={register('confirmPassword', {
                required: t('validation.required'),
                validate: (v) => v === watch('password') || t('validation.passwordsMismatch'),
              })}
            />
          )}
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-primary" {...register('acceptTerms', { validate: (v) => v || t('validation.terms') })} />
            <span>
              {t('auth.acceptTermsPre')}{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-primary underline">
                {t('auth.termsLink')}
              </Link>{' '}
              {t('auth.acceptTermsAnd')}{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-primary underline">
                {t('auth.privacyLink')}
              </Link>{' '}
              {t('auth.acceptTermsPost')}
            </span>
          </label>
          {errors.acceptTerms && <p className="error-text">{errors.acceptTerms.message}</p>}
        </div>
        {serverError && <p className="rounded-xl bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {t('auth.registerBtn')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" state={location.state} className="font-bold text-primary hover:underline">
          {t('nav.login')}
        </Link>
      </p>
    </AuthShell>
  );
}

export function ChooseLanguage() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(i18n.language);
  const [saving, setSaving] = useState(false);

  const pick = (code) => {
    setSelected(code);
    i18n.changeLanguage(code);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setLanguage(selected);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md animate-slide-up p-8">
        <h1 className="text-2xl font-extrabold">{t('auth.chooseLanguageTitle')}</h1>
        <p className="mt-1 text-muted">{t('auth.chooseLanguageText')}</p>
        <div className="mt-6 space-y-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => pick(l.code)}
              aria-pressed={selected === l.code}
              className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-lg font-bold transition ${
                selected === l.code ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:border-primary/40'
              }`}
            >
              <span>
                <span className="mr-3 rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-muted">{l.short}</span>
                {l.label}
              </span>
              {selected === l.code && <Check className="h-5 w-5" />}
            </button>
          ))}
        </div>
        <Button size="lg" className="mt-6 w-full" onClick={save} loading={saving}>
          {t('auth.continue')}
        </Button>
      </div>
    </div>
  );
}
