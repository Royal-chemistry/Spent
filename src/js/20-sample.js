  /* ================= sample data ================= */
  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* Six months of a believable household, scaled to the visitor's currency, so the first screen shows what the app does. */
  function sampleState(keep = null) {
    const currency = keep?.currency || guessCurrency();
    const k = SAMPLE_RATE[currency] || 1;
    const amt = (usd) => {
      const v = usd * k;
      if (ZERO_DEC.includes(currency) || v >= 100) { const step = v >= 20000 ? 100 : v >= 2000 ? 10 : 1; return Math.max(step, Math.round(v / step) * step); }
      return round2(v);
    };
    const s = emptyState(currency, keep?.skin, keep?.mode);
    s.sample = true;
    s.settings.budget = amt(3600);
    const t = todayISO(), cur = monthOf(t), first = addMonths(cur, -5);
    const rng = mulberry32(Number(cur.replace("-", "")) * 7919);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const between = (a, b) => a + rng() * (b - a);

    s.accounts = [
      newAccount("bank", "Checking", "bank", amt(2400)),
      newAccount("card", "Credit card", "card", 0),
      newAccount("cash", "Cash", "cash", amt(120)),
      newAccount("savings", "Savings", "savings", amt(8000)),
      newAccount("goal-safety", "Emergency fund", "goal", amt(6400), { target: amt(10000), color: "#0F766E" }),
      newAccount("goal-trip", "Japan trip", "goal", amt(900), { target: amt(3500), deadline: `${addMonths(cur, 7)}-01`, color: "#BE123C" }),
    ];
    const budgets = { food: 450, groceries: 420, transport: 260, entertainment: 150, shopping: 200 };
    for (const c of s.categories) if (budgets[c.id]) c.budget = amt(budgets[c.id]);

    const overdueDate = addDays(t, -3), soonA = addDays(t, 2), soonB = addDays(t, 5);
    const rec = (kind, name, category, usd, frequency, day, startMonth, extra = {}) => ({ id: uid(), kind, name, category, amount: amt(usd), frequency, start: dayInMonth(startMonth, day), day, end: "", variable: false, auto: false, account: "card", to: "", note: "", active: true, paid: {}, ...extra });
    const R = [
      rec("expense", "Rent", "housing", 1450, "monthly", 1, first, { account: "bank" }),
      rec("expense", "Phone plan", "bills", 35, "monthly", Number(overdueDate.slice(8)), first, { _skip: monthOf(overdueDate) }),
      rec("expense", "Electricity", "bills", 86, "monthly", Number(soonA.slice(8)), first, { variable: true, note: "Higher in summer" }),
      rec("expense", "Home internet", "bills", 60, "monthly", Number(soonB.slice(8)), first),
      rec("expense", "Video streaming", "subscriptions", 15.49, "monthly", 14, first),
      rec("expense", "Music streaming", "subscriptions", 10.99, "monthly", 26, first),
      rec("expense", "Gym membership", "health", 42, "monthly", 3, first),
      rec("expense", "Car insurance", "transport", 540, "quarterly", 15, addMonths(cur, -4), { account: "bank" }),
      rec("expense", "Cloud storage", "subscriptions", 29.99, "yearly", 20, addMonths(cur, -11)),
      rec("income", "Salary", "salary", 4300, "monthly", 1, first, { account: "bank" }),
      rec("transfer", "Japan trip savings", "", 250, "monthly", 26, first, { account: "bank", to: "goal-trip" }),
    ];
    const push = (date, type, title, category, usd, account, extra = {}) => s.entries.push({ id: uid(), type, title, amount: amt(round2(usd)), category, date, account, to: "", person: "", note: "", recurringId: null, ...extra });
    const spend = (date, title, category, usd, account = "card", extra) => push(date, "expense", title, category, usd, account, extra);
    for (const r of R) {
      for (let n = 0; n < 200; n++) {
        const o = occ(r, n);
        if (o.due >= t) break;
        if (r._skip === o.key) continue;
        const id = uid();
        s.entries.push(entryFromRecurring(r, id, o.due, r.variable ? amt(86 * (0.78 + rng() * 0.5)) : r.amount));
        r.paid[o.key] = id;
      }
      delete r._skip;
    }
    for (let i = 5; i >= 0; i--) {
      const m = addMonths(cur, -i);
      const last = i === 0 ? Number(t.slice(8)) : daysInMonth(m);
      for (let d = 1; d <= last; d++) {
        const date = `${m}-${pad(d)}`;
        const wd = parseISO(date).getDay(), weekend = wd === 0 || wd === 6;
        if (rng() < 0.6) spend(date, pick(["Coffee", "Flat white", "Iced latte", "Coffee and croissant"]), "food", between(3.5, 7.5), rng() < 0.3 ? "cash" : "card");
        if (!weekend && rng() < 0.45) spend(date, pick(["Lunch", "Lunch with the team", "Salad bowl", "Sandwich and juice", "Noodle bar"]), "food", between(9, 19));
        if (weekend && rng() < 0.55) spend(date, pick(["Dinner out", "Brunch", "Pizza night", "Ramen with friends", "Takeaway"]), "food", between(24, 72));
        if (rng() < 0.23) spend(date, pick(["Weekly groceries", "Supermarket", "Farmers market", "Groceries top-up"]), "groceries", between(28, 125));
        if (rng() < 0.3) {
          const r = rng();
          if (r < 0.3) spend(date, "Fuel", "transport", between(38, 62));
          else if (r < 0.65) spend(date, "Metro card top-up", "transport", between(10, 25));
          else if (r < 0.9) spend(date, "Ride home", "transport", between(9, 26));
          else spend(date, "Parking", "transport", between(5, 14), "cash");
        }
        if (rng() < 0.06) spend(date, pick(["Running shoes", "Desk lamp", "T-shirts", "Phone case", "Kitchen knife", "Jeans", "Backpack"]), "shopping", between(16, 140));
        if (weekend && rng() < 0.2) spend(date, pick(["Cinema tickets", "Concert", "Bowling", "Board game", "Comedy show"]), "entertainment", between(12, 65));
        if (rng() < 0.035) spend(date, pick(["Pharmacy", "Vitamins", "Dentist checkup"]), "health", between(9, 120));
        if (rng() < 0.025) spend(date, "Haircut", "care", between(24, 38), "cash");
        if (rng() < 0.018) spend(date, pick(["Birthday gift", "Flowers", "Wedding gift"]), "gifts", between(20, 90));
        if (rng() < 0.015) spend(date, pick(["Books", "Online course", "Language app"]), "education", between(12, 60));
      }
      if (`${m}-10` < t) push(`${m}-10`, "transfer", "Cash withdrawal", "", 100, "bank", { to: "cash" });
      if (i > 0) push(`${m}-${pad(daysInMonth(m))}`, "income", "Savings interest", "interest", between(13, 17), "savings");
      if ((i === 4 || i === 2) && `${m}-27` < t) push(`${m}-27`, "transfer", "", "", 150, "bank", { to: "goal-safety" });
    }
    const trip = addMonths(cur, -2);
    spend(`${trip}-12`, "Train tickets", "travel", 128);
    spend(`${trip}-13`, "Weekend hotel", "travel", 264, "card", { note: "Two nights by the coast" });
    spend(`${trip}-13`, "Museum passes", "entertainment", 36);
    push(`${addMonths(cur, -1)}-18`, "income", "Logo design project", "freelance", 350, "bank");
    push(`${addMonths(cur, -3)}-09`, "income", "Sold my old bike", "other-in", 120, "cash");
    push(addDays(t, -9), "refund", "Returned jeans", "shopping", 48, "card");
    push(addDays(t, -16), "lent", "", "", 40, "cash", { person: "Sam", note: "Concert ticket" });
    push(addDays(t, -6), "borrowed", "", "", 25, "cash", { person: "Priya", note: "Lunch, I forgot my card" });
    push(addDays(t, -40), "lent", "", "", 60, "bank", { person: "Alex" });
    push(addDays(t, -31), "collected", "", "", 60, "bank", { person: "Alex" });
    // Pay off each month's card spending on the 5th of the next month.
    for (let i = 4; i >= 0; i--) {
      const m = addMonths(cur, -i), date = `${m}-05`;
      if (date >= t) continue;
      const prev = addMonths(m, -1);
      const due = round2(s.entries.filter((e) => e.account === "card" && e.date.startsWith(prev)).reduce((n, e) => n + (e.type === "refund" ? -e.amount : e.type === "expense" ? e.amount : 0), 0));
      if (due > 0) s.entries.push({ id: uid(), type: "transfer", title: "Card payment", amount: due, category: "", date, account: "bank", to: "card", person: "", note: "", recurringId: null });
    }
    s.recurring = R;
    return s;
  }
