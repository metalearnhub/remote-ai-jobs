// Share icons. Chat apps and X/Threads/Telegram open a compose screen with message + link filled in.
// Facebook and LinkedIn don't let any site pre-fill post text, and their mobile apps often drop links opened from a web
// page, so on phones they go through the phone's share sheet (the app receives the link and builds the preview card),
// and the message is copied at the same tap so it can be pasted into the post.
(function () {
  const withRef = (url, net) => url + (url.indexOf('?') > -1 ? '&' : '?') + 'ref=share-' + net;
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
