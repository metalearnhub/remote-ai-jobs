// Remote AI Work admin: sign in (emailed code), add jobs from pasted text, links list, Threads drafts, leads, alerts.
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
      <input type="email" id="le" value="dijaedadula@gmail.com" autocomplete="email"><button class="btn primary" id="lb">Email me a code</button>
      <div id="lc" hidden><input type="text" inputmode="numeric" id="code" placeholder="6-digit code" maxlength="6"><button class="btn primary block" style="margin-top:10px" type="button" id="lv">Sign in</button></div>
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

  // ---------- parser: micro1-style job text → fields ----------
  const HEAD = {
    about: /^(about the role|the role|role overview|overview|about)\b/i,
    scope: /^(scope of work|what you'?ll do|responsibilities|key responsibilities|what you will do|your role)\b/i,
    preferred: /^(preferred qualifications|what we'?re looking for|requirements|qualifications|who you are|strong plus|nice to have|minimum qualifications)\b/i,
    skills: /^required skills\b/i,
    stop: /^(job description|refer and earn|apply now|the national pay range|micro1 is an equal|our hiring process|benefits|compensation)\b/i,
  };
  function parse(raw) {
    const t = String(raw || '').replace(/\r/g, '');
    const L = t.split('\n').map((x) => x.trim());
    const out = { title: '', pay_text: '', openings: '', job_type: 'Contract · Remote', about: '', scope: [], preferred: [], skills: [] };
    const rt = t.match(/Role Title:\s*(.+)/i) || t.match(/Job Title:\s*(.+)/i);
    out.title = rt ? rt[1].trim() : (L.find((x) => x && !/^(posted|high demand|new|experts|company|opportunities|product|your referral)/i.test(x)) || '');
    const pay = t.match(/\$\s?[\d,.]+[kK]?\s*[-–to]+\s*\$\s?[\d,.]+[kK]?\s*\/\s*(hour|hr|year|yr|month|mo)\b/i) || t.match(/\$\s?[\d,.]+[kK]?\s*\/\s*(hour|hr)\b/i);
    if (pay) out.pay_text = pay[0].replace(/\s+/g, ' ').replace(/\s*-\s*/, '–').replace(/\/\s*hour/i, '/hr').replace(/\/\s*year/i, '/yr');
    const op = t.match(/(\d[\d,]*)\s+openings?/i); if (op) out.openings = `${op[1]} opening${op[1] === '1' ? '' : 's'}`;
    const ty = t.match(/Role Type:\s*(.+)/i) || t.match(/Job Type:\s*(.+)/i); const lo = t.match(/Location:\s*(.+)/i);
    if (ty || lo) out.job_type = [ty && ty[1].trim(), lo && lo[1].trim()].filter(Boolean).join(' · ');
    let cur = null;
    const seen = new Set();
    for (const raw2 of L) {
      const x = raw2.replace(/\s+/g, ' ');
      if (!x) continue;
      if (HEAD.stop.test(x)) { cur = null; continue; }
      let hit = null;
      for (const k of ['skills', 'about', 'scope', 'preferred']) if (HEAD[k].test(x)) { hit = k; break; }
      if (hit) {
        cur = hit;
        const rest = x.replace(HEAD[hit], '').replace(/^[:\s]+/, '');
        if (rest && hit === 'about') out.about += rest + ' ';
        continue;
      }
      if (/^(role title|role type|location|job title|job type|posted|pay:?|\$|\d+ openings?|\+\d+$)/i.test(x)) continue;
      if (!cur) continue;
      if (cur === 'about') out.about += x + ' ';
      else if (cur === 'skills') { if (x.length < 60 && !seen.has('s' + x)) { seen.add('s' + x); out.skills.push(x); } }
      else if (!seen.has(cur + x)) { seen.add(cur + x); out[cur].push(x.replace(/^[-•*·]\s*/, '')); }
    }
    out.about = out.about.trim().replace(/^micro1 is partnering with a leading AI lab to hire /i, 'A leading AI lab, through micro1, is hiring ');
    out.domain = window.RJ_DETECT(out.title + ' ' + out.skills.join(' ') + ' ' + out.scope.join(' '));
    return out;
  }
  function autoFill(j) {
    const d = D[j.domain] || D['General AI training'];
    if (!j.fit || !j.fit.length) j.fit = d.fit.slice();
    if (!j.prep || !j.prep.length) j.prep = d.prep.slice();
    if (!j.take) j.take = `If you've done this work for real, this is one of the better-paid ways to use it remotely. Apply only if you can walk through your own examples in depth: the AI interview keeps asking "how" until it finds the edge of what you know.`;
    return j;
  }

  // ---------- Threads drafts (≤ 500 chars, always disclosed) ----------
  function threads(j, ch = 'threads') {
    const d = D[j.domain] || D['General AI training'];
    const url = `${SITE}/j/${j.slug}?ref=${ch}`;
    const pay = j.pay_text ? `${j.pay_text} (as posted)` : 'pay as posted';
    const disc = '(Referral partner: I may earn a bonus if you\'re hired.)';
    const s0 = (j.scope && j.scope[0]) ? j.scope[0].replace(/\.$/, '') : d.verb;
    const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
    const fit = (j.fit && j.fit.length ? j.fit : d.fit).slice(0, 3);
    const posts = [
      `${j.title}, fully remote. ${pay}.\n\nThe work: ${lc(s0)}.\n\nBuilt for ${d.who} who've done this for real, not people "getting into AI".\n\nDetails, plain-English breakdown and how to apply:\n${url}\n${disc}`,
      `${d.who.charAt(0).toUpperCase() + d.who.slice(1)}: AI labs are paying experts to ${d.verb}.\n\nThis one: ${j.title} · ${pay}.\n\nQuick test before you apply: could you talk for 20 minutes about real work you've done in this area? If yes, it's worth a look.\n\n${url}\n${disc}`,
      `3 signs this remote AI role fits you:\n\n1. ${fit[0]}\n2. ${fit[1] || ''}\n3. ${fit[2] || ''}\n\n${j.title} · ${pay}\n${url}\n${disc}`,
    ];
    return posts.map((t) => t.replace(/\n{3,}/g, '\n\n')).map((t) => (t.length > 500 ? t.slice(0, 497) + '…' : t)).map((text) => ({ text, posted: null }));
  }

  // ---------- views ----------
  function tab(t) {
    $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === t));
    ({ jobs: viewJobs, new: () => viewEdit(null), links: viewLinks, threads: viewThreads, leads: viewLeads, alerts: viewAlerts }[t] || viewJobs)();
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
      <div class="hint">Daily routine (≈2 min): open your referral dashboard yourself, pick 1–3 roles, click "Refer and earn", then paste the link and the job text into <a href="#new">Add job</a>. Automated tools on the referral site aren't allowed by its terms, so this step stays manual.</div>
      <div class="panel" style="margin-top:14px;overflow-x:auto">${JOBS.length ? `<table class="t"><tr><th>Role</th><th class="hm">Domain</th><th>Status</th><th>Views</th><th>Applies</th><th></th></tr>
      ${JOBS.map((j) => `<tr><td><b>${esc(j.title)}</b><br><span class="muted small">${esc(j.pay_text || '')}</span></td><td class="hm">${esc(j.domain)}</td><td><span class="pill ${j.status}">${j.status}</span></td><td>${j.views}</td><td>${j.applies}</td>
      <td class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-copy="${esc(pageUrl(j))}">Copy link</button>${j.status !== 'draft' ? `<a class="btn ghost sm" target="_blank" href="${esc(pageUrl(j))}">Open</a>` : ''}<a class="btn ghost sm" href="#edit-${j.id}">Edit</a></td></tr>`).join('')}</table>` : '<p class="muted">No jobs yet. <a href="#new">Add your first one</a>.</p>'}</div></div>`;
    $$('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.copy));
  }

  function viewEdit(job) {
    const j = job ? JSON.parse(JSON.stringify(job)) : { status: 'draft', company: 'micro1', skills: [], scope: [], preferred: [], fit: [], prep: [], threads: [] };
    app.innerHTML = `<div class="adm"><h1>${job ? 'Edit job' : 'Add a job'}</h1>
      <div class="panel"><h2>1 · Paste from your referral dashboard</h2>
        <label class="f">Your referral link for this role <small>From "Refer and earn" on the role</small><input type="url" id="ref" placeholder="https://…" value="${esc(j.referral_url || '')}"></label>
        <label class="f" style="margin-top:12px">Full job text <small>Select everything on the role page and paste it here</small><textarea class="big" id="raw" placeholder="Junior Software Engineer&#10;Posted by micro1&#10;100 openings&#10;$150 - $200/hr&#10;Required Skills …">${esc(j.raw || '')}</textarea></label>
        <div class="row" style="margin-top:12px"><button class="btn primary sm" id="parse">Build the page from this text</button><span class="muted small">You can edit everything below.</span></div></div>
      <div class="panel" id="fields"></div></div>`;
    function fields() {
      const doms = Object.keys(D);
      $('#fields').innerHTML = `<h2>2 · Check the page</h2>
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
        if (!o.threads.length || !j.id) o.threads = threads(o);
        try { const d = await api({ action: 'save', job: o }); j = d.job; toast(status === 'live' ? 'Published' : status === 'closed' ? 'Marked closed' : 'Draft saved'); location.hash = status === 'live' ? 'threads' : 'jobs'; }
        catch (x) { e.textContent = x.message; e.hidden = false; }
      };
      $('#pub').onclick = () => save('live');
      $('#draft').onclick = () => save('draft');
      if ($('#close')) $('#close').onclick = () => save('closed');
      if ($('#del')) $('#del').onclick = async () => { if (!confirm('Delete this job page permanently?')) return; await api({ action: 'delete', id: j.id }); toast('Deleted'); location.hash = 'jobs'; };
    }
    $('#parse').onclick = () => {
      const p = parse($('#raw').value);
      if (!p.title) { toast('Couldn\'t find a title. Fill the fields by hand.'); }
      Object.assign(j, p, { referral_url: $('#ref').value.trim() });
      j.slug = j.id ? j.slug : slugify(p.title);
      if (!j.id && JOBS.some((x) => x.slug === j.slug)) j.slug = slugify(p.title + '-' + new Date().toISOString().slice(5, 10));
      j.fit = []; j.prep = []; j.take = j.take || '';
      autoFill(j); fields(); toast('Page built. Check it, then publish.');
    };
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
      <textarea id="out" class="big" style="margin-top:12px" readonly></textarea>
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
    app.innerHTML = `<div class="adm"><h1>Threads drafts</h1><p class="muted">3 drafts per live role, each under Threads' 500-character limit and disclosed as a referral link. Post 1–2 a week per role; consistency beats volume.</p>
      ${live.length ? live.map((j) => `<div class="panel" data-id="${j.id}"><div class="row between"><div><b>${esc(j.title)}</b> <span class="muted small">· ${esc(j.domain)}</span></div><button class="btn ghost sm" data-regen>Regenerate</button></div>
      <div class="grid3" style="margin-top:12px">${(j.threads && j.threads.length ? j.threads : threads(j)).map((p, i) => `<div class="post"><textarea data-i="${i}">${esc(p.text)}</textarea>
      <div class="row between"><span class="count">${p.text.length}/500</span><span class="row"><button class="btn ghost sm" data-posted="${i}">${p.posted ? 'Posted ' + esc(p.posted) : 'Mark posted'}</button><button class="btn primary sm" data-cp="${i}">Copy</button></span></div></div>`).join('')}</div></div>`).join('') : '<div class="panel muted">Publish a job to get drafts.</div>'}</div>`;
    $$('.panel[data-id]').forEach((pn) => {
      const j = JOBS.find((x) => String(x.id) === pn.dataset.id);
      if (!j.threads || !j.threads.length) j.threads = threads(j);
      const persist = async () => { try { await api({ action: 'save', job: Object.assign({}, j) }); } catch (e) { toast(e.message); } };
      $$('textarea', pn).forEach((ta) => ta.oninput = () => { const i = +ta.dataset.i; j.threads[i].text = ta.value; const c = ta.parentElement.querySelector('.count'); c.textContent = ta.value.length + '/500'; c.classList.toggle('over', ta.value.length > 500); clearTimeout(ta._t); ta._t = setTimeout(persist, 800); });
      $$('[data-cp]', pn).forEach((b) => b.onclick = () => copy(j.threads[+b.dataset.cp].text));
      $$('[data-posted]', pn).forEach((b) => b.onclick = async () => { const i = +b.dataset.posted; j.threads[i].posted = new Date().toISOString().slice(0, 10); b.textContent = 'Posted ' + j.threads[i].posted; await persist(); });
      $('[data-regen]', pn).onclick = async () => { j.threads = threads(j); await persist(); viewThreads(); };
    });
  }

  async function viewLeads() {
    app.innerHTML = '<div class="adm"><p class="muted">Loading…</p></div>';
    const d = await api({ action: 'leads' });
    const L = d.leads || [];
    app.innerHTML = `<div class="adm"><div class="row between"><h1>Leads</h1><button class="btn ghost sm" id="csv">Export CSV</button></div>
      <div class="stats"><div><b>${L.length}</b><span>emails captured</span></div><div><b>${L.filter((x) => x.alerts).length}</b><span>opted in here</span></div><div><b>${d.alert_subscribers}</b><span>active alert subscribers</span></div><div><b>${L.filter((x) => Date.now() - Date.parse(x.created_at) < 7 * 864e5).length}</b><span>last 7 days</span></div></div>
      <div class="panel" style="overflow-x:auto"><table class="t"><tr><th>Email</th><th>Alerts</th><th class="hm">First role</th><th class="hm">Source</th><th>Date</th></tr>
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
  window.RJ_PARSE = parse; window.RJ_THREADS = threads;
  if (TOKEN) start(); else login();
})();
