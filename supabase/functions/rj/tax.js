// Skill taxonomy: collapse a posting's raw skill list into 2–4 canonical "major skills",
// reusing skills already in the database (rj_skills) and creating new ones only when nothing matches.

// Soft skills every posting lists; they say nothing about the role, so they never become tags.
const GENERIC = /^(attention to detail|detail oriented|communication|written communication|verbal communication|written and verbal communication|collaboration|teamwork|analytical thinking|analytical reasoning|analytical skills|critical thinking|problem solving|review and assessment|time management|english|fluent english|self motivated|adaptability|research|writing)$/;

// Canonical names for common variants. First match wins, so specific patterns come first.
const CANON = [
  [/\b(llm|ai)\b.*\b(eval|evaluation|prompting|training)\b|\bprompting\b.*\beval|rlhf|ai training/, "LLM evaluation"],
  [/prompt engineering|\bprompt(s|ing)?\b/, "Prompt engineering"],
  [/\b(no)?sql\b|database/, "SQL & databases"],
  [/\bpython\b/, "Python"],
  [/javascript|typescript|\bnode\b|react/, "JavaScript / TypeScript"],
  [/langchain|langgraph|llamaindex|agent framework|\bagents?\b/, "LLM agents"],
  [/\bllms?\b|large language model/, "LLMs"],
  [/\baws\b|\bgcp\b|azure|cloud/, "Cloud (AWS/GCP/Azure)"],
  [/fastapi|\bapi(s)?\b|backend/, "Backend & APIs"],
  [/system design|software architecture|architecture/, "System design"],
  [/code review/, "Code review"],
  [/debug/, "Debugging"],
  [/algorithm|data structure/, "Algorithms & data structures"],
  [/machine learning|\bml\b|deep learning/, "Machine learning"],
  [/statistic|experimentation|a\/b test/, "Statistics & experimentation"],
  [/pandas|data analysis|data modeling|data modelling|structured dataset/, "Data analysis & modeling"],
  [/game engine|engine fluency|\bunity\b|unreal|godot/, "Game engines (Unity/Unreal/Godot)"],
  [/gameplay|game development|game design/, "Game development"],
  [/test design|\bqa\b|quality assurance|testing|playtest/, "QA & testing"],
  [/westlaw|lexisnexis|legal research/, "Legal research"],
  [/bluebook|legal writing|citation/, "Legal writing & citation"],
  [/legal analysis|case law|statut/, "Legal analysis"],
  [/catalog/, "Product catalogs"],
  [/taxonomy|normali[sz]/, "Taxonomy & data normalization"],
  [/\be ?-?commerce|merchandis|retail/, "E-commerce operations"],
  [/consumer behavio|shopping journey|user simulation/, "Consumer behavior"],
  [/scenario design|scenario/, "Scenario design"],
  [/general relativity|gravity|cosmolog|hologra|string theory|quantum field/, "Theoretical physics"],
  [/\blatex\b/, "LaTeX"],
  [/mathemat|proof/, "Mathematics"],
  [/financial model|valuation/, "Financial modeling"],
  [/accounting|gaap|ifrs/, "Accounting"],
  [/clinical|medical|patient/, "Clinical knowledge"],
  [/translat|locali[sz]/, "Translation & localization"],
  [/copywrit|content writing|editing/, "Writing & editing"],
  [/crm|salesforce|hubspot/, "CRM"],
  [/marketing|campaign|growth/, "Marketing"],
  [/sales/, "Sales"],
  [/slide|presentation|powerpoint/, "Presentations"],
  [/curriculum|teaching|instruction/, "Teaching & curriculum"],
];

const FILLER = /\b(expertise|expert|knowledge|skills?|proficiency|proficient|understanding|experience|strong|advanced|deep|hands-on|solid|concepts?|fluency|mindset|ability|familiarity|background|in|of|the|and|with)\b/g;
export const norm = (s) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9+#/ ]+/g, " ").replace(/\s+/g, " ").trim();
const core = (s) => norm(s).replace(FILLER, " ").replace(/\s+/g, " ").trim();
const tokens = (s) => new Set(core(s).split(/[\s/]+/).filter((t) => t.length > 1));
function jaccard(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const t of A) if (B.has(t)) n++;
  return n / (A.size + B.size - n);
}
const titleCase = (s) => {
  const c = String(s || "").replace(/\s*\b(expertise|knowledge|skills?|proficiency|understanding|fluency)\b\s*/gi, " ").replace(/\s+/g, " ").trim();
  return c ? (c === c.toLowerCase() ? c.charAt(0).toUpperCase() + c.slice(1) : c) : String(s || "").trim();
};

