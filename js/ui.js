// /js/ui.js
const LS_CITY = 'sbnm_city_v1';
const FORM_LINK = 'https://forms.gle/WNYyVcStumA9eDiE7';

export function initCity() {
  const input = document.getElementById('city-input');
  if (!input) return;

  // preload from localStorage if present
  try {
    const cached = JSON.parse(localStorage.getItem(LS_CITY) || 'null');
    if (cached?.display) input.value = cached.display;
  } catch {}

  function commitCity() {
    const city = (input.value || '').trim();
    try { localStorage.setItem(LS_CITY, JSON.stringify({ display: city })); } catch {}
    document.querySelectorAll('[data-city]').forEach(el => el.textContent = city || 'your area');
  }
  input.addEventListener('change', commitCity);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitCity(); input.blur(); }});
}

export function initLocalHelp() {
  const btn = document.querySelector('[data-action="local-help"]');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(FORM_LINK, '_blank', 'noopener'); // direct to your Google Form
  });
}

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
  }));

  function apply(){
    document.querySelectorAll('.tile').forEach(card => {
      const ok =
        (card.dataset.driveway === state.driveway || state.driveway === 'mixed') &&
        (state.depth === 'deep' ? (card.dataset.depth === 'deep') :
         state.depth === 'moderate' ? (card.dataset.depth !== 'deep') :
         (card.dataset.depth === 'light' || card.dataset.depth === 'moderate')) &&
        (state.noise === 'low' ? (card.dataset.noise === 'low') : true);
      card.hidden = !ok;
    });
  }
  apply();
}
