// Who can apply: reads a posting's title and text and decides whether it is open worldwide, remote with no
// country stated, or limited to specific countries. Returns { kind, countries, label, short, note }.
//   kind: "countries" | "worldwide" | "remote"
// Runs in Deno (edge function) and Node (tests).

const C = [
  // [display name, flag, regex]
  ["United States", "🇺🇸", /\b(united states|u\.s\.a?\.?|usa|us(?=[\s,)/.-]|$)|us-based|u\.s-based|u\.s\.-based|america(?!n? samoa)(?! and the caribbean)(?!s))/i],
  ["Canada", "🇨🇦", /\b(canada|can(?=\b[\s)]*based)|canadian)\b/i],
  ["Mexico", "🇲🇽", /(?<!new )\bmexico\b/i],
  ["Brazil", "🇧🇷", /\bbrazil|brasil\b/i],
  ["United Kingdom", "🇬🇧", /\b(united kingdom|u\.k\.|uk(?=[\s,)/.-]|$)|britain|england)\b/i],
  ["Ireland", "🇮🇪", /\bireland\b/i],
  ["Australia", "🇦🇺", /\baustralia\b/i],
  ["New Zealand", "🇳🇿", /\bnew zealand\b/i],
  ["Philippines", "🇵🇭", /\bphilippines\b/i],
  ["India", "🇮🇳", /\bindia\b/i],
  ["Belgium", "🇧🇪", /\bbelgium\b/i],
  ["Switzerland", "🇨🇭", /\bswitzerland\b/i],
  ["France", "🇫🇷", /\bfrance\b/i],
  ["Germany", "🇩🇪", /\bgermany\b/i],
  ["Spain", "🇪🇸", /\bspain\b/i],
  ["Italy", "🇮🇹", /\bitaly\b/i],
  ["Portugal", "🇵🇹", /\bportugal\b/i],
  ["Netherlands", "🇳🇱", /\bnetherlands\b/i],
  ["Japan", "🇯🇵", /\bjapan\b/i],
  ["South Korea", "🇰🇷", /\b(south korea|korea)\b/i],
  ["Singapore", "🇸🇬", /\bsingapore\b/i],
  ["South Africa", "🇿🇦", /\bsouth africa\b/i],
  ["Nigeria", "🇳🇬", /\bnigeria\b/i],
  ["Kenya", "🇰🇪", /\bkenya\b/i],
  ["Argentina", "🇦🇷", /\bargentina\b/i],
  ["Colombia", "🇨🇴", /\bcolombia\b/i],
  ["Chile", "🇨🇱", /\bchile\b/i],
  ["Peru", "🇵🇪", /\bperu\b/i],
  ["Paraguay", "🇵🇾", /\bparaguay\b/i],
  ["Uruguay", "🇺🇾", /\b(uruguay|uruguai)\b/i],
  ["Ecuador", "🇪🇨", /\becuador\b/i],
  ["Honduras", "🇭🇳", /\bhonduras\b/i],
  ["Costa Rica", "🇨🇷", /\bcosta rica\b/i],
  ["Panama", "🇵🇦", /\bpanama\b/i],
  ["Bahamas", "🇧🇸", /\bbahamas\b/i],
  ["Barbados", "🇧🇧", /\bbarbados\b/i],
  ["Dominican Republic", "🇩🇴", /\b(dominican republic|republica dominicana)\b/i],
  ["Jamaica", "🇯🇲", /\bjamaica\b/i],
];
const LATAM = new Set(["Mexico", "Brazil", "Argentina", "Colombia", "Chile", "Peru", "Paraguay", "Uruguay", "Ecuador", "Honduras", "Costa Rica", "Panama", "Bahamas", "Barbados", "Dominican Republic", "Jamaica"]);
const REGIONS = [
  ["Latin America & Caribbean", "🌎", /\b(latam|latin america)\b/i],
  ["Europe", "🇪🇺", /\b(europe|european union|\beu\b|emea)\b/i],
  ["Asia", "🌏", /\b(asia|apac|southeast asia)\b/i],
];
const US_STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/gi;
const WORLD = /\b(global(ly)?|worldwide|world-wide|anywhere|any country|all countries|open to (candidates|experts|applicants) (from )?(all|any|around the world|everywhere))\b/i;

function countriesIn(s) {
  const out = [];
  for (const [name, flag, re] of C) if (re.test(s) && !out.some((x) => x.name === name)) out.push({ name, flag });
  return out;
}
const FLAG = Object.fromEntries(C.map(([n, f]) => [n, f]));
function listLabel(names) {
  if (names.length <= 3) return names.map((n) => n.replace("United States", "US").replace("United Kingdom", "UK")).join(" & ").replace(/ & (?=.* & )/g, ", ");
  return `${names.length} countries`;
}

