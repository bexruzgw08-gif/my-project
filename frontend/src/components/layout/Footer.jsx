import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';
import { api, unwrap } from '../../lib/api.js';
import { Logo } from '../ui/index.jsx';

function FooterCol({ title, links }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">{title}</h3>
      <ul className="space-y-2">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-[15px] text-white/85 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const [dbMode, setDbMode] = useState(null);

  useEffect(() => {
    unwrap(api.get('/health'))
      .then((d) => setDbMode(d.database.mode))
      .catch(() => {});
  }, []);

  return (
    <footer className="mt-20 bg-primary-dark text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/75">{t('footer.about')}</p>
          <p className="mt-4 text-lg font-bold text-accent-soft">{t('common.slogan')}</p>
        </div>
        <FooterCol
          title={t('footer.explore')}
          links={[
            ['/', t('nav.home')],
            ['/catalog', t('nav.catalog')],
            ['/listings/new', t('nav.rentOut')],
          ]}
        />
        <FooterCol
          title={t('footer.account')}
          links={[
            ['/dashboard', t('nav.dashboard')],
            ['/dashboard/requests', t('nav.myRequests')],
            ['/dashboard/favorites', t('nav.favorites')],
          ]}
        />
        <FooterCol
          title={t('footer.support')}
          links={[
            ['/help', t('footer.help')],
            ['/contact', t('footer.contact')],
            ['/privacy', t('footer.privacy')],
            ['/terms', t('footer.terms')],
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KerakBo‘lsa. {t('footer.rights')}</p>
          {dbMode === 'local-dev' && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <Database className="h-3.5 w-3.5" /> {t('footer.demoDb')}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
