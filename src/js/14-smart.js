  /* ================= smart features: all worked out from your own entries, nothing is sent anywhere ================= */

  /* ---------- automatic categories ---------- */
  /* Words that point to a category. Your own past entries always win over this list. */
  const KEYWORDS = {
    food: "food lunch dinner breakfast brunch coffee cafe café tea chai snack snacks restaurant pizza burger biryani dosa idli thali swiggy zomato takeaway meal meals canteen bakery dessert icecream juice starbucks kfc mcdonalds dominos subway ramen sushi noodles latte croissant",
    groceries: "grocery groceries supermarket vegetables veggies fruit fruits milk bread eggs blinkit zepto bigbasket instamart dmart kirana provisions",
    transport: "uber ola rapido taxi cab auto rickshaw metro bus fuel petrol diesel cng parking toll fastag ride commute",
    housing: "rent maintenance society landlord plumber electrician furniture",
    bills: "electricity power water gas lpg cylinder internet broadband wifi phone mobile recharge postpaid prepaid bill dth airtel jio vodafone bsnl",
    subscriptions: "subscription netflix spotify prime hotstar disney youtube icloud membership sonyliv zee5 jiocinema",
    shopping: "amazon flipkart myntra ajio meesho nykaa clothes clothing shirt tshirt shoes sneakers jeans jacket hoodie kurta saree dress bag watch electronics gadget headphones charger shopping mall",
    health: "doctor hospital clinic medicine medicines pharmacy chemist apollo medplus pharmeasy 1mg lab dentist gym fitness yoga protein vitamins",
    entertainment: "movie movies cinema pvr inox bookmyshow concert show game games gaming steam playstation party club bowling",
    travel: "flight flights airline indigo vistara hotel hostel airbnb oyo makemytrip goibibo irctc train trip holiday vacation visa luggage",
    education: "course courses tuition fees school college books book udemy coursera exam stationery",
    gifts: "gift gifts donation charity present birthday wedding",
    care: "haircut salon spa barber grooming cosmetics skincare parlour",
    salary: "salary payroll paycheck stipend wages",
    freelance: "freelance invoice client project consulting gig",
    interest: "interest dividend dividends returns",
  };
  const KEYWORD_INDEX = (() => {
    const map = new Map();
    for (const [cat, words] of Object.entries(KEYWORDS)) for (const w of words.split(" ")) if (!map.has(w)) map.set(w, cat);
    return map;
  })();
  const normTitle = (s) => String(s || "").toLowerCase().replace(/[0-9]+/g, " ").replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const words = (s) => normTitle(s).split(" ").filter((w) => w.length > 1);
  /* Past titles and the category you gave them. */
  function titleHistory(kind) {
    const map = new Map();
    for (const e of state.entries) {
      if (TYPES[e.type].cat !== kind || !e.title || !e.category) continue;
      const k = normTitle(e.title);
      if (!k) continue;
      const counts = map.get(k) || new Map();
      counts.set(e.category, (counts.get(e.category) || 0) + 1);
      map.set(k, counts);
    }
    return map;
  }
  const topOf = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  /* The best category for some text, and where the guess came from. */
  function guessCategory(text, kind = "expense") {
    const key = normTitle(text);
    if (!key) return null;
    const valid = (id) => state.categories.some((c) => c.id === id && c.kind === kind);
    const hist = titleHistory(kind);
    if (hist.has(key) && valid(topOf(hist.get(key)))) return { id: topOf(hist.get(key)), from: "history" };
    let best = null;
    for (const [k, counts] of hist) {
      if (k.length < 3 || !(key.startsWith(k + " ") || k.startsWith(key + " ") || (key.split(" ")[0].length >= 4 && k.split(" ")[0] === key.split(" ")[0]))) continue;
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      if (!best || total > best.total) best = { counts, total };
    }
    if (best && valid(topOf(best.counts))) return { id: topOf(best.counts), from: "history" };
    const ws = words(text);
    // Your own category names, then the word list
    for (const c of state.categories) {
      if (c.kind !== kind || c.id === "other" || c.id === "other-in") continue;
      const nameWords = words(c.name).filter((w) => w.length > 3 && w !== "home");
      if (nameWords.some((w) => ws.includes(w))) return { id: c.id, from: "words" };
    }
    const hits = new Map();
    for (const w of ws) { const cat = KEYWORD_INDEX.get(w); if (cat && valid(cat)) hits.set(cat, (hits.get(cat) || 0) + 1); }
    const top = [...hits.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { id: top[0], from: "words" } : null;
  }

  /* ---------- typed entries, like "Spent ₹250 on food today" ---------- */
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const CUR_WORDS = { "₹": "INR", rs: "INR", inr: "INR", rupees: "INR", rupee: "INR", "$": "USD", usd: "USD", dollars: "USD", "€": "EUR", eur: "EUR", euros: "EUR", "£": "GBP", gbp: "GBP", pounds: "GBP" };
  function parseQuick(input) {
    const raw = String(input || "").trim();
    let s = " " + raw.toLowerCase().replace(/[“”"]/g, " ").replace(/\s+/g, " ") + " ";
    const out = { type: "", amount: 0, title: "", category: "", date: todayISO(), dateSaid: false, account: "", method: "", person: "", cur: "" };
    const t = todayISO();
    const cut = (re) => { s = s.replace(re, " "); };

    // When
    let m;
    if (/\bday before yesterday\b/.test(s)) { out.date = addDays(t, -2); out.dateSaid = true; cut(/\b(on )?day before yesterday\b/); }
    else if (/\byesterday\b/.test(s)) { out.date = addDays(t, -1); out.dateSaid = true; cut(/\b(on )?yesterday\b/); }
    else if (/\btoday\b|\btonight\b|\bthis morning\b/.test(s)) { out.dateSaid = true; cut(/\b(today|tonight|this morning)\b/); }
    else if ((m = s.match(/\b(\d{1,3}) days? ago\b/))) { out.date = addDays(t, -Number(m[1])); out.dateSaid = true; cut(/\b\d{1,3} days? ago\b/); }
    else if ((m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)) && isDate(m[0])) { out.date = m[0]; out.dateSaid = true; cut(/\b(on )?\d{4}-\d{2}-\d{2}\b/); }
    else if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/) || s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/))) {
      const us = /^en-us$/i.test(LOCALE);
      const dd = Number(us ? m[2] : m[1]), mm = Number(us ? m[1] : m[2]);
      let yy = m[3] ? Number(m[3]) : Number(t.slice(0, 4)); if (yy < 100) yy += 2000;
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) { out.date = dayInMonth(`${yy}-${pad(mm)}`, dd); if (!m[3] && out.date > t) out.date = dayInMonth(`${yy - 1}-${pad(mm)}`, dd); out.dateSaid = true; cut(new RegExp(`\\b(on )?${m[0].replace(/[.]/g, "\\.")}\\b`)); }
    }
    else if ((m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${MONTHS.join("|")})[a-z]*\\b|\\b(${MONTHS.join("|")})[a-z]* (\\d{1,2})(?:st|nd|rd|th)?\\b`)))) {
      const dd = Number(m[1] || m[4]), mon = MONTHS.indexOf((m[2] || m[3]).slice(0, 3)) + 1;
      let yy = Number(t.slice(0, 4));
      out.date = dayInMonth(`${yy}-${pad(mon)}`, dd);
      if (out.date > t) out.date = dayInMonth(`${yy - 1}-${pad(mon)}`, dd);
      out.dateSaid = true; cut(new RegExp(`\\b(on )?${m[0]}\\b`));
    }
    else if ((m = s.match(new RegExp(`\\b(?:on |last )?(${WEEKDAYS.join("|")})(?:day|sday|nesday|rsday|urday|s|r|rs)?\\b`)))) {
      const target = WEEKDAYS.indexOf(m[1]);
      let d = t;
      for (let i = 0; i < 7; i++) { d = addDays(t, -i); if (parseISO(d).getDay() === target) break; }
      if (/last/.test(m[0]) && d === t) d = addDays(t, -7);
      out.date = d; out.dateSaid = true; cut(new RegExp(`\\b${m[0]}\\b`));
    }

    // How much
    m = s.match(/(₹|\$|€|£)?\s*\b(rs\.?|inr|usd|eur|gbp)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(k|thousand|lakh|lac|lakhs)?\b\s*(rupees?|dollars?|euros?|pounds?|rs|inr)?/);
    if (m) {
      let n = parseFloat(m[3].replace(/,/g, ""));
      const mult = m[4] ? (m[4].startsWith("k") || m[4] === "thousand" ? 1e3 : 1e5) : 1;
      n *= mult;
      if (n > 0) out.amount = round2(n);
      const cw = (m[1] || m[2] || m[5] || "").replace(".", "");
      if (CUR_WORDS[cw] && CUR_WORDS[cw] !== state.settings.currency) out.cur = CUR_WORDS[cw];
      s = s.replace(m[0], " ");
    }

    // What kind of entry
    const rules = [
      ["collected", /\b(paid me back|gave me back|got back|returned (?:the |my )?money)\b/],
      ["repaid", /\b(paid back|repaid|returned to)\b/],
      ["lent", /\b(lent|loaned)\b/],
      ["borrowed", /\b(borrowed)\b/],
      ["refund", /\b(refund|refunded|cashback)\b/],
      ["transfer", /\b(transferred|transfer|moved)\b/],
      ["income", /\b(got paid|received|earned|salary|income|credited|bonus)\b/],
      ["expense", /\b(spent|paid|bought|purchased|spend|cost)\b/],
    ];
    for (const [type, re] of rules) if (re.test(s)) { out.type = type; break; }
    if (!out.type) out.type = "expense";

    // Who, for money between people
    if (TYPES[out.type].person) {
      const pm = out.type === "collected" ? raw.match(/^\s*([A-Z][\p{L}'-]+(?: [A-Z][\p{L}'-]+)?)\s+(?:paid|gave|returned)/u) || raw.match(/\bfrom ([A-Z][\p{L}'-]+(?: [A-Z][\p{L}'-]+)?)/u)
        : out.type === "borrowed" ? raw.match(/\bfrom ([\p{L}][\p{L}'-]*(?: [A-Z][\p{L}'-]+)?)/u)
        : raw.match(/\bto ([\p{L}][\p{L}'-]*(?: [A-Z][\p{L}'-]+)?)/u) || raw.match(/\b(?:lent|loaned|paid back|repaid)\s+([A-Z][\p{L}'-]+)/u);
      if (pm) { const name = pm[1].trim(); if (!/^(the|my|a|an|me|him|her|them|for|on)$/i.test(name)) { out.person = name.replace(/(^|\s)\p{Ll}/gu, (c) => c.toUpperCase()); s = s.replace(new RegExp(`\\b(to|from)?\\s*${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`), " "); } }
    }

    // How it was paid, and from which account
    const methodRules = [["upi", /\b(upi|gpay|google pay|phonepe|phone pe|paytm|bhim)\b/], ["debit", /\bdebit card\b/], ["credit", /\b(credit card|card)\b/], ["cash", /\bcash\b/], ["bank", /\b(bank transfer|neft|imps|rtgs|net ?banking)\b/], ["wallet", /\bwallet\b/]];
    for (const [k, re] of methodRules) if (re.test(s)) { out.method = k; s = s.replace(re, " "); break; }
    const live = state.accounts.filter((a) => !a.archived);
    const byName = live.filter((a) => a.name.length > 2).sort((a, b) => b.name.length - a.name.length);
    const mention = (prefix) => byName.find((a) => new RegExp(`\\b${prefix}\\s+(?:my\\s+)?${a.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(s));
    if (out.type === "transfer") {
      const to = mention("(?:to|into)"), from = mention("from");
      if (to) { out.to = to.id; s = s.replace(new RegExp(`\\b(to|into)\\s+(my\\s+)?${to.name.toLowerCase()}\\b`), " "); }
      if (from) { out.account = from.id; s = s.replace(new RegExp(`\\bfrom\\s+(my\\s+)?${from.name.toLowerCase()}\\b`), " "); }
    }
    const named = out.account ? null : byName.find((a) => a.id !== out.to && s.includes(" " + a.name.toLowerCase() + " "));
    if (named) { out.account = named.id; s = s.replace(named.name.toLowerCase(), " "); }
    else if (out.method) {
      const want = { cash: ["cash"], credit: ["card"], wallet: ["wallet"], upi: ["bank", "wallet"], debit: ["bank"], bank: ["bank"] }[out.method] || [];
      out.account = (live.find((a) => want.includes(a.type)) || {}).id || "";
    }
    // What for: the words after "on", "for" or "at", otherwise whatever is left, without filler at either end
    const FILLER = new Set("i i've ive have has just spent spend paid pay bought purchased got received earned lent loaned borrowed transferred moved refund refunded back me to from the a an via by using with through my for on at in of and was is worth rupee rupees rs inr dollar dollars euro euros pound pounds".split(" "));
    const phrase = (s.match(/\b(?:on|for|at)\s+([^]+?)\s*$/) || [])[1] || s;
    const ws = phrase.replace(/[^\p{L}\p{N}&' -]/gu, " ").split(/\s+/).filter(Boolean);
    while (ws.length && FILLER.has(ws[0])) ws.shift();
    while (ws.length && FILLER.has(ws[ws.length - 1])) ws.pop();
    let title = ws.join(" ");
    const kind = TYPES[out.type].cat;
    if (kind) {
      const g = guessCategory(title || raw, kind) || guessCategory(raw, kind);
      out.category = g ? g.id : "";
      // A title that is only the category's name says nothing more
      const nameWords = words(catById(out.category, kind).name);
      if (out.category && words(title).length && words(title).every((w) => nameWords.includes(w))) title = "";
    } else if (out.type === "transfer") title = "";
    if (title) { const at = raw.toLowerCase().indexOf(title.toLowerCase()); if (at >= 0) title = raw.slice(at, at + title.length); }
    out.title = title ? title[0].toUpperCase() + title.slice(1) : "";
    return out;
  }
  /* A readable summary of what was understood. */
  function quickSummary(q) {
    if (!q.amount) return "";
    const bits = [TYPES[q.type].label, money(q.amount)];
    if (q.cur) bits[1] = `${q.amount} ${q.cur}`;
    if (q.person) bits.push(q.person);
    if (q.title) bits.push(q.title);
    if (q.category) bits.push(catById(q.category, TYPES[q.type].cat).name);
    bits.push(relDay(q.date));
    if (q.method) bits.push(METHODS[q.method]);
    if (q.account) bits.push(acctName(q.account));
    if (q.to) bits.push(`to ${acctName(q.to)}`);
    return bits.join(" · ");
  }

  /* ---------- insights ---------- */
  const median = (xs) => { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };
  const discretionary = (list) => list.filter((e) => e.type === "expense" && !e.recurringId);
  /* Spending in a month up to a given day of it, so a part-month can be compared fairly. */
  function spentByDay(m, day, catId = null) {
    const to = `${m}-${pad(Math.min(day, daysInMonth(m)))}`;
    let n = 0;
    for (const e of state.entries) if (e.date >= `${m}-01` && e.date <= to && (!catId || e.category === catId)) n += spendOf(e);
    return round2(n);
  }
  /* What you're on course to spend this month: spending so far, plus your usual daily spending for the days left,
     plus bills still to come. Early in the month it leans on the last three months instead of a few days. */
  function forecastMonth(m = monthOf(todayISO())) {
    const t = todayISO(), days = daysInMonth(m), day = m === monthOf(t) ? Number(t.slice(8)) : days;
    const list = entriesIn(m), spent = Math.max(0, totals(list).spent);
    const discSoFar = sum(discretionary(list).filter((e) => e.date <= t).map((e) => e.amount));
    const past = [1, 2, 3].map((i) => addMonths(m, -i)).filter((mm) => entriesIn(mm).length);
    const pastDaily = past.length ? sum(past.map((mm) => sum(discretionary(entriesIn(mm)).map((e) => e.amount)) / daysInMonth(mm))) / past.length : 0;
    const thisDaily = day ? discSoFar / day : 0;
    const w = past.length ? Math.min(1, day / 14) : 1;
    const daily = thisDaily * w + pastDaily * (1 - w);
    const bills = billsIn(m, t);
    const left = days - day;
    const projected = round2(spent + daily * left + bills.unpaid);
    return { projected, daily: round2(daily), billsLeft: bills.unpaid, day, days, past: past.length };
  }
  /* Things worth knowing about a month, most important first. Each says how it was worked out. */
  function findInsights(m = monthOf(todayISO())) {
    const t = todayISO(), out = [], isCur = m === monthOf(t);
    const list = entriesIn(m), { spent, income } = totals(list);
    if (!list.length) return out;
    const day = isCur ? Number(t.slice(8)) : daysInMonth(m);
    const past = [1, 2, 3].map((i) => addMonths(m, -i)).filter((mm) => entriesIn(mm).length);
    const B = budgetFor(m);

    // 1. Where the month is heading
    if (isCur && day < daysInMonth(m)) {
      const f = forecastMonth(m);
      const avg = past.length ? sum(past.map((mm) => Math.max(0, totals(entriesIn(mm)).spent))) / past.length : 0;
      const how = `Your spending so far (${W(spent)}), plus about ${W(f.daily)} a day for the ${plural(f.days - f.day, "day")} left${f.billsLeft ? `, plus ${W(f.billsLeft)} of bills still due` : ""}.${f.past && f.day < 14 ? " Early in the month this leans on your last three months." : ""}`;
      if (B.total > 0 && f.projected > B.total) out.push({ id: "forecast", tone: "bad", title: `On course for ${W(f.projected)} this month`, body: `That's ${W(f.projected - B.total)} over your ${W(B.total)} budget. Spending about ${W(Math.max(0, (B.total - spent - f.billsLeft) / Math.max(1, f.days - f.day)))} a day from now on keeps you within it.`, how });
      else if (B.total > 0) out.push({ id: "forecast", tone: "good", title: `On course for ${W(f.projected)} this month`, body: `That leaves about ${W(B.total - f.projected)} of your ${W(B.total)} budget unspent.`, how });
      else out.push({ id: "forecast", tone: "info", title: `On course for ${W(f.projected)} this month`, body: avg ? `Your average over the last ${plural(past.length, "month")} was ${W(avg)}.` : "Set a monthly budget to see how that compares.", how });
    }

    // 2. Spending more than came in
    if (income > 0 && spent > income) out.push({ id: "overspend", tone: "bad", title: "Spending more than came in", body: `${W(spent)} went out against ${W(income)} in. That's ${W(spent - income)} more than you earned this month.`, how: "Spending is your expenses minus refunds. Income counts only entries marked as income, not transfers or money borrowed." });

    // 3. Categories ahead of their usual pace, or over their budget
    if (past.length) {
      const cats = catTotals(list);
      const flagged = [];
      for (const ct of cats) {
        const usual = sum(past.map((mm) => spentByDay(mm, day, ct.id))) / past.length;
        const now = spentByDay(m, day, ct.id);
        const floor = Math.max(spent * 0.03, 1);
        if (usual > 0 && now > usual * 1.3 && now - usual >= floor) flagged.push({ ct, now, usual });
      }
      flagged.sort((a, b) => (b.now - b.usual) - (a.now - a.usual));
      for (const x of flagged.slice(0, 2)) {
        const c = catById(x.ct.id);
        out.push({ id: "cat-" + c.id, tone: "warn", title: `More on ${c.name} than usual`, body: `${W(x.now)} so far${isCur ? `, by day ${day}` : ""}. Over the last ${plural(past.length, "month")} you'd usually spent ${W(x.usual)} by this point, so that's ${Math.round((x.now / x.usual - 1) * 100)}% more.`, how: `Compares spending in ${c.name} up to day ${day} of this month with the average up to the same day of the ${plural(past.length, "month")} before.`, act: `data-act="go-cat" data-cat="${esc(c.id)}"` });
      }
    }
    for (const b of budgetStatus(m)) {
      if (!b.id || b.level < 100) continue;
      out.push({ id: "over-" + b.id, tone: "bad", title: `${b.name} is over budget`, body: `${W(b.spent)} spent against a ${W(b.total)} limit, ${W(b.spent - b.total)} over.`, how: "From the category budgets you set under Budgets.", act: `data-act="go-cat" data-cat="${esc(b.id)}"` });
    }

    // 4. One-off spending far above what's normal for its category
    const from = addDays(`${m}-01`, -90);
    const unusual = [];
    for (const e of discretionary(list)) {
      const prior = state.entries.filter((x) => x.type === "expense" && !x.recurringId && x.category === e.category && x.date >= from && x.date < `${m}-01`).map((x) => x.amount);
      if (prior.length < 5) continue;
      const med = median(prior);
      if (med > 0 && e.amount >= med * 3 && e.amount >= Math.max(spent * 0.02, med + 1)) unusual.push({ e, med, x: e.amount / med });
    }
    unusual.sort((a, b) => b.e.amount - a.e.amount);
    for (const u of unusual.slice(0, 2)) {
      const c = catById(u.e.category);
      out.push({ id: "odd-" + u.e.id, tone: "info", title: `An unusually big ${c.name.toLowerCase()} spend`, body: `${W(u.e.amount)} on ${entryTitle(u.e)}, ${fDate(u.e.date)}. That's about ${Math.round(u.x)} times your usual ${c.name.toLowerCase()} spend of ${W(u.med)}.`, how: `Flags spending at least three times the typical (median) amount you spent in ${c.name} over the previous 90 days.`, act: `data-act="edit-entry" data-id="${esc(u.e.id)}"` });
    }

    // 5. Small things that add up
    const since = addDays(isCur ? t : `${m}-${pad(daysInMonth(m))}`, -29);
    const groups = new Map();
    for (const e of state.entries) {
      if (e.type !== "expense" || e.recurringId || e.date < since || e.date > (isCur ? t : `${m}-${pad(daysInMonth(m))}`)) continue;
      const k = normTitle(e.title).split(" ")[0] || "";
      if (k.length < 3) continue;
      const g = groups.get(k) || { k, n: 0, total: 0, title: e.title, cat: e.category };
      g.n++; g.total += e.amount; groups.set(k, g);
    }
    const habit = [...groups.values()].filter((g) => g.n >= 8).sort((a, b) => b.total - a.total)[0];
    if (habit) out.push({ id: "habit", tone: "info", title: `${habit.n} × “${habit.k}” in the last 30 days`, body: `That's ${W(habit.total)}. Cutting it by half would save about ${W(habit.total / 2)} a month, or ${W(habit.total * 6)} a year.`, how: "Groups the last 30 days of everyday spending by its description and picks the most frequent one that you bought eight times or more." });

    // 6. Subscriptions
    const subs = subscriptions();
    if (subs.list.length >= 2) out.push({ id: "subs", tone: "info", title: `${W(subs.monthly)} a month on subscriptions`, body: `${plural(subs.list.length, "subscription")} cost ${W(subs.yearly)} a year. The biggest is ${subs.list[0].r.name} at ${W(subs.list[0].monthly)} a month. Cancelling one you rarely use is the easiest saving.`, how: "Adds up active recurring payments in the Subscriptions category, converting yearly and quarterly ones to a monthly amount.", act: `data-act="go-subs"` });

    // 7. Against earlier months
    if (past.length) {
      const before = sum(past.map((mm) => spentByDay(mm, day))) / past.length;
      const now = spentByDay(m, day);
      if (before > 0 && Math.abs(now - before) / before >= 0.1) {
        const up = now > before;
        out.push({ id: "trend", tone: up ? "warn" : "good", title: up ? "Spending more than your usual month" : "Spending less than your usual month", body: `${W(now)} by day ${day}, against an average of ${W(before)} at the same point of the last ${plural(past.length, "month")}. That's ${Math.round(Math.abs(now / before - 1) * 100)}% ${up ? "more" : "less"}.`, how: "Compares spending up to today's date with the same days of earlier months, so a part-month is compared fairly." });
      }
    }

    // 8. No-spend days
    if (isCur) {
      const ns = noSpendStats(`${m}-01`, t);
      if (ns.count >= 3) out.push({ id: "nospend", tone: "good", title: `${ns.count} no-spend days so far`, body: `Your longest run this month is ${plural(ns.longest, "day")}. Days with only recurring bills count as no-spend days.`, how: "Counts days with no spending apart from recurring bills, from your first entry onwards.", act: `data-act="go-calendar"` });
    }

    const rank = { bad: 0, warn: 1, info: 2, good: 3 };
    return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
  }

  /* ---------- financial health score ---------- */
  /* Five parts, each out of 20. A part you have no data for is left out, and the rest are scaled to 100.
     It's worked out only from what you've entered here, and it is not a credit score. */
  function healthScore() {
    const t = todayISO(), cur = monthOf(t);
    let months = [1, 2, 3].map((i) => addMonths(cur, -i)).filter((m) => entriesIn(m).length);
    const partial = !months.length;
    if (partial && entriesIn(cur).length) months = [cur];
    const parts = [];
    const pct = (x) => Math.round(x * 100);
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const span = months.length ? `${plural(months.length, "month")}` : "";
    const monthTotals = months.map((m) => totals(entriesIn(m)));
    const avgSpend = monthTotals.length ? sum(monthTotals.map((x) => Math.max(0, x.spent))) / monthTotals.length : 0;
    const avgIncome = monthTotals.length ? sum(monthTotals.map((x) => x.income)) / monthTotals.length : 0;

    // Savings rate: 20% or more of income kept scores full marks
    const withIncome = monthTotals.filter((x) => x.income > 0);
    if (withIncome.length) {
      const rate = sum(withIncome.map((x) => x.income - x.spent)) / sum(withIncome.map((x) => x.income));
      parts.push({ id: "save", name: "Savings rate", pts: clamp01(rate / 0.2) * 20, value: rate >= 0 ? `You keep ${pct(rate)}% of what comes in` : `You spend ${pct(-rate)}% more than comes in`, tip: rate >= 0.2 ? "" : `Keeping 20% of your income scores full marks. That's about ${W(Math.max(0, avgIncome * 0.2 - (avgIncome - avgSpend)))} a month more than now.`, how: `Income minus spending, divided by income, over the last ${span}. 20% or more scores 20.` });
    } else parts.push({ id: "save", name: "Savings rate", pts: null, value: "No income logged yet", tip: "Add your income so this can be worked out.", how: "Income minus spending, divided by income. 20% or more scores 20." });

    // Budget discipline: share of months, and of category budgets, kept within their limit
    const checks = [];
    for (const m of months) for (const b of budgetStatus(m)) checks.push(b.spent <= b.total);
    if (checks.length) {
      const kept = checks.filter(Boolean).length / checks.length;
      parts.push({ id: "budget", name: "Budget discipline", pts: kept * 20, value: `${checks.filter(Boolean).length} of ${checks.length} budgets kept`, tip: kept >= 1 ? "" : "Check the categories that went over and either spend less there or set a more realistic limit.", how: `Every monthly and category budget over the last ${span}, counting how many you stayed within.` });
    } else parts.push({ id: "budget", name: "Budget discipline", pts: null, value: "No budgets set", tip: "Set a monthly budget, or a few category budgets, to score this.", how: "Every monthly and category budget, counting how many you stayed within." });

    // Spending consistency: how much everyday spending swings from month to month
    const disc = months.map((m) => sum(discretionary(entriesIn(m)).map((e) => e.amount)));
    if (disc.length >= 2 && !partial) {
      const mean = sum(disc) / disc.length, sd = Math.sqrt(disc.reduce((n, x) => n + (x - mean) ** 2, 0) / disc.length);
      const cv = mean > 0 ? sd / mean : 0;
      parts.push({ id: "steady", name: "Spending consistency", pts: clamp01((0.5 - cv) / 0.4) * 20, value: `Everyday spending varies by about ${pct(cv)}% a month`, tip: cv <= 0.1 ? "" : "Big swings usually come from one-off purchases. Planning for them, for example with a goal, smooths things out.", how: "How much everyday spending (not recurring bills) changes between months. A change of 10% or less scores 20, 50% or more scores 0." });
    } else parts.push({ id: "steady", name: "Spending consistency", pts: null, value: "Needs two full months", tip: "This appears once you have two full months of entries.", how: "How much everyday spending changes between months." });

    // Debt: what you owe on cards and to people, against a month's income
    const bal = balances(), liq = liquidity(bal), ppl = people();
    const owe = liq.cardOwed + sum(ppl.filter((p) => p.balance < 0).map((p) => -p.balance));
    const late = ppl.filter((p) => p.balance < 0 && debtStatus(p)?.overdue).length;
    const base = avgIncome || avgSpend;
    if (months.length && (base > 0 || owe === 0)) {
      const ratio = base > 0 ? owe / base : 0;
      parts.push({ id: "debt", name: "Debt management", pts: Math.max(0, clamp01(1 - ratio) * 20 - late * 5), value: owe ? `You owe ${W(owe)}, ${pct(ratio)}% of a month's ${avgIncome ? "income" : "spending"}${late ? `, with ${plural(late, "repayment")} overdue` : ""}` : "You don't owe anything", tip: owe === 0 ? "" : late ? "Pay back what's overdue first: each late repayment costs 5 points." : "Paying off card balances in full each month keeps this high.", how: "What you owe on credit cards and to people, compared with a month's income. Owing nothing scores 20; owing a month's income or more scores 0. Each overdue repayment takes off 5." });
    }

    // Emergency savings: savings, investments and goals against three months of spending
    if (avgSpend > 0) {
      const monthsCovered = liq.saved / avgSpend;
      parts.push({ id: "safety", name: "Emergency savings", pts: clamp01(monthsCovered / 3) * 20, value: `Your savings would cover ${monthsCovered >= 10 ? Math.round(monthsCovered) : monthsCovered.toFixed(1)} months of spending`, tip: monthsCovered >= 3 ? "" : `Three months of spending, about ${W(avgSpend * 3)}, scores full marks. A goal for it helps.`, how: "Money in savings, investment and goal accounts, divided by your average monthly spending. Three months or more scores 20." });
    } else parts.push({ id: "safety", name: "Emergency savings", pts: null, value: "No spending logged yet", tip: "This appears once you've logged a month of spending.", how: "Savings, investments and goals, divided by your average monthly spending." });

    const scored = parts.filter((p) => p.pts !== null);
    const score = scored.length ? Math.round((sum(scored.map((p) => p.pts)) / (scored.length * 20)) * 100) : null;
    const label = score === null ? "Not enough data" : score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs attention";
    const tips = parts.filter((p) => p.tip && p.pts !== null).sort((a, b) => a.pts - b.pts).slice(0, 2);
    return { score, label, parts, tips, partial, months: months.length };
  }