const plainText = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function eligibility(title, raw) {
  const t = plainText(title), text = plainText(raw);
  const lines = text.split(/\n/);
  const locLine = (lines.find((l) => /^\s*(location|work location|where)\s*:/i.test(l)) || "").replace(/^\s*[^:]*:\s*/, "");
  const notes = [];
  // Credentials that tie a "worldwide" role to one country in practice.
  if (/\b(u\.?s\.?|united states)(?![a-z])[^.\n]{0,40}\bbar\b|\bbar admission\b[^.\n]{0,60}\b(u\.?s\.?|united states|state)\b|law license in at least one u\.?s|license to practice law in the (u\.?s|united states)/i.test(text)) notes.push("Needs an active U.S. bar admission or law license");
  else if (/\b(u\.?s\.?|united states)(?![a-z])[^.\n]{0,30}\b(law school|licensed attorney|attorney license)/i.test(text)) notes.push("Needs a U.S. law degree or license");
  if (/\b(u\.?s\.?|united states)(?![a-z])\s*(military\s+)?veterans?\b|\bveterans? of the u\.?s/i.test(text + " " + t)) notes.push("For U.S. military veterans");
  if (/\beligib(le|ility) to work in the u\.?s/i.test(text)) notes.push("Must be eligible to work in the U.S.");

  const make = (kind, countries, label, short, extra) => ({ kind, countries, label, short, note: [extra, ...notes].filter(Boolean).join(" · ") || null });

  // 1) Explicit worldwide
  if (WORLD.test(locLine) && !/\bonly\b/i.test(locLine)) return make("worldwide", [], "🌍 Open worldwide", "Open worldwide");

  // 2) Region (LATAM etc.) with an optional "Selected countries include:" list
  const where = [locLine, t, ...lines.filter((l) => /(must be|currently|only|candidates|experts|applicants)\b[^.]{0,30}\bbased in|based in the|reside|resident of|located in/i.test(l))].join(" \n ");
  for (const [rname, rflag, re] of REGIONS) if (re.test(locLine) || re.test(t)) {
    const i = text.search(/selected countries include|eligible countries|countries include/i);
    let list = [];
    if (i >= 0) list = countriesIn(text.slice(i, i + 400).split(/\n\s*\n|job summary|key responsibilities/i)[0]).map((x) => x.name);
    if (!list.length && i >= 0) list = (text.slice(i).split("\n")[1] || "").split(/,\s*/).map((s) => s.replace(/[.]+$/, "").trim()).filter((s) => s && s.length < 30);
    return make("countries", list, `${rflag} ${rname} only`, `${rname} only`, list.length ? `${list.length} countries: ${list.join(", ")}` : null);
  }

  // 3) Specific countries in the location line, the title, or a "based in" requirement
  const statesInLoc = (locLine.match(US_STATES) || []).length;
  let found = statesInLoc >= 2 ? [{ name: "United States", flag: "🇺🇸" }] : countriesIn(locLine);
  let fromTitle = false;
  if (!found.length) {
    const paren = (t.match(/\(([^)]*)\)/g) || []).join(" ");
    found = countriesIn(paren);
    if (!found.length && /\b(us|u\.s)\b[- ]?(based|only)?/i.test(paren)) found = [{ name: "United States", flag: "🇺🇸" }];
    fromTitle = found.length > 0 && !/\bonly\b|based/i.test(paren) && !/based in|located in|reside/i.test(text);
  }
  if (!found.length) found = countriesIn(lines.filter((l) => /(must be|currently|only|candidates|experts|applicants|be)\s+(based|located|residing)\s+in|resident of/i.test(l)).join(" "));
  if (found.length) {
    const names = found.map((x) => x.name);
    const flags = found.slice(0, 3).map((x) => x.flag).join("");
    const states = statesInLoc >= 2 && names.length === 1 && names[0] === "United States" && statesInLoc < 45 ? "Selected U.S. states only (check the list on the posting)" : null;
    return make("countries", names, `${flags} ${listLabel(names)} only`, `${listLabel(names)} only`, states || (fromTitle ? "Taken from the job title; the posting itself only says remote" : null));
  }

  // 4) A bare list of countries in the posting (e.g. "Argentina, Bahamas, Brasil, Chile, ...")
  for (const l of lines) {
    const items = l.split(/,|\se\s|\sand\s|\sy\s/).map((x) => x.trim()).filter(Boolean);
    if (items.length < 4) continue;
    const hit = countriesIn(l).map((x) => x.name);
    if (hit.length >= 4 && hit.length >= items.length * 0.6) {
      const lat = hit.filter((n) => LATAM.has(n)).length >= hit.length * 0.7;
      return make("countries", hit, lat ? "🌎 Latin America & Caribbean only" : `${listLabel(hit)} only`, lat ? "Latin America & Caribbean only" : `${listLabel(hit)} only`, `${hit.length} countries: ${hit.join(", ")}`);
    }
  }

  // 5) Remote, no country stated
  const usCred = notes.some((n) => /U\.S\. (bar|law)/.test(n)), vets = notes.some((n) => /veterans/.test(n));
  if (usCred) return make("remote", [], "🌍 Any country · U.S. law license needed", "Any country · U.S. license needed");
  if (vets) return make("remote", [], "🌍 Any country · U.S. veterans only", "U.S. veterans only");
  return make("remote", [], "🌍 Remote · no country limit stated", "No country limit stated");
}

export const FLAGS = FLAG;
