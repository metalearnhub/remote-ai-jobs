// Remote AI Jobs (jobs.dijaedadula.com) — public job data, email capture, referral hand-off, admin, job alerts.
// Mail goes out through the same Zoho SMTP secrets as the newsletter (ZOHO_SMTP_USER / ZOHO_SMTP_PASS / NL_FROM).
// Referral URLs are only returned after a visitor has given an email (capture) or carries a valid lead token (go).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";
import { POST_RE, extract, build, threads, slugify } from "./gen.js";
import { classify } from "./tax.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-rj-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[A-Za-z]{2,24}$/;
const SLUG = /^[a-z0-9-]{2,90}$/;
const NL = "https://qbubwemdvwflxvxwesrl.supabase.co/functions/v1/nl";
const PUBLIC_COLS = "slug,title,domain,company,pay_text,job_type,openings,skills,tags,about,scope,preferred,fit,take,prep,status,published_at,updated_at";
const CONSENT = "Send me instant alerts for remote AI roles and the free guide (job-alerts). Unsubscribe anytime.";

function j(body: unknown, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": cache } });
}
async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function rand(n: number) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join(""); }
const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
async function cfg() {
  const { data } = await db.from("rj_config").select("k, v");
  return Object.fromEntries((data || []).map((r: { k: string; v: string }) => [r.k, r.v])) as Record<string, string>;
}
async function site() { return ((await cfg()).site_url || "https://jobs.dijaedadula.com").replace(/\/$/, ""); }

function transport() {
  const user = Deno.env.get("ZOHO_SMTP_USER"), pass = Deno.env.get("ZOHO_SMTP_PASS");
  if (!user || !pass) return null;
  return nodemailer.createTransport({ host: Deno.env.get("ZOHO_SMTP_HOST") || "smtp.zoho.com", port: 465, secure: true, pool: true, maxConnections: 1, auth: { user, pass } });
}
const FROM = () => `Dijae Dadula <${Deno.env.get("NL_FROM") || Deno.env.get("ZOHO_SMTP_USER")}>`;
function wrap(inner: string, unsub: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#14171c;max-width:560px">${inner}<p style="font-size:12px;color:#777;margin-top:28px">You're getting this because you asked for remote AI job alerts at jobs.dijaedadula.com. This is an independent list run by Dijae Dadula — not micro1 or any employer. Some links are referral links; I may earn a bonus if you're hired. <a href="${unsub}" style="color:#777">Unsubscribe</a>.</p></div>`;
}

// ---------- public ----------
async function capture(req: Request, b: any) {
  if (b.website) return j({ ok: true }); // honeypot
  const email = String(b.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) return j({ error: "Please enter a valid email." }, 400);
  const slug = String(b.slug || "");
  const alerts = !!b.alerts;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  const { data: ex } = await db.from("rj_leads").select("id,token,alerts").eq("email", email).maybeSingle();
  let lead = ex;
  if (!ex) {
    const { data, error } = await db.from("rj_leads").insert({ email, alerts, consent_text: alerts ? CONSENT : "Entered email to view the application link.", first_job: SLUG.test(slug) ? slug : null, source: String(b.ref || "web").slice(0, 80), ip, user_agent: ua }).select("id,token,alerts").single();
    if (error) return j({ error: "Could not save your email right now." }, 500);
    lead = data;
  } else if (alerts && !ex.alerts) {
    await db.from("rj_leads").update({ alerts: true, consent_text: CONSENT, updated_at: new Date().toISOString() }).eq("id", ex.id);
  }
  let newlyAlerted = false;
  if (alerts) newlyAlerted = await subscribeAlerts(email, ip, ua);
  let url: string | null = null;
  if (SLUG.test(slug)) {
    const { data: job } = await db.from("rj_jobs").select("id,referral_url,status,applies,title").eq("slug", slug).maybeSingle();
    if (job && job.status === "live" && job.referral_url) {
      url = job.referral_url;
      await db.from("rj_jobs").update({ applies: job.applies + 1 }).eq("id", job.id);
      await db.from("rj_events").insert({ job_slug: slug, lead_id: lead!.id, kind: "apply", ref: String(b.ref || "").slice(0, 80) || null });
    }
  }
  if (newlyAlerted) {
    const w = welcome(email, slug);
    // @ts-ignore EdgeRuntime is provided by Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(w); else await w;
  }
  return j({ ok: true, token: lead!.token, url });
}

