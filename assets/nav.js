// Compact header for phones: the links move into a slide-in drawer (menu button), and the header slides away
// while you scroll down and comes back when you scroll up, so the page is mostly content.
(function () {
  const bar = document.querySelector('header.bar'); if (!bar) return;
  const wrap = bar.querySelector('.wrap'), nav = bar.querySelector('nav');
  const isAdmin = !!document.getElementById('tabs');
  const FN = window.RJ_FN || 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const svg = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${d}</svg>`;

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn'; btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = svg('<path d="M4 7h16M4 12h16M4 17h16"/>');
  wrap.insertBefore(btn, wrap.firstChild);
  if (isAdmin) {
    const t = document.createElement('b'); t.id = 'ttl'; t.className = 'bar-ttl'; t.textContent = document.body.dataset.ttl || ''; wrap.insertBefore(t, btn.nextSibling);
    const add = document.createElement('a'); add.id = 'qadd'; add.className = 'btn primary sm qadd'; add.href = '#new'; add.textContent = '+ Add links'; wrap.appendChild(add);
  }

  const scrim = document.createElement('div'); scrim.className = 'nscrim';
  const dr = document.createElement('aside'); dr.className = 'ndrawer'; dr.setAttribute('aria-label', 'Menu'); dr.setAttribute('aria-hidden', 'true');
  document.body.append(scrim, dr);
  function build() {
    const links = Array.from(nav ? nav.querySelectorAll('a') : []).map((a) => {
      const label = (a.querySelector('.hide-s') || a).textContent.trim();
      const on = a.classList.contains('on') || (!isAdmin && a.getAttribute('href') === location.pathname);
      return `<a class="nlink${on ? ' on' : ''}" href="${esc(a.getAttribute('href'))}">${esc(label)}</a>`;
    }).join('');
    dr.innerHTML = `<div class="nhead"><a class="logo" href="/"><img src="/assets/icon.svg" alt="" width="30" height="30"><span>Remote AI Work</span></a><button type="button" class="nclose" aria-label="Close menu">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
      <nav class="nlist">${links}${isAdmin ? '' : `<a class="nlink${location.pathname === '/alerts' ? ' on' : ''}" href="/alerts">⚙️ My job alerts</a>`}${isAdmin ? '<a class="nlink" href="/" target="_blank" rel="noopener">Open the job board ↗</a><button type="button" class="nlink out" id="nso">Sign out</button>' : ''}</nav>
      ${isAdmin ? '' : '<div class="nsec"><small>Browse by field</small><div class="nfields" id="nfields"><span class="muted small">Loading…</span></div></div>'}`;
    const so = dr.querySelector('#nso'); if (so) so.onclick = () => { try { localStorage.removeItem('rj_admin'); } catch (e) {} close(); location.hash = ''; location.reload(); };
    if (!isAdmin) fetch(FN + '?a=taxonomy').then((r) => r.json()).then((t) => {
      const el = dr.querySelector('#nfields'); if (!el) return;
      el.innerHTML = (t.domains || []).filter((d) => d.count).map((d) => `<a href="/c/${slug(d.name)}">${esc(d.name)} <i>${d.count}</i></a>`).join('') || '<span class="muted small">No open roles right now.</span>';
    }).catch(() => { const el = dr.querySelector('#nfields'); if (el) el.innerHTML = ''; });
  }
  function open() { build(); document.body.classList.add('nopen'); dr.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true'); setTimeout(() => { const f = dr.querySelector('.nclose'); if (f) f.focus(); }, 50); }
  function close() { document.body.classList.remove('nopen'); dr.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false'); }
  btn.onclick = open; scrim.onclick = close;
  dr.addEventListener('click', (e) => { if (e.target.closest('.nclose') || e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.RJ_NAV = { close, title: (t) => { const el = document.getElementById('ttl'); if (el) el.textContent = t; } };

  // Hide on scroll down, show on scroll up (phones only).
  let y = scrollY, ticking = false;
  const small = matchMedia('(max-width: 760px)');
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const ny = scrollY;
      if (small.matches && !document.body.classList.contains('nopen')) {
        if (ny > y + 6 && ny > 70) bar.classList.add('up');
        else if (ny < y - 6 || ny < 40) bar.classList.remove('up');
      } else bar.classList.remove('up');
      y = ny; ticking = false;
    });
  }, { passive: true });
})();
// Alerts box: on phones it starts as one slim line and opens on tap.
document.querySelectorAll('.sbtoggle').forEach((b) => b.addEventListener('click', () => {
  const box = b.closest('.subbox'); box.classList.add('open'); b.setAttribute('aria-expanded', 'true');
  const e = box.querySelector('input[type=email]'); if (e) e.focus();
}));
