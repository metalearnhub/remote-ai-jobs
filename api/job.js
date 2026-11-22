// Server-rendered job page (/j/:slug) so link previews on Threads, LinkedIn and chat apps show the real role.
const FN = 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
const SITE = process.env.SITE_URL || 'https://jobs.dijaedadula.com';
const share = require('./_share.js');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const li = (a) => (a || []).map((x) => `<li>${esc(x)}</li>`).join('');

function shell({ title, desc, url, body, robots = 'index,follow', jsonld = '', image = `${SITE}/assets/og.png`, alt = 'Remote AI Work: remote AI roles, pay as posted' }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(url)}"><meta property="og:type" content="website"><meta property="og:image:type" content="image/png"><meta property="og:site_name" content="Remote AI Work"><meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(alt)}">
<meta name="theme-color" content="#4B2EE8"><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/assets/site.css?v=202611220800">${jsonld}</head>
<body>${body}</body></html>`;
}

const BAR = `<header class="bar"><div class="wrap"><a class="logo" href="/"><img src="/assets/icon.svg" alt="" width="34" height="34"><span>Remote AI Work<small>curated by Dijae Dadula</small></span></a>
<nav aria-label="Main"><a href="/"><span class="hide-s">Open roles</span><span class="show-s">Roles</span></a><a href="/guide"><span class="hide-s">Free guide</span><span class="show-s">Guide</span></a><a class="hide-m" href="/privacy">Disclosure</a></nav></div></header><script src="/assets/nav.js?v=202611220800" defer></script>`;
const FOOT = `<footer class="foot"><div class="wrap">Independent job page by Dijae Dadula. Not affiliated with, sponsored by or endorsed by micro1 or any employer. Some links are referral links, and I may earn a referral bonus if you're hired. Pay, openings and requirements are as posted and can change; nothing here guarantees an interview, placement or pay. <a href="/privacy">Privacy & disclosure</a> · <a href="/guide">Free guide</a></div></footer>`;

function notFound() {
  return shell({ title: 'Role not found · Remote AI Work', desc: 'This role is no longer listed.', url: SITE, robots: 'noindex',
    body: `${BAR}<main class="wrap article"><h1>This role isn't listed any more</h1><p class="muted">It may have closed. See the roles that are open right now.</p><p><a class="btn primary" href="/">See open roles</a></p></main>${FOOT}` });
}

function render(j) {
  const url = `${SITE}/j/${j.slug}`;
  const closed = j.status !== 'live';
  const company = j.company || 'micro1';
  const cut = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'; };
  const desc = cut(`${j.pay_text ? `${j.pay_text} (as posted) · ` : ''}${j.job_type || 'Remote'}. ${j.about || ''}`, 158);
  const faqs = [
    [`Is this page ${company}?`, `No. It's an independent page by Dijae Dadula. ${company} hires and pays. When you continue, you apply on ${company}'s own site through my referral link, and I may earn a referral bonus if you're hired. It costs you nothing.`],
    ['Do I have to pay anything to apply?', `No. Applying is free. Never pay anyone to "unlock" a remote AI role.`],
    ['Is the pay guaranteed?', `No. The pay range and openings are what ${company} posted at the time of writing, and they can change. Your actual rate is set by ${company}.`],
    ['What happens after I apply?', `${company} roles usually start with an AI interview, then review and matching. Read the free guide for how to prepare.`],
  ];
  const jsonld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }).replace(/</g, '\\u003c')}</script>`;

  const body = `${BAR}
