// Category page (/c/:slug): every open role in one field or major skill, so one link can be shared to a community
// (a music group sees only music roles). Server-rendered for link previews and search; board.js keeps it live.
const { shell, BAR, FOOT, notFound } = require('./job.js');
const share = require('./_share.js');
const FN = 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
const SITE = process.env.SITE_URL || 'https://jobs.dijaedadula.com';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const lower = (s) => String(s || '').split(' ').map((w) => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w)).join(' ');
const tagsOf = (j) => (j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 3));
const cut = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'; };

// Find the field (domain) or major skill this slug names, and the live roles in it.
function resolve(slug, jobs) {
  const live = jobs.filter((j) => j.status === 'live' || !j.status);
  const dom = live.find((j) => slugify(j.domain) === slug);
  if (dom) return { kind: 'd', name: dom.domain, jobs: live.filter((j) => j.domain === dom.domain) };
  for (const j of live) for (const t of tagsOf(j)) if (slugify(t) === slug) return { kind: 's', name: t, jobs: live.filter((x) => tagsOf(x).includes(t)) };
  return null;
}

const cardHtml = (j) => `<a class="card" href="/j/${esc(j.slug)}"><div><div class="chips" style="margin:0"><span class="chip dom">${esc(j.domain)}</span><span class="chip">${esc(j.job_type || 'Remote')}</span></div>
      <h3>${esc(j.title)}</h3><span class="muted small">${esc(cut(j.about, 160))}</span>
      ${tagsOf(j).length ? `<div class="tags">${tagsOf(j).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>
      <div class="pay">${esc(j.pay_text || '')}<small>as posted · ${esc(j.company || '')}</small></div></a>`;

function render(slug, c) {
  const url = `${SITE}/c/${slug}`;
  const n = c.jobs.length;
  const label = c.kind === 'd' ? c.name : `${c.name} roles`;
  const title = `${n} remote AI role${n === 1 ? '' : 's'} in ${c.name} · Remote AI Work`;
  const desc = cut(`Open remote AI roles for people with ${lower(c.name)} experience, explained in plain words with pay as posted: ${c.jobs.slice(0, 3).map((j) => j.title).join(', ')}.`, 158);
  const body = `${BAR}
<main class="wrap">
  <section class="hero cat">
    <div>
      <p class="crumbs"><a href="/">Open roles</a> / ${esc(c.kind === 'd' ? 'Field' : 'Skill')}</p>
      <h1>Remote AI roles in ${esc(c.name)}</h1>
      <p>AI labs hire people with real ${esc(lower(c.name))} experience to train and test their models. These are the ${n === 1 ? 'role' : `${n} roles`} open right now, explained in plain words. New ones get added to this page as they open.</p>
    </div>
    <form class="subbox" id="sub" novalidate>
      <b>Get the next ${esc(c.name)} role first</b>
      <span class="muted small">Instant alerts + my free guide to AI training work and the AI interview.</span>
      <input type="email" id="email" placeholder="you@email.com" autocomplete="email" aria-label="Email address" required>
      <div class="hp" aria-hidden="true"><input tabindex="-1" id="website" autocomplete="off"></div>
      <label class="check"><input type="checkbox" id="alerts" checked> <span>Yes, send me job alerts and the free guide. Unsubscribe anytime.</span></label>
      <button class="btn primary block" type="submit" id="subBtn">Send me alerts</button>
      <p class="err" id="err" hidden></p>
    </form>
  </section>
  <div class="row between" style="align-items:baseline;gap:10px;flex-wrap:wrap"><h2 style="margin:0">${esc(label)}</h2><span class="row" style="gap:10px;align-items:center"><span class="muted small" id="count">${n} role${n === 1 ? '' : 's'}</span><button class="btn ghost sm" type="button" id="share" data-url="${esc(url)}" data-title="Remote AI roles in ${esc(c.name)}">Share this list</button></span></div>
  <div class="list" id="list">${c.jobs.map(cardHtml).join('')}</div>
  <p class="muted" style="margin-top:18px">Not your field? <a href="/">See all open roles</a>.</p>
  <div style="margin-top:28px">${share.block({ url, heading: 'Share this list', sub: `Know people in ${c.name}? Post it in your feed or group, or send it in a DM. New roles show up on the same link.`, msgs: {
    feed: `Every open remote AI role in ${c.name}, on one page with pay as posted. Worth saving if this is your field 👇`,
    dm: `Hey, these remote AI roles in ${c.name} made me think of you. Worth a look?` } })}</div>
  <div class="steps3">
    <div><b>1 · Pick a role you've done</b><span class="muted">Only apply where you could talk for 20 minutes about real work.</span></div>
    <div><b>2 · Get the link</b><span class="muted">Enter your email once. Next time, it's one click.</span></div>
    <div><b>3 · Apply on the official site</b><span class="muted">You apply and get paid by the hiring platform, never through me.</span></div>
  </div>
</main>
${FOOT}
<script>window.RJ_FN=${JSON.stringify(FN)};window.RJ_CAT=${JSON.stringify({ k: c.kind, v: c.name, slug }).replace(/</g, '\\u003c')};</script><script src="/assets/board.js?v=202611211200" defer></script><script src="/assets/share.js?v=202611211140" defer></script>`;
  const ld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Remote AI roles in ${c.name}`, url, mainEntity: { '@type': 'ItemList', itemListElement: c.jobs.map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/j/${j.slug}`, name: j.title })) } };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Open roles', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: c.name, item: url }] };
  const jsonld = [ld, crumbs].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
  const v = c.jobs.map((j) => String(j.updated_at || '').replace(/\D/g, '').slice(0, 12)).sort().pop() || '';
  return shell({ title, desc, url, body, jsonld, image: `${SITE}/og/c-${slug}.png?v=${n}${v}`, alt: `${n} remote AI role${n === 1 ? '' : 's'} in ${c.name}` });
}

function empty(slug) {
  return shell({ title: 'No open roles here right now · Remote AI Work', desc: 'Nothing open in this field right now. See all open remote AI roles.', url: `${SITE}/c/${slug}`, robots: 'noindex',
    body: `${BAR}<main class="wrap article"><h1>Nothing open here right now</h1><p class="muted">Roles in this field have filled or closed. Leave your email on the main page and you'll hear when the next one opens.</p><p><a class="btn primary" href="/">See all open roles</a></p></main>${FOOT}` });
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').toLowerCase();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) { res.statusCode = 404; return res.end(notFound()); }
  try {
    const d = await (await fetch(`${FN}?a=list`)).json();
    const c = resolve(slug, d.jobs || []);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    if (!c) { res.statusCode = 404; res.setHeader('X-Robots-Tag', 'noindex'); return res.end(empty(slug)); }
    return res.end(render(slug, c));
  } catch (e) { res.statusCode = 500; return res.end(notFound()); }
};
module.exports.render = render;
module.exports.resolve = resolve;
module.exports.lower = lower;
module.exports.slugify = slugify;
module.exports.empty = empty;