// Adds the job-alerts tag in the shared newsletter list. Returns true if this is a new opt-in.
async function subscribeAlerts(email: string, ip: string | null, ua: string) {
  const { data: s } = await db.from("nl_subscribers").select("id,tags,status").eq("email", email).maybeSingle();
  if (!s) {
    const { error } = await db.from("nl_subscribers").insert({ email, source: "jobs.dijaedadula.com", tags: ["job-alerts"], consent_text: CONSENT, ip, user_agent: ua });
    return !error;
  }
  const tags: string[] = s.tags || [];
  if (tags.includes("job-alerts") && s.status === "subscribed") return false;
  await db.from("nl_subscribers").update({ tags: Array.from(new Set([...tags, "job-alerts"])), status: "subscribed", consent_text: CONSENT, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", s.id);
  return true;
}

async function welcome(email: string, slug: string) {
  const t = transport(); if (!t) return;
  const { data: s } = await db.from("nl_subscribers").select("unsub_token").eq("email", email).maybeSingle();
  const unsub = `${NL}?u=${s?.unsub_token || ""}`;
  const base = await site();
  const jobLine = SLUG.test(slug) ? `<p>The role you were looking at stays here: <a href="${base}/j/${slug}">${base}/j/${slug}</a></p>` : "";
  try {
    await t.sendMail({
      from: FROM(), to: email, subject: "Your remote AI work guide (and job alerts are on)",
      html: wrap(`<p>Hi,</p><p>Thanks for signing up. Here's the free guide I promised: how AI-training and annotation work actually works, where to find it, and how I prepared for the AI interview after failing twice.</p><p><a href="${base}/guide" style="display:inline-block;background:#4b2ee8;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Open the guide</a></p>${jobLine}<p>From now on, when I find a remote AI role worth your time, you'll get a short email. No spam, and you can leave with one click.</p><p>Dijae</p>`, unsub),
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
  } catch (_) { /* best effort */ }
  t.close();
}

async function go(b: any) {
  const slug = String(b.slug || ""), token = String(b.token || "");
  if (!SLUG.test(slug) || !/^[0-9a-f-]{36}$/.test(token)) return j({ error: "bad request" }, 400);
  const { data: lead } = await db.from("rj_leads").select("id").eq("token", token).maybeSingle();
  if (!lead) return j({ error: "unknown", reset: true }, 404);
  const { data: job } = await db.from("rj_jobs").select("id,referral_url,status,applies").eq("slug", slug).maybeSingle();
  if (!job || job.status !== "live" || !job.referral_url) return j({ error: "This role is closed." }, 410);
  await db.from("rj_jobs").update({ applies: job.applies + 1 }).eq("id", job.id);
  await db.from("rj_events").insert({ job_slug: slug, lead_id: lead.id, kind: "apply", ref: String(b.ref || "").slice(0, 80) || null });
  return j({ ok: true, url: job.referral_url });
}

// ---------- taxonomy: domains + canonical major skills ----------
async function skillTable() {
  const { data: sk } = await db.from("rj_skills").select("id,name,domain,aliases");
  const { data: jobs } = await db.from("rj_jobs").select("tags");
  const uses: Record<string, number> = {};
  for (const r of jobs || []) for (const t of r.tags || []) uses[t] = (uses[t] || 0) + 1;
  return (sk || []).map((x: any) => ({ ...x, uses: uses[x.name] || 0 }));
}
async function ensureDomain(name: string) {
  if (name) await db.from("rj_domains").upsert({ name }, { onConflict: "name", ignoreDuplicates: true });
}
async function tagJob(raw: string[], domain: string, text: string) {
  const r = classify(raw || [], domain, await skillTable(), text || "");
  for (const c of r.create) await db.from("rj_skills").upsert({ name: c.name, domain: c.domain, aliases: c.aliases }, { onConflict: "name", ignoreDuplicates: true });
  for (const a of r.alias) {
    const { data: e } = await db.from("rj_skills").select("id,aliases").eq("name", a.name).maybeSingle();
    if (e && !(e.aliases || []).includes(a.alias)) await db.from("rj_skills").update({ aliases: [...(e.aliases || []), a.alias].slice(0, 40) }).eq("id", e.id);
  }
  return r.tags;
}
async function retagAll() {
  const { data: jobs } = await db.from("rj_jobs").select("id,skills,domain,scope,title");
  const out: any[] = [];
  for (const jb of jobs || []) {
    await ensureDomain(jb.domain);
    const tags = await tagJob(jb.skills || [], jb.domain, (jb.scope || []).join(" ") + " " + jb.title);
    await db.from("rj_jobs").update({ tags }).eq("id", jb.id);
    out.push({ id: jb.id, tags });
  }
  return { ok: true, jobs: out };
}
async function taxonomy(liveOnly: boolean) {
  const { data: jobs } = await db.from("rj_jobs").select("domain,tags,status");
  const dc: Record<string, number> = {}, sc: Record<string, number> = {};
  for (const r of jobs || []) { if (liveOnly && r.status !== "live") continue; dc[r.domain] = (dc[r.domain] || 0) + 1; for (const t of r.tags || []) sc[t] = (sc[t] || 0) + 1; }
  const { data: doms } = await db.from("rj_domains").select("name,sort").order("sort").order("name");
  const { data: sk } = await db.from("rj_skills").select("name,domain,aliases").order("name");
  const domains = (doms || []).map((d: any) => ({ name: d.name, count: dc[d.name] || 0 })).filter((d: any) => !liveOnly || d.count);
  const skills = (sk || []).map((x: any) => ({ name: x.name, domain: x.domain, count: sc[x.name] || 0, ...(liveOnly ? {} : { aliases: x.aliases || [] }) })).filter((x: any) => !liveOnly || x.count).sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));
  return { domains, skills };
}
async function renameSkill(from: string, to: string) {
  from = String(from || "").trim(); to = String(to || "").trim().slice(0, 80);
  if (!from || !to || from === to) return { error: "Pick two different names." };
  const { data: a } = await db.from("rj_skills").select("id,aliases").eq("name", from).maybeSingle();
  if (!a) return { error: "Skill not found." };
  const { data: b } = await db.from("rj_skills").select("id,aliases").eq("name", to).maybeSingle();
  if (b) {
    await db.from("rj_skills").update({ aliases: Array.from(new Set([...(b.aliases || []), from, ...(a.aliases || [])])).slice(0, 60) }).eq("id", b.id);
    await db.from("rj_skills").delete().eq("id", a.id);
  } else {
    await db.from("rj_skills").update({ name: to, aliases: Array.from(new Set([...(a.aliases || []), from])) }).eq("id", a.id);
  }
  const { data: jobs } = await db.from("rj_jobs").select("id,tags").contains("tags", [from]);
  for (const jb of jobs || []) await db.from("rj_jobs").update({ tags: Array.from(new Set((jb.tags || []).map((t: string) => (t === from ? to : t)))) }).eq("id", jb.id);
  return { ok: true, merged: !!b, jobs: (jobs || []).length };
}

// ---------- link → page (one public job page per link, only when Dijae submits it) ----------
async function fetchPost(id: string) {
  const r = await fetch(`https://jobs.micro1.ai/post/${id}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RemoteAIWork/1.0; +https://jobs.dijaedadula.com)", "Accept": "text/html" }, redirect: "follow" });
  if (!r.ok) throw new Error(`The job page answered ${r.status}.`);
  const x = extract(await r.text());
  if (!x || !x.title) throw new Error("Couldn't read this job page (it may be closed or the layout changed).");
  return x;
}
// Fingerprint of what the posting actually says (title, pay, full description), so a repeat link is caught
// only when the link AND every detail match; a changed posting is reported as an update instead.
async function fingerprint(g: any) {
  const n = (v: unknown) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return await sha256([n(g.title), n(g.pay_text), n(g.openings), n(g.job_type), n(g.raw)].join("|"));
}
const refCode = (u: string) => (String(u).match(/[?&]referralCode=([^&#]+)/) || [])[1] || "";
async function ingest(list: unknown, refresh: boolean, force = false) {
  const urls = (Array.isArray(list) ? list : String(list || "").split(/\s+/)).map((u) => String(u).trim()).filter(Boolean).slice(0, 8);
  const base = await site();
  const out: any[] = [];
  const seenIds = new Set<string>();
  for (const u of urls) {
    const m = u.match(POST_RE);
    if (!m) { out.push({ url: u, ok: false, error: "Not a jobs.micro1.ai/post/… link." }); continue; }
    const id = m[1].toLowerCase();
    if (!/[?&]referralCode=/.test(u)) { out.push({ url: u, ok: false, error: "This link has no referralCode. Copy it from \"Refer and earn\"." }); continue; }
    if (seenIds.has(id)) { out.push({ url: u, ok: false, duplicate: true, error: "Duplicate: you pasted this same link twice in this batch." }); continue; }
    seenIds.add(id);
    try {
      const { data: ex } = await db.from("rj_jobs").select("*").or(`source_id.eq.${id},referral_url.ilike.*${id}*`).limit(1).maybeSingle();
      const x = await fetchPost(id);
      const g = build(x, u, base);
      const hash = await fingerprint(g);

      if (ex) {
        // Same job post. Compare the link and every detail.
        const changes: string[] = [];
        const edited = ex.source_hash ? ex.source_hash !== hash : ((g.pay_text || "") !== (ex.pay_text || "") || (g.openings || "") !== (ex.openings || ""));
        if (edited) {
          if (ex.source_hash && g.title !== ex.title) changes.push(`title: "${ex.title}" → "${g.title}"`);
          if ((g.pay_text || "") !== (ex.pay_text || "")) changes.push(`pay: ${ex.pay_text || "—"} → ${g.pay_text || "—"}`);
          if ((g.openings || "") !== (ex.openings || "")) changes.push(`openings: ${ex.openings || "—"} → ${g.openings || "—"}`);
          if (!changes.length) changes.push("job description was edited on micro1");
        }
        if (g.status === "closed" && ex.status !== "closed") changes.push("closed on micro1");
        const sameLink = ex.referral_url === u || refCode(ex.referral_url || "") === refCode(u);
        if (!changes.length && !refresh) {
          if (!ex.source_hash || !ex.source_id) await db.from("rj_jobs").update({ source_id: id, source_hash: hash }).eq("id", ex.id);
          const where = ex.status === "live" ? "already live" : ex.status === "closed" ? "already saved (closed)" : "already saved as a draft";
          out.push({ url: u, ok: false, duplicate: true, slug: ex.slug, title: ex.title, pay_text: ex.pay_text, status: ex.status, error: sameLink
            ? `Duplicate: same link and same job details as a page that's ${where}. Nothing was added.`
            : `Duplicate job: same posting and details as a page that's ${where}, but with a different referral code than the one saved. Nothing was changed; the saved link is kept.` });
          continue;
        }
        if (!sameLink) changes.push("this link's referral code differs from the saved one (saved link kept)");
        // Details changed (or refresh asked): update the facts, keep the curated text, rewrite posts.
        const upd: any = { pay_text: g.pay_text || ex.pay_text, openings: g.openings, status: g.status === "closed" ? "closed" : ex.status, source_id: id, source_hash: hash, updated_at: new Date().toISOString() };
        if (ex.source_hash && g.title && g.title !== ex.title) upd.title = g.title;
        await ensureDomain(ex.domain);
        upd.tags = await tagJob(x.skills.length ? x.skills : ex.skills || [], ex.domain, (ex.scope || []).join(" ") + " " + ex.title);
        upd.threads = threads({ ...ex, ...upd }, ex.slug, base).map((p: any, i: number) => ({ ...p, posted: (ex.threads || [])[i]?.posted || null }));
        const { error } = await db.from("rj_jobs").update(upd).eq("id", ex.id);
        if (error) throw new Error(error.message);
        out.push({ url: u, ok: true, updated: true, changes: changes.length ? changes : ["no changes; posts rewritten"], slug: ex.slug, title: upd.title || ex.title, pay_text: upd.pay_text, domain: ex.domain, tags: upd.tags, status: upd.status });
        continue;
      }

      // Different link, but the very same posting text as an existing page (micro1 sometimes reposts a job).
      const { data: twin } = await db.from("rj_jobs").select("slug,title,pay_text,status").eq("source_hash", hash).limit(1).maybeSingle();
      if (twin && !force) {
        out.push({ url: u, ok: false, duplicate: true, slug: twin.slug, title: twin.title, pay_text: twin.pay_text, status: twin.status, error: "Duplicate: this is a different link, but the title, pay and full description are identical to an existing page. Nothing was added. Tick \"Add anyway\" if it's really a separate opening." });
        continue;
      }

      let slug = slugify(g.title) || "role-" + id.slice(0, 8);
      const { data: taken } = await db.from("rj_jobs").select("slug").like("slug", slug + "%");
      const used = new Set((taken || []).map((r: any) => r.slug));
      for (let n = 2; used.has(slug); n++) slug = slugify(g.title) + "-" + n;
      const now = new Date().toISOString();
      await ensureDomain(g.domain);
      const tags = await tagJob(x.skills, g.domain, g.scope.join(" ") + " " + g.title);
      const row = { ...g, slug, tags, source_id: id, source_hash: hash, threads: threads(g, slug, base), published_at: g.status === "live" ? now : null, updated_at: now };
      const { error } = await db.from("rj_jobs").insert(row);
      if (error) throw new Error(error.message);
      out.push({ url: u, ok: true, created: true, slug, title: g.title, pay_text: g.pay_text, domain: g.domain, tags, status: g.status, similar: twin ? twin.slug : null });
    } catch (e) {
      out.push({ url: u, ok: false, error: String((e as Error).message || e).slice(0, 200) });
    }
  }
  return { results: out, site: base };
}

