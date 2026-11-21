(function () {
  const FN = window.RJ_FN;
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = document.getElementById('list');
  const qs = new URLSearchParams(location.search);
  const CAT = window.RJ_CAT || null;
  let D = CAT ? (CAT.k === 'd' ? CAT.v : '') : qs.get('d') || '', S = CAT ? (CAT.k === 's' ? CAT.v : '') : qs.get('s') || '', JOBS = [], TAX = { domains: [], skills: [] };
  const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const shareBtn = document.getElementById('share');
  function setShare() {
    if (!shareBtn || CAT) return;
    const v = S || D; shareBtn.hidden = !v;
    if (v) { shareBtn.dataset.url = location.origin + '/c/' + slugify(v); shareBtn.dataset.title = 'Remote AI roles in ' + v; }
  }
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const url = window.RJ_LINK ? window.RJ_LINK(shareBtn.dataset.url, 'share-list') : shareBtn.dataset.url, title = shareBtn.dataset.title;
    try { if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); } catch (e) { window.prompt('Copy this link:', url); return; }
    const t = shareBtn.textContent; shareBtn.textContent = 'Link copied ✓'; setTimeout(() => (shareBtn.textContent = t), 1600);
  });
  const cut = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'; };
  const tagsOf = (j) => (j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 3));
  function sync() {
    if (CAT) return;
    const u = new URL(location.href); D ? u.searchParams.set('d', D) : u.searchParams.delete('d'); S ? u.searchParams.set('s', S) : u.searchParams.delete('s');
    history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  }
  function chip(label, n, on, kind) { return `<button type="button" class="fchip${on ? ' on' : ''}" data-k="${kind}" data-v="${esc(label)}" aria-pressed="${on}">${esc(label)}${n != null ? ` <i>${n}</i>` : ''}</button>`; }
  function draw() {
    const inD = JOBS.filter((j) => !D || j.domain === D);
    const shown = inD.filter((j) => !S || tagsOf(j).includes(S));
    const fd = document.getElementById('fdom'), fs = document.getElementById('fskill'), fl = document.getElementById('filters');
    const doms = TAX.domains.length ? TAX.domains : Array.from(new Set(JOBS.map((j) => j.domain))).map((name) => ({ name, count: JOBS.filter((j) => j.domain === name).length }));
    if (fd) fd.innerHTML = chip('All fields', JOBS.length, !D, 'd') + doms.map((d) => chip(d.name, d.count, D === d.name, 'd')).join('');
    const sc = {}; inD.forEach((j) => tagsOf(j).forEach((t) => (sc[t] = (sc[t] || 0) + 1)));
    const skills = Object.entries(sc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
    if (fs) fs.innerHTML = skills.length > 1 || S ? `<span class="muted small">Skills:</span>` + skills.map(([n, c]) => chip(n, c, S === n, 's')).join('') + (S && !sc[S] ? chip(S, 0, true, 's') : '') : '';
    if (fl) fl.hidden = JOBS.length < 2;
    document.getElementById('count').innerHTML = `${shown.length} role${shown.length === 1 ? '' : 's'}${!CAT && (D || S) ? ' · <a href="/" id="clr">clear filters</a>' : ''}`;
    setShare();
    const clr = document.getElementById('clr'); if (clr) clr.onclick = (e) => { e.preventDefault(); D = S = ''; sync(); draw(); };
    list.innerHTML = shown.length ? shown.map((j) => `<a class="card" href="/j/${esc(j.slug)}"><div><div class="chips" style="margin:0"><span class="chip dom">${esc(j.domain)}</span><span class="chip">${esc(j.job_type || 'Remote')}</span></div>
      <h3>${esc(j.title)}</h3><span class="muted small">${esc(cut(j.about, 160))}</span>
      ${tagsOf(j).length ? `<div class="tags">${tagsOf(j).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>
      <div class="pay">${esc(j.pay_text || '')}<small>as posted · ${esc(j.company || '')}</small></div></a>`).join('')
      : CAT ? '<div class="empty">Nothing open here right now. Leave your email above to hear when the next one opens, or <a href="/">see all roles</a>.</div>' : '<div class="empty">No open roles match this filter right now. <a href="/">See all roles</a> or leave your email above to hear when one opens.</div>';
  }
  const flEl = document.getElementById('filters'); if (flEl) flEl.addEventListener('click', (e) => {
    const b = e.target.closest('.fchip'); if (!b) return;
    if (b.dataset.k === 'd') { D = b.dataset.v === 'All fields' ? '' : (D === b.dataset.v ? '' : b.dataset.v); S = ''; }
    else S = S === b.dataset.v ? '' : b.dataset.v;
    sync(); draw();
  });
  Promise.all([fetch(FN + '?a=list').then((r) => r.json()), fetch(FN + '?a=taxonomy').then((r) => r.json()).catch(() => ({}))]).then(([d, t]) => {
    JOBS = d.jobs || []; TAX = { domains: (t && t.domains) || [], skills: (t && t.skills) || [] };
    if (!JOBS.length) { list.innerHTML = '<div class="empty">No roles open right now. Leave your email above and you\'ll hear first when one opens.</div>'; return; }
    draw();
  }).catch(() => { list.innerHTML = '<div class="empty">Couldn\'t load roles. Refresh in a moment.</div>'; });

  const f = document.getElementById('sub');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const er = document.getElementById('err'); er.hidden = true;
    const email = document.getElementById('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { er.textContent = 'Enter a valid email address.'; er.hidden = false; return; }
    if (!document.getElementById('alerts').checked) { er.textContent = 'Tick the box so I can send you alerts.'; er.hidden = false; return; }
    const b = document.getElementById('subBtn'); b.disabled = true; b.textContent = 'One moment…';
    try {
      const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'capture', email, alerts: true, website: document.getElementById('website').value, ref: new URLSearchParams(location.search).get('ref') || (CAT ? 'c-' + CAT.slug : 'board'), by: window.RJ_BY ? window.RJ_BY() : '' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Something went wrong.');
      const v = JSON.stringify({ token: d.token, email, code: d.code });
      if (window.RJ_SET_LEAD) window.RJ_SET_LEAD({ token: d.token, email, code: d.code }); else { try { localStorage.setItem('rj_lead', v); } catch (x) {} document.cookie = `rj_lead=${encodeURIComponent(v)}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax; Secure`; }
      f.innerHTML = '<b>You\'re on the list ✓</b><span class="muted small">Check your inbox for the free guide. Any role page now opens with one click.</span><a class="btn ghost block" href="/guide">Open the guide now</a>';
    } catch (x) { b.disabled = false; b.textContent = 'Send me alerts'; er.textContent = x.message; er.hidden = false; }
  });
})();
