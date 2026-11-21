// Job page: email capture, remembered visitors (cookie + localStorage), referral hand-off.
(function () {
  const FN = window.RJ_FN;
  const main = document.querySelector('main.job');
  if (!main) return;
  const slug = main.dataset.slug, live = main.dataset.status === 'live', company = main.dataset.company || 'the hiring platform';
  const ref = new URLSearchParams(location.search).get('ref') || (document.referrer ? new URL(document.referrer).hostname : '');
  const KEY = 'rj_lead';
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const co = esc(company);

  const getCookie = (n) => (document.cookie.split('; ').find((c) => c.startsWith(n + '=')) || '').split('=')[1];
  function load() {
    let v = null;
    try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!v) { const c = getCookie(KEY); if (c) { try { v = JSON.parse(decodeURIComponent(c)); } catch (e) {} } }
    return v && v.token && v.email ? v : null;
  }
  function save(v) {
    if (window.RJ_SET_LEAD) return window.RJ_SET_LEAD(v);
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(v))}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax; Secure`;
  }
  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    document.cookie = `${KEY}=; Max-Age=0; Path=/`;
  }
  const mask = (e) => e.replace(/^(.)(.*)(@.*)$/, (m, a, b, c) => a + '•'.repeat(Math.min(6, b.length)) + c);
  async function post(body) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong. Try again.'), d);
    return d;
  }
  // count the view (fire and forget)
  const by = () => (window.RJ_BY ? window.RJ_BY() : '');
  post({ action: 'view', slug, ref, by: by() }).catch(() => {});

  const body = document.getElementById('passBody');
  function readyView(url) {
    body.innerHTML = `<div class="ready"><div class="ok"><i>✓</i> Your link is ready</div>
      <a class="btn primary block" href="${esc(url)}" target="_blank" rel="noopener" id="cont">Continue to ${co} →</a>
      <p class="note">You'll apply on ${co}'s official page. Tip: pick roles you could talk about for 20 minutes with real examples. <a href="/guide">Read the free prep guide</a>.</p></div>`;
  }
  function returningView(v) {
    body.innerHTML = `<h3>Welcome back</h3><p class="muted small">Signed in as ${mask(v.email)} on this device.</p>
      <button class="btn primary block" id="instant">Apply now on ${co} →</button>
      <p class="err" id="err" hidden></p>
      <p class="note">Independent page, not ${co}. I'm a referral partner and may earn a bonus if you're hired. <button class="linkish" id="notme">Not you?</button></p>`;
    document.getElementById('notme').onclick = () => { forget(); location.reload(); };
    document.getElementById('instant').onclick = async () => {
      const w = window.open('', '_blank');
      const btn = document.getElementById('instant'); btn.disabled = true; btn.textContent = 'Opening…';
      try {
        const d = await post({ action: 'go', slug, token: v.token, ref, by: by() });
        if (d.code && d.code !== v.code) save(Object.assign({}, v, { code: d.code }));
        if (w) { w.opener = null; w.location.href = d.url; } else location.href = d.url;
        readyView(d.url);
      } catch (e) {
        if (w) w.close();
        if (e.reset) { forget(); location.reload(); return; }
        btn.disabled = false; btn.textContent = `Apply now on ${co} →`;
        const er = document.getElementById('err'); er.textContent = e.message; er.hidden = false;
      }
    };
  }

  const known = load();
  if (known && live) returningView(known);

  const form = document.getElementById('capture');
  if (form) form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value.trim();
    const er = document.getElementById('err'); er.hidden = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { er.textContent = 'Enter a valid email address.'; er.hidden = false; return; }
    const btn = document.getElementById('go'); btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const d = await post({ action: 'capture', slug, email, alerts: document.getElementById('alerts').checked, website: document.getElementById('website').value, ref, by: by() });
      save({ token: d.token, email, code: d.code });
      if (d.url) readyView(d.url);
      else body.innerHTML = `<div class="ready"><div class="ok"><i>✓</i> You're on the list</div><p class="muted small">${document.getElementById('alerts').checked ? 'Check your inbox for the free guide. I\'ll email you when a role like this opens.' : 'Saved.'}</p><a class="btn ghost block" href="/">See open roles</a></div>`;
    } catch (e) {
      btn.disabled = false; btn.textContent = live ? 'Get my application link' : 'Get job alerts';
      er.textContent = e.message; er.hidden = false;
    }
  });
})();
// Hide the mobile bottom bar while the apply card is on screen.
(function () {
  const cta = document.querySelector('.mobile-cta'), pass = document.getElementById('pass');
  if (!cta || !pass || !('IntersectionObserver' in window)) return;
  new IntersectionObserver((es) => { cta.style.display = es[0].isIntersecting ? 'none' : ''; }).observe(pass);
})();
