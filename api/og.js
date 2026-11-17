// Share image for each job page (/og/<slug>.png): role, pay and field, in the site's brand. Used by Threads, LinkedIn, Facebook, X and chat apps.
const fs = require('fs'), path = require('path');
const FN = 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
const SITE = process.env.SITE_URL || 'https://jobs.dijaedadula.com';
let FONTS = null;
async function fonts() {
  if (FONTS) return FONTS;
  const load = async (w) => {
    const f = path.join(__dirname, '_fonts', `schibsted-grotesk-latin-${w}-normal.woff`);
    try { return fs.readFileSync(f); } catch (e) { return Buffer.from(await (await fetch(`${SITE}/api/_fonts/schibsted-grotesk-latin-${w}-normal.woff`)).arrayBuffer()); }
  };
  FONTS = [{ name: 'Schibsted', data: await load(500), weight: 500, style: 'normal' }, { name: 'Schibsted', data: await load(800), weight: 800, style: 'normal' }];
  return FONTS;
}
let LOGO = null;
function logo() {
  if (LOGO) return LOGO;
  let svg = '';
  try { svg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon.svg'), 'utf8'); } catch (e) {}
  LOGO = svg ? 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') : `${SITE}/assets/icon.svg`;
  return LOGO;
}
const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } });

function card(j) {
  const t = String(j.title || 'Remote AI role');
  const size = t.length > 60 ? 44 : t.length > 40 ? 50 : t.length > 22 ? 58 : 70;
  const tags = (j.tags && j.tags.length ? j.tags : (j.skills || [])).slice(0, 2);
  return h('div', { width: '1200px', height: '630px', background: '#F4F5F7', fontFamily: 'Schibsted', padding: '48px', color: '#13161B' }, [
    h('div', { flex: 1, background: '#FFFFFF', border: '3px solid #13161B', borderRadius: '34px', overflow: 'hidden', boxShadow: '14px 14px 0 rgba(19,22,27,.09)' }, [
      h('div', { flex: 1, flexDirection: 'column', padding: '44px 48px', justifyContent: 'space-between' }, [
        h('div', { alignItems: 'center', gap: '14px', fontSize: '28px', fontWeight: 800 }, [{ type: 'img', props: { src: logo(), width: 56, height: 56 } }, 'Remote AI Work']),
        h('div', { flexDirection: 'column', gap: '16px' }, [
          h('div', { gap: '10px' }, [h('div', { background: '#ECE8FE', color: '#4B2EE8', borderRadius: '99px', padding: '8px 18px', fontSize: '24px', fontWeight: 800 }, String(j.domain || 'Remote AI work'))]),
          h('div', { fontSize: `${size}px`, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-1.5px' }, t),
          tags.length ? h('div', { gap: '10px' }, tags.map((x) => h('div', { border: '2px solid #DFE3E8', borderRadius: '12px', padding: '6px 14px', fontSize: '22px', fontWeight: 500, color: '#555C67' }, String(x)))) : h('div', {}, ''),
        ]),
        h('div', { fontSize: '22px', color: '#555C67', fontWeight: 500 }, 'jobs.dijaedadula.com · independent page · referral link'),
      ]),
      h('div', { width: '400px', background: '#13161B', color: '#F4F5F7', flexDirection: 'column', justifyContent: 'center', padding: '44px 40px', gap: '8px' }, [
        h('div', { fontSize: '24px', opacity: 0.7, fontWeight: 500 }, 'Pay, as posted'),
        h('div', { fontSize: (j.pay_text || '').length > 12 ? '40px' : (j.pay_text || '').length > 8 ? '48px' : '60px', fontWeight: 800, color: '#7CE0B2', lineHeight: 1.05, letterSpacing: '-1px' }, String(j.pay_text || 'See posting')),
        h('div', { fontSize: '24px', opacity: 0.85, fontWeight: 500, marginTop: '10px' }, String(j.job_type || 'Remote').split(' · ').slice(0, 2).join(' · ')),
        h('div', { fontSize: '22px', opacity: 0.6, fontWeight: 500, marginTop: '18px' }, `Hiring platform: ${j.company || 'micro1'}`),
      ]),
    ]),
  ]);
}

async function render(j) {
  const { ImageResponse } = await import('@vercel/og');
  const r = new ImageResponse(card(j), { width: 1200, height: 630, fonts: await fonts() });
  return Buffer.from(await r.arrayBuffer());
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').replace(/\.png$/, '');
  try {
    if (!/^[a-z0-9-]{2,90}$/.test(slug)) throw new Error('bad slug');
    const d = await (await fetch(`${FN}?a=job&slug=${encodeURIComponent(slug)}`)).json();
    if (!d.job) throw new Error('not found');
    const png = await render(d.job);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.end(png);
  } catch (e) {
    res.statusCode = 302; res.setHeader('Location', '/assets/og.png'); res.end();
  }
};
module.exports.render = render;
module.exports.card = card;
