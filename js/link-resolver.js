


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


// --- Router Scoreboard Logging ---
function logMerchantClick(merchant, country) {
  try {
    const key = `sbnm_scoreboard_v1`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    const mkey = `${merchant}_${country}`;
    data[mkey] = data[mkey] || { clicks: 0 };
    data[mkey].clicks += 1;
    localStorage.setItem(key, JSON.stringify(data));
    // Also fire a custom event for analytics if needed
    window.dispatchEvent(new CustomEvent('merchant_click', { detail: { merchant, country } }));
  } catch(e){}
}

function getScoreboard(country) {
  try {
    const key = `sbnm_scoreboard_v1`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    // Compute pseudo-EPC (clicks only, no revenue)
    const out = {};
    for (const k in data) {
      if (k.endsWith(`_${country}`)) {
        const merchant = k.replace(`_${country}`, '');
        out[merchant] = data[k].clicks || 0;
      }
    }
    return out;
  } catch { return {}; }
}

// Adjust routing if a non-Amazon merchant outperforms Amazon for a route
function pickBestWithScoreboard(destinations, country) {
  const scoreboard = getScoreboard(country);
  const byGeo = destinations.filter(d => !d.geo || d.geo.includes(country));
  let list = (byGeo.length ? byGeo : destinations).slice()
    .sort((a,b)=>(a.priority??99)-(b.priority??99));
  // If a non-Amazon merchant has more clicks than Amazon, move it to the top
  const amazon = list.find(d => d.merchant === 'amazon');
  const topNonAmazon = list.find(d => d.merchant !== 'amazon');
  if (amazon && topNonAmazon && scoreboard[topNonAmazon.merchant] > (scoreboard['amazon']||0)) {
    // Move topNonAmazon to the front
    list = [topNonAmazon, ...list.filter(d => d !== topNonAmazon)];
  }
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
    let url = entry ? pickBestWithScoreboard(entry.destinations || [], country) : null;
    if (!url) url = FALLBACK[country] || FALLBACK.US;
    a.href = ensureAmazonTag(url);
    a.setAttribute('rel','sponsored nofollow noopener');
    a.setAttribute('target','_blank');

    // Merchant click logging
    a.addEventListener('click', function(e) {
      const dest = entry ? pickBestWithScoreboard(entry.destinations || [], country) : null;
      let merchant = 'unknown';
      if (dest) {
        const found = (entry.destinations || []).find(d => d.url === dest);
        if (found && found.merchant) merchant = found.merchant;
      }
      logMerchantClick(merchant, country);
    });
  }
}

// also attach a global fallback (handy for debugging without modules)
window.__wireCTAs = wireCTAs;
