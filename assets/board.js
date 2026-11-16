(function () {
  const FN = window.RJ_FN;
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const list = document.getElementById('list');
  fetch(FN + '?a=list').then((r) => r.json()).then((d) => {
    const jobs = d.jobs || [];
    if (!jobs.length) { list.innerHTML = '<div class="empty">No roles open right now. Leave your email above and you\'ll hear first when one opens.</div>'; return; }
    list.innerHTML = jobs.map((j) => `<a class="card" href="/j/${esc(j.slug)}"><div><div class="chips" style="margin:0"><span class="chip dom">${esc(j.domain)}</span><span class="chip">${esc(j.job_type || 'Remote')}</span></div>
      <h3>${esc(j.title)}</h3><span class="muted small">${esc(String(j.about || '').slice(0, 150))}${String(j.about || '').length > 150 ? '…' : ''}</span></div>
      <div class="pay">${esc(j.pay_text || '')}<small>as posted · ${esc(j.company || '')}</small></div></a>`).join('');
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
      const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'capture', email, alerts: true, website: document.getElementById('website').value, ref: new URLSearchParams(location.search).get('ref') || 'board' }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Something went wrong.');
      const v = JSON.stringify({ token: d.token, email });
      try { localStorage.setItem('rj_lead', v); } catch (x) {}
      document.cookie = `rj_lead=${encodeURIComponent(v)}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax; Secure`;
      f.innerHTML = '<b>You\'re on the list ✓</b><span class="muted small">Check your inbox for the free guide. Any role page now opens with one click.</span><a class="btn ghost block" href="/guide">Open the guide now</a>';
    } catch (x) { b.disabled = false; b.textContent = 'Send me alerts'; er.textContent = x.message; er.hidden = false; }
  });
})();
