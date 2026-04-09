import { productDatabase } from '../data/products';

// ── Search keywords per condition ─────────────────────────────────────────────
const SEARCH_QUERIES = {
  dandruff: 'anti dandruff shampoo India',
  thinning: 'hair growth oil India hair fall',
  greasy:   'oil control shampoo oily scalp India',
  healthy:  'hair care shampoo nourishing India',
};

// ── Cache TTL: 30 minutes ──────────────────────────────────────────────────────
const CACHE_TTL_MS = 30 * 60 * 1000;

// ── Blocklist: any product whose title or brand contains these will be removed ─
// Covers all possible encodings the API might return for "L'Oréal"
const BLOCKED_BRANDS = [
  'loreal',
  "l'oreal",
  "l'oréal",
  'l&#x27;oreal',
  'l&#39;oreal',
  'l&#x27;oréal',
  'loréal',
  'l oreal',
  'loreal paris',
  'loreal professionnel',
  'l\'oreal paris',
  'l\'oréal paris',
];

// Returns true if a RAW API product object should be blocked
function isBlockedProduct(raw) {
  const title = String(
    raw.product_title || raw.title || raw.name || raw.product_name || ''
  ).toLowerCase();
  const brand = String(
    raw.product_brand || raw.brand || raw.manufacturer || ''
  ).toLowerCase();
  const combined = title + ' ' + brand;
  return BLOCKED_BRANDS.some(blocked => combined.includes(blocked));
}

// Returns true if a NORMALISED product object should be blocked
// (used as a second safety net on cached results)
function isBlockedNormalised(product) {
  const name  = String(product.name  || '').toLowerCase();
  const brand = String(product.brand || '').toLowerCase();
  const combined = name + ' ' + brand;
  return BLOCKED_BRANDS.some(blocked => combined.includes(blocked));
}

