// Remote AI Work admin: sign in (emailed code), add jobs from referral links, links list, Threads posts, leads, alerts.
(function () {
  const FN = window.RJ_FN, D = window.RJ_DOMAINS;
  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (s) => String(s || '').split('\n').map((x) => x.replace(/^\s*[-•*·\d.)]+\s*/, '').trim()).filter(Boolean);
  const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  let TOKEN = localStorage.getItem('rj_admin') || '', JOBS = [], SITE = 'https://jobs.dijaedadula.com';

  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); }
  async function copy(t) { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { prompt('Copy:', t); } }
  async function api(body) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-rj-session': TOKEN }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && d.error === 'signed out') { TOKEN = ''; localStorage.removeItem('rj_admin'); login(); throw new Error('Signed out'); }
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }

  // ---------- sign in ----------
  function login() {
    $('#tabs').hidden = true; document.body.classList.add('signedout'); setTitle('Sign in');
    app.innerHTML = `<div class="adm"><form class="panel login" id="lf"><h1>Admin sign in</h1><p class="muted small">A 6-digit code goes to your email.</p>
      <input type="email" id="le" value="dijaedadula@gmail.com" autocomplete="email" aria-label="Admin email"><button class="btn primary" id="lb">Email me a code</button>
      <div id="lc" hidden><input type="text" inputmode="numeric" id="code" placeholder="6-digit code" maxlength="6" aria-label="6-digit code" autocomplete="one-time-code"><button class="btn primary block" style="margin-top:10px" type="button" id="lv">Sign in</button></div>
      <p class="err" id="le2" hidden></p></form></div>`;
    const err = (m) => { const e = $('#le2'); e.textContent = m; e.hidden = !m; };
    $('#lf').onsubmit = async (ev) => {
      ev.preventDefault(); err('');
      try { const d = await api({ action: 'code', email: $('#le').value }); $('#lc').hidden = false; $('#code').focus(); if (!d.emailed) err('Code saved but the email could not be sent.'); else toast('Code sent'); } catch (e) { err(e.message); }
    };
    $('#lv').onclick = async () => {
      err('');
      try { const d = await api({ action: 'verify', email: $('#le').value, code: $('#code').value }); TOKEN = d.token; localStorage.setItem('rj_admin', TOKEN); start(); } catch (e) { err(e.message); }
    };
  }

  // ---------- views ----------
  const LABEL = { jobs: 'Jobs', new: 'Add links', links: 'Links', threads: 'Threads', cats: 'Categories', leads: 'Leads', alerts: 'Alerts' };
  function setTitle(t) { document.body.dataset.ttl = t; const el = document.getElementById('ttl'); if (el) el.textContent = t; }
  function tab(t) {
    $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === t));
    setTitle(LABEL[t] || 'Jobs'); window.scrollTo(0, 0);
    ({ jobs: viewJobs, new: viewAdd, links: viewLinks, threads: viewThreads, cats: viewCats, leads: viewLeads, alerts: viewAlerts }[t] || viewJobs)();
  }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h.startsWith('edit-')) viewEdit(JOBS.find((x) => String(x.id) === h.slice(5))); else tab(h || 'jobs'); });
  async function refresh() { const d = await api({ action: 'jobs' }); JOBS = d.jobs || []; SITE = d.site || SITE; }
  const pageUrl = (j, ch) => `${SITE}/j/${j.slug}${ch ? '?ref=' + encodeURIComponent(ch) : ''}`;
  const catSlug = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const catUrl = (name, ch) => `${SITE}/c/${catSlug(name)}${ch ? '?ref=' + encodeURIComponent(ch) : ''}`;
  const tagsOf = (j) => (j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 3));
  // Fields and major skills with live roles, for the shareable category pages (/c/<slug>).
  function cats() {
    const live = JOBS.filter((j) => j.status === 'live');
    const by = (key) => { const m = {}; live.forEach((j) => [].concat(key(j)).forEach((k) => { if (k) (m[k] = m[k] || []).push(j); })); return Object.entries(m).map(([name, jobs]) => ({ name, jobs })).sort((a, b) => b.jobs.length - a.jobs.length || a.name.localeCompare(b.name)); };
    return { fields: by((j) => j.domain), skills: by(tagsOf).filter((c) => c.jobs.length > 1) };
  }
  // A ready post for a community group: who it's for, what's open, the one link, and the referral disclosure.
  function catPost(c, ch) {
    const n = c.jobs.length;
    const list = c.jobs.slice(0, 4).map((j) => `• ${j.title}${j.pay_text ? ' (' + j.pay_text + ')' : ''}`).join('\n');
    const low = String(c.name).split(' ').map((w) => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w)).join(' ');
    return `For people with ${low} experience: AI labs are paying people with your background to train and test their models, fully remote.\n\nI keep one page with every open ${low} role, explained in plain words with pay as posted. ${n === 1 ? '1 role is' : n + ' roles are'} open now:\n${list}${n > 4 ? '\n…and ' + (n - 4) + ' more' : ''}\n\nSee them all here: ${catUrl(c.name, ch)}\n\nNew roles get added to the same link, so it's worth saving. (Independent page, not the hiring platform. I'm a referral partner and may earn a bonus if you're hired. Applying is free.)`;
  }

  const whereCls = (e) => (!e ? 'wr' : e.kind === 'countries' ? 'wc' : e.kind === 'worldwide' ? 'ww' : 'wr');
  const whereTag = (j) => (j.eligibility && j.eligibility.label ? `<span class="wtag ${whereCls(j.eligibility)}" title="${esc(j.eligibility.note || '')}">${esc(j.eligibility.label)}</span>` : '');
  let JF = { q: '', st: '', w: '' };
  async function viewJobs() {
    if (!JOBS.length) app.innerHTML = '<div class="adm"><p class="muted">Loading…</p></div>';
    await refresh();
    const live = JOBS.filter((j) => j.status === 'live');
    const v = JOBS.reduce((n, j) => n + j.views, 0), a = JOBS.reduce((n, j) => n + j.applies, 0);
    const cnt = (st) => JOBS.filter((j) => !st || j.status === st).length;
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Jobs</h1><a class="btn primary sm hm" href="#new">+ Add job</a></div>
      <div class="stats mini"><div><b>${live.length}</b><span>live</span></div><div><b>${v}</b><span>views</span></div><div><b>${a}</b><span>applies</span></div><div><b>${v ? Math.round(a / v * 100) : 0}%</b><span>view→apply</span></div></div>
      <div class="jtools"><input type="search" id="jq" placeholder="Search roles" value="${esc(JF.q)}" aria-label="Search roles">
      <div class="jchips" role="group" aria-label="Filter by who can apply" data-g="w">${[['', 'Anywhere'], ['open', '🌍 Open to all'], ['countries', '📍 Country-only']].map(([k, l]) => `<button type="button" data-w="${k}" class="${JF.w === k ? 'on' : ''}">${l} <i>${JOBS.filter((j) => !k || (k === 'countries' ? (j.eligibility || {}).kind === 'countries' : (j.eligibility || {}).kind !== 'countries')).length}</i></button>`).join('')}</div>
      <div class="jchips" role="group" aria-label="Filter by status">${[['', 'All'], ['live', 'Live'], ['draft', 'Draft'], ['closed', 'Closed']].map(([k, l]) => `<button type="button" data-st="${k}" class="${JF.st === k ? 'on' : ''}">${l} <i>${cnt(k)}</i></button>`).join('')}</div></div>
      <div id="jlist"></div>
      <details class="hint fold"><summary>Daily routine (≈1 min)</summary>In your referral dashboard, click "Refer and earn" on 1–3 roles, copy the links, and paste them into <a href="#new">Add links</a>. Everything else is written for you. (The dashboard itself stays manual: its terms don't allow automated tools.)</details></div>`;
    const draw = () => {
      const q = JF.q.toLowerCase();
      const xs = JOBS.filter((j) => (!JF.st || j.status === JF.st) && (!JF.w || (JF.w === 'countries') === ((j.eligibility || {}).kind === 'countries')) && (!q || (j.title + ' ' + j.domain + ' ' + (j.pay_text || '') + ' ' + ((j.eligibility || {}).label || '')).toLowerCase().includes(q)));
      $('#jlist').innerHTML = !JOBS.length ? '<p class="muted">No jobs yet. <a href="#new">Add your first one</a>.</p>' : !xs.length ? '<p class="muted" style="padding:14px 2px">No roles match.</p>' :
        `<div class="jl">${xs.map((j) => `<article class="jrow"><div class="jmain"><b>${esc(j.title)}</b>${whereTag(j)}<span class="jmeta"><span class="pill ${j.status}">${j.status}</span>${esc(j.pay_text || '')}<span class="dot">·</span>${esc(j.domain)}<span class="dot">·</span>${j.views} views · ${j.applies} applies</span></div>
          <div class="jact"><button class="btn primary sm" data-posts="${j.id}">Posts</button><button class="btn ghost sm" data-copy="${esc(pageUrl(j))}">Copy link</button>${j.status !== 'draft' ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(pageUrl(j))}">Open</a>` : ''}<a class="btn ghost sm" href="#edit-${j.id}">Edit</a></div></article>`).join('')}</div>`;
      $$('#jlist [data-copy]').forEach((b) => b.onclick = async () => { await copy(b.dataset.copy); flash(b); });
      $$('#jlist [data-posts]').forEach((b) => b.onclick = () => openPosts(+b.dataset.posts));
    };
    $('#jq').oninput = (e) => { JF.q = e.target.value; draw(); };
    $$('.jchips button[data-st]').forEach((b) => b.onclick = () => { JF.st = b.dataset.st; $$('.jchips button[data-st]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    $$('.jchips button[data-w]').forEach((b) => b.onclick = () => { JF.w = b.dataset.w; $$('.jchips button[data-w]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }

  // ---------- posts modal: every post + reply for one job, with instant copy ----------
  const isNewPost = (p) => p && typeof p.comment === 'string';
  async function openPosts(id) {
    let j = JOBS.find((x) => x.id === id);
    if (!j) return;
    if (!(j.threads || []).length || !(j.threads || []).every(isNewPost)) {
      toast('Writing posts…');
      try { const d = await api({ action: 'rethread', id }); if (d.job) Object.assign(j, d.job); } catch (e) { return toast(e.message); }
    }
    const url = pageUrl(j);
    const SEP = '\n\n━━━━━━━━━━\n\n';
    const both = (p) => (p.comment ? `${p.text}\n\n— Reply with —\n${p.comment}` : p.text);
    const m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'mh');
    m.innerHTML = `<div class="sheet"><div class="mhead"><div><b id="mh">${esc(j.title)}</b><span class="muted small">${esc(j.pay_text || '')} · ${esc(j.domain || '')}</span>${whereTag(j)}</div><button class="x" aria-label="Close">✕</button></div>
      <div class="mbar"><button class="btn primary sm" data-all>Copy all 3 posts</button><button class="btn ghost sm" data-sel>Copy ticked</button><button class="btn ghost sm" data-link>Copy page link</button>${j.domain ? `<button class="btn ghost sm" data-cat>Copy ${esc(j.domain)} list link</button>` : ''}</div>
      <div class="mbody">${j.threads.map((p, i) => `<div class="mpost">
        <div class="row between"><label class="check"><input type="checkbox" data-pick="${i}" checked> <b>${esc(p.angle || 'Post ' + (i + 1))}</b></label><span class="pill">Topic: ${esc(p.tag || 'Remote Jobs')}</span></div>
        <div class="mlabel"><span>1 · Post <span class="muted">${p.text.length}/500</span></span><button class="btn primary sm" data-c="text" data-i="${i}">Copy post</button></div><pre class="mtext">${esc(p.text)}</pre>
        ${p.comment ? `<div class="mlabel"><span>2 · Reply to your own post</span><button class="btn ghost sm" data-c="comment" data-i="${i}">Copy reply</button></div><pre class="mtext cm">${esc(p.comment)}</pre>` : ''}
        <div class="mfoot"><button class="btn ghost sm" data-c="both" data-i="${i}">Copy post + reply</button><button class="btn ghost sm" data-posted="${i}">${p.posted ? '✓ Posted ' + esc(p.posted) : 'Mark posted'}</button></div>
      </div>`).join('')}</div></div>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    m.addEventListener('click', async (e) => {
      if (e.target === m || e.target.closest('.x')) return close();
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.c) { const p = j.threads[+b.dataset.i]; await copy(b.dataset.c === 'both' ? both(p) : p[b.dataset.c]); flash(b); }
      else if ('all' in b.dataset) { await copy(j.threads.map(both).join(SEP)); flash(b); }
      else if ('sel' in b.dataset) { const pick = $$('[data-pick]:checked', m).map((x) => j.threads[+x.dataset.pick]); if (!pick.length) return toast('Tick at least one post'); await copy(pick.map(both).join(SEP)); flash(b); }
      else if ('link' in b.dataset) { await copy(url); flash(b); }
      else if ('cat' in b.dataset) { await copy(catUrl(j.domain)); flash(b); }
      else if (b.dataset.posted != null) { const i = +b.dataset.posted; j.threads[i].posted = j.threads[i].posted ? null : new Date().toISOString().slice(0, 10); b.textContent = j.threads[i].posted ? '✓ Posted ' + j.threads[i].posted : 'Mark posted'; try { await api({ action: 'save', job: Object.assign({}, j) }); } catch (x) { toast(x.message); } }
    });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(m);
    m.querySelector('.x').focus();
  }
  function flash(b) { if (b._f) return; const t = b.textContent; b._f = 1; b.textContent = 'Copied ✓'; b.classList.add('ok'); setTimeout(() => { b.textContent = t; b.classList.remove('ok'); b._f = 0; }, 1400); }

  function viewAdd() {
    app.innerHTML = `<div class="adm"><h1>Add jobs</h1>
      <div class="panel"><label class="f">Paste referral links <small>One per line, straight from "Refer and earn". Up to 8 at a time.</small>
      <textarea id="urls" class="big" style="min-height:150px" placeholder="https://jobs.micro1.ai/post/…?referralCode=…"></textarea></label>
      <div id="pre" class="small" style="margin-top:8px"></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="go">Create pages + Threads posts</button><label class="check small"><input type="checkbox" id="rf"> Rewrite posts even if nothing changed</label><label class="check small"><input type="checkbox" id="force"> Add anyway if the details match another page</label></div>
      <p class="muted small" style="margin-top:10px">For each link I read the public job post, write the page (what you'll do, who it fits, your take, prep), publish it, and write 3 Threads posts with a link comment.</p>
      <div id="res"></div></div></div>`;
    const pid = (u) => (u.match(/jobs\.micro1\.ai\/post\/([0-9a-f-]{36})/i) || [])[1];
    const precheck = () => {
      const urls = $('#urls').value.split(/\s+/).map((x) => x.trim()).filter(Boolean);
      const seen = {}, msgs = [];
      urls.forEach((u) => {
        const id = pid(u); if (!id) { msgs.push(`<span class="err" style="display:block">Not a micro1 job link: ${esc(u.slice(0, 80))}</span>`); return; }
        if (seen[id]) msgs.push(`<span class="warn">⚠ Pasted twice: ${esc(u.slice(0, 70))}…</span>`); seen[id] = 1;
        const hit = JOBS.find((j) => (j.referral_url || '').toLowerCase().includes(id.toLowerCase()));
        if (hit) msgs.push(`<span class="warn">⚠ Already on your board: <b>${esc(hit.title)}</b> (${esc(hit.status)}). I'll check if the details changed; if not, nothing is added.</span>`);
      });
      $('#pre').innerHTML = msgs.join('<br>');
    };
    if (!JOBS.length) refresh().then(precheck).catch(() => {});
    $('#urls').oninput = precheck;
    $('#go').onclick = async () => {
      const urls = $('#urls').value.split(/\s+/).map((x) => x.trim()).filter(Boolean);
      if (!urls.length) return toast('Paste at least one link');
      const b = $('#go'); b.disabled = true; b.textContent = 'Working…'; $('#res').innerHTML = '<p class="muted">Reading the job posts…</p>';
      try {
        const d = await api({ action: 'ingest', urls, refresh: $('#rf').checked, force: $('#force').checked });
        SITE = d.site || SITE;
        const nDup = d.results.filter((r) => r.duplicate).length, nNew = d.results.filter((r) => r.created).length, nUpd = d.results.filter((r) => r.updated).length;
        const icon = (r) => (r.duplicate ? '<span class="warn" title="Duplicate">⚠</span>' : r.ok ? '✓' : '<span class="err">✕</span>');
        const line = (r) => r.created ? `<b>${esc(r.title)}</b><br><span class="muted small">${esc(r.pay_text || '')} · new page${(r.tags || []).length ? ' · ' + esc(r.tags.join(', ')) : ''}${r.status === 'closed' ? ' · closed on micro1' : ''}</span>`
          : r.updated ? `<b>${esc(r.title)}</b><br><span class="small"><b>Updated:</b> ${esc((r.changes || []).join('; '))}</span>`
          : r.duplicate ? `${r.title ? `<b>${esc(r.title)}</b><br>` : ''}<span class="warn small" style="display:block">${esc(r.error)}</span>`
          : `<span class="muted small">${esc(r.url)}</span><br><span class="err" style="display:block">${esc(r.error)}</span>`;
        $('#res').innerHTML = `<div class="hint" style="margin-top:14px">${nNew} new · ${nUpd} updated · ${nDup} duplicate${nDup === 1 ? '' : 's'} skipped${d.results.length - nNew - nUpd - nDup ? ' · ' + (d.results.length - nNew - nUpd - nDup) + ' failed' : ''}</div>
          <table class="t" style="margin-top:8px">${d.results.map((r) => `<tr class="${r.duplicate ? 'dup' : ''}"><td style="width:28px">${icon(r)}</td><td>${line(r)}</td>
          <td style="text-align:right;white-space:nowrap">${r.slug && (r.created || r.updated) ? `<button class="btn primary sm" data-postslug="${esc(r.slug)}">Posts</button> ` : ''}${r.slug ? `<a class="btn ghost sm" target="_blank" href="${esc(SITE + '/j/' + r.slug)}">Open</a> <button class="btn ghost sm" data-copy="${esc(SITE + '/j/' + r.slug)}">Copy link</button>` : ''}</td></tr>`).join('')}</table>
          ${nNew || nUpd ? '<div class="row" style="margin-top:12px"><a class="btn primary sm" href="#threads">Go to Threads posts →</a></div>' : ''}`;
        if (nDup) toast(nDup + ' duplicate' + (nDup === 1 ? '' : 's') + ' skipped');
        await refresh().catch(() => {});
        $$('[data-postslug]').forEach((x) => x.onclick = () => { const jb = JOBS.find((y) => y.slug === x.dataset.postslug); if (jb) openPosts(jb.id); });
        $$('[data-copy]').forEach((x) => x.onclick = () => copy(x.dataset.copy));
        if (d.results.every((r) => r.ok || r.duplicate)) { $('#urls').value = ''; $('#pre').innerHTML = ''; }
      } catch (e) { $('#res').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
      b.disabled = false; b.textContent = 'Create pages + Threads posts';
    };
  }

  function viewEdit(job) {
    setTitle(job && job.id ? 'Edit job' : 'New job');
    const j = job ? JSON.parse(JSON.stringify(job)) : { status: 'draft', company: 'micro1', skills: [], scope: [], preferred: [], fit: [], prep: [], threads: [] };
    app.innerHTML = `<div class="adm"><h1>${job ? 'Edit job' : 'Add a job'}</h1>
      <div class="panel"><label class="f">Your referral link for this role<input type="url" id="ref" placeholder="https://…" value="${esc(j.referral_url || '')}"></label><textarea id="raw" hidden>${esc(j.raw || '')}</textarea></div>
      <div class="panel" id="fields"></div></div>`;
    function fields() {
      const doms = Object.keys(D);
      const E = j.eligibility || null;
      $('#fields').innerHTML = `<h2>Who can apply</h2>
        <p class="muted small" style="margin:-6px 0 10px">${E ? `Now showing: ${whereTag(j)}${E.manual ? ' (set by you)' : ' (auto-detected from the posting)'}` : 'Not detected yet.'}</p>
        <div class="grid3"><label class="f">Show as<select id="w_kind"><option value="">Auto-detect from the posting</option><option value="worldwide"${E && E.manual && E.kind === 'worldwide' ? ' selected' : ''}>🌍 Open worldwide</option><option value="remote"${E && E.manual && E.kind === 'remote' ? ' selected' : ''}>🌍 Remote, no country limit stated</option><option value="countries"${E && E.manual && E.kind === 'countries' ? ' selected' : ''}>📍 Specific countries only</option></select></label>
        <label class="f">Countries <small>comma-separated, for country-only</small><input type="text" id="w_c" value="${esc(E && E.kind === 'countries' ? (E.countries || []).join(', ') : '')}" placeholder="United States, Canada"></label>
        <label class="f">Note <small>optional, e.g. needs a U.S. license</small><input type="text" id="w_n" value="${esc((E && E.note) || '')}"></label></div>
        <h2 style="margin-top:22px">Page content</h2>
        <div class="grid2"><label class="f">Role title<input type="text" id="f_title" value="${esc(j.title || '')}"></label>
        <label class="f">Page address <small>${esc(SITE)}/j/…</small><input type="text" id="f_slug" value="${esc(j.slug || '')}"></label></div>
        <div class="grid3" style="margin-top:12px"><label class="f">Domain<select id="f_domain">${doms.map((d) => `<option ${d === j.domain ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
        <label class="f">Pay (as posted)<input type="text" id="f_pay" value="${esc(j.pay_text || '')}"></label>
        <label class="f">Openings<input type="text" id="f_open" value="${esc(j.openings || '')}"></label></div>
        <div class="grid2" style="margin-top:12px"><label class="f">Type<input type="text" id="f_type" value="${esc(j.job_type || 'Contract · Remote')}"></label>
        <label class="f">Hiring platform<input type="text" id="f_co" value="${esc(j.company || 'micro1')}"></label></div>
        <label class="f" style="margin-top:12px">In short <small>1–3 sentences in your own words</small><textarea id="f_about">${esc(j.about || '')}</textarea></label>
        <div class="grid2" style="margin-top:12px"><label class="f">What you'll do <small>one per line</small><textarea id="f_scope">${esc((j.scope || []).join('\n'))}</textarea></label>
        <label class="f">What they prefer <small>one per line</small><textarea id="f_pref">${esc((j.preferred || []).join('\n'))}</textarea></label></div>
        <label class="f" style="margin-top:12px">Skills they list <small>comma-separated</small><input type="text" id="f_skills" value="${esc((j.skills || []).join(', '))}"></label>
        <div class="grid2" style="margin-top:12px"><label class="f">This fits you if… <small>one per line</small><textarea id="f_fit">${esc((j.fit || []).join('\n'))}</textarea></label>
        <label class="f">Before you apply <small>one per line</small><textarea id="f_prep">${esc((j.prep || []).join('\n'))}</textarea></label></div>
        <label class="f" style="margin-top:12px">Your take <small>Your honest view; no promises about getting hired or pay</small><textarea id="f_take">${esc(j.take || '')}</textarea></label>
        <div class="row" style="margin-top:16px"><button class="btn primary" id="pub">${j.status === 'live' ? 'Save live page' : 'Publish'}</button><button class="btn ghost" id="draft">Save as draft</button>
        ${j.id && j.status === 'live' ? '<button class="btn ghost" id="close">Mark closed</button>' : ''}${j.id ? '<button class="btn ghost" id="del">Delete</button>' : ''}</div><p class="err" id="ferr" hidden></p>`;
      $('#f_title').oninput = () => { if (!j.id) $('#f_slug').value = slugify($('#f_title').value); };
      $('#f_domain').onchange = () => { j.domain = $('#f_domain').value; };
      const collect = (status) => ({
        id: j.id, status, referral_url: $('#ref').value.trim(), raw: $('#raw').value, title: $('#f_title').value.trim(), slug: slugify($('#f_slug').value),
        domain: $('#f_domain').value, pay_text: $('#f_pay').value.trim(), openings: $('#f_open').value.trim(), job_type: $('#f_type').value.trim(), company: $('#f_co').value.trim() || 'micro1',
        about: $('#f_about').value.trim(), scope: lines($('#f_scope').value), preferred: lines($('#f_pref').value), skills: $('#f_skills').value.split(',').map((x) => x.trim()).filter(Boolean),
        fit: lines($('#f_fit').value), prep: lines($('#f_prep').value), take: $('#f_take').value.trim(), threads: j.threads || [],
        ...whereFromForm(),
      });
      // Your choice overrides the auto-detected value; "Auto-detect" clears it so the next refresh re-reads the posting.
      function whereFromForm() {
        const k = $('#w_kind').value, note = $('#w_n').value.trim() || null;
        if (!k) return {};
        const FL = { 'United States': '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽', Brazil: '🇧🇷', 'United Kingdom': '🇬🇧', Philippines: '🇵🇭', India: '🇮🇳', Australia: '🇦🇺', Belgium: '🇧🇪', Switzerland: '🇨🇭', France: '🇫🇷', Germany: '🇩🇪', Spain: '🇪🇸' };
        if (k === 'worldwide') return { eligibility: { kind: k, countries: [], label: '🌍 Open worldwide', short: 'Open worldwide', note, manual: true } };
        if (k === 'remote') return { eligibility: { kind: k, countries: [], label: '🌍 Remote · no country limit stated', short: 'No country limit stated', note, manual: true } };
        const cs = $('#w_c').value.split(',').map((x) => x.trim()).filter(Boolean).map((x) => (/^(us|usa|u\.s\.?)$/i.test(x) ? 'United States' : /^uk$/i.test(x) ? 'United Kingdom' : x));
        const nm = cs.length <= 3 ? cs.map((x) => x.replace('United States', 'US').replace('United Kingdom', 'UK')).join(' & ') : `${cs.length} countries`;
        return { eligibility: { kind: k, countries: cs, label: `${cs.slice(0, 3).map((x) => FL[x] || '📍').join('')} ${nm} only`, short: `${nm} only`, note: note || (cs.length > 3 ? cs.join(', ') : null), manual: true } };
      }
      const save = async (status) => {
        const e = $('#ferr'); e.hidden = true;
        const o = collect(status);
        try { let d = await api({ action: 'save', job: o });
          if (!$('#w_kind').value && j.id && j.eligibility && j.eligibility.manual) d = await api({ action: 'where_auto', id: j.id });
          else if (o.eligibility && j.id) { const r = await api({ action: 'rethread', id: j.id }); if (r.job) d = r; }
          j = d.job; toast(status === 'live' ? 'Published' : status === 'closed' ? 'Marked closed' : 'Draft saved'); location.hash = status === 'live' ? 'threads' : 'jobs'; }
        catch (x) { e.textContent = x.message; e.hidden = false; }
      };
      $('#pub').onclick = () => save('live');
      $('#draft').onclick = () => save('draft');
      if ($('#close')) $('#close').onclick = () => save('closed');
      if ($('#del')) $('#del').onclick = async () => { if (!confirm('Delete this job page permanently?')) return; await api({ action: 'delete', id: j.id }); toast('Deleted'); location.hash = 'jobs'; };
    }
    if (!j.domain) j.domain = 'General AI training';
    fields();
  }

  async function viewLinks() {
    await refresh();
    const live = JOBS.filter((j) => j.status === 'live');
    app.innerHTML = `<div class="adm"><h1>Links</h1><p class="muted">Every live page as a list. Add a channel tag to see where clicks come from.</p>
      <div class="panel"><div class="grid3"><label class="f">Channel tag<input type="text" id="ch" value="" placeholder="e.g. linkedin, fb-group, whatsapp"></label>
      <label class="f">Format<select id="fmt"><option value="full">Title · pay · link</option><option value="md">Markdown</option><option value="url">Links only</option><option value="ref">Raw referral links (private)</option></select></label>
      <div class="row" style="align-items:end"><button class="btn primary" id="cp">Copy all</button></div></div>
      <textarea id="out" class="big" style="margin-top:12px" readonly aria-label="Links to copy"></textarea>
      <p class="muted small">Share your page links (they capture the email first). Raw referral links skip your capture page; keep them for direct one-to-one sharing.</p></div>
      <h2 style="margin-top:28px">Category links</h2><p class="muted">One link per field or skill for a community: a music group sees only the music roles, and new roles appear on the same link automatically. The channel tag above is added to these links too.</p>
      <div class="panel" id="cats"></div></div>`;
    const draw = () => {
      const ch = $('#ch').value.trim(), f = $('#fmt').value;
      $('#out').value = live.map((j) => f === 'md' ? `- [${j.title}](${pageUrl(j, ch)}) — ${j.pay_text || ''}` : f === 'url' ? pageUrl(j, ch) : f === 'ref' ? `${j.title}: ${j.referral_url}` : `${j.title} · ${j.pay_text || 'pay as posted'} · ${pageUrl(j, ch)}`).join('\n') || 'No live jobs yet.';
    };
    const C = cats();
    const row = (c, k, i) => `<div class="catrow"><div class="cat-n"><b>${esc(c.name)}</b><span class="muted small">${c.jobs.length} open · <a href="${esc(catUrl(c.name))}" target="_blank" rel="noopener">/c/${esc(catSlug(c.name))}</a></span></div>
        <div class="cat-b"><button class="btn primary sm" data-cl="${k}${i}">Copy link</button><button class="btn ghost sm" data-cp="${k}${i}">Copy group post</button></div></div>`;
    const drawCats = () => {
      $('#cats').innerHTML = C.fields.length ? `<h3 class="small muted" style="margin:0 0 6px">Fields</h3>${C.fields.map((c, i) => row(c, 'f', i)).join('')}${C.skills.length ? `<h3 class="small muted" style="margin:16px 0 6px">Major skills (2+ roles)</h3>${C.skills.map((c, i) => row(c, 's', i)).join('')}` : ''}` : '<p class="muted">No live jobs yet.</p>';
    };
    $('#cats').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const key = b.dataset.cl || b.dataset.cp; const c = (key[0] === 'f' ? C.fields : C.skills)[+key.slice(1)];
      await copy(b.dataset.cl ? catUrl(c.name, $('#ch').value.trim()) : catPost(c, $('#ch').value.trim())); flash(b);
    };
    $('#ch').oninput = draw; $('#fmt').onchange = draw; $('#cp').onclick = () => copy($('#out').value); draw(); drawCats();
  }

  async function viewThreads() {
    await refresh();
    const live = JOBS.filter((j) => j.status === 'live');
    const isNew = (p) => p && typeof p.comment === 'string';
    app.innerHTML = `<div class="adm"><h1>Threads posts</h1><p class="muted">Each role has 3 posts. Post the main text, then reply to your own post with the comment (it has the link and the referral disclosure). Pick the topic shown. Space them out: 1–2 posts a week per role.</p>
      ${live.length ? live.map((j) => `<div class="panel" data-id="${j.id}"><div class="row between"><div><b>${esc(j.title)}</b> <span class="muted small">· ${esc(j.pay_text || '')} · ${esc(j.domain)}</span></div><span class="row"><a class="btn ghost sm" target="_blank" href="${esc(pageUrl(j))}">Page</a><button class="btn ghost sm" data-regen>Rewrite posts</button></span></div>
      ${(j.threads || []).every(isNew) && (j.threads || []).length ? `<div class="grid3" style="margin-top:12px">${j.threads.map((p, i) => `<div class="post">
        <div class="row between"><b class="small">${esc(p.angle || 'Post ' + (i + 1))}</b><span class="pill">Topic: ${esc(p.tag || 'Remote Jobs')}</span></div>
        <label class="small muted" for="p${j.id}_${i}">1 · Post</label><textarea id="p${j.id}_${i}" data-i="${i}" data-f="text">${esc(p.text)}</textarea>
        <div class="row between"><span class="count">${p.text.length}/500</span><button class="btn primary sm" data-cp="${i}" data-f="text">Copy post</button></div>
        <label class="small muted" for="c${j.id}_${i}">2 · Reply to your post with</label><textarea id="c${j.id}_${i}" class="cm" data-i="${i}" data-f="comment">${esc(p.comment)}</textarea>
        <div class="row between"><button class="btn ghost sm" data-posted="${i}">${p.posted ? 'Posted ' + esc(p.posted) : 'Mark posted'}</button><button class="btn primary sm" data-cp="${i}" data-f="comment">Copy comment</button></div></div>`).join('')}</div>` : '<p class="muted small" style="margin-top:10px">Old-format drafts. Click "Rewrite posts".</p>'}</div>`).join('') : '<div class="panel muted">Add a job to get posts.</div>'}</div>`;
    $$('.panel[data-id]').forEach((pn) => {
      const j = JOBS.find((x) => String(x.id) === pn.dataset.id);
      const persist = async () => { try { await api({ action: 'save', job: Object.assign({}, j) }); } catch (e) { toast(e.message); } };
      $$('textarea', pn).forEach((ta) => ta.oninput = () => { const i = +ta.dataset.i; j.threads[i][ta.dataset.f] = ta.value; if (ta.dataset.f === 'text') { const c = ta.parentElement.querySelector('.count'); c.textContent = ta.value.length + '/500'; c.classList.toggle('over', ta.value.length > 500); } clearTimeout(ta._t); ta._t = setTimeout(persist, 800); });
      $$('[data-cp]', pn).forEach((b) => b.onclick = () => copy(j.threads[+b.dataset.cp][b.dataset.f]));
      $$('[data-posted]', pn).forEach((b) => b.onclick = async () => { const i = +b.dataset.posted; j.threads[i].posted = j.threads[i].posted ? null : new Date().toISOString().slice(0, 10); b.textContent = j.threads[i].posted ? 'Posted ' + j.threads[i].posted : 'Mark posted'; await persist(); });
      $('[data-regen]', pn).onclick = async () => { if ((j.threads || []).some(isNew) && !confirm('Replace these 3 posts with freshly written ones?')) return; try { await api({ action: 'rethread', id: j.id }); toast('Posts rewritten'); viewThreads(); } catch (e) { toast(e.message); } };
    });
  }


  async function viewCats() {
    app.innerHTML = '<div class="adm"><p class="muted">Loading…</p></div>';
    const [t] = await Promise.all([api({ action: 'taxonomy' }), refresh()]);
    const used = t.skills.filter((x) => x.count), unused = t.skills.filter((x) => !x.count);
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Categories</h1><button class="btn ghost sm" id="retag">Re-categorize all jobs</button></div>
      <p class="muted">Every job gets one domain and 2–4 major skills from this shared list. New links reuse what's here; a new skill or domain is only added when nothing matches. Rename a skill to an existing name to merge them.</p>
      <div class="grid2"><div class="panel"><h2>Domains</h2><table class="t">${t.domains.map((d) => `<tr><td>${esc(d.name)}</td><td style="text-align:right">${d.count} job${d.count === 1 ? '' : 's'}</td></tr>`).join('')}</table></div>
      <div class="panel"><h2>Major skills <span class="muted small">(${used.length} in use)</span></h2><table class="t">${[...used, ...unused].map((x) => `<tr><td><b>${esc(x.name)}</b>${x.aliases && x.aliases.length ? `<br><span class="muted small">also: ${esc(x.aliases.slice(0, 6).join(', '))}</span>` : ''}</td><td class="hm muted small">${esc(x.domain || '')}</td><td style="text-align:right;white-space:nowrap">${x.count} · <button class="btn ghost sm" data-ren="${esc(x.name)}">Rename / merge</button></td></tr>`).join('') || '<tr><td class="muted">No skills yet.</td></tr>'}</table></div></div>
      <div class="panel"><h2>Jobs</h2><table class="t">${JOBS.map((j) => `<tr data-id="${j.id}"><td><b>${esc(j.title)}</b></td><td><select data-dom aria-label="Domain for ${esc(j.title)}">${t.domains.map((d) => `<option ${d.name === j.domain ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}<option value="__new">+ New domain…</option></select></td>
        <td><input type="text" data-tags aria-label="Major skills for ${esc(j.title)}" value="${esc((j.tags || []).join(', '))}" placeholder="Skill, Skill"></td><td><button class="btn ghost sm" data-save>Save</button></td></tr>`).join('')}</table></div></div>`;
    $('#retag').onclick = async () => { if (!confirm('Re-run categorization for every job? Manual skill edits will be replaced.')) return; try { await api({ action: 'retag_all' }); toast('Done'); viewCats(); } catch (e) { toast(e.message); } };
    $$('[data-ren]').forEach((b) => b.onclick = async () => {
      const to = prompt(`Rename "${b.dataset.ren}" to (type an existing name to merge):`, b.dataset.ren); if (!to || to === b.dataset.ren) return;
      try { const r = await api({ action: 'tax_rename', from: b.dataset.ren, to }); toast(r.merged ? 'Merged' : 'Renamed'); viewCats(); } catch (e) { toast(e.message); }
    });
    $$('tr[data-id]').forEach((tr) => {
      const sel = $('[data-dom]', tr);
      sel.onchange = () => { if (sel.value === '__new') { const n = prompt('New domain name:'); if (n) { const o = document.createElement('option'); o.textContent = n; o.selected = true; sel.insertBefore(o, sel.lastElementChild); } else sel.selectedIndex = 0; } };
      $('[data-save]', tr).onclick = async () => {
        const id = +tr.dataset.id;
        try { await api({ action: 'set_domain', id, domain: sel.value }); await api({ action: 'set_tags', id, tags: $('[data-tags]', tr).value.split(',').map((x) => x.trim()).filter(Boolean) }); toast('Saved'); } catch (e) { toast(e.message); }
      };
    });
  }

  async function viewLeads() {
    app.innerHTML = '<div class="adm"><p class="muted">Loading…</p></div>';
    const d = await api({ action: 'leads' });
    const L = d.leads || [], SH = d.shares || {};
    const byCode = {}; L.forEach((x) => { if (x.ref_code) byCode[x.ref_code] = x; });
    const joined = {}; L.forEach((x) => { if (x.referred_by) joined[x.referred_by] = (joined[x.referred_by] || 0) + 1; });
    const codes = Array.from(new Set([...Object.keys(SH), ...Object.keys(joined)]));
    const top = codes.map((c) => ({ c, who: byCode[c] ? byCode[c].email : '(unknown code)', views: (SH[c] || {}).views || 0, applies: (SH[c] || {}).applies || 0, joined: joined[c] || 0 })).sort((a, b) => b.joined - a.joined || b.applies - a.applies || b.views - a.views);
    const refBy = (x) => x.referred_by ? `${esc(byCode[x.referred_by] ? byCode[x.referred_by].email : '')} <span class="muted">${esc(x.referred_by)}</span>` : '—';
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Leads</h1><button class="btn ghost sm" id="csv">Export CSV</button></div>
      <div class="stats"><div><b>${L.length}</b><span>emails captured</span></div><div><b>${L.filter((x) => x.alerts).length}</b><span>opted in here</span></div><div><b>${d.alert_subscribers}</b><span>active alert subscribers</span></div><div><b>${L.filter((x) => Date.now() - Date.parse(x.created_at) < 7 * 864e5).length}</b><span>last 7 days</span></div></div>
      <h2>Top sharers</h2><p class="muted small">Every lead has a sharer code. Links they share (share icons, copy, Share this list) carry <code>?by=CODE</code>. Visits and apply clicks come from those links; "joined" is people who left their email after arriving through one. Cross-check the joined emails with your micro1 referrals.</p>
      <div class="panel" style="overflow-x:auto" tabindex="0" aria-label="Top sharers"><table class="t"><tr><th>Sharer</th><th>Code</th><th>Visits</th><th>Apply clicks</th><th>Joined</th></tr>
      ${top.slice(0, 100).map((t) => `<tr><td>${esc(t.who)}</td><td><code>${esc(t.c)}</code></td><td>${t.views}</td><td>${t.applies}</td><td><b>${t.joined}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No shared visits yet.</td></tr>'}</table></div>
      <h2>All leads</h2>
      <div class="panel" style="overflow-x:auto" tabindex="0" aria-label="Leads table"><table class="t"><tr><th>Email</th><th>Code</th><th>Referred by</th><th>Alerts</th><th class="hm">First role</th><th class="hm">Source</th><th>Date</th></tr>
      ${L.slice(0, 500).map((x) => `<tr><td>${esc(x.email)}</td><td><code>${esc(x.ref_code || '')}</code></td><td>${refBy(x)}</td><td>${x.alerts ? '✓' : '—'}</td><td class="hm">${esc(x.first_job || '')}</td><td class="hm">${esc(x.source || '')}</td><td>${esc(x.created_at.slice(0, 10))}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No leads yet.</td></tr>'}</table></div></div>`;
    $('#csv').onclick = () => {
      const rows = [['email', 'ref_code', 'referred_by_code', 'referred_by_email', 'alerts', 'first_job', 'source', 'created_at'], ...L.map((x) => [x.email, x.ref_code || '', x.referred_by || '', x.referred_by && byCode[x.referred_by] ? byCode[x.referred_by].email : '', x.alerts, x.first_job || '', x.source || '', x.created_at])];
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = 'remote-ai-work-leads.csv'; a.click();
    };
  }

  async function viewAlerts() {
    await refresh();
    const live = JOBS.filter((j) => j.status === 'live');
    app.innerHTML = `<div class="adm"><h1>Job alert email</h1><p class="muted">Sends to everyone subscribed to job alerts, from your usual sender, with a one-click unsubscribe. Send at most once or twice a week.</p>
      <div class="panel"><b>Roles to include</b><div style="display:grid;gap:8px;margin:10px 0">${live.map((j) => `<label class="check"><input type="checkbox" value="${esc(j.slug)}"> <span><b>${esc(j.title)}</b> · ${esc(j.pay_text || '')}</span></label>`).join('') || '<span class="muted">No live roles.</span>'}</div>
      <label class="f">Subject<input type="text" id="sub" placeholder="New remote AI role: …"></label>
      <div class="row" style="margin-top:12px"><button class="btn ghost" id="test">Send a test to me</button><button class="btn primary" id="send">Send to all subscribers</button></div>
      <div class="prog" style="margin-top:14px" hidden id="pg"><i></i></div><p class="muted small" id="pst"></p><p class="err" id="aerr" hidden></p></div></div>`;
    const pick = () => $$('input[type=checkbox]:checked', app).map((x) => x.value);
    $$('input[type=checkbox]', app).forEach((c) => c.onchange = () => { const p = pick(); if (p.length && !$('#sub').value) { const j = live.find((x) => x.slug === p[0]); $('#sub').value = `New remote AI role: ${j.title}${j.pay_text ? ` (${j.pay_text})` : ''}`; } });
    const err = (m) => { const e = $('#aerr'); e.textContent = m; e.hidden = !m; };
    $('#test').onclick = async () => { err(''); try { const s = await api({ action: 'alert_start', slugs: pick(), subject: $('#sub').value }); await api({ action: 'alert_step', id: s.id, test: true }); toast('Test sent to you'); } catch (e) { err(e.message); } };
    $('#send').onclick = async () => {
      err(''); if (!confirm('Send this alert to all job-alert subscribers now?')) return;
      try {
        const s = await api({ action: 'alert_start', slugs: pick(), subject: $('#sub').value });
        $('#pg').hidden = false; let r, total = null;
        do { r = await api({ action: 'alert_step', id: s.id }); total = total || (r.sent + r.failed + r.remaining) || 1; $('#pg i').style.width = Math.round((r.sent + r.failed) / total * 100) + '%'; $('#pst').textContent = `${r.sent} sent · ${r.failed} failed · ${r.remaining} left`; } while (r.remaining > 0);
        toast('Alert sent');
      } catch (e) { err(e.message); }
    };
  }

  async function start() {
    try { await api({ action: 'me' }); } catch (e) { return; }
    $('#tabs').hidden = false; document.body.classList.remove('signedout');
    const h = location.hash.slice(1); if (h.startsWith('edit-')) { await refresh(); viewEdit(JOBS.find((x) => String(x.id) === h.slice(5))); } else tab(h || 'jobs');
  }
  
  // Opened from the CRM: swap the one-time pass in the URL for an admin session (no emailed code).
  const SSO = /[#&]sso=([0-9a-f]{64})/.exec(location.hash);
  if (SSO) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (TOKEN) start();
    else {
      app.innerHTML = '<div class="adm"><p class="muted">Signing you in from your CRM…</p></div>';
      fetch('https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/sso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redeem', app: 'jobs', pass: SSO[1] }) })
        .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
        .then((x) => { if (!x.ok || !x.d.token) throw new Error(x.d.error || 'Sign-in failed'); TOKEN = x.d.token; localStorage.setItem('rj_admin', TOKEN); start(); toast('Signed in from your CRM'); })
        .catch((e) => { login(); const el = $('#le2'); if (el) { el.textContent = e.message + ' You can sign in with an emailed code instead.'; el.hidden = false; } });
    }
  } else if (TOKEN) start(); else login();
})();
