// Share blocks: switch feed/DM message, keep network links in sync with the (editable) text, copy, native share.
(function () {
  const withRef = (url, net) => url + (url.indexOf('?') > -1 ? '&' : '?') + 'ref=share-' + net;
  const enc = encodeURIComponent;
  function href(net, url, text) {
    const u = enc(withRef(url, net)), t = enc(text), tu = enc(text + '\n' + withRef(url, net));
    return { facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u, messenger: 'fb-messenger://share/?link=' + u, whatsapp: 'https://wa.me/?text=' + tu, viber: 'viber://forward?text=' + tu,
      threads: 'https://www.threads.net/intent/post?text=' + tu, x: 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u, linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
      telegram: 'https://t.me/share/url?url=' + u + '&text=' + t, email: 'mailto:?subject=' + enc(text.split(/[:.!?]/)[0].slice(0, 70)) + '&body=' + tu }[net];
  }
  const touch = matchMedia('(pointer: coarse)').matches;
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { window.prompt('Copy this:', t); return false; } }
  function flash(b, m) { const t = b.textContent; b.textContent = m || 'Copied ✓'; b.classList.add('ok'); setTimeout(() => { b.textContent = t; b.classList.remove('ok'); }, 1500); }
  document.querySelectorAll('[data-share]').forEach((box) => {
    const url = box.dataset.url, ta = box.querySelector('.smsg'), hint = box.querySelector('[data-hint]');
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 4 + 'px'; };
    const sync = () => { fit(); box.querySelectorAll('.snet').forEach((a) => (a.href = href(a.dataset.net, url, ta.value.trim()))); };
    fit();
    if (touch) box.querySelectorAll('[data-mobile]').forEach((a) => (a.hidden = false));
    const nat = box.querySelector('[data-native]'); if (navigator.share && touch) nat.hidden = false;
    box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      box.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      ta.value = box.dataset[b.dataset.mode]; sync();
    }));
    ta.addEventListener('input', sync);
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-copy]');
      if (b) { if (await copy(b.dataset.copy === 'msg' ? ta.value.trim() + '\n' + withRef(url, 'copy') : withRef(url, 'link'))) flash(b); return; }
      if (e.target.closest('[data-native]')) { try { await navigator.share({ text: ta.value.trim(), url: withRef(url, 'native') }); } catch (x) {} return; }
      const a = e.target.closest('.snet');
      // Facebook, LinkedIn and Messenger only take the link, so the message goes to the clipboard to paste.
      if (a && /^(facebook|linkedin|messenger)$/.test(a.dataset.net)) { copy(ta.value.trim()).then((ok) => { if (ok && hint) { hint.hidden = false; setTimeout(() => (hint.hidden = true), 4000); } }); }
    });
  });
})();
