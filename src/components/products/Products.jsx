import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, ExternalLink, Star, ChevronDown, ChevronUp, Sparkles, Loader, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { conditionMeta } from '../../data/products';
import { getProductsByCondition } from '../../services/productService';

// ─────────────────────────────────────────────────────────────────────────────
// ProductImage — 3-tier fallback (primary → imageFallback → SVG placeholder)
// ─────────────────────────────────────────────────────────────────────────────
function ProductImage({ product }) {
  const [src,    setSrc]    = useState(product.image || product.imageFallback || '');
  const [tier,   setTier]   = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reset when product changes
  useEffect(() => {
    setSrc(product.image || product.imageFallback || '');
    setTier(0);
    setLoaded(false);
  }, [product.id, product.image]);

  const initials  = (product.brand || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bgHex     = (product.tagColor || '#4361ee').replace('#', '%23');
  const placeholder = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%23f0f4ff'/><rect x='140' y='70' width='120' height='150' rx='14' fill='${bgHex}18'/><text x='200' y='155' font-family='Arial' font-size='36' font-weight='700' fill='${bgHex}' text-anchor='middle'>${initials}</text><text x='200' y='240' font-family='Arial' font-size='11' fill='%23667799' text-anchor='middle'>${encodeURIComponent(product.brand || 'Product')}</text></svg>`;

  function handleError() {
    if (tier === 0 && product.imageFallback && product.imageFallback !== src) {
      setSrc(product.imageFallback);
      setTier(1);
    } else {
      setSrc(placeholder);
      setTier(2);
    }
  }

  // If no image URL at all, go straight to placeholder
  useEffect(() => {
    if (!src || src.trim() === '') {
      setSrc(placeholder);
      setTier(2);
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f0f4ff' }}>
      {!loaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        style={{
          width: '100%', height: '100%',
          objectFit: tier === 2 ? 'contain' : 'cover',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s, transform 0.4s',
          padding: tier === 2 ? 16 : 0,
        }}
        onMouseEnter={e => { if (tier !== 2) e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stars
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ r }) {
  const rounded = Math.round(Math.min(5, Math.max(0, r || 4)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12}
          style={{ color: i <= rounded ? '#f59e0b' : '#e2e8f0', fill: i <= rounded ? '#f59e0b' : 'none' }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 3 }}>
        {(r || 4.0).toFixed(1)} ({((r || 4) * 1000).toLocaleString('en-IN')}+)
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Card
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ p }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="product-card">
      {/* Image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
        <ProductImage product={p} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        {p.tag && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: `${p.tagColor || '#4361ee'}28`, color: p.tagColor || '#4361ee',
            border: `1px solid ${p.tagColor || '#4361ee'}50`,
            padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
            letterSpacing: '.04em', textTransform: 'uppercase', backdropFilter: 'blur(8px)',
          }}>
            {p.tag}
          </span>
        )}

        {p.discount && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(10,191,138,0.18)', color: '#089e73',
            border: '1px solid rgba(10,191,138,.35)',
            padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
            backdropFilter: 'blur(8px)',
          }}>
            {p.discount}
          </span>
        )}

        <span style={{
          position: 'absolute', bottom: 8, left: 10,
          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.95)',
          letterSpacing: '.02em', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          {p.brand}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            {p.category}
          </p>
          <h3 style={{
            fontWeight: 700, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.name}
          </h3>
        </div>

        <Stars r={p.rating} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>
            {p.price ? `₹${p.price}` : 'See price'}
          </span>
          {p.originalPrice && p.originalPrice !== p.price && (
            <span style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'line-through' }}>
              ₹{p.originalPrice}
            </span>
          )}
        </div>

        <div>
          <p style={{
            fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.description}
          </p>
          <button onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3 }}>
            {expanded ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />More</>}
          </button>
        </div>

        {p.keyIngredients && p.keyIngredients.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {p.keyIngredients.slice(0, 3).map(ing => (
              <span key={ing} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                {ing}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 'auto', paddingTop: 4 }}>
          <a href={p.buyLink} target="_blank" rel="noopener noreferrer"
            className="btn btn-primary" style={{ fontSize: 12, padding: '9px 8px', borderRadius: 10 }}>
            <ShoppingBag size={13} /> Amazon
          </a>
          <a href={p.flipkartLink} target="_blank" rel="noopener noreferrer"
            className="btn btn-outline" style={{ fontSize: 12, padding: '9px 8px', borderRadius: 10 }}>
            <ExternalLink size={13} /> Flipkart
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loading cards
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="product-card" style={{ padding: 0 }}>
      <div className="skeleton" style={{ height: 200, borderRadius: '20px 20px 0 0' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
        <div className="skeleton" style={{ height: 16, width: '90%' }} />
        <div className="skeleton" style={{ height: 16, width: '70%' }} />
        <div className="skeleton" style={{ height: 20, width: '40%' }} />
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 24, width: 70, borderRadius: 99 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
          <div className="skeleton" style={{ height: 36, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 36, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source badge — shows whether products came from API or local DB
// ─────────────────────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return null;

  const config = {
    api:   { icon: <Wifi   size={11} />, label: 'Live from Amazon',    color: '#089e73', bg: 'var(--teal-light)',  border: 'rgba(10,191,138,0.25)' },
    cache: { icon: <Wifi   size={11} />, label: 'Cached results',      color: '#089e73', bg: 'var(--teal-light)',  border: 'rgba(10,191,138,0.25)' },
    local: { icon: <WifiOff size={11}/>, label: 'Curated local picks', color: '#4361ee', bg: 'var(--blue-light)', border: 'var(--blue-mid)' },
    demo:  { icon: <WifiOff size={11}/>, label: 'Demo data',           color: '#b45309', bg: 'var(--amber-light)', border: 'rgba(245,158,11,0.25)' },
  }[source];

  if (!config) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
    }}>
      {config.icon} {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter tabs
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',      label: 'All',      emoji: '✨' },
  { key: 'dandruff', label: 'Dandruff', emoji: '⚠️' },
  { key: 'thinning', label: 'Thinning', emoji: '🔴' },
  { key: 'greasy',   label: 'Excess Oil', emoji: '🟠' },
  { key: 'healthy',  label: 'Healthy',  emoji: '✅' },
];

// Per-condition state cache (avoids re-fetching when switching tabs)
const conditionCache = {};

// ─────────────────────────────────────────────────────────────────────────────
// Condition section with async product loading
// ─────────────────────────────────────────────────────────────────────────────
function ConditionSection({ condition }) {
  const [products, setProducts] = useState(conditionCache[condition]?.products || null);
  const [source,   setSource]   = useState(conditionCache[condition]?.source   || null);
  const [loading,  setLoading]  = useState(!conditionCache[condition]);
  const [error,    setError]    = useState('');

  const meta = conditionMeta[condition];
  const ac   = meta?.color || '#4361ee';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getProductsByCondition(condition);
      conditionCache[condition] = result; // In-memory cache
      setProducts(result.products);
      setSource(result.source);
    } catch (e) {
      setError('Could not load products. Showing local recommendations.');
      console.error(e);
    }
    setLoading(false);
  }, [condition]);

  useEffect(() => {
    if (!conditionCache[condition]) load();
  }, [condition, load]);

  if (!meta) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Condition header */}
      <div className="au" style={{
        background: meta.lightBg,
        border: `1px solid ${meta.borderColor}`,
        borderRadius: 16, padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: `${ac}20`, border: `1px solid ${ac}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: ac }}>{meta.fullLabel}</span>
            <span>{meta.emoji}</span>
            <SourceBadge source={source} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
            {meta.advice}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {meta.tips.map(tip => (
              <span key={tip} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '4px 12px', borderRadius: 99,
                background: `${ac}12`, color: ac, border: `1px solid ${ac}25`,
              }}>
                <Sparkles size={10} /> {tip}
              </span>
            ))}
          </div>
        </div>
        {/* Refresh button */}
        <button
          onClick={() => { delete conditionCache[condition]; load(); }}
          disabled={loading}
          className="btn btn-ghost"
          style={{ padding: '7px', fontSize: 12, flexShrink: 0 }}
          title="Refresh products">
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </button>
      </div>

      {/* Error notice */}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, padding: '8px 12px', background: 'var(--amber-light)', borderRadius: 8 }}>
          ⚠️ {error}
        </p>
      )}

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
        {loading
          ? [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
          : (products || []).map(p => <ProductCard key={p.id} p={p} />)
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Products export
// ─────────────────────────────────────────────────────────────────────────────
export default function Products({ condition: init = null, inline = false }) {
  const [active, setActive] = useState(init || 'all');

  const conditions = active === 'all'
    ? ['dandruff', 'thinning', 'greasy', 'healthy']
    : [active];

  return (
    <div>
      {/* Page header */}
      {!inline && (
        <div className="au" style={{ marginBottom: 24 }}>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(22px,3vw,32px)', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Recommended Products
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
            Top Indian brands — Head & Shoulders, Mamaearth, Pilgrim, WOW, Dove, Indulekha & more.
          </p>

          {/* API setup hint */}
          {!import.meta.env.VITE_RAPIDAPI_KEY && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
              fontSize: 12, color: 'var(--blue-dark)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <Wifi size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>Live product API available.</strong> Add{' '}
                <code style={{ background: 'rgba(67,97,238,0.1)', padding: '1px 5px', borderRadius: 4 }}>VITE_RAPIDAPI_KEY=your_key</code>{' '}
                to <code style={{ background: 'rgba(67,97,238,0.1)', padding: '1px 5px', borderRadius: 4 }}>.env</code>{' '}
                to fetch real-time Amazon products.{' '}
                <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data"
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                  Get free key →
                </a>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {!inline && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }} className="au d1">
          {TABS.map(tab => {
            const isActive = active === tab.key;
            const meta = conditionMeta[tab.key];
            const ac = meta?.color || 'var(--blue)';
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)}
                className="btn"
                style={{
                  padding: '9px 18px', fontSize: 13,
                  background: isActive ? `${ac}12` : 'var(--surface)',
                  color:      isActive ? ac : 'var(--text-2)',
                  border:     isActive ? `1.5px solid ${ac}40` : '1px solid var(--border)',
                  transform:  isActive ? 'translateY(-1px)' : '',
                  boxShadow:  isActive ? `0 4px 12px ${ac}20` : 'none',
                }}>
                <span>{tab.emoji}</span> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Condition sections */}
      {conditions.map(cond => (
        <ConditionSection key={cond} condition={cond} />
      ))}
    </div>
  );
}
