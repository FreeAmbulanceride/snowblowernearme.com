


// /js/link-resolver.js
// Geo-aware resolver + Amazon tag enforcement (US: snowme-20, CA: cansnowme-20)

const AMAZON_TAGS = {
  'amazon.com': 'snowme-20',
  'www.amazon.com': 'snowme-20',
  'amazon.ca':  'cansnowme-20',
  'www.amazon.ca': 'cansnowme-20'
};
const FALLBACK = {
  US: 'https://www.amazon.com/s?k=snow+blower',
  CA: 'https://www.amazon.ca/s?k=snow+blower'
};

function ensureAmazonTag(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (host.includes('amazon.')) {
      const TAGS = {
        'amazon.com': 'snowme-20',
        'www.amazon.com': 'snowme-20',
        'amazon.ca':  'cansnowme-20',
        'www.amazon.ca': 'cansnowme-20'
      };
      url.searchParams.set('tag', TAGS[host] || TAGS['amazon.com']);
    }
    return url.toString();
  } catch { return u; }
}

function getCountry() {
  const qp = new URLSearchParams(location.search).get('country');
  if (qp && /^(US|CA)$/i.test(qp)) { localStorage.setItem('sbnm_country', qp.toUpperCase()); return qp.toUpperCase(); }
  const saved = localStorage.getItem('sbnm_country'); if (saved) return saved;
  const lang = (navigator.language||'').toLowerCase();
  if (lang.includes('-ca')) return 'CA';
  if (lang.includes('-us')) return 'US';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (/Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns/i.test(tz)) return 'CA';
  return 'US';
}

async function loadManifest() {
  try {
    const res = await fetch('/link_manifest.json', {cache:'no-store'});
    if (!res.ok) throw new Error('manifest fetch failed');
    return await res.json();
  } catch { return []; }
}

function pickBest(destinations, country) {
  const byGeo = destinations.filter(d => !d.geo || d.geo.includes(country));
  const list = (byGeo.length ? byGeo : destinations).slice()
               .sort((a,b)=>(a.priority??99)-(b.priority??99));
  return list[0]?.url || null;
}

/** Public: hydrate all CTAs on the page */
export async function wireCTAs() {
  const ctAs = Array.from(document.querySelectorAll('a.cta'));
  if (!ctAs.length) return;

  const country = getCountry();
  const manifest = await loadManifest();

  const byId = new Map(manifest.map(m => [m.id, m]));
  const byModel = new Map(manifest.map(m => [m.model, m])); // legacy fallback

  for (const a of ctAs) {
    const id = a.dataset.id || null;
    const model = a.dataset.model || null;

    const entry = (id && byId.get(id)) || (model && byModel.get(model));
    let url = entry ? pickBest(entry.destinations || [], country) : null;
    if (!url) url = FALLBACK[country] || FALLBACK.US;
    a.href = ensureAmazonTag(url);
    a.setAttribute('rel','sponsored nofollow noopener');
    a.setAttribute('target','_blank');
  }
}

// also attach a global fallback (handy for debugging without modules)
window.__wireCTAs = wireCTAs;