// Records the fingerprint of every saved job (no content changes), so future duplicates are caught exactly.
async function hashAll() {
  const { data: jobs } = await db.from("rj_jobs").select("id,referral_url").not("referral_url", "is", null);
  const out: any[] = [];
  for (const jb of jobs || []) {
    const m = String(jb.referral_url).match(POST_RE);
    if (!m) continue;
    try {
      const x = await fetchPost(m[1].toLowerCase());
      const g = build(x, jb.referral_url, await site());
      await db.from("rj_jobs").update({ source_id: m[1].toLowerCase(), source_hash: await fingerprint(g) }).eq("id", jb.id);
      out.push({ id: jb.id, ok: true });
    } catch (e) { out.push({ id: jb.id, ok: false, error: String(e).slice(0, 120) }); }
  }
  return { ok: true, jobs: out };
}

// ---------- admin ----------
async function mailCode(to: string, code: string) {
  const t = transport(); if (!t) return false;
  try {
    await t.sendMail({ from: `Remote AI Jobs admin <${Deno.env.get("NL_FROM") || Deno.env.get("ZOHO_SMTP_USER")}>`, to, subject: `Your admin sign-in code: ${code}`,
      text: `Your Remote AI Jobs admin code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:16px"><p>Your Remote AI Jobs admin sign-in code:</p><p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p><p style="color:#666">It expires in 10 minutes. If you didn't ask for it, ignore this email.</p></div>` });
  } finally { t.close(); }
  return true;
}
async function sendCode(email: string) {
  const c = await cfg();
  if (email !== (c.allowed_email || "").toLowerCase()) return j({ error: "This email can't sign in here." }, 403);
  const { data: prev } = await db.from("rj_otp").select("sent_at").eq("email", email).maybeSingle();
  if (prev && Date.now() - Date.parse(prev.sent_at) < 45000) return j({ error: "A code was just sent. Wait a few seconds, then try again." }, 429);
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await db.from("rj_otp").upsert({ email, code_hash: await sha256(email + ":" + code), expires_at: new Date(Date.now() + 600000).toISOString(), attempts: 0, sent_at: new Date().toISOString() });
  try { return j({ ok: true, emailed: await mailCode(email, code) }); }
  catch (e) { return j({ ok: false, error: "Couldn't email the code: " + String(e).slice(0, 80) }, 500); }
}
async function verify(email: string, code: string) {
  const c = await cfg();
  if (email !== (c.allowed_email || "").toLowerCase()) return j({ error: "This email can't sign in here." }, 403);
  const { data: o } = await db.from("rj_otp").select("code_hash, expires_at, attempts").eq("email", email).maybeSingle();
  if (!o || Date.parse(o.expires_at) < Date.now() || o.attempts >= 5 || (await sha256(email + ":" + code)) !== o.code_hash) {
    if (o) await db.from("rj_otp").update({ attempts: o.attempts + 1 }).eq("email", email);
    return j({ error: "That code is wrong or expired." }, 401);
  }
  await db.from("rj_otp").delete().eq("email", email);
  const token = rand(32), expires = new Date(Date.now() + 30 * 864e5).toISOString();
  await db.from("rj_sessions").insert({ token_hash: await sha256(token), email, expires_at: expires });
  await db.from("rj_sessions").delete().lt("expires_at", new Date().toISOString());
  return j({ token, expires_at: expires, email });
}

