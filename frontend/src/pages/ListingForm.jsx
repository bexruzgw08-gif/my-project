import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  ImagePlus,
  MapPin,
  Plus,
  Save,
  ShieldAlert,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api, errorMessage, fieldErrors, unwrap } from '../lib/api.js';
import { catName, money, toDateInput } from '../lib/format.js';
import { REGIONS, regionCenter } from '../lib/regions.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, Button, ConfirmDialog, ErrorState, Field, PageLoader } from '../components/ui/index.jsx';
import { CategoryIcon, ProductImage } from '../components/product/index.jsx';
import { LocationPicker } from '../components/map/index.jsx';

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];

const EMPTY = {
  title: '',
  category: '',
  description: '',
  condition: 'good',
  specifications: [],
  usageInfo: '',
  accessories: [],
  images: [],
  coverIndex: 0,
  prices: { hourly: '', daily: '', weekly: '', deposit: '' },
  location: { region: '', city: '', pickupInstructions: '', lat: null, lng: null },
  availability: { isAvailable: true, availableFrom: '', availableTo: '', note: '' },
  delivery: { pickup: true, delivery: false, deliveryFee: '', note: '' },
  rentalTerms: '',
  damagePolicy: '',
};

const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

function fromProduct(p) {
  return {
    title: p.title || '',
    category: p.category?._id || p.category || '',
    description: p.description || '',
    condition: p.condition || 'good',
    specifications: p.specifications || [],
    usageInfo: p.usageInfo || '',
    accessories: p.accessories || [],
    images: (p.images || []).map(({ url, publicId }) => ({ url, publicId })),
    coverIndex: p.coverIndex || 0,
    prices: {
      hourly: p.prices?.hourly ?? '',
      daily: p.prices?.daily ?? '',
      weekly: p.prices?.weekly ?? '',
      deposit: p.prices?.deposit ?? '',
    },
    location: { ...EMPTY.location, ...p.location },
    availability: {
      isAvailable: p.availability?.isAvailable ?? true,
      availableFrom: toDateInput(p.availability?.availableFrom),
      availableTo: toDateInput(p.availability?.availableTo),
      note: p.availability?.note || '',
    },
    delivery: { ...EMPTY.delivery, ...p.delivery, deliveryFee: p.delivery?.deliveryFee ?? '' },
    rentalTerms: p.rentalTerms || '',
    damagePolicy: p.damagePolicy || '',
  };
}

function toPayload(f) {
  return {
    title: f.title,
    category: f.category || null,
    description: f.description,
    condition: f.condition,
    specifications: f.specifications.filter((s) => s.key.trim() && s.value.trim()),
    usageInfo: f.usageInfo,
    accessories: f.accessories.filter(Boolean),
    images: f.images,
    coverIndex: f.coverIndex,
    prices: {
      hourly: numOrNull(f.prices.hourly),
      daily: numOrNull(f.prices.daily),
      weekly: numOrNull(f.prices.weekly),
      deposit: numOrNull(f.prices.deposit) ?? 0,
    },
    location: f.location,
    availability: {
      isAvailable: f.availability.isAvailable,
      availableFrom: f.availability.availableFrom || null,
      availableTo: f.availability.availableTo || null,
      note: f.availability.note,
    },
    delivery: { ...f.delivery, deliveryFee: numOrNull(f.delivery.deliveryFee) ?? 0 },
    rentalTerms: f.rentalTerms,
    damagePolicy: f.damagePolicy,
  };
}

/** Mirrors the server's publish checks so the user sees problems early (the server still decides). */
function missingFields(f) {
  const m = [];
  if (f.title.trim().length < 3) m.push('title');
  if (!f.category) m.push('category');
  if (f.description.trim().length < 20) m.push('description');
  if (!f.images.length) m.push('images');
  if (!(Number(f.prices.daily) > 0)) m.push('prices_daily');
  if (!f.location.region) m.push('location_region');
  if (!f.location.city.trim()) m.push('location_city');
  if (f.location.lat == null || f.location.lng == null) m.push('location_coordinates');
  if (!f.delivery.pickup && !f.delivery.delivery) m.push('delivery');
  if (f.availability.availableFrom && f.availability.availableTo && f.availability.availableTo < f.availability.availableFrom) m.push('availability_dates');
  return m;
}

