// /js/ui.js
const LS_CITY = 'sbnm_city_v1';
const FORM_LINK = 'https://forms.gle/WNYyVcStumA9eDiE7'; // your live form

/* ---------- City auto-detect + inject into H1 ---------- */
export function initCity() {
  // 1) show any saved city
  let city = '';
  try { city = JSON.parse(localStorage.getItem(LS_CITY)||'{}').display || ''; } catch {}

  // 2) if not saved, try geolocation -> reverse-geocode (best effort; silent fail)
  if (!city && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(async p => {
      try {
        const lat = p.coords.latitude.toFixed(3);
        const lon = p.coords.longitude.toFixed(3);
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, {headers:{'Accept':'application/json'}});
        if (res.ok) {
          const data = await res.json();
          city = data.city || data.locality || data.principalSubdivision || '';
          if (city) localStorage.setItem(LS_CITY, JSON.stringify({display: city}));
          paintCity(city);
        }
      } catch {}
    }, () => {/* ignore */}, {timeout:4000, maximumAge:600000});
  }

  // paint whatever we have immediately
  paintCity(city);

  // Fire compare_open event if compare table is visible
  document.querySelectorAll('.compare table').forEach(tbl => {
    tbl.addEventListener('mouseenter', () => {
      window.dispatchEvent(new CustomEvent('compare_open'));
    }, { once: true });
  });
}

function paintCity(city) {
  document.querySelectorAll('[data-city]').forEach(el => el.textContent = city || 'your area');
}

/* ---------- “Find Local Help” → Google Form ---------- */
export function initLocalHelp() {
  const btn = document.querySelector('[data-action="local-help"]');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(FORM_LINK, '_blank', 'noopener');
    window.dispatchEvent(new CustomEvent('sticky_bar_click'));
  });
}

/* ---------- Filters (chips → show/hide cards) ---------- */
export function initFilters() {
  const chips = document.querySelectorAll('.filters .chip');
  if (!chips.length) return;

  const state = { driveway:'paved', depth:'light', noise:'low' };

  chips.forEach(ch => ch.addEventListener('click', () => {
    document.querySelectorAll(`.filters .chip[data-group="${ch.dataset.group}"]`)
      .forEach(x => x.classList.remove('is-active'));
    ch.classList.add('is-active');
    state[ch.dataset.group] = ch.dataset.value;
    apply();
    window.dispatchEvent(new CustomEvent('filters_applied', { detail: { ...state } }));
  }));

  function apply(){
    document.querySelectorAll('.tile').forEach(card => {
      const matchDrive = state.driveway === 'mixed' ? true : (card.dataset.driveway === state.driveway);
      const matchDepth =
        state.depth === 'deep'      ? card.dataset.depth === 'deep' :
        state.depth === 'moderate'  ? card.dataset.depth !== 'deep' :
                                      (card.dataset.depth === 'light' || card.dataset.depth === 'moderate');
      const matchNoise = state.noise === 'low' ? card.dataset.noise === 'low' : true;
      card.hidden = !(matchDrive && matchDepth && matchNoise);
    });
  }
  apply();

  // Instrument scroll_75 event
  let fired = false;
  window.addEventListener('scroll', () => {
    if (fired) return;
    const scrolled = window.scrollY + window.innerHeight;
    if (scrolled / document.body.scrollHeight > 0.75) {
      window.dispatchEvent(new CustomEvent('scroll_75'));
      fired = true;
    }
  });
}

// Instrument affiliate_click, merchant_click_amazon, merchant_click_ace
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a.cta').forEach(a => {
    a.addEventListener('click', e => {
      window.dispatchEvent(new CustomEvent('affiliate_click'));
      const id = a.dataset.id || '';
      if (a.href.includes('amazon.')) {
        window.dispatchEvent(new CustomEvent('merchant_click_amazon'));
      } else if (a.href.includes('acehardware.com')) {
        window.dispatchEvent(new CustomEvent('merchant_click_ace'));
      }
    });
  });
});
