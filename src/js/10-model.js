  /* ================= model ================= */
  const { SKINS, hostTheme } = window.__spent;

  Object.assign(ICONS, {
    swap: '<path d="M4 8.5h14.5L15 5M20 15.5H5.5L9 19"/>',
    person: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.5 20c.9-3.7 3.9-5.8 7.5-5.8s6.6 2.1 7.5 5.8"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.9-.8 1.9-1.8 0-1.2-.9-1.6-.9-2.7 0-1 .8-1.7 1.8-1.7H17a3.5 3.5 0 0 0 3.5-3.5c0-4-3.8-7.3-8.5-7.3z"/><circle cx="7.8" cy="11.6" r=".9"/><circle cx="10.4" cy="7.9" r=".9"/><circle cx="15" cy="8" r=".9"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3"/><path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5h12A1.5 1.5 0 0 0 20 18V9.5A1.5 1.5 0 0 0 18.5 8h-12A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.7" r="1"/>',
    bank: '<path d="M3.5 9.5 12 4l8.5 5.5z"/><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    cash: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 10v4M17.5 10v4"/>',
    vault: '<rect x="4" y="4.5" width="16" height="14" rx="2.5"/><circle cx="12" cy="11.5" r="3"/><path d="M12 8.5v1M12 13.5v1M7.5 18.5V20M16.5 18.5V20"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    trend: '<path d="M3.5 17 9 11.5l3.5 3.5 8-8"/><path d="M15 7h5.5v5.5"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2h6v2M3.5 12.5h17"/>',
    laptop: '<rect x="5" y="5.5" width="14" height="9.5" rx="1.5"/><path d="M3 18.5h18"/>',
    coins: '<ellipse cx="9" cy="7.5" rx="5.5" ry="2.7"/><path d="M3.5 7.5v4c0 1.5 2.4 2.7 5.5 2.7M3.5 11.5v4c0 1.5 2.4 2.7 5.5 2.7"/><ellipse cx="15.5" cy="13.5" rx="5" ry="2.5"/><path d="M10.5 13.5V17c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.5"/>',
    undo: '<path d="M8 6 4 10l4 4"/><path d="M4 10h10a5.5 5.5 0 0 1 0 11h-3"/>',
    archive: '<rect x="3.5" y="5" width="17" height="4" rx="1"/><path d="M5.5 9v9.5h13V9M10 13h4"/>',
    skip: '<path d="M5 5.5v13l9-6.5zM18 5.5v13"/>',
  });
  CAT_ICONS.push("briefcase", "laptop", "trend", "coins");

  /* Every kind of entry. `cat` says which categories apply, `person` labels the name field for money between people. */
  const TYPES = {
    expense: { label: "Expense", verb: "Paid from", cat: "expense" },
    income: { label: "Income", verb: "Received in", cat: "income" },
    transfer: { label: "Transfer", verb: "From" },
    refund: { label: "Refund", verb: "Refunded to", cat: "expense" },
    lent: { label: "Lent", verb: "Paid from", person: "Lent to" },
    borrowed: { label: "Borrowed", verb: "Received in", person: "Borrowed from" },
    collected: { label: "Got back", verb: "Received in", person: "Paid back by" },
    repaid: { label: "Paid back", verb: "Paid from", person: "Paid back to" },
  };
  const TYPE_HINT = {
    expense: "Money you spent.",
    income: "Money you earned or received.",
    transfer: "Money moved between your own accounts or into a goal. It doesn't count as spending.",
    refund: "Money back for something you bought. It lowers that category's spending.",
    lent: "Money you gave someone who will pay you back. It doesn't count as spending.",
    borrowed: "Money someone gave you that you'll pay back. It doesn't count as income.",
    collected: "Someone paid back money they owed you.",
    repaid: "You paid back money you owed.",
  };
  const TYPE_EG = { expense: "e.g. Lunch with Sam", income: "e.g. March salary", transfer: "e.g. Card payment", refund: "e.g. Returned shoes", lent: "e.g. Concert ticket", borrowed: "e.g. Taxi home", collected: "", repaid: "" };
  const IN_TYPES = new Set(["income", "refund", "borrowed", "collected"]);

  const FREQ = {
    weekly: { days: 7, label: "Every week", perMonth: 52 / 12 },
    biweekly: { days: 14, label: "Every 2 weeks", perMonth: 26 / 12 },
    monthly: { months: 1, label: "Every month", perMonth: 1 },
    bimonthly: { months: 2, label: "Every 2 months", perMonth: 1 / 2 },
    quarterly: { months: 3, label: "Every 3 months", perMonth: 1 / 3 },
    halfyearly: { months: 6, label: "Every 6 months", perMonth: 1 / 6 },
    yearly: { months: 12, label: "Every year", perMonth: 1 / 12 },
  };
  const RKIND = {
    expense: { label: "Bill", action: "Pay", done: "paid" },
    income: { label: "Income", action: "Receive", done: "received" },
    transfer: { label: "Transfer", action: "Move", done: "moved" },
  };
  const ACCT = {
    cash: { label: "Cash", icon: "cash", color: "#15803D" },
    bank: { label: "Bank account", icon: "bank", color: "#1D4ED8" },
    card: { label: "Credit card", icon: "card", color: "#3F3F46" },
    wallet: { label: "Digital wallet", icon: "wallet", color: "#7C3AED" },
    savings: { label: "Savings", icon: "vault", color: "#0E7490" },
    invest: { label: "Investments", icon: "trend", color: "#B45309" },
    goal: { label: "Goal", icon: "target", color: "#BE123C" },
  };
  const GOAL_COLORS = ["#BE123C", "#0F766E", "#6D28D9", "#B45309", "#1E40AF", "#A21CAF"];
  const DEFAULT_CATS = [
    ["food", "Food & dining", "#C2410C", "food", "expense"], ["groceries", "Groceries", "#15803D", "groceries", "expense"], ["transport", "Transport", "#1D4ED8", "transport", "expense"],
    ["housing", "Rent & home", "#7C3AED", "housing", "expense"], ["bills", "Bills & utilities", "#B45309", "bills", "expense"], ["subscriptions", "Subscriptions", "#BE123C", "subscriptions", "expense"],
    ["shopping", "Shopping", "#DB2777", "shopping", "expense"], ["health", "Health & fitness", "#0E7490", "health", "expense"], ["entertainment", "Entertainment", "#9333EA", "entertainment", "expense"],
    ["travel", "Travel", "#0369A1", "travel", "expense"], ["education", "Education", "#4338CA", "education", "expense"], ["gifts", "Gifts & giving", "#A21CAF", "gifts", "expense"],
    ["care", "Personal care", "#0F766E", "care", "expense"], ["other", "Other", "#52525B", "other", "expense"],
    ["salary", "Salary", "#15803D", "briefcase", "income"], ["freelance", "Freelance & side work", "#0E7490", "laptop", "income"], ["interest", "Interest & returns", "#B45309", "trend", "income"],
    ["gifts-in", "Gifts received", "#A21CAF", "gifts", "income"], ["other-in", "Other income", "#52525B", "coins", "income"],
  ];
  const CUSTOM_COLORS = ["#9F1239", "#166534", "#1E40AF", "#92400E", "#6D28D9", "#155E75", "#BE185D", "#3F6212", "#7E22CE", "#0F766E"];
  const SOON_DAYS = 7;
  const LOOK_BACK_CYCLES = 3;

  const newAccount = (id, name, type, opening = 0, extra = {}) => ({ id, name, type, opening, target: 0, deadline: "", color: "", archived: false, ...extra });
  function emptyState(currency, skin = "cinema", mode = "system") {
    return {
      v: 2, sample: false,
      settings: { currency, budget: 0, skin, mode },
      accounts: [newAccount("cash", "Cash", "cash"), newAccount("bank", "Bank account", "bank"), newAccount("card", "Credit card", "card")],
      categories: DEFAULT_CATS.map(([id, name, color, icon, kind]) => ({ id, name, color, icon, kind, budget: 0 })),
      entries: [], recurring: [],
    };
  }

  /* Cleans up anything loaded from storage, a backup or the cloud. It also upgrades data saved by the first version,
     which only knew expenses and a "paid with" method. */
  function normalize(s) {
    if (!s || typeof s !== "object") return null;
    const set = s.settings || {};
    const mode = set.mode ?? set.theme;
    const out = emptyState(CURRENCIES.includes(set.currency) ? set.currency : guessCurrency(), SKINS.some((k) => k.id === set.skin) ? set.skin : "cinema", mode === "dark" || mode === "light" ? mode : "system");
    out.sample = !!s.sample;
    out.settings.budget = Math.max(0, round2(set.budget));
    const hex = (c) => /^#[0-9a-f]{6}$/i.test(c);

    if (Array.isArray(s.categories) && s.categories.length) {
      const seen = new Set();
      const cats = s.categories
        .filter((c) => c && typeof c.id === "string" && c.id && !seen.has(c.id) && seen.add(c.id))
        .map((c) => ({ id: c.id.slice(0, 40), name: String(c.name || "Category").slice(0, 28), color: hex(c.color) ? c.color : "#52525B", icon: CAT_ICONS.includes(c.icon) ? c.icon : "other", kind: c.kind === "income" ? "income" : "expense", budget: c.kind === "income" ? 0 : Math.max(0, round2(c.budget)) }));
      if (!cats.some((c) => c.kind === "income")) cats.push(...out.categories.filter((c) => c.kind === "income" && !seen.has(c.id)));
      for (const id of ["other", "other-in"]) if (!cats.some((c) => c.id === id)) cats.push(out.categories.find((c) => c.id === id));
      out.categories = cats;
    }
    if (Array.isArray(s.accounts) && s.accounts.length) {
      const seen = new Set();
      const accts = s.accounts
        .filter((a) => a && typeof a.id === "string" && a.id && !seen.has(a.id) && seen.add(a.id))
        .map((a) => newAccount(a.id.slice(0, 40), String(a.name || "Account").slice(0, 32), ACCT[a.type] ? a.type : "bank", round2(a.opening), { target: Math.max(0, round2(a.target)), deadline: isDate(a.deadline) ? a.deadline : "", color: hex(a.color) ? a.color : "", archived: !!a.archived }));
      if (accts.length) out.accounts = accts;
    }
    const acctIds = new Set(out.accounts.map((a) => a.id));
    const legacy = { cash: "cash", card: "card", upi: "bank", bank: "bank", wallet: "bank", other: "bank" };
    const acctOf = (id, method) => (acctIds.has(id) ? id : acctIds.has(legacy[method]) ? legacy[method] : out.accounts[0].id);
    const catIds = { expense: new Set(), income: new Set() };
    for (const c of out.categories) catIds[c.kind].add(c.id);
    const catOf = (kind, id) => (kind === "income" ? (catIds.income.has(id) ? id : "other-in") : kind === "expense" ? (catIds.expense.has(id) ? id : "other") : "");
    const ids = new Set();
    const okId = (id) => { const v = typeof id === "string" && id ? id.slice(0, 40) : uid(); if (ids.has(v)) return uid(); ids.add(v); return v; };

    const src = Array.isArray(s.entries) ? s.entries : Array.isArray(s.expenses) ? s.expenses : [];
    for (const e of src) {
      if (!e || !isDate(e.date) || !(Number(e.amount) > 0)) continue;
      const type = TYPES[e.type] ? e.type : "expense";
      const account = acctOf(e.account, e.method);
      let to = "";
      if (type === "transfer") { if (!acctIds.has(e.to) || e.to === account) continue; to = e.to; }
      out.entries.push({
        id: okId(e.id), type, title: String(e.title || "").slice(0, 80), amount: round2(e.amount), category: catOf(TYPES[type].cat, e.category), date: e.date, account, to,
        person: TYPES[type].person ? String(e.person || "").trim().slice(0, 40) || "Someone" : "", note: String(e.note || "").slice(0, 140),
        recurringId: typeof e.recurringId === "string" ? e.recurringId : null,
      });
    }
    if (Array.isArray(s.recurring)) {
      for (const r of s.recurring) {
        if (!r || !r.name || !(Number(r.amount) > 0)) continue;
        const kind = RKIND[r.kind] ? r.kind : "expense";
        let day = Math.round(Number(r.day ?? r.dueDay)) || 0;
        let start = isDate(r.start) ? r.start : "";
        if (!start) start = dayInMonth(isMonth(r.startMonth) ? r.startMonth : monthOf(todayISO()), day || 1);
        if (!(day >= 1 && day <= 31)) day = Number(start.slice(8));
        const account = acctOf(r.account, r.method);
        let to = "";
        if (kind === "transfer") { if (!acctIds.has(r.to) || r.to === account) continue; to = r.to; }
        const paid = {};
        if (r.paid && typeof r.paid === "object") for (const [k, v] of Object.entries(r.paid)) if ((isMonth(k) || isDate(k)) && v) paid[k] = String(v);
        out.recurring.push({
          id: okId(r.id), kind, name: String(r.name).slice(0, 60), category: catOf(kind, r.category), amount: round2(r.amount), frequency: FREQ[r.frequency] ? r.frequency : "monthly",
          start, day, end: isDate(r.end) ? r.end : "", variable: !!r.variable, auto: !!r.auto, account, to, note: String(r.note || "").slice(0, 140), active: r.active !== false, paid,
        });
      }
    }
    return out;
  }

  /* ---------- lookups ---------- */
  const catById = (id, kind = "expense") => state.categories.find((c) => c.id === id) || state.categories.find((c) => c.id === (kind === "income" ? "other-in" : "other")) || { id: "other", name: "Other", color: "#52525B", icon: "other", kind: "expense", budget: 0 };
  const acctById = (id) => state.accounts.find((a) => a.id === id);
  const acctName = (id) => acctById(id)?.name || "Deleted account";
  const acctColor = (a) => (a && (a.color || ACCT[a.type]?.color)) || "#52525B";
  const personKey = (n) => String(n || "").trim().toLowerCase();
  const isIn = (e) => IN_TYPES.has(e.type);
  const spendOf = (e) => (e.type === "expense" ? e.amount : e.type === "refund" ? -e.amount : 0);
  const entriesIn = (m) => state.entries.filter((e) => e.date.startsWith(m));
  const byNewest = (a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1);

  /* ---------- sums ---------- */
  function balances() {
    const map = new Map(state.accounts.map((a) => [a.id, a.opening || 0]));
    const add = (id, n) => { if (map.has(id)) map.set(id, map.get(id) + n); };
    for (const e of state.entries) {
      if (e.type === "transfer") { add(e.account, -e.amount); add(e.to, e.amount); }
      else add(e.account, isIn(e) ? e.amount : -e.amount);
    }
    for (const [k, v] of map) map.set(k, round2(v));
    return map;
  }
  /* Who owes whom. A positive balance means they owe you. */
  function people() {
    const map = new Map();
    for (const e of state.entries) {
      if (!TYPES[e.type].person) continue;
      const key = personKey(e.person);
      if (!key) continue;
      const p = map.get(key) || { key, name: e.person, balance: 0, count: 0, last: "" };
      p.balance += e.type === "lent" || e.type === "repaid" ? e.amount : -e.amount;
      p.count++;
      if (e.date >= p.last) { p.last = e.date; p.name = e.person; }
      map.set(key, p);
    }
    return [...map.values()].map((p) => ({ ...p, balance: round2(p.balance) })).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));
  }
  function worth(bal = balances(), ppl = people()) {
    let assets = 0, debts = 0, goals = 0;
    for (const a of state.accounts) {
      const b = bal.get(a.id) || 0;
      if (b >= 0) assets += b; else debts -= b;
      if (a.type === "goal") goals += b;
    }
    const owed = sum(ppl.filter((p) => p.balance > 0).map((p) => p.balance));
    const owe = sum(ppl.filter((p) => p.balance < 0).map((p) => -p.balance));
    return { assets: round2(assets), debts: round2(debts), goals: round2(goals), owed, owe, net: round2(assets + owed - debts - owe) };
  }
  function totals(list) {
    let spent = 0, income = 0;
    for (const e of list) { spent += spendOf(e); if (e.type === "income") income += e.amount; }
    return { spent: round2(spent), income: round2(income), net: round2(income - spent) };
  }
  /* Spending by category, with refunds taken off. */
  function catTotals(list) {
    const map = new Map();
    for (const e of list) {
      const v = spendOf(e);
      if (!v) continue;
      const c = map.get(e.category) || { id: e.category, total: 0, count: 0 };
      c.total += v;
      if (e.type === "expense") c.count++;
      map.set(e.category, c);
    }
    return [...map.values()].map((c) => ({ ...c, total: round2(c.total) })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }

  /* ---------- how an entry reads ---------- */
  function entryTitle(e) {
    if (e.title) return e.title;
    switch (e.type) {
      case "transfer": return `${acctName(e.account)} to ${acctName(e.to)}`;
      case "lent": return `Lent to ${e.person}`;
      case "borrowed": return `Borrowed from ${e.person}`;
      case "collected": return `${e.person} paid you back`;
      case "repaid": return `Paid ${e.person} back`;
      case "refund": return `${catById(e.category).name} refund`;
      default: return catById(e.category, TYPES[e.type].cat).name;
    }
  }
  function entryVisual(e) {
    if (e.type === "transfer") return { icon: "swap", color: acctColor(acctById(e.to)) };
    if (TYPES[e.type].person) return { icon: "person", color: "#6D28D9" };
    const c = catById(e.category, TYPES[e.type].cat);
    return { icon: e.type === "refund" ? "undo" : c.icon, color: c.color };
  }
  function entryAmount(e) {
    const m = money(e.amount);
    if (e.type === "transfer") return { text: m, cls: "muted" };
    return isIn(e) ? { text: "+" + m, cls: "in" } : { text: m, cls: "" };
  }
  function entryMeta(e, withDate) {
    const T = TYPES[e.type], bits = [];
    if (withDate) bits.push(fDate(e.date));
    if (e.type === "refund") bits.push("Refund");
    if (T.cat && (e.title || e.type === "refund")) bits.push(catById(e.category, T.cat).name);
    if (T.person) bits.push(e.title ? `${T.label}, ${e.person}` : T.label);
    if (e.type === "transfer") bits.push(e.title ? `${acctName(e.account)} to ${acctName(e.to)}` : "Transfer");
    else bits.push(acctName(e.account));
    if (e.recurringId && state.recurring.some((r) => r.id === e.recurringId)) bits.push("Recurring");
    if (e.note) bits.push(e.note);
    return bits.map(esc).join(" · ");
  }
  const searchText = (e) => `${entryTitle(e)} ${e.note} ${e.person} ${e.category ? catById(e.category).name : ""} ${TYPES[e.type].label} ${acctName(e.account)} ${e.to ? acctName(e.to) : ""}`.toLowerCase();

  /* ---------- recurring: when each one falls due and whether it has been dealt with ---------- */
  /* The nth time a recurring item comes round. Weekly ones are keyed by date, monthly ones by month. */
  function occ(r, n) {
    const f = FREQ[r.frequency] || FREQ.monthly;
    if (f.days) { const due = addDays(r.start, n * f.days); return { key: due, due }; }
    const m = addMonths(monthOf(r.start), n * f.months);
    return { key: m, due: dayInMonth(m, r.day) };
  }
  /* Where an item stands today: the oldest recent cycle that hasn't been handled if one is late, otherwise the next one. */
  function cycleStatus(r, today) {
    const f = FREQ[r.frequency] || FREQ.monthly;
    let n, floor;
    if (f.days) { floor = addDays(today, -f.days * LOOK_BACK_CYCLES); n = Math.max(0, Math.floor(daysBetween(r.start, floor) / f.days)); }
    else { floor = addMonths(monthOf(today), -f.months * LOOK_BACK_CYCLES); n = Math.max(0, Math.floor(monthDiff(monthOf(r.start), floor) / f.months)); }
    for (let guard = 0; guard < 400; guard++, n++) {
      const o = occ(r, n);
      if (r.end && o.due > r.end) return null;
      if (o.key < floor || r.paid?.[o.key]) continue;
      const days = daysBetween(today, o.due);
      return { key: o.key, due: o.due, days, overdue: days < 0, soon: days >= 0 && days <= SOON_DAYS };
    }
    return null;
  }
  function occurrencesBetween(r, from, to) {
    const f = FREQ[r.frequency] || FREQ.monthly, out = [];
    let n = f.days ? Math.max(0, Math.ceil(daysBetween(r.start, from) / f.days)) : Math.max(0, Math.floor(monthDiff(monthOf(r.start), monthOf(from)) / f.months));
    for (let guard = 0; guard < 80; guard++, n++) {
      const o = occ(r, n);
      if (o.due > to || (r.end && o.due > r.end)) break;
      if (o.due >= from) out.push(o);
    }
    return out;
  }
  function statusInfo(r, st) {
    if (r.active === false) return { cls: "paused", text: "Paused" };
    if (!st) return { cls: "paused", text: r.end ? "Finished" : "Up to date" };
    const n = Math.abs(st.days), income = r.kind === "income";
    if (st.overdue) return income ? { cls: "soon", text: `Late ${plural(n, "day")}` } : { cls: "overdue", text: `Overdue ${plural(n, "day")}` };
    if (st.days === 0) return income ? { cls: "ok", text: "Expected today" } : { cls: "soon", text: "Due today" };
    if (st.soon) return income ? { cls: "ok", text: `In ${plural(st.days, "day")}` } : { cls: "soon", text: `Due in ${plural(st.days, "day")}` };
    return { cls: "ok", text: "Up to date" };
  }
  function shortStatus(st) {
    if (st.overdue) return `overdue ${plural(Math.abs(st.days), "day")}`;
    if (st.days === 0) return "due today";
    if (st.days === 1) return "due tomorrow";
    if (st.days <= SOON_DAYS) return `in ${st.days} days`;
    return `due ${fDate(st.due)}`;
  }
  function upcoming() {
    const t = todayISO();
    return state.recurring.filter((r) => r.active !== false).map((r) => ({ r, st: cycleStatus(r, t) })).filter((x) => x.st).sort((a, b) => a.st.due.localeCompare(b.st.due));
  }
  /* Bills in a month: the total, how much of it has fallen due by today, and how much is still unpaid. */
  function billsIn(m, t) {
    let fixedMonth = 0, fixedSoFar = 0, unpaid = 0;
    for (const r of state.recurring) {
      if (r.active === false || r.kind !== "expense") continue;
      for (const o of occurrencesBetween(r, `${m}-01`, `${m}-${pad(daysInMonth(m))}`)) {
        fixedMonth += r.amount;
        if (o.due <= t) fixedSoFar += r.amount;
        if (!r.paid?.[o.key]) unpaid += r.amount;
      }
    }
    return { fixedMonth: round2(fixedMonth), fixedSoFar: round2(fixedSoFar), unpaid: round2(unpaid) };
  }
  function entryFromRecurring(r, id, date, amount, account = r.account) {
    return { id, type: r.kind, title: r.name, amount, category: r.kind === "transfer" ? "" : r.category, date, account, to: r.kind === "transfer" ? r.to : "", person: "", note: "", recurringId: r.id };
  }
  /* Adds entries for recurring items set to record themselves once their date arrives. Returns how many were added. */
  function autoPost() {
    if (state.sample) return 0;
    const t = todayISO();
    let added = 0;
    for (const r of state.recurring) {
      if (!r.auto || r.active === false) continue;
      for (let guard = 0; guard < 60; guard++) {
        const st = cycleStatus(r, t);
        if (!st || st.due > t) break;
        const id = uid();
        state.entries.push(entryFromRecurring(r, id, st.due, r.amount));
        r.paid[st.key] = id;
        added++;
      }
    }
    return added;
  }
