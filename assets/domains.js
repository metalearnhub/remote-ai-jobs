// Domain profiles: detection keywords, audience wording, fit lines, prep steps and post angles.
window.RJ_DOMAINS = {
  'Software engineering': {
    kw: ['software', 'engineer', 'developer', 'code review', 'debugging', 'system design', 'algorithms', 'backend', 'frontend', 'full stack', 'devops', 'swe'],
    who: 'software engineers', verb: 'review AI-written code and design hard coding problems',
    fit: ['You write and review production code regularly, not just tutorials', 'You can explain why a design or fix is right, in writing', 'You enjoy finding the bug others miss'],
    prep: ['Pick 2 real systems you built or debugged and write down the trade-offs you made', 'Practise explaining one algorithm and one design decision out loud in under 2 minutes', 'Expect a live coding task: warm up on 3–5 medium problems in your main language'],
    tag: 'SoftwareEngineering',
  },
  'Data science & ML': {
    kw: ['data scien', 'machine learning', 'statistic', 'pandas', 'experimentation', 'data model', 'quantitative', ' ml ', 'analytics'],
    who: 'data scientists and quants', verb: 'spot flawed methods and weak statistical reasoning in AI answers',
    fit: ['You run analyses or experiments as part of your actual job', 'You can spot a bad baseline, leakage or p-hacking quickly', 'You can explain statistics clearly to non-experts'],
    prep: ['Prepare one experiment you designed: hypothesis, metric, sample, result', 'Review common pitfalls: leakage, Simpson\'s paradox, multiple testing', 'Be ready to explain a model choice and how you validated it'],
    tag: 'DataScience',
  },
  'Product': {
    kw: ['product manager', 'product owner', 'prd', 'roadmap', 'acceptance criteria', 'product ownership'],
    who: 'product managers and product owners', verb: 'judge AI-written specs, release notes and product decisions',
    fit: ['You\'ve written specs, PRDs or acceptance criteria that engineers built from', 'You can say exactly why one document serves its reader better', 'You make decisions with metrics, not opinions'],
    prep: ['Prepare one product decision you made with data: baseline, decision, outcome', 'Practise writing a 5-line rationale: verdict, rule, evidence, impact, fix', 'Know the difference between product and project management in two sentences'],
    tag: 'ProductManagement',
  },
  'Marketing & sales': {
    kw: ['marketing', 'sales', 'brand', 'growth', 'crm', 'gtm', 'copywrit', 'campaign', 'seo', 'presentation', 'slide'],
    who: 'marketers and sales pros', verb: 'judge AI-written campaigns, decks and sales workflows',
    fit: ['You\'ve run real campaigns, funnels or sales processes with numbers to show', 'You can explain why one message works better for a specific audience', 'You know your tools (CRM, ads, analytics) hands-on'],
    prep: ['Pick 2 campaigns or pipelines you ran and the metrics that moved', 'Practise critiquing a landing page or deck in 60 seconds: audience, message, proof', 'Be ready for "how exactly did you set that up?" follow-ups'],
    tag: 'MarketingJobs',
  },
  'Finance & accounting': {
    kw: ['finance', 'financial', 'accounting', 'accountant', 'cpa', 'cfa', 'investment', 'banking', 'audit', 'tax', 'valuation'],
    who: 'finance and accounting professionals', verb: 'check AI answers on models, valuation and accounting rules',
    fit: ['You work with financial statements or models every week', 'You can cite the rule or standard behind an answer', 'Small numerical errors bother you'],
    prep: ['Prepare one model or analysis you built and the assumptions behind it', 'Refresh the standards you use most (GAAP/IFRS, tax rules for your country)', 'Practise explaining an error in an answer: what\'s wrong, the rule, the correct figure'],
    tag: 'FinanceJobs',
  },
  'Legal': {
    kw: ['legal', 'lawyer', 'attorney', 'law ', 'paralegal', 'contract', 'litigation', 'compliance'],
    who: 'lawyers and legal professionals', verb: 'review AI legal reasoning for accuracy and missing nuance',
    fit: ['You practise or have practised law in a specific area', 'You can point to the exact rule, case or clause behind an answer', 'You notice when an answer is confidently wrong'],
    prep: ['Choose 2 matters you handled (no confidential details) and the reasoning you used', 'Be ready to explain jurisdiction limits in plain words', 'Practise flagging a flawed legal answer: issue, rule, correct analysis'],
    tag: 'LegalJobs',
  },
  'Healthcare & medicine': {
    kw: ['doctor', 'physician', 'medical', 'clinical', 'nurse', 'nursing', 'pharmac', 'health', 'dentist', 'radiolog', 'therap'],
    who: 'doctors, nurses and clinicians', verb: 'check AI medical answers for safety and accuracy',
    fit: ['You hold or held a clinical licence and see real cases', 'You can explain why an answer is unsafe, not just wrong', 'You know current guidelines in your specialty'],
    prep: ['Review current guidelines for your specialty', 'Prepare one case (anonymised) where judgment mattered more than protocol', 'Practise rating an answer for safety first, then completeness'],
    tag: 'HealthcareJobs',
  },
  'Language & writing': {
    kw: ['writer', 'writing', 'editor', 'translat', 'linguist', 'language', 'localization', 'journalis'],
    who: 'writers, editors and translators', verb: 'judge and improve AI writing in your language',
    fit: ['You write or edit professionally', 'You can explain why a sentence works, not just that it does', 'You\'re fluent at a native level in the language they ask for'],
    prep: ['Prepare 2 samples of your work and the edits that made them better', 'Practise critiquing a paragraph: clarity, tone, accuracy', 'Know the style guide you use and why'],
    tag: 'WritingJobs',
  },
  'Science & math': {
    kw: ['physics', 'chemistry', 'biology', 'mathematic', 'math', 'phd', 'research scientist', 'stem'],
    who: 'scientists and mathematicians', verb: 'write hard problems and check AI reasoning step by step',
    fit: ['You have advanced training in the field (degree or research)', 'You can find the exact step where a proof or derivation fails', 'You enjoy writing problems that are hard but fair'],
    prep: ['Write 2 problems from your field with full solutions', 'Practise explaining one derivation out loud', 'Review common reasoning errors in your field'],
    tag: 'STEMJobs',
  },
  'Education': {
    kw: ['teacher', 'teaching', 'tutor', 'education', 'curriculum', 'instructional'],
    who: 'teachers and tutors', verb: 'judge AI explanations for accuracy and how well they teach',
    fit: ['You teach or tutor regularly', 'You can tell when an explanation will confuse a learner', 'You can write clear rubrics'],
    prep: ['Prepare a lesson you taught and how you checked understanding', 'Practise rewriting a confusing explanation for a specific grade level', 'Bring one rubric you\'ve used'],
    tag: 'EducationJobs',
  },
  'E-commerce & retail': {
    kw: ['e-commerce', 'ecommerce', 'catalog', 'merchandising', 'shopping', 'retail', 'product taxonomy', 'online store'],
    who: 'e-commerce and catalog pros', verb: 'build realistic online stores and test how AI shops, searches and recommends',
    fit: ['You\'ve run or managed real online store catalogs, not just bought from them', 'Messy product data (variants, sizes, categories) is something you fix for a living', 'You can spot when a shopping answer would frustrate a real customer'],
    prep: ['Pick one catalog you structured: categories, attributes, how you handled variants', 'Prepare an example of normalising messy product data, with before and after', 'Be ready to design a tricky shopping scenario and the right answer for it'],
    tag: 'Ecommerce',
  },
  'Game development': {
    kw: ['game developer', 'game engine', 'gameplay', 'unity', 'unreal', 'godot', 'game development', 'playtest'],
    who: 'game developers', verb: 'build game scenes with planted bugs and feature challenges for AI agents',
    fit: ['You\'ve shipped or published games: AAA, indie, jam or solo all count', 'You know Unity, Godot or Unreal well enough to debug gameplay logic', 'You can write a bug report or feature brief a stranger could follow'],
    prep: ['Gather your best portfolio links (itch.io, Steam, GitHub, jam entries); it matters most', 'Prepare one gameplay bug you hunted down: symptom, cause, fix', 'Practise writing success criteria: input sequence, expected on-screen result'],
    tag: 'GameDev',
  },
  'General AI training': {
    kw: [],
    who: 'experienced professionals', verb: 'evaluate and improve AI answers in their field',
    fit: ['You have real, hands-on experience in the skills listed', 'You can explain your reasoning clearly in writing', 'You\'re careful with details and follow written guidelines'],
    prep: ['List the 3–5 skills the posting repeats and one real example for each', 'Take the free practice interview for the closest role', 'Prepare 3 STAR stories with a number in each result'],
    tag: 'RemoteJobs',
  },
};
window.RJ_DETECT = function (text) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  let best = 'General AI training', score = 0;
  for (const [name, d] of Object.entries(window.RJ_DOMAINS)) {
    const s = d.kw.reduce((n, k) => n + (t.includes(k) ? (t.split(k).length - 1) : 0), 0);
    if (s > score) { score = s; best = name; }
  }
  return best;
};