const STEP_FIELDS = [
  ['title', 'category', 'description'],
  ['images'],
  ['prices_daily'],
  ['location_region', 'location_city', 'location_coordinates'],
  ['delivery', 'availability_dates'],
  [],
];

function MoneyInput({ value, onChange, id, invalid }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        className={`input pr-14 ${invalid ? 'input-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder="0"
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{t('common.currency')}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-3">
      <span className="font-semibold">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-accent" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('draft');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step ?? 0);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [storageMode, setStorageMode] = useState(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [accessoryDraft, setAccessoryDraft] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cats = await unwrap(api.get('/categories'));
        if (!alive) return;
        setCategories(cats.items);
        if (isEdit) {
          const d = await unwrap(api.get(`/products/${id}`));
          if (!d.product.isOwner) throw Object.assign(new Error('forbidden'), { response: { status: 403, data: { error: { code: 'FORBIDDEN', message: 'Forbidden' } } } });
          if (!alive) return;
          setForm(fromProduct(d.product));
          setStatus(d.product.status);
        }
      } catch (err) {
        if (alive) setLoadError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const missing = useMemo(() => missingFields(form), [form]);
  const verified = user?.verificationStatus === 'verified';

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const updateGroup = (group, patch) => {
    setForm((f) => ({ ...f, [group]: { ...f[group], ...patch } }));
    setDirty(true);
  };
  const err = (field) => (showErrors && missing.includes(field) ? t(`listing.field_${field}`) : serverErrors[field.replace('_', '.')] || '');

  const save = async ({ publish = false } = {}) => {
    setSaving(true);
    setServerErrors({});
    try {
      const body = { ...toPayload(form), ...(publish ? { publish: true } : {}) };
      const d = isEdit ? await unwrap(api.patch(`/products/${id}`, body)) : await unwrap(api.post('/products', body));
      setDirty(false);
      setStatus(d.product.status);
      if (publish) {
        toast.success(t('listing.published'));
        navigate(`/products/${d.product._id}`);
      } else {
        toast.success(t(d.product.status === 'draft' ? 'listing.draftSaved' : 'listing.saved'));
        if (!isEdit) navigate(`/listings/${d.product._id}/edit`, { replace: true, state: { step } });
      }
      return d.product;
    } catch (e) {
      setServerErrors(fieldErrors(e));
      setShowErrors(true);
      toast.error(errorMessage(e));
      return null;
    } finally {
      setSaving(false);
      setConfirmPublish(false);
    }
  };

  const goVerify = async () => {
    const saved = await save();
    const target = saved ? `/listings/${saved._id}/edit` : '/listings/new';
    navigate(`/verification?next=${encodeURIComponent(target)}`);
  };

  const next = () => {
    const blocking = STEP_FIELDS[step].filter((f) => missing.includes(f));
    if (blocking.length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onFiles = async (fileList) => {
    setUploadErr('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (form.images.length + files.length > MAX_IMAGES) {
      setUploadErr(t('listing.maxImages'));
      return;
    }
    const bad = files.find((f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      setUploadErr(t('errors.UPLOAD_ERROR'));
      return;
    }
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    setUploading(true);
    try {
      const d = await unwrap(api.post('/uploads/images', fd));
      setStorageMode(d.storage);
      setForm((f) => ({ ...f, images: [...f.images, ...d.images.map(({ url, publicId }) => ({ url, publicId }))] }));
      setDirty(true);
    } catch (e) {
      setUploadErr(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (i) => {
    setForm((f) => {
      const images = f.images.filter((_, idx) => idx !== i);
      let coverIndex = f.coverIndex;
      if (i === f.coverIndex) coverIndex = 0;
      else if (i < f.coverIndex) coverIndex -= 1;
      return { ...f, images, coverIndex };
    });
    setDirty(true);
  };

  if (loading) return <PageLoader />;
  if (loadError) {
    return (
      <div className="container-page max-w-xl py-16">
        <ErrorState message={errorMessage(loadError)} />
        <div className="mt-4 text-center">
          <Button to="/dashboard/listings" variant="outline">{t('nav.myListings')}</Button>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c._id === form.category);
  const cover = form.images[form.coverIndex] || form.images[0];

  return (
    <div className="container-page max-w-4xl py-8">
      <Link to="/dashboard/listings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> {t('nav.myListings')}
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{isEdit ? t('listing.titleEdit') : t('listing.titleNew')}</h1>
          <p className="mt-1 text-muted">{t('listing.subtitle')}</p>
        </div>
        {isEdit && <Badge tone={status === 'active' ? 'green' : status === 'paused' ? 'amber' : 'gray'}>{t(`dashboard.listingStatus_${status}`)}</Badge>}
      </div>

      {/* Step indicator */}
      <ol className="mb-6 grid grid-cols-6 gap-1.5 sm:gap-2">
        {STEP_KEYS.map((k, i) => {
          const hasMissing = showErrors && STEP_FIELDS[i].some((f) => missing.includes(f));
          return (
            <li key={k}>
              <button type="button" onClick={() => setStep(i)} className="w-full text-left" aria-current={i === step ? 'step' : undefined}>
                <span className={`block h-1.5 rounded-full transition ${i <= step ? 'bg-primary' : 'bg-line'} ${hasMissing ? '!bg-danger' : ''}`} />
                <span className={`mt-2 hidden text-xs font-bold sm:block ${i === step ? 'text-ink' : 'text-muted'}`}>
                  {i + 1}. {t(`listing.${k}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mb-4 text-sm font-bold text-primary sm:hidden">
        {step + 1}/6 · {t(`listing.${STEP_KEYS[step]}`)}
      </p>

      <div className="card animate-fade-in p-5 sm:p-7" key={step}>
        {/* STEP 1 — basics */}
        {step === 0 && (
          <div className="space-y-5">
            <Field label={t('listing.title')} error={err('title')}>
              {(fid) => (
                <input id={fid} className={`input ${err('title') ? 'input-error' : ''}`} maxLength={120} placeholder={t('listing.titlePh')} value={form.title} onChange={(e) => update({ title: e.target.value })} />
              )}
            </Field>
            <div>
              <span className="label">{t('listing.category')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => update({ category: c._id })}
                    aria-pressed={form.category === c._id}
                    className={`flex items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold transition ${
                      form.category === c._id ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:border-primary/40'
                    }`}
                  >
                    <CategoryIcon name={c.icon} className="h-5 w-5 shrink-0" />
                    {catName(c)}
                  </button>
                ))}
              </div>
              {err('category') && <p className="error-text">{err('category')}</p>}
            </div>
            <Field label={t('listing.description')} error={err('description')} help={t('listing.descriptionHint')}>
              {(fid) => (
                <textarea
                  id={fid}
                  rows={5}
                  maxLength={4000}
                  className={`input ${err('description') ? 'input-error' : ''}`}
                  placeholder={t('listing.descriptionPh')}
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              )}
            </Field>
            <div>
              <span className="label">{t('listing.condition')}</span>
              <div className="flex flex-wrap gap-2">
                {['new', 'like_new', 'good', 'fair'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ condition: c })}
                    aria-pressed={form.condition === c}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${form.condition === c ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:border-primary/40'}`}
                  >
                    {t(`product.cond_${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">
                {t('listing.specs')} <span className="font-normal text-muted">({t('common.optional')})</span>
              </span>
              <div className="space-y-2">
                {form.specifications.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      placeholder={t('listing.specKey')}
                      maxLength={60}
                      value={s.key}
                      onChange={(e) => update({ specifications: form.specifications.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)) })}
                    />
                    <input
                      className="input"
                      placeholder={t('listing.specValue')}
                      maxLength={200}
                      value={s.value}
                      onChange={(e) => update({ specifications: form.specifications.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                    />
                    <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => update({ specifications: form.specifications.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.specifications.length < 20 && (
                  <Button variant="soft" size="sm" onClick={() => update({ specifications: [...form.specifications, { key: '', value: '' }] })}>
                    <Plus className="h-4 w-4" /> {t('listing.addSpec')}
                  </Button>
                )}
              </div>
            </div>
            <Field label={t('listing.usageInfo')} optional>
              {(fid) => (
                <textarea id={fid} rows={3} maxLength={2000} className="input" placeholder={t('listing.usageInfoPh')} value={form.usageInfo} onChange={(e) => update({ usageInfo: e.target.value })} />
              )}
            </Field>
            <div>
              <span className="label">
                {t('listing.accessories')} <span className="font-normal text-muted">({t('common.optional')})</span>
              </span>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t('listing.accessoryPh')}
                  maxLength={120}
                  value={accessoryDraft}
                  onChange={(e) => setAccessoryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (accessoryDraft.trim() && form.accessories.length < 20) {
                        update({ accessories: [...form.accessories, accessoryDraft.trim()] });
                        setAccessoryDraft('');
                      }
                    }
                  }}
                />
                <Button
                  variant="soft"
                  disabled={!accessoryDraft.trim() || form.accessories.length >= 20}
                  onClick={() => {
                    update({ accessories: [...form.accessories, accessoryDraft.trim()] });
                    setAccessoryDraft('');
                  }}
                >
                  {t('listing.addAccessory')}
                </Button>
              </div>
              {form.accessories.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {form.accessories.map((a, i) => (
                    <span key={`${a}-${i}`} className="chip">
                      {a}
                      <button type="button" onClick={() => update({ accessories: form.accessories.filter((_, j) => j !== i) })} aria-label={t('common.delete')}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 — images */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold">{t('listing.images')}</h2>
              <p className="help">{t('listing.imagesHint')}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              disabled={uploading || form.images.length >= MAX_IMAGES}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition hover:border-accent hover:bg-accent-soft/30 disabled:opacity-60 ${
                err('images') ? 'border-danger' : 'border-line'
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                {uploading ? <Upload className="h-6 w-6 animate-bounce" /> : <ImagePlus className="h-6 w-6" />}
              </span>
              <span className="font-bold">{uploading ? t('listing.uploading') : t('listing.upload')}</span>
              <span className="text-xs text-muted">
                {form.images.length} / {MAX_IMAGES}
              </span>
            </button>
            {(uploadErr || err('images')) && <p className="error-text">{uploadErr || err('images')}</p>}
            {storageMode === 'local' && <p className="help">ℹ️ {t('listing.localStorageNote')}</p>}

            {form.images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((img, i) => (
                  <li key={img.url} className={`group relative overflow-hidden rounded-2xl border-2 ${i === form.coverIndex ? 'border-primary' : 'border-line'}`}>
                    <ProductImage src={img.url} alt="" className="aspect-square w-full" />
                    {i === form.coverIndex && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                        <Star className="h-3 w-3 fill-white" /> {t('listing.cover')}
                      </span>
                    )}
                    <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
                      {i !== form.coverIndex && (
                        <button type="button" onClick={() => update({ coverIndex: i })} className="flex-1 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-primary shadow-sm hover:bg-white">
                          {t('listing.setCover')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="ml-auto rounded-lg bg-white/95 p-1.5 text-danger shadow-sm hover:bg-white"
                        aria-label={t('listing.removeImage')}
                        title={t('listing.removeImage')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* STEP 3 — prices */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-muted">{t('listing.pricesHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('listing.daily')} error={err('prices_daily')}>
                {(fid) => <MoneyInput id={fid} value={form.prices.daily} invalid={Boolean(err('prices_daily'))} onChange={(v) => updateGroup('prices', { daily: v })} />}
              </Field>
              <Field label={t('listing.hourly')} optional>
                {(fid) => <MoneyInput id={fid} value={form.prices.hourly} onChange={(v) => updateGroup('prices', { hourly: v })} />}
              </Field>
              <Field label={t('listing.weekly')} optional>
                {(fid) => <MoneyInput id={fid} value={form.prices.weekly} onChange={(v) => updateGroup('prices', { weekly: v })} />}
              </Field>
              <Field label={t('listing.deposit')} optional help={t('listing.depositHint')}>
                {(fid) => <MoneyInput id={fid} value={form.prices.deposit} onChange={(v) => updateGroup('prices', { deposit: v })} />}
              </Field>
            </div>
          </div>
        )}

        {/* STEP 4 — location */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('listing.region')} error={err('location_region')}>
                {(fid) => (
                  <select
                    id={fid}
                    className={`input ${err('location_region') ? 'input-error' : ''}`}
                    value={form.location.region}
                    onChange={(e) => updateGroup('location', { region: e.target.value })}
                  >
                    <option value="">{t('listing.chooseRegion')}</option>
                    {REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t('listing.city')} error={err('location_city')}>
                {(fid) => (
                  <input
                    id={fid}
                    maxLength={80}
                    className={`input ${err('location_city') ? 'input-error' : ''}`}
                    value={form.location.city}
                    onChange={(e) => updateGroup('location', { city: e.target.value })}
                  />
                )}
              </Field>
            </div>
            <Field label={t('listing.pickupInstructions')} optional>
              {(fid) => (
                <textarea
                  id={fid}
                  rows={2}
                  maxLength={1000}
                  className="input"
                  placeholder={t('listing.pickupPh')}
                  value={form.location.pickupInstructions}
                  onChange={(e) => updateGroup('location', { pickupInstructions: e.target.value })}
                />
              )}
            </Field>
            <div>
              <span className="label">{t('listing.map')}</span>
              <p className="help mb-3 mt-0">{t('listing.mapHint')}</p>
              <LocationPicker
                value={{ lat: form.location.lat, lng: form.location.lng }}
                fallbackCenter={regionCenter(form.location.region)}
                onChange={({ lat, lng }) => updateGroup('location', { lat, lng })}
              />
              {err('location_coordinates') && <p className="error-text">{err('location_coordinates')}</p>}
            </div>
          </div>
        )}

        {/* STEP 5 — availability, delivery, terms */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">{t('listing.availability')}</h2>
              <Toggle checked={form.availability.isAvailable} onChange={(v) => updateGroup('availability', { isAvailable: v })} label={t('listing.isAvailable')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('listing.availableFrom')} optional>
                  {(fid) => <input id={fid} type="date" className="input" value={form.availability.availableFrom} onChange={(e) => updateGroup('availability', { availableFrom: e.target.value })} />}
                </Field>
                <Field label={t('listing.availableTo')} optional error={err('availability_dates')}>
                  {(fid) => (
                    <input
                      id={fid}
                      type="date"
                      className="input"
                      min={form.availability.availableFrom || undefined}
                      value={form.availability.availableTo}
                      onChange={(e) => updateGroup('availability', { availableTo: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">{t('listing.deliveryOptions')}</h2>
              <Toggle checked={form.delivery.pickup} onChange={(v) => updateGroup('delivery', { pickup: v })} label={t('listing.offerPickup')} />
              <Toggle checked={form.delivery.delivery} onChange={(v) => updateGroup('delivery', { delivery: v })} label={t('listing.offerDelivery')} />
              {err('delivery') && <p className="error-text">{err('delivery')}</p>}
              {form.delivery.delivery && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('listing.deliveryFee')}>
                    {(fid) => <MoneyInput id={fid} value={form.delivery.deliveryFee} onChange={(v) => updateGroup('delivery', { deliveryFee: v })} />}
                  </Field>
                  <Field label={t('listing.deliveryNote')} optional>
                    {(fid) => <input id={fid} className="input" maxLength={300} value={form.delivery.note} onChange={(e) => updateGroup('delivery', { note: e.target.value })} />}
                  </Field>
                </div>
              )}
            </div>
            <Field label={t('listing.rentalTerms')} optional>
              {(fid) => (
                <textarea id={fid} rows={4} maxLength={3000} className="input" placeholder={t('listing.rentalTermsPh')} value={form.rentalTerms} onChange={(e) => update({ rentalTerms: e.target.value })} />
              )}
            </Field>
            <Field label={t('listing.damagePolicy')} optional>
              {(fid) => (
                <textarea id={fid} rows={4} maxLength={3000} className="input" placeholder={t('listing.damagePolicyPh')} value={form.damagePolicy} onChange={(e) => update({ damagePolicy: e.target.value })} />
              )}
            </Field>
          </div>
        )}

        {/* STEP 6 — preview & publish */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-extrabold">{t('listing.preview')}</h2>
            <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                <ProductImage src={cover?.url} alt={form.title} className="aspect-[4/3] w-full" />
                <div className="p-3">
                  {category && <p className="text-xs font-bold uppercase text-primary/80">{catName(category)}</p>}
                  <p className="font-bold leading-snug">{form.title || '—'}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" /> {form.location.city || '—'}
                  </p>
                  {Number(form.prices.daily) > 0 && (
                    <p className="mt-2 font-extrabold">
                      {money(form.prices.daily)} <span className="text-sm font-normal text-muted">/ {t('common.perDay')}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {missing.length ? (
                  <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
                    <p className="flex items-center gap-2 font-bold text-danger">
                      <CircleAlert className="h-5 w-5" /> {t('listing.missingTitle')}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {missing.map((m) => (
                        <li key={m}>
                          <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => setStep(STEP_FIELDS.findIndex((s) => s.includes(m)))}>
                            • {t(`listing.field_${m}`)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-3 font-bold text-primary">
                    <Check className="h-5 w-5" /> {t('listing.readyToPublish')}
                  </p>
                )}
                <div className="rounded-2xl border border-line p-4">
                  <p className="text-sm font-semibold text-muted">{t('listing.verificationStatus')}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    {verified ? (
                      <Badge tone="green">
                        <BadgeCheck className="h-3.5 w-3.5" /> {t('verification.status_verified')} · {t('common.demo')}
                      </Badge>
                    ) : (
                      <>
                        <Badge tone="amber">
                          <ShieldAlert className="h-3.5 w-3.5" /> {t(`verification.status_${user?.verificationStatus || 'not_started'}`)}
                        </Badge>
                        <Button size="sm" variant="soft" onClick={goVerify} loading={saving}>
                          {t('listing.verifyToPublish')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => save()} loading={saving}>
            <Save className="h-4 w-4" /> {status === 'active' ? t('listing.saveChanges') : t('listing.saveDraft')}
          </Button>
        </div>
        {step < STEP_KEYS.length - 1 ? (
          <Button onClick={next}>
            {t('common.next')} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : status !== 'active' ? (
          <Button
            size="lg"
            disabled={!verified}
            onClick={() => {
              setShowErrors(true);
              if (!missing.length) setConfirmPublish(true);
            }}
          >
            {t('listing.publish')}
          </Button>
        ) : (
          <Button size="lg" onClick={() => save()} loading={saving}>
            {t('listing.saveChanges')}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmPublish}
        title={t('listing.publishConfirmTitle')}
        text={t('listing.publishConfirmText')}
        confirmLabel={t('listing.publish')}
        loading={saving}
        onConfirm={() => save({ publish: true })}
        onClose={() => setConfirmPublish(false)}
      />
    </div>
  );
}
