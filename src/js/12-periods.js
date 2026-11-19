  /* ================= periods, budgets, no-spend days, debts, subscriptions ================= */
  Object.assign(ICONS, {
    alert: '<path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="8.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  });
  DF.dayLong = df({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  DF.wd = df({ weekday: "short" });
  const PERIODS = { day: "Day", week: "Week", month: "Month", year: "Year", all: "All time" };

  /* Weeks run Monday to Sunday. */
  const weekStart = (d) => addDays(d, -((parseISO(d).getDay() + 6) % 7));
  function periodRange(p, anchor) {
    if (p === "day") return { from: anchor, to: anchor };
    if (p === "week") { const from = weekStart(anchor); return { from, to: addDays(from, 6) }; }
    if (p === "year") { const y = anchor.slice(0, 4); return { from: `${y}-01-01`, to: `${y}-12-31` }; }
    if (p === "all") return { from: "0000-01-01", to: "9999-12-31" };
    const m = monthOf(anchor);
    return { from: `${m}-01`, to: `${m}-${pad(daysInMonth(m))}` };
  }
  function periodLabel(p, anchor) {
    const { from, to } = periodRange(p, anchor);
    if (p === "day") return DF.dayLong.format(parseISO(anchor));
    if (p === "week") return `${fDate(from)} – ${fDateLong(to)}`;
    if (p === "year") return anchor.slice(0, 4);
    if (p === "all") return "All time";
    return fMonth(monthOf(anchor));
  }
  function stepAnchor(p, anchor, dir) {
    if (p === "day") return addDays(anchor, dir);
    if (p === "week") return addDays(anchor, 7 * dir);
    const m = addMonths(monthOf(anchor), p === "year" ? 12 * dir : dir);
    return dayInMonth(m, Number(anchor.slice(8)));
  }
  const inPeriod = (p, anchor, d = todayISO()) => { const r = periodRange(p, anchor); return d >= r.from && d <= r.to; };
  const entriesBetween = (from, to) => state.entries.filter((e) => e.date >= from && e.date <= to);
  const PERIOD_WORD = { day: "day", week: "week", month: "month", year: "year" };

  /* ---------- budgets ---------- */
  /* With carry-forward on, what was left of last month's budget is added to this month. It only ever looks back one
     month, so unused money doesn't pile up forever. */
  function withCarry(base, m, prevSpent) {
    if (!(base > 0)) return { base: 0, carry: 0, total: 0 };
    const prev = addMonths(m, -1);
    const carry = state.settings.carry && entriesIn(prev).length ? Math.max(0, round2(base - prevSpent(prev))) : 0;
    return { base, carry, total: round2(base + carry) };
  }
  const budgetFor = (m) => withCarry(state.settings.budget || 0, m, (prev) => totals(entriesIn(prev)).spent);
  const catBudgetFor = (c, m) => withCarry(c.budget || 0, m, (prev) => catTotals(entriesIn(prev)).find((x) => x.id === c.id)?.total || 0);
  const LEVELS = [100, 80, 50];
  const levelOf = (spent, total) => (total > 0 ? LEVELS.find((l) => (spent / total) * 100 >= l) || 0 : 0);
  /* Every budget for a month: the whole month first, then categories. */
  function budgetStatus(m) {
    const list = entriesIn(m);
    const spent = Math.max(0, totals(list).spent);
    const byCat = new Map(catTotals(list).map((c) => [c.id, c.total]));
    const out = [];
    const b = budgetFor(m);
    if (b.total > 0) out.push({ id: "", name: "Monthly budget", color: "", spent, ...b, pct: (spent / b.total) * 100, level: levelOf(spent, b.total) });
    for (const c of state.categories) {
      if (c.kind !== "expense" || !(c.budget > 0)) continue;
      const cb = catBudgetFor(c, m), sp = byCat.get(c.id) || 0;
      out.push({ id: c.id, name: c.name, color: c.color, spent: sp, ...cb, pct: (sp / cb.total) * 100, level: levelOf(sp, cb.total) });
    }
    return out;
  }
  /* Budgets that moved up a level (50, 80 or 100%) between two snapshots, for the alert after saving an entry. */
  function crossedLevels(before, after) {
    const was = new Map(before.map((b) => [b.id, b.level]));
    return after.filter((b) => b.level > (was.get(b.id) || 0));
  }
  const levelText = (b) => (b.level >= 100 ? `${b.name} is over budget` : `${b.name} is ${Math.floor(b.pct)}% used`);

  /* ---------- no-spend days ---------- */
  /* A no-spend day has no spending apart from recurring bills. Days before your first entry don't count. */
  function firstEntryDate() { let f = ""; for (const e of state.entries) if (!f || e.date < f) f = e.date; return f; }
  function discretionaryDays() {
    const set = new Set();
    for (const e of state.entries) if (e.type === "expense" && !e.recurringId) set.add(e.date);
    return set;
  }
  function noSpendStats(from, to) {
    const t = todayISO(), first = firstEntryDate(), spent = discretionaryDays();
    let count = 0, run = 0, longest = 0, counted = 0;
    if (first) {
      for (let d = from < first ? first : from; d <= to && d <= t; d = addDays(d, 1)) {
        counted++;
        if (spent.has(d)) { run = 0; continue; }
        count++; run++; longest = Math.max(longest, run);
      }
    }
    return { count, longest, counted };
  }
  /* No-spend days in a row up to and including today. */
  function noSpendStreak() {
    const first = firstEntryDate(), spent = discretionaryDays();
    if (!first) return 0;
    let n = 0;
    for (let d = todayISO(), guard = 0; d >= first && guard < 800; d = addDays(d, -1), guard++) { if (spent.has(d)) break; n++; }
    return n;
  }

  /* ---------- debts ---------- */
  function debtStatus(p) {
    if (!p.due || !p.balance) return null;
    const days = daysBetween(todayISO(), p.due);
    return { days, overdue: days < 0, soon: days >= 0 && days <= SOON_DAYS };
  }
  function debtText(st) {
    if (!st) return "";
    if (st.overdue) return `Overdue ${plural(-st.days, "day")}`;
    if (st.days === 0) return "Due today";
    if (st.days === 1) return "Due tomorrow";
    return st.soon ? `Due in ${st.days} days` : "";
  }

  /* ---------- subscriptions, payment methods, balances ---------- */
  const isSubscription = (r) => r.kind === "expense" && r.category === "subscriptions";
  function subscriptions() {
    const t = todayISO();
    const list = state.recurring.filter((r) => isSubscription(r) && r.active !== false).map((r) => ({ r, st: cycleStatus(r, t), monthly: round2(r.amount * FREQ[r.frequency].perMonth) })).filter((x) => x.st);
    const monthly = round2(list.reduce((n, x) => n + x.monthly, 0));
    return { list: list.sort((a, b) => b.monthly - a.monthly), monthly, yearly: round2(monthly * 12) };
  }
  /* Spending by how it was paid, with refunds taken off. */
  function methodTotals(list) {
    const map = new Map();
    for (const e of list) { const v = spendOf(e); if (!v) continue; const k = e.method || "other"; const x = map.get(k) || { id: k, total: 0, count: 0 }; x.total += v; if (e.type === "expense") x.count++; map.set(k, x); }
    return [...map.values()].map((x) => ({ ...x, total: round2(x.total) })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  }
  /* Money you can spend now (cash, bank and wallets), what you owe on cards, and what's put aside. */
  function liquidity(bal = balances()) {
    let available = 0, cardOwed = 0, saved = 0;
    for (const a of state.accounts) {
      const b = bal.get(a.id) || 0;
      if (a.type === "cash" || a.type === "bank" || a.type === "wallet") available += b;
      else if (a.type === "card") { if (b < 0) cardOwed -= b; }
      else saved += b;
    }
    return { available: round2(available), cardOwed: round2(cardOwed), saved: round2(saved) };
  }
  const METHOD_COLORS = { upi: "#0E7490", debit: "#1D4ED8", credit: "#3F3F46", cash: "#15803D", bank: "#4338CA", wallet: "#7C3AED", other: "#52525B" };

