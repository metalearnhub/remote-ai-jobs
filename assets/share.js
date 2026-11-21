// Share icons. Chat apps and X/Threads/Telegram open a compose screen with message + link filled in.
// Facebook and LinkedIn don't let any site pre-fill post text, and their mobile apps often drop links opened from a web
// page, so on phones they go through the phone's share sheet (the app receives the link and builds the preview card),
// and the message is copied at the same tap so it can be pasted into the post.
(function () {
  // ---- Sharer codes. Every signed-up visitor has a 6-character code; links they share carry ?by=CODE.
  // A visitor who arrives through such a link keeps that code (60 days) and it is saved with their sign-up.
  const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
  const ck = (n) => (document.cookie.split('; ').find((c) => c.startsWith(n + '=')) || '').split('=')[1];
  const store = (k, v, days) => { try { localStorage.setItem(k, v); } catch (e) {} document.cookie = `${k}=${encodeURIComponent(v)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax; Secure`; };
  const read = (k) => { let v = null; try { v = localStorage.getItem(k); } catch (e) {} if (!v) { const c = ck(k); if (c) try { v = decodeURIComponent(c); } catch (e) {} } return v; };
  const lead = () => { try { return JSON.parse(read('rj_lead') || 'null'); } catch (e) { return null; } };
  const inBy = (new URLSearchParams(location.search).get('by') || '').toUpperCase();
  const me0 = lead();
  if (CODE.test(inBy) && !(me0 && me0.code === inBy)) store('rj_by', inBy, 60);
  window.RJ_BY = () => { const v = (read('rj_by') || '').toUpperCase(); return CODE.test(v) ? v : ''; };
  window.RJ_ME = () => { const l = lead(); return l && CODE.test(l.code || '') ? l.code : ''; };
  const subs = [];
  window.RJ_ON_CODE = (f) => subs.push(f);
  window.RJ_SET_LEAD = (v) => { store('rj_lead', JSON.stringify(v), 365); subs.forEach((f) => f()); };
  if (me0 && me0.token && !me0.code && window.RJ_FN) {
    fetch(window.RJ_FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'code', token: me0.token }) })
      .then((r) => r.json()).then((d) => { if (d.code) window.RJ_SET_LEAD(Object.assign({}, me0, { code: d.code })); }).catch(() => {});
  }
  window.RJ_LINK = (url, ref) => { const me = window.RJ_ME(); const u = new URL(url, location.origin); if (ref) u.searchParams.set('ref', ref); if (me) u.searchParams.set('by', me); else u.searchParams.delete('by'); return u.toString(); };
  if (!document.querySelector('[data-share]')) return;

  const withRef = (url, net) => window.RJ_LINK(url, 'share-' + net);
  const hrefFor = { facebook: (u) => 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u), messenger: (u) => 'fb-messenger://share/?link=' + encodeURIComponent(u),
    whatsapp: (u, t) => 'https://wa.me/?text=' + encodeURIComponent(t + '\n' + u), viber: (u, t) => 'viber://forward?text=' + encodeURIComponent(t + '\n' + u),
    threads: (u, t) => 'https://www.threads.net/intent/post?text=' + encodeURIComponent(t + '\n' + u), x: (u, t) => 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(u),
    linkedin: (u) => 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(u), telegram: (u, t) => 'https://t.me/share/url?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(t),
    email: (u, t) => 'mailto:?subject=' + encodeURIComponent(t.split(/[:.!?]/)[0].slice(0, 70)) + '&body=' + encodeURIComponent(t + '\n' + u) };
  const FEEDNET = /^(facebook|threads|x|linkedin)$/;
  const touch = matchMedia('(pointer: coarse)').matches;
  const canShare = !!navigator.share;
  function copy(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(() => true, () => legacy(t));
    return Promise.resolve(legacy(t));
  }
  function legacy(t) { try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:-999px;opacity:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; } }
  let toastEl;
  function toast(m) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'stoast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('on'), 4200);
  }
  function popup(u) { const w = 620, h = 560; const win = window.open(u, 'share', `width=${w},height=${h},left=${(screen.width - w) / 2},top=${(screen.height - h) / 2}`); if (!win) location.href = u; }
  document.querySelectorAll('[data-share]').forEach((box) => {
    const url = box.dataset.url, feed = box.dataset.feed, dm = box.dataset.dm;
    const relink = () => box.querySelectorAll('.si[data-net]').forEach((a) => { const n = a.dataset.net; a.href = hrefFor[n](withRef(url, n), FEEDNET.test(n) ? feed : dm); });
    relink(); window.RJ_ON_CODE(relink);
    if (touch) box.querySelectorAll('[data-mobile]').forEach((a) => (a.hidden = false));
    if (canShare && touch) box.querySelector('[data-native]').hidden = false;
    box.addEventListener('click', (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) { copy(feed + '\n' + withRef(url, 'copy')).then((ok) => { if (ok) { c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 1500); toast('Copied: message + link ✓'); } else window.prompt('Copy this:', feed + '\n' + withRef(url, 'copy')); }); return; }
      if (e.target.closest('[data-native]')) { navigator.share({ text: dm + '\n' + withRef(url, 'native') }).catch(() => {}); return; }
      const a = e.target.closest('.si[data-net]'); if (!a) return;
      const net = a.dataset.net;
      if (net === 'facebook' || net === 'linkedin') {
        e.preventDefault();
        const link = withRef(url, net);
        copy(feed).then((ok) => ok && toast(`Message copied. In ${net === 'facebook' ? 'Facebook' : 'LinkedIn'}, tap the post box and Paste it above the link.`));
        if (touch && canShare) { navigator.share({ url: link }).catch(() => {}); return; }
        popup(net === 'facebook' ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link) : 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link));
        return;
      }
      if (net === 'messenger') copy(dm);
      if (!touch && /^(x|threads|telegram)$/.test(net)) { e.preventDefault(); popup(a.href); }
    });
  });
})();