// existing: [{ name, domain, aliases[], uses }]
// returns { tags: [names], create: [{name, domain, aliases}], alias: [{name, alias}] }
export function classify(raw, domain, existing, extraText = "") {
  const ex = (existing || []).map((e) => ({ ...e, aliases: e.aliases || [], uses: e.uses || 0 }));
  const byNorm = new Map();
  for (const e of ex) { byNorm.set(norm(e.name), e); for (const a of e.aliases) byNorm.set(norm(a), e); }
  const picks = [];   // { name, isNew, idx, uses, alias? }
  const seen = new Set();
  const list = (raw || []).map((s) => String(s).trim()).filter(Boolean);
  list.forEach((s, idx) => {
    const n = norm(s);
    if (!n || GENERIC.test(core(s)) || GENERIC.test(n)) return;
    let hit = byNorm.get(n);
    let canon = null;
    if (!hit) for (const [re, name] of CANON) if (re.test(n)) { canon = name; break; }
    if (!hit && canon) hit = byNorm.get(norm(canon));
    if (!hit && !canon) {
      let best = null, sc = 0;
      for (const e of ex) { const v = Math.max(jaccard(s, e.name), ...e.aliases.map((a) => jaccard(s, a))); if (v > sc) { sc = v; best = e; } }
      if (best && sc >= 0.6) hit = best;
    }
    const name = hit ? hit.name : canon || titleCase(s);
    if (seen.has(name)) return;
    seen.add(name);
    picks.push({ name, isNew: !hit, idx, uses: hit ? hit.uses : 0, alias: hit && norm(hit.name) !== n && !hit.aliases.some((a) => norm(a) === n) ? s : null, canon: !!canon || !!hit });
  });
  // Major skills: known/canonical skills first (shared across jobs keeps the list short), in posting order.
  picks.sort((a, b) => (Number(b.canon) - Number(a.canon)) || (a.idx - b.idx));
  let chosen = picks.slice(0, 4);
  // If the posting gave no usable skills, fall back to canonical skills mentioned in the text.
  if (!chosen.length && extraText) {
    const t = norm(extraText);
    for (const [re, name] of CANON) if (re.test(t) && !chosen.some((c) => c.name === name)) chosen.push({ name, isNew: !byNorm.get(norm(name)), canon: true });
    chosen = chosen.slice(0, 3);
  }
  const create = [], alias = [];
  for (const c of chosen) {
    if (c.isNew && !create.some((x) => x.name === c.name)) create.push({ name: c.name, domain, aliases: [] });
    else if (c.alias) alias.push({ name: c.name, alias: c.alias });
  }
  // Raw variants that collapsed into a newly created canonical skill become its aliases.
  for (const s of list) {
    const n = norm(s);
    for (const c of create) if (n !== norm(c.name)) { for (const [re, name] of CANON) if (name === c.name && re.test(n)) { c.aliases.push(s); break; } }
  }
  return { tags: chosen.map((c) => c.name), create, alias };
}

// Map micro1's own domain slug to one of ours when keyword detection found nothing specific.
const SLUGMAP = { "software-engineering": "Software engineering", "ai-machine-learning": "Data science & ML", "data-science": "Data science & ML", "legal": "Legal", "finance": "Finance & accounting", "healthcare": "Healthcare & medicine", "medical": "Healthcare & medicine", "marketing": "Marketing & sales", "sales": "Marketing & sales", "education": "Education", "writing": "Language & writing", "languages": "Language & writing", "science": "Science & math", "mathematics": "Science & math", "product": "Product", "game-development": "Game development", "ecommerce": "E-commerce & retail" };
export function domainFromSlug(slug) {
  const s = String(slug || "").toLowerCase();
  if (!s || s === "other" || s === "general") return null;
  if (SLUGMAP[s]) return SLUGMAP[s];
  const t = s.replace(/-/g, " ").replace(/\band\b/g, "&");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
