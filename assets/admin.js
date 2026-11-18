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
    $('#tabs').hidden = true;
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
  function tab(t) {
    $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === t));
    ({ jobs: viewJobs, new: viewAdd, links: viewLinks, threads: viewThreads, cats: viewCats, leads: viewLeads, alerts: viewAlerts }[t] || viewJobs)();
  }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h.startsWith('edit-')) viewEdit(JOBS.find((x) => String(x.id) === h.slice(5))); else tab(h || 'jobs'); });
  async function refresh() { const d = await api({ action: 'jobs' }); JOBS = d.jobs || []; SITE = d.site || SITE; }
  const pageUrl = (j, ch) => `${SITE}/j/${j.slug}${ch ? '?ref=' + encodeURIComponent(ch) : ''}`;

  async function viewJobs() {
    app.innerHTML = '<div class="adm"><p class="muted">Loading…</p></div>';
    await refresh();
    const live = JOBS.filter((j) => j.status === 'live');
    const v = JOBS.reduce((n, j) => n + j.views, 0), a = JOBS.reduce((n, j) => n + j.applies, 0);
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Jobs</h1><a class="btn primary sm" href="#new">+ Add job</a></div>
      <div class="stats"><div><b>${live.length}</b><span>live pages</span></div><div><b>${v}</b><span>page views</span></div><div><b>${a}</b><span>apply clicks</span></div><div><b>${v ? Math.round(a / v * 100) : 0}%</b><span>view → apply</span></div></div>
      <div class="hint">Daily routine (≈1 min): in your referral dashboard, click "Refer and earn" on 1–3 roles, copy the links, and paste them into <a href="#new">Add job</a>. Everything else is written for you. (The dashboard itself stays manual: its terms don't allow automated tools.)</div>
      <div class="panel" style="margin-top:14px;overflow-x:auto">${JOBS.length ? `<table class="t cards"><tr><th>Role</th><th class="hm">Domain</th><th>Status</th><th>Views</th><th>Applies</th><th><span class="sr">Actions</span></th></tr>
      ${JOBS.map((j) => `<tr><td><b>${esc(j.title)}</b><br><span class="muted small">${esc(j.pay_text || '')}</span></td><td class="hm">${esc(j.domain)}</td><td><span class="pill ${j.status}">${j.status}</span></td><td>${j.views}</td><td>${j.applies}</td>
      <td class="row" style="justify-content:flex-end"><button class="btn primary sm" data-posts="${j.id}">Posts</button><button class="btn ghost sm" data-copy="${esc(pageUrl(j))}">Copy link</button>${j.status !== 'draft' ? `<a class="btn ghost sm" target="_blank" href="${esc(pageUrl(j))}">Open</a>` : ''}<a class="btn ghost sm" href="#edit-${j.id}">Edit</a></td></tr>`).join('')}</table>` : '<p class="muted">No jobs yet. <a href="#new">Add your first one</a>.</p>'}</div></div>`;
    $$('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.copy));
    $$('[data-posts]').forEach((b) => b.onclick = () => openPosts(+b.dataset.posts));
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
    m.innerHTML = `<div class="sheet"><div class="mhead"><div><b id="mh">${esc(j.title)}</b><span class="muted small">${esc(j.pay_text || '')} · ${esc(j.domain || '')}</span></div><button class="x" aria-label="Close">✕</button></div>
      <div class="mbar"><button class="btn primary sm" data-all>Copy all 3 posts</button><button class="btn ghost sm" data-sel>Copy ticked</button><button class="btn ghost sm" data-link>Copy page link</button></div>
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
    const j = job ? JSON.parse(JSON.stringify(job)) : { status: 'draft', company: 'micro1', skills: [], scope: [], preferred: [], fit: [], prep: [], threads: [] };
    app.innerHTML = `<div class="adm"><h1>${job ? 'Edit job' : 'Add a job'}</h1>
      <div class="panel"><label class="f">Your referral link for this role<input type="url" id="ref" placeholder="https://…" value="${esc(j.referral_url || '')}"></label><textarea id="raw" hidden>${esc(j.raw || '')}</textarea></div>
      <div class="panel" id="fields"></div></div>`;
    function fields() {
      const doms = Object.keys(D);
      $('#fields').innerHTML = `<h2>Page content</h2>
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
      });
      const save = async (status) => {
        const e = $('#ferr'); e.hidden = true;
        const o = collect(status);
        try { const d = await api({ action: 'save', job: o }); j = d.job; toast(status === 'live' ? 'Published' : status === 'closed' ? 'Marked closed' : 'Draft saved'); location.hash = status === 'live' ? 'threads' : 'jobs'; }
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
      <p class="muted small">Share your page links (they capture the email first). Raw referral links skip your capture page; keep them for direct one-to-one sharing.</p></div></div>`;
    const draw = () => {
      const ch = $('#ch').value.trim(), f = $('#fmt').value;
      $('#out').value = live.map((j) => f === 'md' ? `- [${j.title}](${pageUrl(j, ch)}) — ${j.pay_text || ''}` : f === 'url' ? pageUrl(j, ch) : f === 'ref' ? `${j.title}: ${j.referral_url}` : `${j.title} · ${j.pay_text || 'pay as posted'} · ${pageUrl(j, ch)}`).join('\n') || 'No live jobs yet.';
    };
    $('#ch').oninput = draw; $('#fmt').onchange = draw; $('#cp').onclick = () => copy($('#out').value); draw();
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
    const L = d.leads || [];
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Leads</h1><button class="btn ghost sm" id="csv">Export CSV</button></div>
      <div class="stats"><div><b>${L.length}</b><span>emails captured</span></div><div><b>${L.filter((x) => x.alerts).length}</b><span>opted in here</span></div><div><b>${d.alert_subscribers}</b><span>active alert subscribers</span></div><div><b>${L.filter((x) => Date.now() - Date.parse(x.created_at) < 7 * 864e5).length}</b><span>last 7 days</span></div></div>
      <div class="panel" style="overflow-x:auto" tabindex="0" aria-label="Leads table"><table class="t"><tr><th>Email</th><th>Alerts</th><th class="hm">First role</th><th class="hm">Source</th><th>Date</th></tr>
      ${L.slice(0, 500).map((x) => `<tr><td>${esc(x.email)}</td><td>${x.alerts ? '✓' : '—'}</td><td class="hm">${esc(x.first_job || '')}</td><td class="hm">${esc(x.source || '')}</td><td>${esc(x.created_at.slice(0, 10))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No leads yet.</td></tr>'}</table></div></div>`;
    $('#csv').onclick = () => {
      const rows = [['email', 'alerts', 'first_job', 'source', 'created_at'], ...L.map((x) => [x.email, x.alerts, x.first_job || '', x.source || '', x.created_at])];
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
    $('#tabs').hidden = false;
    const h = location.hash.slice(1); if (h.startsWith('edit-')) { await refresh(); viewEdit(JOBS.find((x) => String(x.id) === h.slice(5))); } else tab(h || 'jobs');
  }
  
  if (TOKEN) start(); else login();
})();
