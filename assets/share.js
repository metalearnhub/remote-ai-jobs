// Share icons: copy (message + link), native share sheet on phones, and a clipboard backup for apps that only take a link.
(function () {
  const withRef = (url, net) => url + (url.indexOf('?') > -1 ? '&' : '?') + 'ref=share-' + net;
  const touch = matchMedia('(pointer: coarse)').matches;
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { window.prompt('Copy this:', t); return false; } }
  document.querySelectorAll('[data-share]').forEach((box) => {
    const url = box.dataset.url, feed = box.dataset.feed, dm = box.dataset.dm, hint = box.querySelector('.shint');
    const say = (m) => { hint.textContent = m; clearTimeout(hint._t); hint._t = setTimeout(() => (hint.textContent = ''), 3500); };
    if (touch) box.querySelectorAll('[data-mobile]').forEach((a) => (a.hidden = false));
    if (navigator.share && touch) box.querySelector('[data-native]').hidden = false;
    box.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) { if (await copy(feed + '\n' + withRef(url, 'copy'))) { c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 1500); say('Copied: message + link ✓'); } return; }
      if (e.target.closest('[data-native]')) { try { await navigator.share({ text: dm, url: withRef(url, 'native') }); } catch (x) {} return; }
      const a = e.target.closest('.si[data-net]');
      // LinkedIn and Messenger only take the link, so the message is also copied, ready to paste.
      if (a && /^(linkedin|messenger|facebook)$/.test(a.dataset.net)) copy(a.dataset.net === 'messenger' ? dm : feed).then((ok) => ok && say('Message copied too. Paste it if the app leaves it out.'));
    });
  });
})();
