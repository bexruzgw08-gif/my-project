import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bike, Camera, ChevronLeft, ChevronRight, Hammer, Heart, ImageOff, MapPin, Package, PartyPopper, Sprout, Tent } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { catName, money } from '../../lib/format.js';
import { Badge, Skeleton } from '../ui/index.jsx';
import { Reveal } from '../motion.jsx';

const ICONS = { Hammer, Camera, Sprout, PartyPopper, Tent, Bike, Package };
export function CategoryIcon({ name, className = 'h-5 w-5' }) {
  const Icon = ICONS[name] || Package;
  return <Icon className={className} />;
}

export function FavoriteButton({ productId, className = '', size = 'md' }) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useTranslation();
  const active = isFavorite(productId);
  const [pulse, setPulse] = useState(0);
  const dims = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPulse((n) => n + 1);
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={t(active ? 'product.removeFavorite' : 'product.addFavorite')}
      title={t(active ? 'product.removeFavorite' : 'product.addFavorite')}
      className={`inline-flex ${dims} items-center justify-center rounded-full border border-white/60 bg-white/90 text-ink shadow-sm backdrop-blur transition hover:scale-105 hover:text-danger ${className}`}
    >
      <Heart key={pulse} className={`h-[18px] w-[18px] transition ${active ? 'fill-danger text-danger' : ''} ${pulse ? 'animate-pop' : ''}`} />
    </button>
  );
}

export function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-sand text-muted ${className}`}>
        <ImageOff className="h-7 w-7" />
        <span className="text-xs">{t('common.noImage')}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** Shows the lowest offered unit price, e.g. "50 000 so‘m / kun". Never invents a price. */
export function PriceLine({ prices, className = '' }) {
  const { t } = useTranslation();
  if (!prices?.daily) return null;
  return (
    <div className={className}>
      <span className="text-lg font-extrabold text-ink">{money(prices.daily)}</span>
      <span className="text-sm text-muted"> / {t('common.perDay')}</span>
      {prices.hourly ? (
        <div className="text-xs text-muted">
          {money(prices.hourly)} / {t('common.perHour')}
        </div>
      ) : null}
    </div>
  );
}

export function ProductCard({ product }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <ProductImage src={product.coverImage} alt={product.title} className="h-full w-full transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isDemo && <Badge tone="dark">{t('common.demo')}</Badge>}
          {product.availability && !product.availability.isAvailable && <Badge tone="amber">{t('product.unavailable')}</Badge>}
        </div>
        {!product.isOwner && <FavoriteButton productId={product._id} className="absolute right-3 top-3" />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary/80">
            <CategoryIcon name={product.category.icon} className="h-3.5 w-3.5" />
            {catName(product.category)}
          </span>
        )}
        <h3 className="line-clamp-2 font-bold leading-snug text-ink group-hover:text-primary">{product.title}</h3>
        <div className="mt-1.5 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{product.location?.city || '—'}</span>
        </div>
        <div className="mt-auto pt-3">
          <PriceLine prices={product.prices} />
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-4 h-5 w-2/5" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, skeletons = 8, className = '' }) {
  const cls = `grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 ${className}`;
  if (loading) {
    return (
      <div className={cls}>
        {Array.from({ length: skeletons }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={cls}>
      {products.map((p, i) => (
        <Reveal key={p._id} delay={(i % 4) * 80}>
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
  );
}

export function ImageGallery({ images = [], title, initialIndex = 0, badges }) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(images.length - 1, 0)));
  const { t } = useTranslation();
  const count = images.length;
  const go = (d) => setIndex((i) => (i + d + count) % count);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-sand">
        <ProductImage key={index} src={images[index]?.url} alt={title} className="h-full w-full animate-fade-in" />
        {badges && <div className="absolute left-4 top-4 flex gap-2">{badges}</div>}
        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition hover:bg-white"
              aria-label={t('common.back')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition hover:bg-white"
              aria-label={t('common.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setIndex(i)}
              aria-label={t('product.photo', { n: i + 1 })}
              className={`relative h-18 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <ProductImage src={img.url} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
