// "Share this" block for job and category pages: a short ready message (feed or DM), copy buttons and one-tap
// share links for the main networks. Links work without JavaScript; assets/share.js adds copy, editing and tracking.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NETS = [
  ['facebook', 'Facebook', 'feed'], ['messenger', 'Messenger', 'dm', 'm'], ['whatsapp', 'WhatsApp', 'dm'], ['viber', 'Viber', 'dm', 'm'],
  ['threads', 'Threads', 'feed'], ['x', 'X', 'feed'], ['linkedin', 'LinkedIn', 'feed'], ['telegram', 'Telegram', 'dm'], ['email', 'Email', 'dm'],
];
const withRef = (url, net) => `${url}${url.includes('?') ? '&' : '?'}ref=share-${net}`;
function href(net, url, text) {
  const u = encodeURIComponent(withRef(url, net)), t = encodeURIComponent(text), tu = encodeURIComponent(`${text}\n${withRef(url, net)}`);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
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
// msgs: { feed, dm } short texts without the link. heading: e.g. "Share this role".
function block({ url, heading, sub, msgs }) {
  return `<section class="sec share" data-share data-url="${esc(url)}" data-feed="${esc(msgs.feed)}" data-dm="${esc(msgs.dm)}">
  <h2>${esc(heading)}</h2>
  <p class="muted small">${esc(sub)}</p>
  <div class="seg" role="tablist" aria-label="Message type"><button type="button" role="tab" aria-selected="true" data-mode="feed">For my feed</button><button type="button" role="tab" aria-selected="false" data-mode="dm">For a DM</button></div>
  <textarea class="smsg" rows="3" aria-label="Message to share (you can edit it)">${esc(msgs.feed)}</textarea>
  <div class="sact"><button type="button" class="btn primary sm" data-copy="msg">Copy message + link</button><button type="button" class="btn ghost sm" data-copy="link">Copy link</button><button type="button" class="btn ghost sm" data-native hidden>More…</button></div>
  <div class="snets">${NETS.map(([k, label, , mob]) => `<a class="snet n-${k}" data-net="${k}"${mob ? ' data-mobile hidden' : ''} href="${esc(href(k, url, msgs.feed))}" target="_blank" rel="noopener nofollow">${esc(label)}</a>`).join('')}</div>
  <p class="smuted small" data-hint hidden>Message copied. Paste it into your post.</p>
</section>`;
}
module.exports = { block, href, NETS };
