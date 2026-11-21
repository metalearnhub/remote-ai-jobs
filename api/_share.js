// Share row for job and category pages: icon buttons only. Each network opens its own compose screen with the
// ready message + link filled in (feed text for feed networks, DM text for chat apps). Copy puts message + link on the clipboard.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = (d, fill) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${d}</svg>`;
const T = (t, size = 17) => `<span class="sg" style="font-size:${size}px">${t}</span>`;
// [key, label, mode, mobileOnly, glyph]
const NETS = [
  ['facebook', 'Facebook', 'feed', 0, T('f', 22)],
  ['messenger', 'Messenger', 'dm', 1, '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 2.5C6.7 2.5 2.5 6.4 2.5 11.4c0 2.8 1.3 5.3 3.4 6.9V22l3.2-1.8c.9.3 1.9.4 2.9.4 5.3 0 9.5-3.9 9.5-8.9S17.3 2.5 12 2.5z" fill="currentColor"/><path d="m6.6 14.2 3.3-3.6 2.3 2.1 3.9-2.1-3.3 3.6-2.3-2.1z" fill="#A033FF" stroke="#A033FF" stroke-width="1.2" stroke-linejoin="round"/></svg>'],
  ['whatsapp', 'WhatsApp', 'dm', 0, S('<path d="M7.5 4.5c.6 0 1 .3 1.2.9l.9 2.3c.2.5 0 1-.3 1.4l-.8.9a9.6 9.6 0 0 0 4.4 4.4l.9-.8c.4-.3.9-.5 1.4-.3l2.3.9c.6.2.9.6.9 1.2v1.4c0 1-.8 1.8-1.8 1.7A13.6 13.6 0 0 1 4.4 6.3C4.3 5.3 5.1 4.5 6.1 4.5z"/>', 1)],
  ['viber', 'Viber', 'dm', 1, S('<path d="M7.5 4.5c.6 0 1 .3 1.2.9l.9 2.3c.2.5 0 1-.3 1.4l-.8.9a9.6 9.6 0 0 0 4.4 4.4l.9-.8c.4-.3.9-.5 1.4-.3l2.3.9c.6.2.9.6.9 1.2v1.4c0 1-.8 1.8-1.8 1.7A13.6 13.6 0 0 1 4.4 6.3C4.3 5.3 5.1 4.5 6.1 4.5z"/>', 1)],
  ['threads', 'Threads', 'feed', 0, T('@', 20)],
  ['x', 'X', 'feed', 0, T('𝕏', 18)],
  ['linkedin', 'LinkedIn', 'feed', 0, T('in', 17)],
  ['telegram', 'Telegram', 'dm', 0, S('<path d="M21 4 3 11l6 2 2 6 3-4 4 3z"/><path d="m9 13 8-6"/>')],
  ['email', 'Email', 'dm', 0, S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')],
];
const COPY = S('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>');
const MORE = S('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>');
const withRef = (url, net) => `${url}${url.includes('?') ? '&' : '?'}ref=share-${net}`;
function href(net, url, text) {
  const u = encodeURIComponent(withRef(url, net)), t = encodeURIComponent(text), tu = encodeURIComponent(`${text}\n${withRef(url, net)}`);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    messenger: `fb-messenger://share/?link=${u}`,
    whatsapp: `https://wa.me/?text=${tu}`,
    viber: `viber://forward?text=${tu}`,
    threads: `https://www.threads.net/intent/post?text=${tu}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    email: `mailto:?subject=${encodeURIComponent(text.split(/[:.!?]/)[0].slice(0, 70))}&body=${tu}`,
  }[net];
}
// msgs: { feed, dm } short texts without the link.
function block({ url, heading, msgs }) {
  return `<section class="sec share" data-share data-url="${esc(url)}" data-feed="${esc(msgs.feed)}" data-dm="${esc(msgs.dm)}">
  <h2>${esc(heading)}</h2>
  <div class="sicons">
    <button type="button" class="si n-copy" data-copy title="Copy message + link" aria-label="Copy message and link">${COPY}</button>
    ${NETS.map(([k, label, mode, mob, g]) => `<a class="si n-${k}" data-net="${k}"${mob ? ' data-mobile hidden' : ''} href="${esc(href(k, url, msgs[mode]))}" target="_blank" rel="noopener nofollow" title="Share on ${label}" aria-label="Share on ${label}">${g}</a>`).join('')}
    <button type="button" class="si n-more" data-native hidden title="More apps" aria-label="Share with another app">${MORE}</button>
  </div>
  <p class="shint small" role="status" aria-live="polite"></p>
</section>`;
}
module.exports = { block, href, NETS };
