import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fades/slides its content in the first time it scrolls into view. */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${shown ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Counts from 0 up to `value` with an ease-out curve. */
export function CountUp({ value = 0, duration = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value || prefersReducedMotion()) {
      setN(value || 0);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round((1 - (1 - p) ** 3) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

/** Splits text into words that rise into place one after another. */
export function RisingWords({ text, className = '', baseDelay = 0, step = 70 }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden>
          {i > 0 && ' '}
          <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <span className="inline-block animate-rise" style={{ animationDelay: `${baseDelay + i * step}ms` }}>
              {word}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}