// ── Cache helpers ──────────────────────────────────────────────────────────────
function getCached(key) {
  try {
    const raw = sessionStorage.getItem(`products_${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`products_${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    sessionStorage.setItem(
      `products_${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // sessionStorage may be full — silently skip
  }
}

// ── Wipe ALL cached product entries ───────────────────────────────────────────
export function clearProductCache() {
  ['dandruff', 'thinning', 'greasy', 'healthy'].forEach(key => {
    sessionStorage.removeItem(`products_${key}`);
  });
  console.log('🗑️ Product cache cleared');
}

// ── Helper: decode HTML entities like &#x27; → ' and &amp; → & ───────────────
function decodeHTML(str) {
  if (!str) return String(str ?? '');
  return String(str)
    .replace(/&#x27;/gi,  "'")
    .replace(/&#39;/gi,   "'")
    .replace(/&apos;/gi,  "'")
    .replace(/&quot;/gi,  '"')
    .replace(/&amp;/gi,   '&')
    .replace(/&lt;/gi,    '<')
    .replace(/&gt;/gi,    '>')
    .replace(/&#(\d+);/g,       (_, c)   => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ── Normalise a raw API product into our standard shape ───────────────────────
function normaliseProduct(raw, index, condition) {
  // ── RapidAPI "Real-Time Amazon Data" shape ────────────────────────────────
  if (raw.product_title !== undefined) {
    return {
      id:             `api_${condition}_${index}`,
      brand:          decodeHTML(raw.product_brand || extractBrand(raw.product_title)),
      name:           decodeHTML(raw.product_title || 'Hair Care Product'),
      shortName:      decodeHTML((raw.product_title || '').slice(0, 30)),
      image:          proxyImage(raw.product_photo || raw.product_main_image_url || ''),
      imageFallback:  localFallbackImage(condition, index),
      description:    decodeHTML(raw.product_description || raw.about_product || 'Quality hair care product.'),
      category:       CATEGORY_LABELS[condition] || 'Hair Care',
      rating:         parseFloat(raw.product_star_rating) || 4.0,
      reviews:        parseInt(String(raw.product_num_ratings || '0').replace(/,/g, '')) || 100,
      price:          extractPrice(raw.product_price || raw.typical_price_savings || ''),
      originalPrice:  extractPrice(raw.product_original_price || ''),
      discount:       raw.discount || raw.savings_percent || '',
      keyIngredients: extractIngredients(raw.product_title, condition),
      bestFor:        BEST_FOR[condition] || 'Hair Care',
      buyLink:        raw.product_url || raw.product_page_url || `https://www.amazon.in/s?k=${encodeURIComponent(raw.product_title || '')}`,
      flipkartLink:   `https://www.flipkart.com/search?q=${encodeURIComponent(raw.product_title || '')}`,
      tag:            raw.is_best_seller ? 'Best Seller' : (raw.is_amazon_choice ? "Amazon's Choice" : ''),
      tagColor:       '#f59e0b',
      _source:        'api',
    };
  }

  // ── Generic / unknown API shape ───────────────────────────────────────────
  return {
    id:             `api_${condition}_${index}`,
    brand:          decodeHTML(raw.brand || raw.manufacturer || extractBrand(raw.title || raw.name || '')),
    name:           decodeHTML(raw.title || raw.name || raw.product_name || 'Hair Care Product'),
    shortName:      decodeHTML((raw.title || raw.name || '').slice(0, 30)),
    image:          proxyImage(raw.image || raw.thumbnail || raw.img || raw.picture || ''),
    imageFallback:  localFallbackImage(condition, index),
    description:    decodeHTML(raw.description || raw.summary || raw.overview || 'Quality hair care product from a trusted Indian brand.'),
    category:       CATEGORY_LABELS[condition] || 'Hair Care',
    rating:         parseFloat(raw.rating || raw.stars || raw.score || '4.0') || 4.0,
    reviews:        parseInt(raw.reviews || raw.ratings_count || raw.review_count || '0') || 100,
    price:          extractPrice(raw.price || raw.cost || raw.mrp || ''),
    originalPrice:  extractPrice(raw.original_price || raw.mrp || ''),
    discount:       raw.discount || '',
    keyIngredients: extractIngredients(raw.title || raw.name || '', condition),
    bestFor:        BEST_FOR[condition] || 'Hair Care',
    buyLink:        raw.url || raw.link || raw.product_url || `https://www.amazon.in/s?k=${encodeURIComponent(SEARCH_QUERIES[condition])}`,
    flipkartLink:   `https://www.flipkart.com/search?q=${encodeURIComponent(SEARCH_QUERIES[condition])}`,
    tag:            '',
    tagColor:       '#4361ee',
    _source:        'api',
  };
}

// ── Helper: proxy image through wsrv.nl ───────────────────────────────────────
function proxyImage(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&h=300&fit=cover&output=webp`;
}

// ── Helper: fallback image from local DB ──────────────────────────────────────
function localFallbackImage(condition, index) {
  const local = productDatabase[condition] || [];
  return local[index % local.length]?.image || local[0]?.image || '';
}

// ── Helper: extract numeric price ─────────────────────────────────────────────
function extractPrice(priceStr) {
  if (!priceStr) return '';
  return String(priceStr).replace(/[^0-9.]/g, '') || '';
}

// ── Helper: extract brand from product title ──────────────────────────────────
function extractBrand(title) {
  if (!title) return 'Brand';
  const words = title.split(' ');
  const brands = [
    'mamaearth','himalaya','indulekha','parachute','wow','pilgrim',
    'dove','biotique','pantene','head','loreal','tresemme','garnier',
    'khadi','vatika','kesh','bajaj',
  ];
  const lower = title.toLowerCase();
  for (const b of brands) {
    if (lower.startsWith(b)) return words.slice(0, 2).join(' ');
  }
  return words[0] || 'Brand';
}

// ── Helper: suggest ingredients based on condition + title ────────────────────
function extractIngredients(title, condition) {
  const titleLower = (title || '').toLowerCase();
  const defaults = {
    dandruff: ['Zinc Pyrithione', 'Tea Tree Oil', 'Salicylic Acid'],
    thinning: ['Biotin', 'Bhringraj', 'Castor Oil'],
    greasy:   ['ACV', 'Salicylic Acid', 'Niacinamide'],
    healthy:  ['Argan Oil', 'Keratin', 'Pro-Vitamin B5'],
  };
  const detected = [];
  const checks = [
    ['onion',       'Onion Extract'],  ['tea tree',   'Tea Tree Oil'],
    ['argan',       'Argan Oil'],      ['keratin',    'Keratin'],
    ['biotin',      'Biotin'],         ['bhringraj',  'Bhringraj'],
    ['amla',        'Amla'],           ['neem',       'Neem'],
    ['coconut',     'Coconut Oil'],    ['rosemary',   'Rosemary'],
    ['ginger',      'Ginger'],         ['aloe',       'Aloe Vera'],
    ['zinc',        'Zinc'],           ['niacinamide','Niacinamide'],
    ['caffeine',    'Caffeine'],
  ];
  for (const [keyword, label] of checks) {
    if (titleLower.includes(keyword)) detected.push(label);
    if (detected.length >= 3) break;
  }
  return detected.length > 0 ? detected : (defaults[condition] || ['Natural Extracts']);
}

const CATEGORY_LABELS = {
  dandruff: 'Anti-Dandruff',
  thinning: 'Hair Growth',
  greasy:   'Oil Control',
  healthy:  'Hair Maintenance',
};

const BEST_FOR = {
  dandruff: 'Dandruff & Flaky Scalp',
  thinning: 'Hair Fall & Growth',
  greasy:   'Oily Scalp Control',
  healthy:  'Healthy Hair Maintenance',
};

// ─────────────────────────────────────────────────────────────────────────────
// ── API FETCHERS ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── OPTION A: RapidAPI Real-Time Amazon Data ──────────────────────────────────
async function fetchFromRapidAPIAmazon(condition) {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!apiKey || apiKey === 'your_rapidapi_key_here') {
    throw new Error('RAPIDAPI_KEY_MISSING');
  }

  const query = SEARCH_QUERIES[condition];
  const url   = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&country=IN&sort_by=RELEVANCE&product_condition=ALL`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com',
      'x-rapidapi-key':  apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`RapidAPI HTTP ${response.status}: ${response.statusText}`);
  }

  const data     = await response.json();
  const products = data?.data?.products || data?.products || [];

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products in RapidAPI response');
  }

  return products
    .filter(p => !isBlockedProduct(p))      // ← remove L'Oreal from raw API data
    .slice(0, 6)
    .map((p, i) => normaliseProduct(p, i, condition));
}

