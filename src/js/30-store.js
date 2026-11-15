  /* ================= storage ================= */
  const LS_KEY = "spent.v2", LS_OLD = "spent.v1";
  let storageOK = true;
  let unsynced = false;
  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
      const old = JSON.parse(localStorage.getItem(LS_OLD) || "null"); // data from the first version, upgraded by normalize()
      return old && !old.sample ? { ...old, _unsynced: true } : null;
    } catch { return null; }
  }
  function writeLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...state, _unsynced: unsynced })); storageOK = true; }
    catch { storageOK = false; }
  }
  /* In the cloud, everything but the entries lives in one document and each month of entries in its own. */
  function docsOf(s) {
    const out = { meta: { v: 2, sample: s.sample, settings: s.settings, accounts: s.accounts, categories: s.categories, recurring: s.recurring } };
    for (const e of s.entries) { const k = "m" + e.date.slice(0, 7); (out[k] ||= { month: e.date.slice(0, 7), entries: [] }).entries.push(e); }
    for (const k of Object.keys(out)) if (k !== "meta") out[k].entries.sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
    return out;
  }
  /* Sample data nobody has added to. It is never worth keeping or syncing: a fresh one is always more current. */
  const pristineSample = (s) => !!s.sample && Array.isArray(s.entries) && new Set(s.entries.map((e) => String(e.id).slice(0, 5))).size <= 1;
  function stateFromDocs(docs) {
    if (!docs.meta) return null;
    const entries = [];
    for (const [k, d] of Object.entries(docs)) {
      if (k === "meta") continue;
      const list = Array.isArray(d.entries) ? d.entries : Array.isArray(d.expenses) ? d.expenses : [];
      entries.push(...list);
    }
    if (pristineSample({ sample: docs.meta.sample, entries })) return null;
    return normalize({ ...docs.meta, entries });
  }
  function mergeStates(remote, local) {
    const out = JSON.parse(JSON.stringify(local));
    for (const key of ["entries", "recurring", "categories", "accounts"]) {
      const have = new Set(out[key].map((x) => x.id));
      for (const x of remote[key]) if (!have.has(x.id)) out[key].push(x);
    }
    return normalize(out);
  }

