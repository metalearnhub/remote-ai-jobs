const FN = 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
const SITE = process.env.SITE_URL || 'https://jobs.dijaedadula.com';
module.exports = async (req, res) => {
  let jobs = [];
  try { const r = await fetch(`${FN}?a=list`); jobs = (await r.json()).jobs || []; } catch (e) {}
  const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const cats = {};
  for (const j of jobs) { const k = slugify(j.domain); if (k && (!cats[k] || j.updated_at > cats[k])) cats[k] = j.updated_at; }
  const urls = [['/', null], ['/guide', null], ['/privacy', null], ...Object.entries(cats).map(([k, d]) => [`/c/${k}`, d]), ...jobs.map((j) => [`/j/${j.slug}`, j.updated_at])];
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([u, d]) => `<url><loc>${SITE}${u}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ''}</url>`).join('')}</urlset>`);
};
