import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CircleHelp, FileText, Lock, Mail, SearchX } from 'lucide-react';
import { Button, EmptyState } from '../components/ui/index.jsx';

function PageShell({ icon: Icon, title, intro, children }) {
  return (
    <div className="container-page max-w-3xl py-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Help() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(0);
  const faqs = [1, 2, 3, 4, 5, 6];
  return (
    <PageShell icon={CircleHelp} title={t('pages.helpTitle')} intro={t('pages.helpIntro')}>
      <div className="space-y-3">
        {faqs.map((n, i) => (
          <div key={n} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold"
            >
              {t(`pages.faq${n}q`)}
              <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <p className="animate-fade-in px-5 pb-5 text-[15px] leading-relaxed text-ink/80">{t(`pages.faq${n}a`)}</p>}
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/contact" variant="outline">
          <Mail className="h-4 w-4" /> {t('footer.contact')}
        </Button>
      </div>
    </PageShell>
  );
}

export function Contact() {
  const { t } = useTranslation();
  return (
    <PageShell icon={Mail} title={t('pages.contactTitle')} intro={t('pages.contactIntro')}>
      <div className="card p-6">
        <p className="text-sm font-semibold text-muted">{t('pages.contactEmail')}</p>
        <a href="mailto:hello@kerakbolsa.example" className="mt-1 inline-block text-lg font-bold text-primary hover:underline">
          hello@kerakbolsa.example
        </a>
        <p className="mt-4 text-sm text-muted">{t('pages.contactNote')}</p>
      </div>
    </PageShell>
  );
}

function ListPage({ icon, titleKey, bodyKey }) {
  const { t } = useTranslation();
  const body = t(bodyKey, { returnObjects: true });
  return (
    <PageShell icon={icon} title={t(titleKey)}>
      <div className="card space-y-4 p-6 text-[15px] leading-relaxed text-ink/85">
        {(Array.isArray(body) ? body : []).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </PageShell>
  );
}

export const Privacy = () => <ListPage icon={Lock} titleKey="pages.privacyTitle" bodyKey="pages.privacyBody" />;
export const Terms = () => <ListPage icon={FileText} titleKey="pages.termsTitle" bodyKey="pages.termsBody" />;

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container-page max-w-xl py-20">
      <EmptyState icon={SearchX} title={t('common.notFound')} text={t('common.notFoundText')} action={<Button to="/">{t('common.goHome')}</Button>} />
    </div>
  );
}