<main class="wrap job" data-slug="${esc(j.slug)}" data-status="${esc(j.status)}" data-company="${esc(company)}">
  <article>
    <p class="crumbs"><a href="/">Open roles</a> / <a href="/?d=${encodeURIComponent(j.domain)}">${esc(j.domain)}</a></p>
    <div class="chips"><a class="chip dom" href="/?d=${encodeURIComponent(j.domain)}">${esc(j.domain)}</a><span class="chip">${esc(j.job_type || 'Remote')}</span>${j.openings ? `<span class="chip">${esc(j.openings)}</span>` : ''}${closed ? '<span class="chip closed">Closed</span>' : ''}</div>
    <h1>${esc(j.title)}</h1>
    ${j.about ? `<p class="lead-p">${esc(j.about)}</p>` : ''}
    <div class="facts">
      <div><span>Pay (as posted)</span><b class="payb">${esc(j.pay_text || 'See posting')}</b></div>
      <div><span>Type</span><b>${esc(j.job_type || 'Remote')}</b></div>
      <div><span>Hiring platform</span><b>${esc(company)}</b></div>
      <div><span>Openings</span><b>${esc(j.openings || '—')}</b></div>
    </div>
    ${(j.scope || []).length ? `<section class="sec"><h2>What you'll do</h2><ul>${li(j.scope)}</ul></section>` : ''}
    ${((j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 4))).length ? `<section class="sec"><h2>Major skills</h2><div class="skills">${(j.tags && j.tags.length ? j.tags : (j.skills || []).slice(0, 4)).map((s) => `<a href="/?s=${encodeURIComponent(s)}">${esc(s)}</a>`).join('')}</div></section>` : ''}
    ${(j.preferred || []).length ? `<section class="sec"><h2>What they prefer</h2><ul>${li(j.preferred)}</ul></section>` : ''}
    ${(j.fit || []).length ? `<section class="sec fit"><h2>This fits you if…</h2><ul>${li(j.fit)}</ul></section>` : ''}
    ${j.take ? `<section class="sec"><div class="take"><p>${esc(j.take)}</p><small>Dijae's take</small></div></section>` : ''}
    ${(j.prep || []).length ? `<section class="sec prep"><h2>Before you apply</h2><ol>${li(j.prep)}</ol></section>` : ''}
    ${closed ? '' : share.block({ url, heading: 'Share this role', msgs: {
      feed: `Hiring now, fully remote: ${j.title}${j.pay_text ? `, ${j.pay_text} (as posted)` : ''}. Free to apply. Know someone who fits? 👇`,
      dm: `Hey, saw this and thought of you: ${j.title}, remote${j.pay_text ? `, ${j.pay_text} as posted` : ''}. Worth a look?` } })}
    <section class="sec"><h2>Questions</h2>${faqs.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
    <p class="disclose">Independent page by Dijae Dadula — not ${esc(company)}. The role description is summarised from ${esc(company)}'s public posting. I'm a ${esc(company)} referral partner: the application link is my referral link, and I may earn a bonus if you're hired. That never changes what you're paid or how you're assessed.</p>
  </article>
  <aside>
    <div class="pass" id="pass">
      <div class="pass-top"><small>${closed ? 'This role is closed' : 'Pay as posted'}</small><div class="rate ${String(j.pay_text || '').length > 16 ? 'sm' : ''}">${esc(j.pay_text || 'See posting')}</div><div class="role">${esc(j.title)}</div></div>
      <div class="perf"></div>
      <div class="pass-body" id="passBody">
        ${closed ? `<h3>This role has closed</h3><p class="muted small">Get the next one like it in your inbox.</p>` : `<h3>Apply on ${esc(company)}</h3><p class="muted small">Enter your email to get the application link. You'll go straight to ${esc(company)}'s official page.</p>`}
        <form id="capture" novalidate>
          <input type="email" id="email" name="email" placeholder="you@email.com" autocomplete="email" required aria-label="Email address">
          <div class="hp" aria-hidden="true"><input tabindex="-1" name="website" id="website" autocomplete="off"></div>
          <label class="check" style="margin:12px 0"><input type="checkbox" id="alerts" ${closed ? 'checked' : ''}> <span>Send me instant alerts for high-paying remote AI roles, plus my free guide to AI training work and the AI interview. Unsubscribe anytime.</span></label>
          <button class="btn primary block" id="go" type="submit">${closed ? 'Get job alerts' : 'Get my application link'}</button>
          <p class="err" id="err" hidden></p>
        </form>
        <p class="note">Independent page, not ${esc(company)}. I'm a referral partner and may earn a bonus if you're hired. Your email stays with me: <a href="/privacy">privacy</a>.</p>
      </div>
    </div>
  </aside>
</main>
${closed ? '' : `<div class="mobile-cta"><b>${esc(j.pay_text || '')}</b><a class="btn primary" href="#pass">Apply now</a></div>`}
${FOOT}
<script>window.RJ_FN=${JSON.stringify(FN)};</script><script src="/assets/share.js?v=202611211330" defer></script><script src="/assets/job.js?v=202611211330" defer></script>`;
  const crumbs = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Open roles', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: j.domain || 'Role', item: `${SITE}/?d=${encodeURIComponent(j.domain || '')}` }, { '@type': 'ListItem', position: 3, name: j.title, item: url }] }).replace(/</g, '\\u003c')}</script>`;
  const v = encodeURIComponent(String(j.updated_at || '').replace(/\D/g, '').slice(0, 12));
  return shell({ title: `${j.title}${j.pay_text ? ` (${j.pay_text})` : ''} · Remote AI Work`, desc, url, body, jsonld: jsonld + crumbs, image: `${SITE}/og/${j.slug}.png${v ? '?v=' + v : ''}`, alt: `${j.title}${j.pay_text ? ', ' + j.pay_text + ' as posted' : ''}` });
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').toLowerCase();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!/^[a-z0-9-]{2,90}$/.test(slug)) { res.statusCode = 404; return res.end(notFound()); }
  try {
    const r = await fetch(`${FN}?a=job&slug=${encodeURIComponent(slug)}`);
    if (!r.ok) { res.statusCode = 404; return res.end(notFound()); }
    const { job } = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    if (!job.status || job.status !== 'live') res.setHeader('X-Robots-Tag', 'noindex');
    return res.end(render(job).replace('<body>', `<body class="${job.status === 'live' ? 'has-cta' : ''}">`));
  } catch (e) {
    res.statusCode = 500;
    return res.end(notFound());
  }
};
module.exports.render = render;
module.exports.notFound = notFound;
module.exports.shell = shell;
module.exports.BAR = BAR;
module.exports.FOOT = FOOT;
