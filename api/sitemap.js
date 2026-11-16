const FN = 'https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/rj';
const SITE = process.env.SITE_URL || 'https://jobs.dijaedadula.com';
module.exports = async (req, res) => {
  let jobs = [];
  try { const r = await fetch(`${FN}?a=list`); jobs = (await r.json()).jobs || []; } catch (e) {}
  const urls = [['/', null], ['/guide', null], ['/privacy', null], ...jobs.map((j) => [`/j/${j.slug}`, j.updated_at])];
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([u, d]) => `<url><loc>${SITE}${u}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ''}</url>`).join('')}</urlset>`);
};
