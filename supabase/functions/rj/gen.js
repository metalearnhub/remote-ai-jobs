// Turns one public micro1 job page (jobs.micro1.ai/post/<id>) into a full job page + Threads posts.
// Runs in Deno (edge function) and Node (local tests). No AI calls: everything is derived from the posting.
import { DOMAINS } from "./domains.js";
import { domainFromSlug } from "./tax.js";

export const POST_RE = /^https:\/\/jobs\.micro1\.ai\/post\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#].*)?$/i;

// ---------- page → data ----------
function rscText(html) {
  let s = "";
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m;
  while ((m = re.exec(html))) { try { s += JSON.parse(m[1]); } catch (_) { /* skip */ } }
  return s;
}
function objAt(s, i) {
  let d = 0, k = i, str = false;
  for (; k < s.length; k++) {
    const c = s[k];
    if (str) { if (c === "\\") k++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true; else if (c === "{") d++; else if (c === "}") { d--; if (!d) break; }
  }
  return JSON.parse(s.slice(i, k + 1));
}
function resolveRef(s, v) {
  if (typeof v !== "string" || !/^\$[0-9a-f]+$/i.test(v)) return v;
  const id = v.slice(1);
  const m = new RegExp("(^|\\n)" + id + ":T([0-9a-f]+),").exec(s);
  if (!m) return "";
  const bytes = new TextEncoder().encode(s.slice(m.index + m[0].length));
  return new TextDecoder().decode(bytes.slice(0, parseInt(m[2], 16)));
}
export function extract(html) {
  const s = rscText(html);
  let data = null, ld = null;
  const i = s.indexOf('{"client_job_id"');
  if (i >= 0) { try { data = objAt(s, i); } catch (_) { data = null; } }
  const k = s.indexOf('{"@context":"https://schema.org/","@type":"JobPosting"');
  if (k >= 0) { try { ld = objAt(s, k); } catch (_) { ld = null; } }
  if (!data && !ld) return null;
  data = data || {};
  let desc = resolveRef(s, data.job_description);
  if (!desc && ld) desc = resolveRef(s, ld.description) || "";
  return {
    id: data.client_job_id || "",
    domainSlug: String(data.domain_slug || ""),
    title: (data.job_role_name || ld?.title || "").trim(),
    hourly: data.ideal_hourly_rate || null,
    yearly: data.ideal_yearly_compensation || null,
    monthly: data.ideal_monthly_salary_min || data.ideal_monthly_salary_max ? { min: data.ideal_monthly_salary_min, max: data.ideal_monthly_salary_max } : null,
    skills: (data.required_skills || ld?.skills || []).map((x) => String(x).trim()).filter(Boolean),
    openings: Number(data.no_of_openings) || 0,
    status: String(data.job_status || "open").toLowerCase(),
    jobType: String(data.job_type || ""),
    locationName: String(data.location_name || ""),
    countries: (ld?.applicantLocationRequirements || []).map((c) => c?.name).filter(Boolean),
    validThrough: ld?.validThrough || null,
    desc: String(desc || ""),
  };
}

// ---------- description HTML → sections ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…" };
const decode = (t) => t.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
const clean = (t) => decode(String(t).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\bAn?(BSc|MSc|BA|BS|MS|PhD|MBA|MD|JD)\b/g, "A $1").replace(/\s+/g, " ").trim();

function blocks(html) {
  const out = [];
  const re = /<(p|li|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const inner = m[2];
    const t = clean(inner);
    if (!t) continue;
    out.push({ tag: m[1].toLowerCase(), text: t, strong: /^\s*<(strong|b)\b/i.test(inner) });
  }
  if (!out.length) clean(html).split(/(?<=[.!?])\s+(?=[A-Z])/).forEach((t) => t && out.push({ tag: "p", text: t }));
  return out;
}
const SEC = [
  ["meta", /^(job title|role title|title|job type|role type|employment type|location|work location|commitment|hours|duration|start date|schedule|pay|compensation|rate|time commitment|engagement)\b/i],
  ["pref", /^(preferred|nice to have|bonus|plus|good to have|desirable)/i],
  ["req", /^(required|requirements|minimum qualifications|qualifications|must have|what we.?re looking for|who you are|what you bring|ideal candidate|you have|skills and qualifications|eligibility)/i],
  ["scope", /^(key responsibilities|responsibilities|scope|what you.?ll (do|work on|be doing)|what you will (do|work on)|duties|day[- ]to[- ]day|your role|the work|tasks|you will|what the work looks like|how you.?ll help)/i],
  ["about", /^(job summary|summary|about the role|about this role|role overview|overview|about the job|the role|about the opportunity|opportunity snapshot|snapshot|role summary|position summary|the opportunity|description|job description|about)\b/i],
  ["extra", /^(additional info|additional information|benefits|perks|why join|what we offer|about micro1|about us|how to apply|our hiring process|application process|next steps)/i],
];
function sectionOf(label) { for (const [k, re] of SEC) if (re.test(label)) return k; return null; }

export function sections(html, title = "") {
  const r = { meta: {}, about: [], aboutList: [], scope: [], req: [], pref: [], extra: [], text: [] };
  const T = String(title || "").toLowerCase().replace(/\s+/g, " ").trim();
  let cur = "about";
  for (const b of blocks(html)) {
    const low = b.text.toLowerCase();
    if (T && (low === T || low === T + ":")) continue; // the posting repeats its own title
    r.text.push(b.tag === "li" ? "• " + b.text : b.text);
    if (b.tag !== "li") {
      const lab = b.text.match(/^([A-Za-z][A-Za-z '’/&()-]{1,60}):\s*(.*)$/);
      if (lab) {
        const k = sectionOf(lab[1]);
        if (k === "meta") { r.meta[lab[1].toLowerCase()] = lab[2]; continue; }
        if (k && lab[2] && k === "extra") { r.extra.push(lab[2]); continue; } // "Benefits: …" inline: don't swallow what follows
        if (k) { cur = k; if (lab[2]) r[k].push(lab[2]); continue; }
      }
      if ((b.tag[0] === "h" || b.strong || b.text.length < 70) && !/[.!?]$/.test(b.text)) {
        const k = sectionOf(b.text.replace(/:$/, ""));
        if (k && k !== "meta") { cur = k; continue; }
        if (b.tag[0] === "h" && !k) { cur = "extra"; continue; } // unknown heading: park it
      }
    }
    if (cur === "about" && b.tag === "li") r.aboutList.push(b.text); else r[cur].push(b.text);
  }
  return r;
}

// ---------- helpers ----------
const fmtN = (n) => (n >= 1000 ? "$" + (Math.round(n / 100) / 10).toString().replace(/\.0$/, "") + "K" : "$" + String(Math.round(n * 100) / 100));
function payText(x) {
  const rng = (o, unit) => {
    if (!o) return "";
    const a = Number(o.min) || 0, b = Number(o.max) || 0;
    if (!a && !b) return "";
    if (a && b && a !== b) return `${fmtN(a)}–${fmtN(b)}/${unit}`;
    return `${fmtN(a || b)}/${unit}`;
  };
  return rng(x.yearly, "yr") || rng(x.hourly, "hr") || rng(x.monthly, "mo");
}
export const slugify = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const noDot = (s) => String(s || "").trim().replace(/[.;:]+$/, "");
const sentences = (t) => String(t || "").split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/).map((x) => x.trim()).filter(Boolean);
const core = (s) => { const m = s.match(/^(.{40,}?)(?:,?\s+(?:ensuring|to serve as|in order to|so that|which|that will|to help|while|using reliable)\b)/i); return m ? m[1] : s; };
const short = (s, n) => {
  s = noDot(s); if (s.length <= n) return s; s = core(s); if (s.length <= n) return s;
  const cut = s.slice(0, n), c = cut.lastIndexOf(","), w = cut.lastIndexOf(" ");
  return cut.slice(0, c > n * 0.45 ? c : w).replace(/\s+(and|or|the|a|an|of|in|to|with|for|related)$/i, "").replace(/[,;:\s]+$/, "");
};
// Turns recruiting boilerplate into a plain description of the work, or returns null.
function plain(sen) {
  const m = sen.match(/^(?:we are|we're|micro1 is|micro1 are|our client is|the client is)\s+(?:looking for|engaging|hiring|seeking|recruiting|partnering with [^,]+? to hire)\s+(?:a |an )?(?:highly[- ]skilled |experienced |talented |top |skilled )?(.+?)\s+(?:to|who will|who can)\s+(?:contribute to|support|help with|help|join|work on|participate in)\s+(.+?)\.?$/i);
  if (!m) return null;
  const what = lc(m[2].replace(/^(an?|the)\s+/i, ""));
  const plural = /^(\S+\s+){0,3}(projects|tasks|programs|initiatives)\b/i.test(what);
  const art = plural ? "" : /^[aeiou]/i.test(what) ? "An " : "A ";
  const body = art ? what : what.charAt(0).toUpperCase() + what.slice(1);
  return `${art}${body}, for ${m[1].replace(/^(a|an)\s+/i, "")}.`;
}
const BOILER = /(^micro1 is |^micro1, |help train next-generation ai|shape how models learn|high-quality, real-world input|cutting-edge|unique opportunity|passionate and multidisciplinary|micro1 is (a|partnering)|leading ai lab|we are looking for|we're looking for|join (our|a) )/i;

export function detectDomain(title, body) {
  const score = (t, w) => {
    const s = " " + String(t || "").toLowerCase() + " ";
    const hit = (k) => (s.match(new RegExp("(^|[^a-z])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=$|[^a-z])", "g")) || []).length;
    const r = {};
    for (const [name, d] of Object.entries(DOMAINS)) r[name] = d.kw.reduce((n, k) => n + hit(k), 0) * w;
    return r;
  };
  const a = score(title, 4), b = score(body, 1);
  let best = "General AI training", top = 0;
  for (const name of Object.keys(DOMAINS)) { const v = (a[name] || 0) + (b[name] || 0); if (v > top) { top = v; best = name; } }
  return best;
}

// ---------- data → page ----------
export function build(x, referralUrl, siteUrl = "https://jobs.dijaedadula.com") {
  const title = x.title || "Remote AI role";
  const sec = sections(x.desc, title);
  const all = sec.text.join(" ");
  let domain = detectDomain(title, [x.skills.join(" "), sec.scope.join(" "), sec.req.join(" ")].join(" "));
  if (domain === "General AI training") domain = domainFromSlug(x.domainSlug) || domain;
  const d = DOMAINS[domain] || DOMAINS["General AI training"];

  // type
  const rawType = (sec.meta["job type"] || sec.meta["role type"] || sec.meta["employment type"] || "").toLowerCase();
  const fullTime = /full[- ]?time|employee|w-?2/.test(rawType) || (x.yearly && !x.hourly);
  const perTask = /per (accepted )?task|task-based pay|paid per task|per-task/i.test(all);
  const remote = /remote|telecommute/i.test((sec.meta["location"] || sec.meta["work location"] || "") + " " + x.locationName) || !x.locationName || x.countries.length > 0;
  const typeBits = [fullTime ? "Full-time" : "Contract", remote ? "Remote" : (x.locationName || sec.meta["location"] || "")];
  if (perTask) typeBits.push("paid per task");
  if (/part[- ]?time/.test(rawType)) typeBits[0] = "Part-time contract";
  const job_type = typeBits.filter(Boolean).join(" · ");

  // lists
  const bullet = (s) => { const t = noDot(String(s).replace(/^[-•*·]\s*/, "").replace(/[;,]\s*(or|and)\s*$/i, "")); const f = sentences(t)[0] || t; return f.length > 230 ? short(f, 230) : noDot(f); };
  let scope = sec.scope.filter((s) => s.length > 12 && !BOILER.test(s)).map(bullet).slice(0, 6);
  if (!scope.length) {
    const inv = sentences(sec.about.join(" ")).find((s) => /^the work involves|^you will|^you'll|^your work/i.test(s));
    if (inv) scope = [noDot(inv.replace(/^the work involves\s+/i, "")).replace(/^./, (c) => c.toUpperCase())];
    if (sec.aboutList.length && sec.aboutList.length <= 12) scope.push("Work in your strongest area: " + sec.aboutList.map(noDot).slice(0, 8).join(", "));
  }
  const req = sec.req.filter((s) => s.length > 8 && !BOILER.test(s)).map(bullet);
  const pref = sec.pref.filter((s) => s.length > 8).map(bullet);
  const preferred = [...req.slice(0, 5), ...pref.slice(0, 2)];
  const skills = x.skills.slice(0, 12).map((k) => (k === k.toLowerCase() ? k.charAt(0).toUpperCase() + k.slice(1) : k));

  // about: what the work really is, in plain words
  const noAI = /no (prior )?(experience in ai|ai experience)|no ai (background|experience)|ai experience (is )?not required/i.test(all);
  const sum = sentences(sec.about.join(" ")).map((s) => plain(s) || s).filter((s) => !BOILER.test(s) && !/no (prior )?(experience in ai|ai experience)/i.test(s) && !/^(this is a|candidates (must|should|are)|pay|location|job type)\b/i.test(s) && s.length > 25 && s.length < 260);
  const a1 = scope[0] ? `You'll ${lc(short(scope[0], 170))}.` : "";
  let about = [sum[0] || "", sum[1] && /^(the work|you('ll| will)|your work|tasks)\b/i.test(sum[1]) ? sum[1] : (/^You('ll| will) /.test(sum[0] || "") ? "" : a1)].filter(Boolean).join(" ");
  if (about.length > 420) about = short(about, 420) + ".";
  if (!about) about = `Remote work where you ${d.verb}.`;
  if (noAI) about += " No AI experience needed: your domain knowledge is what counts.";
  about = about.replace(/\s+/g, " ").trim();

  // requirement signals
  const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const ym = all.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*(?:or more\s*)?years?\b[^•;]{0,50}?\b(?:experience|working)\s+(in|as|with)\s+([^.;•]{4,80})/i);
  const yrs = ym ? [ym[0], String(W[ym[1].toLowerCase()] || ym[1]), (ym[2].toLowerCase() === "as" ? "as " : "") + ym[3]] : null;
  const must = [...sec.about, ...sec.aboutList, ...sec.req, ...sec.scope].join(" ");
  const jd = /\bJ\.?D\b/.test(must), bar = /bar admission|admitted to (the|a) .{0,20}bar|licensed attorney/i.test(must);
  let cred = jd && bar ? "a J.D. and active bar admission" : jd ? "a J.D." : (must.match(/\b(board[- ]certified|Ph\.?D|M\.?D\.|CPA|CFA|licensed (?:physician|nurse|pharmacist|engineer))\b/) || [])[1];
  if (cred && new RegExp("(or|preferred|ideally|plus|bonus)[^.]{0,40}" + cred.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(must)) cred = null; // "Master's or PhD" / "PhD preferred" isn't a hard requirement
  if (cred && /^ph\.?d$/i.test(cred)) cred = "a PhD";
  const based = (all.match(/based in (?:an? )?([^.;,]{3,40})/i) || [])[1];
  const fewCountries = x.countries.length && x.countries.length <= 6 ? x.countries : null;

  // fit
  const fit = [];
  if (yrs) fit.push(`You have ${yrs[1]}+ years ${/^as /.test(yrs[2]) ? "" : "in "}${noDot(yrs[2]).replace(/^(?:the )/i, "")}`);
  if (cred && fit.length < 3) fit.push(`You hold ${/^(a|an) /.test(cred) ? cred : "a " + cred.replace(/^board[- ]certified$/i, "board certification")}`);
  for (const f of d.fit) if (fit.length < 3 && !fit.some((y) => y.slice(0, 20) === f.slice(0, 20))) fit.push(f);
  if (domain === "General AI training" && skills.length >= 2) fit[fit.length - 1] = `You've used ${skills.slice(0, 3).join(", ").replace(/, ([^,]*)$/, " and $1")} in real work, not just courses`;

  // take
  const t = [];
  if (fullTime) t.push("This is a full-time role, not side work: expect a normal hiring process with live interviews.");
  else if (perTask) t.push("Pay is per accepted task, so your real hourly rate depends on your speed and acceptance rate.");
  else t.push("Flexible, remote contract work you can fit around other commitments.");
  if (yrs) t.push(`The ${yrs[1]}+ years requirement is real: apply with concrete examples from that work.`);
  if (cred) t.push(`It asks for ${cred}; apply only if you hold it.`);
  else t.push(`Apply if you could talk for 20 minutes about real work you've done in this field; the AI interview keeps asking "how".`);
  if (based) t.push(`Check eligibility first: the posting asks for people based in ${noDot(based)}.`);
  else if (fewCountries) t.push(`Check eligibility first: open to applicants in ${fewCountries.join(", ")}.`);
  else if (noAI && t.length < 3) t.push("You don't need an AI background; your field expertise is what gets tested.");
  const take = t.slice(0, 3).join(" ");

  // prep
  const prep = d.prep.slice(0, 3);

  const pay_text = payText(x);
  const job = {
    title, domain, company: "micro1", pay_text, job_type,
    openings: x.openings ? `${x.openings} opening${x.openings === 1 ? "" : "s"}` : "",
    skills, about, scope, preferred, fit: fit.slice(0, 3), take, prep,
    referral_url: referralUrl, status: x.status === "open" ? "live" : "closed",
    raw: sec.text.join("\n").slice(0, 20000),
  };
  return job;
}

// ---------- Threads: main post (no link) + first comment (link + disclosure) ----------
// Built from what worked on @chatengr: pay-first opener, who it's for, the work, the bar, then one reply prompt.
// Everything is derived from saved job fields, so posts can be regenerated any time.
function catchOf(job) {
  const f0 = job.fit[0] || "";
  let m = f0.match(/^You have (\d+\+ years (?:in|as) .+)$/);
  if (m) return `you need ${m[1]}`;
  m = f0.match(/^You hold (.+)$/) || (job.fit[1] || "").match(/^You hold (.+)$/);
  if (m) return `you need ${m[1]}`;
  m = job.take.match(/based in ([^.]+)\./) || job.take.match(/open to applicants in ([^.]+)\./);
  if (m) return `it's only open to people in ${m[1]}`;
  if (/per task/i.test(job.job_type)) return "pay is per accepted task, so speed matters";
  if (/full-time/i.test(job.job_type)) return "it's full-time with live interviews, not side work";
  return "the AI interview keeps asking \"how\" until it finds the edge of what you know";
}
export function threads(job, slug, siteUrl = "https://jobs.dijaedadula.com") {
  const d = DOMAINS[job.domain] || DOMAINS["General AI training"];
  const url = `${siteUrl}/j/${slug}?ref=threads`;
  const pay = job.pay_text || "pay as posted";
  const who = d.who;
  const Who = who.charAt(0).toUpperCase() + who.slice(1);
  const work = short(lc(job.scope[0] || d.verb), 120);
  const f0 = job.fit[0] || "";
  const forWho = /^You have \d/.test(f0) ? `${who} with ${f0.replace(/^You have /, "")}` : /^You hold /.test(f0) ? `${who} with ${f0.replace(/^You hold /, "")}` : `${who} who've done this work for real`;
  const remote = /remote/i.test(job.job_type);
  const kind = /full-time/i.test(job.job_type) ? "full-time" : /per task/i.test(job.job_type) ? "paid per task" : "contract";
  const noAI = /no ai experience needed/i.test(job.about);
  const field = job.domain === "General AI training" ? "field" : job.domain.toLowerCase().replace(" & ", " and ");
  const fit = job.fit.slice(0, 3);
  const comment = (lead) => `${lead}\n${url}\n\nReferral link: I may earn a bonus if you're hired. Pay and openings as posted.`;
  const fix = (s) => s.replace(/\n{3,}/g, "\n\n").trim();
  const cap = (s) => (s.length > 500 ? s.slice(0, 499) + "…" : s);
  const posts = [
    {
      angle: "Role drop",
      tag: "Remote Jobs",
      text: `${remote ? "Remote" : "Open"} role: ${job.title} — ${pay} (as posted).\n\nFor ${forWho}.\n\nThe work: ${work}.\n\n${noAI ? `No AI background needed. They're testing your ${field} depth.\n\n` : ""}Know someone who fits? Tag them. Link in the first comment.`,
      comment: comment("Full breakdown, who it fits and how to prep for the AI interview:"),
    },
    {
      angle: "Question hook",
      tag: "AI Threads",
      text: `${Who}: would you take ${pay} to ${work}?\n\nThat's the ${job.title} role (${kind}${remote ? ", fully remote" : ""}).\n\nThe catch: ${catchOf(job)}.\n\nReply with your field and I'll point you to the closest open role.`,
      comment: comment(`${job.title}: what it is, who it's for, and what to prep:`),
    },
    {
      angle: "Fit checklist",
      tag: "Remote Jobs",
      text: `3 signs you'd be a fit for ${job.title} (${pay}):\n\n1. ${fit[0] || ""}\n2. ${fit[1] || ""}\n3. ${fit[2] || ""}\n\nAll 3? Worth applying.\n2 of 3? Read the prep notes first.\n\nWhich one are you missing?`,
      comment: comment("Prep notes and how to apply:"),
    },
  ];
  return posts.map((p) => ({ angle: p.angle, tag: p.tag, text: cap(fix(p.text)), comment: fix(p.comment), posted: null }));
}