const JOB_FIELDS = ["slug", "title", "domain", "company", "pay_text", "job_type", "openings", "skills", "about", "scope", "preferred", "fit", "take", "prep", "referral_url", "status", "threads", "raw"];
function cleanJob(x: any) {
  const o: any = {};
  for (const k of JOB_FIELDS) if (k in x) o[k] = x[k];
  for (const k of ["skills", "scope", "preferred", "fit", "prep"]) if (k in o) o[k] = (Array.isArray(o[k]) ? o[k] : []).map((s: unknown) => String(s).trim().slice(0, 600)).filter(Boolean).slice(0, 30);
  for (const k of ["title", "domain", "company", "pay_text", "job_type", "openings"]) if (k in o) o[k] = String(o[k] ?? "").trim().slice(0, 200);
  for (const k of ["about", "take", "raw"]) if (k in o) o[k] = String(o[k] ?? "").slice(0, 20000);
  if ("referral_url" in o) { const u = String(o.referral_url || "").trim(); o.referral_url = /^https:\/\/[^\s]+$/.test(u) ? u : null; }
  if ("slug" in o) o.slug = String(o.slug || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  if ("threads" in o && !Array.isArray(o.threads)) o.threads = [];
  return o;
}

async function admin(b: any, email: string) {
  const a = b.action;
  if (a === "me") return j({ email });
  if (a === "jobs") {
    const { data, error } = await db.from("rj_jobs").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) return j({ error: error.message }, 500);
    return j({ jobs: data, site: await site() });
  }
  if (a === "save") {
    const o = cleanJob(b.job || {});
    if (!o.title) return j({ error: "Title is required." }, 400);
    if (!o.slug || !SLUG.test(o.slug)) return j({ error: "The page address (slug) is missing or invalid." }, 400);
    if (o.status === "live" && !o.referral_url) return j({ error: "Paste your referral link before publishing." }, 400);
    o.updated_at = new Date().toISOString();
    const id = Number(b.job?.id) || 0;
    if (id) {
      const { data: prev } = await db.from("rj_jobs").select("status,published_at").eq("id", id).single();
      if (o.status === "live" && prev && !prev.published_at) o.published_at = o.updated_at;
      const { data, error } = await db.from("rj_jobs").update(o).eq("id", id).select("*").single();
      if (error) return j({ error: error.message.includes("duplicate") ? "Another job already uses that page address." : error.message }, 400);
      return j({ job: data });
    }
    if (o.status === "live") o.published_at = o.updated_at;
    const { data, error } = await db.from("rj_jobs").insert(o).select("*").single();
    if (error) return j({ error: error.message.includes("duplicate") ? "Another job already uses that page address." : error.message }, 400);
    return j({ job: data });
  }
  if (a === "delete") {
    const { error } = await db.from("rj_jobs").delete().eq("id", Number(b.id) || 0);
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true });
  }
  if (a === "leads") {
    const { data, error } = await db.from("rj_leads").select("email,alerts,first_job,source,created_at").order("created_at", { ascending: false }).limit(2000);
    if (error) return j({ error: error.message }, 500);
    const { count } = await db.from("nl_subscribers").select("id", { count: "exact", head: true }).contains("tags", ["job-alerts"]).eq("status", "subscribed");
    return j({ leads: data, alert_subscribers: count || 0 });
  }
  if (a === "alert_start") {
    const slugs = (Array.isArray(b.slugs) ? b.slugs : []).filter((s: string) => SLUG.test(s)).slice(0, 5);
    if (!slugs.length) return j({ error: "Pick at least one live job." }, 400);
    const subject = String(b.subject || "").trim().slice(0, 140);
    if (!subject) return j({ error: "Subject is required." }, 400);
    const { data, error } = await db.from("rj_alerts").insert({ job_slugs: slugs, subject }).select("id").single();
    if (error) return j({ error: error.message }, 500);
    return j({ id: data.id });
  }
  if (a === "alert_step") return await alertStep(Number(b.id) || 0, !!b.test, email);
  if (a === "ingest") return j(await ingest(b.urls, !!b.refresh, !!b.force));
  if (a === "taxonomy") return j(await taxonomy(false));
  if (a === "retag_all") return j(await retagAll());
  if (a === "tax_rename") { const r = await renameSkill(b.from, b.to); return j(r, (r as any).error ? 400 : 200); }
  if (a === "set_domain") {
    const name = String(b.domain || "").trim().slice(0, 60);
    if (!name) return j({ error: "Domain is required." }, 400);
    await ensureDomain(name);
    const { error } = await db.from("rj_jobs").update({ domain: name }).eq("id", Number(b.id) || 0);
    return error ? j({ error: error.message }, 500) : j({ ok: true });
  }
  if (a === "set_tags") {
    const tags = (Array.isArray(b.tags) ? b.tags : []).map((t: unknown) => String(t).trim().slice(0, 80)).filter(Boolean).slice(0, 6);
    for (const t of tags) await db.from("rj_skills").upsert({ name: t }, { onConflict: "name", ignoreDuplicates: true });
    const { error } = await db.from("rj_jobs").update({ tags }).eq("id", Number(b.id) || 0);
    return error ? j({ error: error.message }, 500) : j({ ok: true, tags });
  }
  if (a === "rethread") {
    const { data: jb } = await db.from("rj_jobs").select("*").eq("id", Number(b.id) || 0).maybeSingle();
    if (!jb) return j({ error: "Job not found." }, 404);
    const t = threads(jb, jb.slug, await site());
    const { data, error } = await db.from("rj_jobs").update({ threads: t, updated_at: new Date().toISOString() }).eq("id", jb.id).select("*").single();
    if (error) return j({ error: error.message }, 500);
    return j({ job: data });
  }
  return j({ error: "unknown action" }, 400);
}