// ── OPTION B: RapidAPI Amazon Product Search (backup) ────────────────────────
async function fetchFromRapidAPIAmazonSearch(condition) {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!apiKey || apiKey === 'your_rapidapi_key_here') {
    throw new Error('RAPIDAPI_KEY_MISSING');
  }

  const query = SEARCH_QUERIES[condition];
  const url   = `https://amazon-product-search4.p.rapidapi.com/amazon/products?query=${encodeURIComponent(query)}&country=in&limit=6`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'amazon-product-search4.p.rapidapi.com',
      'x-rapidapi-key':  apiKey,
    },
  });

  if (!response.ok) throw new Error(`RapidAPI Search HTTP ${response.status}`);

  const data     = await response.json();
  const products = data?.products || data?.results || data?.data || [];

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products in RapidAPI Search response');
  }

  return products
    .filter(p => !isBlockedProduct(p))      // ← remove L'Oreal from raw API data
    .slice(0, 6)
    .map((p, i) => normaliseProduct(p, i, condition));
}

// ── OPTION C: Fake Store API (free, no key — for testing only) ────────────────
async function fetchFromFakeStore() {
  const response = await fetch('https://fakestoreapi.com/products?limit=6');
  if (!response.ok) throw new Error(`FakeStore HTTP ${response.status}`);
  const data = await response.json();
  return data.map((p, i) => ({
    id:             `fake_${i}`,
    brand:          'Demo Brand',
    name:           decodeHTML(p.title),
    shortName:      decodeHTML(p.title.slice(0, 30)),
    image:          p.image,
    imageFallback:  '',
    description:    decodeHTML(p.description),
    category:       'Hair Care Demo',
    rating:         p.rating?.rate || 4.0,
    reviews:        p.rating?.count || 100,
    price:          String(Math.round(p.price * 83)),
    originalPrice:  String(Math.round(p.price * 90)),
    discount:       '8% off',
    keyIngredients: ['Natural Extracts'],
    bestFor:        'General Hair Care',
    buyLink:        'https://www.amazon.in',
    flipkartLink:   'https://www.flipkart.com',
    tag:            '',
    tagColor:       '#4361ee',
    _source:        'demo',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN EXPORTED FUNCTION ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export async function getProductsByCondition(condition) {
  // 1. Always wipe old cache so previously stored L'Oreal entries are gone
  clearProductCache();

  // 2. Check cache (will always be empty after step 1 on first load after deploy)
  const cached = getCached(condition);
  if (cached) {
    console.log(`📦 Products from cache for: ${condition}`);
    // Second safety net: filter normalised cached products too
    return {
      products: cached.filter(p => !isBlockedNormalised(p)),
      source: 'cache',
    };
  }

  const hasRapidAPIKey = !!(
    import.meta.env.VITE_RAPIDAPI_KEY &&
    import.meta.env.VITE_RAPIDAPI_KEY !== 'your_rapidapi_key_here' &&
    import.meta.env.VITE_RAPIDAPI_KEY.length > 10
  );

  // 3. Try live API if key is present
  if (hasRapidAPIKey) {
    for (const fetcher of [fetchFromRapidAPIAmazon, fetchFromRapidAPIAmazonSearch]) {
      try {
        const products = await fetcher(condition);
        console.log(`🛒 Live API products fetched for: ${condition} (${products.length} items)`);
        setCache(condition, products);
        return { products, source: 'api' };
      } catch (err) {
        console.warn(`API fetcher failed: ${err.message} — trying next...`);
      }
    }
    console.warn('All API fetchers failed — falling back to local database');
  }

  // 4. Fall back to local productDatabase (always works, no network needed)
  const local = productDatabase[condition] || productDatabase.healthy || [];
  console.log(`📁 Using local product database for: ${condition} (${local.length} items)`);
  return { products: local, source: 'local' };
}

// Export individual API fetchers for direct use if needed
export { fetchFromRapidAPIAmazon, fetchFromRapidAPIAmazonSearch };
