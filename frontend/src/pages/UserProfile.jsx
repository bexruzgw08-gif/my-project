import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, MapPin, PackageOpen } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { formatDate } from '../lib/format.js';
import { Avatar, Badge, EmptyState, ErrorState, PageLoader } from '../components/ui/index.jsx';
import { ProductGrid } from '../components/product/index.jsx';

export default function UserProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data, error, loading, reload } = useApi(() => api.get(`/users/${id}`), [id]);

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="container-page max-w-xl py-16">
        <ErrorState message={errorMessage(error)} onRetry={reload} />
      </div>
    );
  }
  const { user, products } = data;
  return (
    <div className="container-page py-8">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={user.fullName} src={user.avatarUrl} size={80} />
        <div>
          <h1 className="text-2xl font-extrabold">{user.fullName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.verified ? (
              <Badge tone="green">
                <BadgeCheck className="h-3.5 w-3.5" /> {t('product.verifiedOwner')}
              </Badge>
            ) : (
              <Badge tone="gray">{t('product.notVerified')}</Badge>
            )}
            {user.city && (
              <Badge tone="gray">
                <MapPin className="h-3.5 w-3.5" /> {user.city}
              </Badge>
            )}
            <Badge tone="gray">{t('product.memberSince', { date: formatDate(user.memberSince, { month: 'long', year: 'numeric' }) })}</Badge>
          </div>
        </div>
      </div>
      <h2 className="mb-5 mt-10 text-xl font-extrabold">{t('product.activeListings', { count: products.length })}</h2>
      {products.length ? <ProductGrid products={products} /> : <EmptyState icon={PackageOpen} title={t('dashboard.emptyListings')} />}
    </div>
  );
}