async function alertHtml(slugs: string[], first: string) {
  const base = await site();
  const { data: jobs } = await db.from("rj_jobs").select("slug,title,pay_text,job_type,domain,about").in("slug", slugs).eq("status", "live");
  const cards = (jobs || []).map((x: any) => `<div style="border:1px solid #e3e6ea;border-radius:12px;padding:16px 18px;margin:12px 0"><div style="font-size:12px;color:#5b616b;text-transform:none">${esc(x.domain)} · ${esc(x.job_type || "Remote")}</div><div style="font-size:19px;font-weight:800;margin:4px 0">${esc(x.title)}</div>${x.pay_text ? `<div style="color:#0b7a52;font-weight:700">${esc(x.pay_text)} <span style="color:#777;font-weight:400">(as posted)</span></div>` : ""}<p style="margin:8px 0 12px;color:#333">${esc(String(x.about || "").slice(0, 220))}${String(x.about || "").length > 220 ? "…" : ""}</p><a href="${base}/j/${x.slug}?ref=alert" style="display:inline-block;background:#4b2ee8;color:#fff;padding:10px 16px;border-radius:9px;text-decoration:none;font-weight:700">See the role</a></div>`).join("");
  return { html: `<p>Hi ${esc(first || "there")},</p><p>New remote AI role${(jobs || []).length > 1 ? "s" : ""} worth a look:</p>${cards}<p style="color:#555">Apply only where you could talk for 20 minutes about real work you've done. Pay and openings are as posted and can change.</p><p>Dijae</p>`, n: (jobs || []).length };
}
async function alertStep(id: number, test: boolean, adminEmail: string) {
  const { data: al } = await db.from("rj_alerts").select("*").eq("id", id).maybeSingle();
  if (!al) return j({ error: "Alert not found." }, 404);
  const t = transport();
  if (!t) return j({ error: "Email isn't set up (Zoho SMTP secrets missing)." }, 500);
  if (test) {
    const { html, n } = await alertHtml(al.job_slugs, "Dijae");
    if (!n) { t.close(); return j({ error: "None of the selected jobs are live." }, 400); }
    try { await t.sendMail({ from: FROM(), to: adminEmail, subject: "[TEST] " + al.subject, html: wrap(html, NL) }); } catch (e) { t.close(); return j({ error: String(e).slice(0, 200) }, 500); }
    t.close(); await db.from("rj_alerts").delete().eq("id", id); return j({ ok: true, test: true });
  }
  const { data: done } = await db.from("rj_alert_sends").select("subscriber_id").eq("alert_id", id);
  const skip = new Set((done || []).map((r: any) => r.subscriber_id));
  const { data: subs } = await db.from("nl_subscribers").select("id,email,first_name,unsub_token").eq("status", "subscribed").contains("tags", ["job-alerts"]).order("id").limit(10000);
  const todo = (subs || []).filter((s: any) => !skip.has(s.id));
  const batch = todo.slice(0, 25);
  let ok = 0, bad = 0;
  for (const s of batch) {
    const unsub = `${NL}?u=${s.unsub_token}`;
    const { html } = await alertHtml(al.job_slugs, (s.first_name || "").trim());
    let st = "sent", err: string | null = null;
    try { await t.sendMail({ from: FROM(), to: s.email, subject: al.subject, html: wrap(html, unsub), headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }); ok++; }
    catch (e) { st = "failed"; err = String(e).slice(0, 300); bad++; }
    await db.from("rj_alert_sends").insert({ alert_id: id, subscriber_id: s.id, status: st, error: err });
  }
  t.close();
  const remaining = todo.length - batch.length;
  const upd: any = { sent: al.sent + ok, failed: al.failed + bad };
  if (remaining <= 0) { upd.status = "sent"; upd.finished_at = new Date().toISOString(); }
  await db.from("rj_alerts").update(upd).eq("id", id);
  return j({ sent: upd.sent, failed: upd.failed, remaining });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    if (req.method === "GET") {
      const a = url.searchParams.get("a");
      if (a === "list") {
        const { data } = await db.from("rj_jobs").select(PUBLIC_COLS).eq("status", "live").order("published_at", { ascending: false }).limit(100);
        return j({ jobs: data || [] }, 200, "public, max-age=60");
      }
      if (a === "job") {
        const slug = url.searchParams.get("slug") || "";
        if (!SLUG.test(slug)) return j({ error: "not found" }, 404);
        const { data } = await db.from("rj_jobs").select(PUBLIC_COLS).eq("slug", slug).in("status", ["live", "closed"]).maybeSingle();
        if (!data) return j({ error: "not found" }, 404);
        return j({ job: data }, 200, "public, max-age=60");
      }
      if (a === "taxonomy") return j(await taxonomy(true), 200, "public, max-age=60");
      return j({ ok: true, service: "rj" });
    }
    let b: any = {};
    try { b = JSON.parse((await req.text()).slice(0, 300000)); } catch { return j({ error: "bad json" }, 400); }
    if (b.action === "capture") return await capture(req, b);
    if (b.action === "go") return await go(b);
    if (b.action === "view") {
      const slug = String(b.slug || "");
      if (SLUG.test(slug)) {
        await db.from("rj_events").insert({ job_slug: slug, kind: "view", ref: String(b.ref || "").slice(0, 80) || null });
        const { data: jb } = await db.from("rj_jobs").select("id,views").eq("slug", slug).maybeSingle();
        if (jb) await db.from("rj_jobs").update({ views: jb.views + 1 }).eq("id", jb.id);
      }
      return j({ ok: true });
    }
    if (b.action === "ingest_key") {
      const k = (await cfg()).ingest_key || "";
      if (k.length < 32 || String(b.key || "") !== k) return j({ error: "unauthorized" }, 401);
      if (b.retag_all) return j(await retagAll());
      if (b.hash_all) return j(await hashAll());
      return j(await ingest(b.urls, !!b.refresh, !!b.force));
    }
    const email = String(b.email || "").trim().toLowerCase();
    if (b.action === "code") return await sendCode(email);
    if (b.action === "verify") return await verify(email, String(b.code || "").replace(/\D/g, ""));
    const tok = req.headers.get("x-rj-session") || "";
    if (tok.length < 32) return j({ error: "signed out" }, 401);
    const { data: s } = await db.from("rj_sessions").select("email, expires_at").eq("token_hash", await sha256(tok)).maybeSingle();
    if (!s || Date.parse(s.expires_at) < Date.now()) return j({ error: "signed out" }, 401);
    if (b.action === "signout") { await db.from("rj_sessions").delete().eq("token_hash", await sha256(tok)); return j({ ok: true }); }
    return await admin(b, s.email);
  } catch (e) {
    return j({ error: "Server error: " + String((e as Error).message || e).slice(0, 160) }, 500);
  }
});
