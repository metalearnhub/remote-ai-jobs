// Job alert settings: each subscriber ticks the fields, locations, work types and skills they want alerts for.
// Opened from the sign-up success screen, the welcome email and every alert email (link carries #t=<token>).
(function () {
  const FN = window.RJ_FN;
  const app = document.getElementById('app');
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const hashT = (location.hash.match(/[#&]t=([0-9a-f-]{36})/) || [])[1];
  const lead = () => { try { return JSON.parse(localStorage.getItem('rj_lead') || 'null'); } catch (e) { return null; } };
  const cookieLead = () => { const c = (document.cookie.split('; ').find((x) => x.startsWith('rj_lead=')) || '').split('=')[1]; try { return c ? JSON.parse(decodeURIComponent(c)) : null; } catch (e) { return null; } };
  const TOKEN = hashT || ((lead() || cookieLead() || {}).token) || '';
  if (hashT) history.replaceState(null, '', location.pathname + location.search); // keep the token out of the address bar

  async function post(body) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong. Try again.'), d);
    return d;
  }

  // Same rules the server uses when it sends an alert.
  const kindOf = (j) => { const t = String(j.job_type || ''); return /full-time/i.test(t) ? 'full-time' : /part-time/i.test(t) ? 'part-time' : /per task/i.test(t) ? 'per-task' : 'contract'; };
  const whereKeysOf = (j) => { const e = j.eligibility; if (!e || e.kind !== 'countries') return ['open']; return [String(e.short || '').replace(/ only$/, '')]; };
  const tagsOf = (j) => (j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 3));
  const match = (j, p) => (!p.fields.length || p.fields.includes(j.domain)) && (!p.where.length || whereKeysOf(j).some((k) => p.where.includes(k))) && (!p.types.length || p.types.includes(kindOf(j))) && (!p.skills.length || tagsOf(j).some((t) => p.skills.includes(t)));
  const whereLabel = (k) => (k === 'open' ? '🌍 Open to all countries' : `📍 ${k} only`);

  function askEmail(msg) {
    app.innerHTML = `<h1>Your job alerts</h1>
      <p class="lead-p">Choose which remote AI roles you hear about: your field, where you can apply from, type of work and skills.</p>
      ${msg ? `<p class="warn">${esc(msg)}</p>` : ''}
      <form class="subbox open" id="lf" novalidate style="max-width:520px">
        <b>Get your settings link</b><span class="muted small">Enter the email you signed up with. I'll send you a private link to your alert settings.</span>
        <input type="email" id="le" placeholder="you@email.com" autocomplete="email" aria-label="Email address" required>
        <button class="btn primary block" type="submit" id="lb">Email me my settings link</button><p class="err" id="lerr" hidden></p>
      </form>
      <p class="muted small" style="margin-top:14px">Not signed up yet? <a href="/#sub">Get alerts on the job board</a>.</p>`;
    document.getElementById('lf').onsubmit = async (e) => {
      e.preventDefault();
      const em = document.getElementById('le').value.trim(), er = document.getElementById('lerr'), b = document.getElementById('lb'); er.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = 'Enter a valid email address.'; er.hidden = false; return; }
      b.disabled = true; b.textContent = 'Sending…';
      try { await post({ action: 'prefs_link', email: em }); document.getElementById('lf').innerHTML = `<b>Check your inbox ✓</b><span class="muted small">If ${esc(em)} is on the list, a settings link is on its way. It can take a minute; check Promotions or Spam too.</span>`; }
      catch (x) { b.disabled = false; b.textContent = 'Email me my settings link'; er.textContent = x.message; er.hidden = false; }
    };
  }

  function render(d, jobs) {
    const p = { fields: [...d.prefs.fields], where: [...d.prefs.where], types: [...d.prefs.types], skills: [...d.prefs.skills] };
    const empty = !p.fields.length && !p.where.length && !p.types.length && !p.skills.length;
    const sug = qs.get('d');
    if (empty && sug && d.options.fields.some((f) => f.name === sug)) p.fields.push(sug);
    const chip = (g, name, label, count) => `<label class="pchip"><input type="checkbox" data-g="${g}" value="${esc(name)}"${p[g].includes(name) ? ' checked' : ''}><span>${esc(label)}${count != null ? ` <i>${count}</i>` : ''}</span></label>`;
    const group = (g, title, hint, opts) => `<section class="pgroup" data-group="${g}"><div class="pgh"><h2>${title}</h2><button type="button" class="linkish" data-clear="${g}">Any</button></div><p class="muted small">${hint}</p><div class="pchips">${opts}</div></section>`;
    app.innerHTML = `<h1>Your job alerts</h1>
      <p class="muted">For ${esc(d.email)} · ${d.subscribed ? '<span class="pon">🔔 Alerts are on</span>' : '<span class="poff">🔕 Alerts are off</span>'}</p>
      <p class="lead-p">Tick only what you want. Leave a group on <b>Any</b> to get everything in it. I'll only email you roles that match.</p>
      ${empty && sug && p.fields.length ? `<p class="hint">I ticked <b>${esc(sug)}</b> because you came from a role in that field. Change it however you like.</p>` : ''}
      ${group('where', 'Where can you apply from?', 'Many roles are open to any country. Some are limited to the US, LATAM or another country.', d.options.where.map((o) => chip('where', o.name, whereLabel(o.name), o.count)).join(''))}
      ${group('types', 'Type of work', 'Contract and project work is the most common.', d.options.types.map((o) => chip('types', o.name, o.label, o.count)).join(''))}
      ${group('fields', 'Fields', 'Pick the areas you have real experience in.', d.options.fields.map((o) => chip('fields', o.name, o.name, o.count)).join(''))}
      ${group('skills', 'Skills <small class="muted">(optional)</small>', 'Narrow it down further. Most people leave this on Any.', d.options.skills.map((o) => chip('skills', o.name, o.name, o.count)).join(''))}
      <section class="pprev" id="prev"></section>
      <div class="psave"><div class="wrap"><span id="pcount" class="muted small"></span><button type="button" class="btn ghost" id="preset">Reset</button><button type="button" class="btn primary" id="psave">${d.subscribed ? 'Save my alerts' : 'Save & turn alerts on'}</button></div></div>
      ${d.unsub && d.subscribed ? `<p class="muted small" style="margin:22px 0 90px">Don't want any alerts? <a href="${esc(d.unsub)}">Unsubscribe</a>.</p>` : '<div style="height:90px"></div>'}`;
    const update = () => {
      const m = jobs.filter((j) => match(j, p));
      const anyPick = p.fields.length || p.where.length || p.types.length || p.skills.length;
      document.getElementById('pcount').innerHTML = anyPick ? `<b>${m.length}</b> of ${jobs.length} open roles match` : `All ${jobs.length} open roles`;
      document.getElementById('prev').innerHTML = `<h2>Roles open right now that you'd get</h2>${m.length ? `<div class="alts">${m.slice(0, 5).map((j) => `<a href="/j/${esc(j.slug)}"><span><b>${esc(j.title)}</b><small>${esc(j.domain)}${j.eligibility && j.eligibility.short ? ' · ' + esc(j.eligibility.short) : ''}</small></span><span class="p">${esc(j.pay_text || '')}</span></a>`).join('')}</div>${m.length > 5 ? `<p class="muted small">…and ${m.length - 5} more.</p>` : ''}` : '<p class="muted">No open roles match right now. That\'s fine: you\'ll hear as soon as one does. Or loosen a group to Any.</p>'}`;
      app.querySelectorAll('[data-clear]').forEach((b) => b.classList.toggle('on', !p[b.dataset.clear].length));
    };
    app.addEventListener('change', (e) => {
      const c = e.target.closest('input[data-g]'); if (!c) return;
      const g = c.dataset.g; p[g] = p[g].filter((x) => x !== c.value); if (c.checked) p[g].push(c.value);
      update();
    });
    app.addEventListener('click', (e) => {
      const b = e.target.closest('[data-clear]'); if (!b) return;
      const g = b.dataset.clear; p[g] = []; app.querySelectorAll(`input[data-g="${g}"]`).forEach((x) => (x.checked = false)); update();
    });
    document.getElementById('preset').onclick = () => { ['fields', 'where', 'types', 'skills'].forEach((g) => (p[g] = [])); app.querySelectorAll('input[data-g]').forEach((x) => (x.checked = false)); update(); };
    document.getElementById('psave').onclick = async () => {
      const b = document.getElementById('psave'); b.disabled = true; b.textContent = 'Saving…';
      try {
        await post({ action: 'prefs_set', token: TOKEN, prefs: p, subscribe: !d.subscribed });
        d.subscribed = true; b.textContent = 'Saved ✓'; b.classList.add('ok');
        const on = app.querySelector('.poff'); if (on) { on.className = 'pon'; on.textContent = '🔔 Alerts are on'; }
        setTimeout(() => { b.disabled = false; b.classList.remove('ok'); b.textContent = 'Save my alerts'; }, 1800);
      } catch (x) { b.disabled = false; b.textContent = 'Save my alerts'; document.getElementById('pcount').innerHTML = `<span class="err">${esc(x.message)}</span>`; }
    };
    update();
  }

  if (!TOKEN) return askEmail();
  Promise.all([post({ action: 'prefs_get', token: TOKEN }), fetch(FN + '?a=list').then((r) => r.json()).catch(() => ({ jobs: [] }))])
    .then(([d, l]) => render(d, l.jobs || []))
    .catch((e) => askEmail(e.reset ? 'That settings link has expired. Enter your email to get a new one.' : e.message));
})();
