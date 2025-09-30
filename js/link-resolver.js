

// --- Amazon tag enforcement ---
const AMAZON_TAGS = {
  'amazon.com': 'snowme-20',     // US
  'www.amazon.com': 'snowme-20',
  'amazon.ca':  'cansnowme-20',  // Canada
  'www.amazon.ca': 'cansnowme-20'
};

function ensureAmazonTag(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (host.includes('amazon.')) {
      const tag = AMAZON_TAGS[host];
      if (tag) url.searchParams.set('tag', tag);
      // optional first-party attribution for your own analytics
      url.searchParams.set('utm_source', 'site');
      url.searchParams.set('utm_medium', 'affiliate');
      url.searchParams.set('utm_campaign', 'snowblowers');
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}

export async function bestLinkFor(model){
  const manifest = await fetch('/link_manifest.json').then(r=>r.json());
  const item = manifest.find(x => x.model === model);
  if(!item) return null;
  const sorted = [...item.destinations].sort((a,b)=>a.priority-b.priority);
  return sorted[0].url;
}


export async function wireCTAs(){
  const anchors = document.querySelectorAll('a.cta[data-model]');
  for (const a of anchors) {
    const raw = await bestLinkFor(a.dataset.model);   // your geo-aware pick
    const finalUrl = ensureAmazonTag(raw);            // enforce correct tag
    a.href = finalUrl;
    a.addEventListener('click', () => {
      console.log('affiliate_click', { model: a.dataset.model, url: finalUrl });
      // optional: warn in dev if an Amazon link somehow lacks a tag
      if (/amazon\./i.test(finalUrl) && !/[?&]tag=/.test(finalUrl)) {
        console.warn('Amazon link missing tag!', finalUrl);
      }
    });
  }
}
