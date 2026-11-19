  /* ================= rendering ================= */
  const VIEWS = ["home", "activity", "recurring", "wallet", "insights"];
  function render() {
    renderBanner();
    if (ui.view === "home") renderHome();
    else if (ui.view === "activity") renderActivity();
    else if (ui.view === "recurring") renderRecurring();
    else if (ui.view === "wallet") renderWallet();
    else renderInsights();
  }
  function renderBanner() {
    const el = $("#banner");
    if (!state.sample || ui.bannerHidden) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="banner"><div class="wrap banner-in"><p><strong>You're looking at sample data.</strong> Explore as much as you like, then start fresh to track your own money.</p><div class="banner-btns"><button type="button" class="btn small primary" data-act="start-fresh">Start fresh</button><button type="button" class="btn small" data-act="hide-banner">Keep exploring</button></div></div></div>`;
  }
  const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
  const art = (c) => `<span class="art" aria-hidden="true">${svg(c.icon)}</span>`;
  const W = (n) => money(n, { whole: true });
  const signed = (n, o) => (n < 0 ? "−" + money(-n, o) : money(n, o));
  const kpi = (label, value, subText, tone = "") => `<div class="kpi ${tone}"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${esc(value)}</span><span class="kpi-sub">${esc(subText)}</span></div>`;
  function balText(a, b, o) {
    if (a.type === "card") return b < 0 ? `${money(-b, o)} owed` : b > 0 ? `${money(b, o)} in credit` : money(0);
    return signed(b, o);
  }

  function row(title, href, linkText, cards) {
    return `<section class="row"><div class="wrap row-head"><h2>${esc(title)}</h2><a class="see-all" href="${href}">${esc(linkText)}${svg("right")}</a></div>
      <div class="row-shell"><button type="button" class="row-arrow prev" data-act="row-prev" aria-label="Scroll ${esc(title)} back" hidden>${svg("left")}</button>
      <div class="row-track">${cards}</div>
      <button type="button" class="row-arrow next" data-act="row-next" aria-label="Scroll ${esc(title)} forward">${svg("right")}</button></div></section>`;
  }
  function emptyTile(msg, act, label) {
    return `<div class="empty-tile"><p>${esc(msg)}</p><button type="button" class="btn small primary" data-act="${act}">${svg("plus")}${esc(label)}</button></div>`;
  }
  function billCard(r, st) {
    const K = RKIND[r.kind];
    const c = r.kind === "transfer" ? { name: "Transfer", color: acctColor(acctById(r.to)), icon: "swap" } : catById(r.category, r.kind);
    const s = statusInfo(r, st);
    const calm = s.text === "Up to date";
    const amount = `${r.kind === "income" ? "+" : ""}${money(r.amount)}`;
    return `<div class="bill-wrap lift"><button type="button" class="poster bill" style="--c:${c.color}" data-act="edit-rec" data-id="${esc(r.id)}" aria-label="${esc(`${r.name}, ${amount}, ${calm ? `in ${plural(st.days, "day")}` : s.text}. Edit`)}">${art(c)}
      <span class="bill-top"><span class="pill ${calm ? "ghost" : s.cls}">${esc(calm ? `In ${plural(st.days, "day")}` : s.text)}</span><span class="mono">${esc(fDate(st.due))}</span></span>
      <span class="poster-kicker">${esc(c.name)} · ${esc(FREQ[r.frequency].label)}</span>
      <span class="poster-title">${esc(r.name)}</span>
      <span class="p-amt">${r.variable ? "<small>about</small>" : ""}${esc(amount)}</span></button>
      <button type="button" class="pay-btn" data-act="pay" data-id="${esc(r.id)}" aria-label="${esc(`${K.action} ${r.name}`)}">${svg("check")}${K.action}</button></div>`;
  }
  function topCard(e, rank) {
    const c = catById(e.category);
    return `<div class="top-item lift"><span class="rank" aria-hidden="true">${rank}</span><button type="button" class="poster" style="--c:${c.color}" data-act="edit-entry" data-id="${esc(e.id)}" aria-label="${esc(`Number ${rank}: ${entryTitle(e)}, ${money(e.amount)}. Edit`)}">${art(c)}
      <span class="poster-kicker">${esc(c.name)}</span><span class="poster-title">${esc(entryTitle(e))}</span>
      <span class="poster-foot"><span class="p-amt">${esc(money(e.amount))}</span><span class="mono">${esc(fDate(e.date))}</span></span></button></div>`;
  }
  function tileCard(e) {
    const v = entryVisual(e), a = entryAmount(e);
    return `<button type="button" class="tile" data-act="edit-entry" data-id="${esc(e.id)}"><span class="ico" style="--c:${v.color}">${svg(v.icon)}</span>
      <span class="min0"><span class="tile-title">${esc(entryTitle(e))}</span><span class="tile-meta">${esc(relDay(e.date))} · ${esc(e.type === "expense" ? acctName(e.account) : TYPES[e.type].label)}</span></span>
      <span class="tile-amt ${a.cls}">${esc(a.text)}</span></button>`;
  }
  function catCard(ct, total) {
    const c = catById(ct.id), pct = total > 0 ? Math.round((ct.total / total) * 100) : 0;
    return `<button type="button" class="poster square lift" style="--c:${c.color}" data-act="go-cat" data-cat="${esc(c.id)}" aria-label="${esc(`${c.name}: ${money(ct.total)}, ${pct}% of this month. Show these entries`)}">${art(c)}
      <span class="poster-kicker">${plural(ct.count, "expense")}</span><span class="poster-title">${esc(c.name)}</span>
      <span class="poster-foot"><span class="p-amt">${esc(W(ct.total))}</span><span class="mono">${pct}%</span></span>
      <span class="share"><i style="width:${Math.min(100, pct)}%"></i></span></button>`;
  }
  function acctCard(a, b) {
    const T = ACCT[a.type] || ACCT.bank;
    return `<button type="button" class="poster acct lift" style="--c:${acctColor(a)}" data-act="edit-acct" data-id="${esc(a.id)}" aria-label="${esc(`${a.name}, ${T.label}, ${balText(a, b)}. Edit`)}">${art(T)}
      <span class="acct-top"><span class="mono">${esc(T.label)}</span>${svg(T.icon)}</span>
      <span class="acct-name">${esc(a.name)}</span><span class="acct-bal">${esc(balText(a, b))}</span></button>`;
  }
  function goalCard(a, b) {
    const pct = a.target > 0 ? Math.max(0, Math.min(100, (b / a.target) * 100)) : 0;
    const left = round2(a.target - b), t = todayISO();
    let note;
    if (left <= 0) note = "Reached. Nicely done.";
    else if (a.deadline && a.deadline < t) note = `${W(left)} to go. The date you set has passed.`;
    else if (a.deadline) {
      const perDay = left / Math.max(1, daysBetween(t, a.deadline));
      note = `${W(left / Math.max(1, monthDiff(monthOf(t), monthOf(a.deadline))))} a month, or ${money(perDay, { whole: perDay >= 10 })} a day, gets you there by ${fMonth(monthOf(a.deadline))}`;
    }
    else note = `${W(left)} to go. Add a target date to see what to put aside each month.`;
    return `<div class="goal"><button type="button" class="goal-main" data-act="edit-acct" data-id="${esc(a.id)}" aria-label="${esc(`${a.name}: ${W(b)} of ${W(a.target)} saved. Edit`)}">
      <span class="goal-head"><span class="ico" style="--c:${acctColor(a)}">${svg("target")}</span><span class="goal-name">${esc(a.name)}</span><span class="mono">${Math.round(pct)}%</span></span>
      <span class="goal-amt">${esc(W(b))} <small>of ${esc(W(a.target))}</small></span>
      <span class="meter${left <= 0 ? " good" : ""}"><i style="width:${pct}%"></i></span>
      <span class="goal-note">${esc(note)}</span></button>
      <button type="button" class="btn small" data-act="fund" data-id="${esc(a.id)}">${svg("plus")}Add money</button></div>`;
  }

  function debtCard(p, st) {
    const owed = p.balance > 0, text = owed ? `${p.name} owes you` : `You owe ${p.name}`;
    return `<div class="bill-wrap lift"><button type="button" class="poster bill" style="--c:#6D28D9" data-act="person" data-k="${esc(p.key)}" aria-label="${esc(`${text} ${money(Math.abs(p.balance))}, ${debtText(st)}. Show history`)}">${art({ icon: "person" })}
      <span class="bill-top"><span class="pill ${st.overdue ? "overdue" : "soon"}">${esc(debtText(st))}</span><span class="mono">${esc(fDate(p.due))}</span></span>
      <span class="poster-kicker">${owed ? "Lent · paying you back" : "Borrowed · to pay back"}</span>
      <span class="poster-title">${esc(text)}</span>
      <span class="p-amt">${esc(money(Math.abs(p.balance)))}</span></button>
      <button type="button" class="pay-btn" data-act="settle" data-k="${esc(p.key)}" aria-label="${esc(`Settle up with ${p.name}`)}">${svg("check")}Settle</button></div>`;
  }
  function budgetAlerts(m) {
    if (!state.settings.alerts) return "";
    const list = budgetStatus(m).filter((b) => b.level >= 50).sort((a, b) => b.pct - a.pct);
    if (!list.length) return "";
    return `<div class="alerts" role="list" aria-label="Budget alerts">${list.map((b) => `<button type="button" role="listitem" class="alert-chip lvl-${b.level}" data-act="${b.id ? "go-cat" : "budgets"}"${b.id ? ` data-cat="${esc(b.id)}"` : ""}>${svg(b.level >= 100 ? "alert" : "bell")}<span><b>${esc(b.name)}</b> ${b.level >= 100 ? `over by ${esc(W(b.spent - b.total))}` : `${Math.floor(b.pct)}% used, ${esc(W(b.total - b.spent))} left`}</span></button>`).join("")}</div>`;
  }

  /* ---------- home ---------- */
  function renderHome() {
    const t = todayISO(), m = monthOf(t), days = daysInMonth(m), day = Number(t.slice(8));
    const list = entriesIn(m);
    const { spent, income, net } = totals(list);
    const B = budgetFor(m), budget = B.total;
    const bills = billsIn(m, t);
    const cats = catTotals(list);
    const hue = cats[0] ? catById(cats[0].id).color : "";
    const up = upcoming();
    const next = up.find((x) => x.r.kind !== "income") || up[0];
    const daysLeft = days - day + 1;
    const bal = balances(), wo = worth(bal);
    const live = state.accounts.filter((a) => !a.archived);
    const accts = live.filter((a) => a.type !== "goal"), goals = live.filter((a) => a.type === "goal");

    let sub, pace = "";
    if (budget > 0) {
      const left = round2(budget - spent);
      const flex = Math.max(0, budget - bills.fixedMonth);
      const paceAmt = Math.min(budget, bills.fixedSoFar + (flex * day) / days);
      const fillPct = Math.max(0, Math.min(100, (spent / budget) * 100));
      const pacePct = Math.min(100, (paceAmt / budget) * 100);
      if (left >= 0) {
        const perDay = Math.max(0, left - bills.unpaid) / daysLeft;
        sub = `of your <b>${esc(W(budget))}</b> budget${B.carry ? `, which includes ${esc(W(B.carry))} carried over from ${esc(fMonthName(addMonths(m, -1)))}` : ""}. <b>${esc(W(left))}</b> left` + (bills.unpaid > 0
          ? `, with ${esc(W(bills.unpaid))} of bills still to pay. That leaves about <b>${esc(W(perDay))} a day</b> for the next ${plural(daysLeft, "day")}.`
          : `. That's about <b>${esc(W(perDay))} a day</b> for the next ${plural(daysLeft, "day")}.`);
      } else {
        sub = `That's <b>${esc(W(-left))}</b> over your ${esc(W(budget))} budget for ${esc(fMonthName(m))}.`;
      }
      const tone = spent > budget ? ["overdue", "Over budget"] : spent > paceAmt ? ["soon", `${W(spent - paceAmt)} ahead of pace`] : ["ok", `On track, ${W(paceAmt - spent)} under pace`];
      pace = `<div class="pace"><div class="pace-track" role="img" aria-label="${esc(`${Math.round(fillPct)}% of the budget used. An even pace by today would be ${Math.round(pacePct)}%.`)}"><div class="pace-fill" style="width:${fillPct}%"></div><div class="pace-tick" style="left:${pacePct}%"></div></div>
        <div class="pace-meta"><span class="pill ${tone[0]}">${esc(tone[1])}</span><span class="pace-key"><i></i>Even pace for day ${day}, with bills counted on their due dates</span></div></div>`;
    } else {
      sub = `in ${esc(fMonthName(m))} so far. Set a monthly budget to see what's left each day.`;
    }
    const stats = `<dl class="bb-stats"><div><dt>Came in</dt><dd class="${income > 0 ? "in" : ""}">${income > 0 ? "+" : ""}${esc(W(income))}</dd></div>${income > 0 ? `<div><dt>${net >= 0 ? "Kept" : "Short by"}</dt><dd>${esc(W(Math.abs(net)))}</dd></div>` : ""}<div><dt>Net worth</dt><dd>${esc(signed(wo.net, { whole: true }))}</dd></div></dl>`;
    const nextBtn = next
      ? `<button type="button" class="btn-ghost" data-act="pay" data-id="${esc(next.r.id)}">${svg("clock")}<span>Up next: <b>${esc(next.r.name)}</b>, ${esc(shortStatus(next.st))}</span></button>`
      : `<button type="button" class="btn-ghost" data-act="add-rec">${svg("repeat")}<span>Add a recurring bill</span></button>`;
    const budgetBtn = budget > 0 ? "" : `<button type="button" class="btn-ghost" data-act="budgets">${svg("target")}<span>Set a budget</span></button>`;
    const amount = W(Math.max(0, spent));

    // Today at a glance
    const todayList = state.entries.filter((e) => e.date === t);
    const todaySpent = Math.max(0, totals(todayList).spent), nToday = todayList.filter((e) => e.type === "expense").length;
    const streak = noSpendStreak(), liq = liquidity(bal);
    const goalTarget = sum(goals.map((a) => a.target)), goalSaved = sum(goals.map((a) => bal.get(a.id) || 0));
    const left = round2(budget - spent), perDay = Math.max(0, left - bills.unpaid) / daysLeft;
    const glance = `<section class="wrap home-kpis" aria-label="Today at a glance"><div class="kpis">
        ${kpi("Spent today", W(todaySpent), nToday ? plural(nToday, "expense") : streak > 1 ? `No-spend streak: ${plural(streak, "day")}` : "Nothing yet today")}
        ${kpi("Available now", signed(liq.available, { whole: true }), liq.cardOwed > 0 ? `${W(liq.cardOwed)} owed on cards` : "Cash, bank and wallets", liq.available < 0 ? "bad" : "")}
        ${kpi("Total savings", W(liq.saved), goalTarget > 0 ? `${Math.round((goalSaved / goalTarget) * 100)}% of your goal targets` : "Savings, investments and goals")}
        ${budget > 0 ? kpi("Budget left", left >= 0 ? W(left) : `−${W(-left)}`, left >= 0 ? `${W(perDay)} a day for ${plural(daysLeft, "day")}` : "You're over budget", left < 0 ? "bad" : spent / budget >= 0.8 ? "warn" : "") : kpi("Budget left", "No budget", "Set one under Budgets")}
      </div>${budgetAlerts(m)}</section>`;

    // Bills and debts that are due, soonest first
    const dueDebts = people().map((p) => ({ p, st: debtStatus(p) })).filter((x) => x.st && (x.st.overdue || x.st.soon));
    const upcomingCards = [...dueDebts.map((x) => ({ due: x.p.due, html: debtCard(x.p, x.st) })), ...up.slice(0, 14).map(({ r, st }) => ({ due: st.due, html: billCard(r, st) }))].sort((a, b) => a.due.localeCompare(b.due));
    const months6 = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5)), mt = months6.map((mm) => totals(entriesIn(mm)));

    const rows = [];
    rows.push(row("Up next", "#recurring", "All recurring", upcomingCards.length ? upcomingCards.map((x) => x.html).join("") : emptyTile("Add rent, subscriptions, bills and your salary, and you'll see what's coming up.", "add-rec", "Add recurring")));
    if (accts.length) rows.push(row("Your money", "#wallet", "Wallet", accts.map((a) => acctCard(a, bal.get(a.id) || 0)).join("")));
    if (mt.some((x) => x.income > 0 || x.spent > 0)) rows.push(`<section class="row"><div class="wrap row-head"><h2>In and out</h2><a class="see-all" href="#insights">Insights${svg("right")}</a></div><div class="wrap"><div class="card home-chart">${flowChart(months6, mt)}</div></div></section>`);
    const top = list.filter((e) => e.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5);
    if (top.length) rows.push(row(`Top ${top.length} in ${fMonthName(m)}`, "#activity", "All activity", top.map((e, i) => topCard(e, i + 1)).join("")));
    const recent = [...state.entries].sort(byNewest).slice(0, 12);
    rows.push(row("Recently added", "#activity", "All activity", recent.length ? recent.map(tileCard).join("") : emptyTile("Your latest entries show up here.", "add-entry", "Add entry")));
    if (cats.length) rows.push(row("Where it went", "#insights", "Insights", cats.map((c) => catCard(c, spent)).join("")));
    if (goals.length) rows.push(row("Goals", "#wallet", "Wallet", goals.map((a) => goalCard(a, bal.get(a.id) || 0)).join("")));

    $("#view-home").innerHTML = `
      <section class="billboard">
        <div class="bb-art" style="${hue ? `--hue:${hue}` : ""}" aria-hidden="true"><span class="bb-word">${esc(fMonthName(m))}</span></div>
        <div class="wrap bb-in"><div class="bb-copy">
          <p class="eyebrow">${esc(fMonth(m))} · Day ${day} of ${days}</p>
          <h1 class="bb-title"><span class="bb-lead">You've spent</span><span class="bb-num" style="--len:${Math.max(6, amount.length)}">${esc(amount)}</span></h1>
          <p class="bb-sub">${sub}</p>
          ${pace}
          ${stats}
          <div class="bb-actions"><button type="button" class="btn-play" data-act="add-entry">${svg("plus")}Add entry</button>${nextBtn}${budgetBtn}</div>
        </div></div>
      </section>
      ${glance}
      <div class="rows">${rows.join("")}</div>`;
    bindRows();
  }
  function bindRows() {
    $$(".row-track").forEach((tr) => {
      const shell = tr.parentElement;
      const upd = () => {
        const prev = $(".prev", shell), nxt = $(".next", shell);
        prev.hidden = tr.scrollLeft < 8;
        nxt.hidden = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 8;
      };
      tr.addEventListener("scroll", upd, { passive: true });
      tr._upd = upd;
      upd();
    });
  }

  /* Previous, next and back-to-now for whichever period a view shows. */
  function periodNav(period) {
    const t = todayISO();
    const nextFrom = periodRange(period, stepAnchor(period, ui.anchor, 1)).from;
    const canNext = nextFrom <= `${addMonths(monthOf(t), 12)}-01`;
    const now = { day: "Today", week: "This week", month: "This month", year: "This year" }[period];
    const word = PERIOD_WORD[period];
    return `<div class="month-nav"><button type="button" class="icon-btn" data-act="period-prev" data-p="${period}" aria-label="Previous ${word}">${svg("left")}</button>${inPeriod(period, ui.anchor) ? "" : `<button type="button" class="btn small" data-act="period-now">${now}</button>`}<button type="button" class="icon-btn" data-act="period-next" data-p="${period}" aria-label="Next ${word}"${canNext ? "" : " disabled"}>${svg("right")}</button></div>`;
  }
  const methodChoices = () => Object.entries(METHODS).filter(([k]) => k !== "upi" || state.settings.currency === "INR" || state.entries.some((e) => e.method === "upi"));

  /* ---------- activity ---------- */
  function periodEntries(period) {
    if (period === "all") return state.entries;
    const r = periodRange(period, ui.anchor);
    return entriesBetween(r.from, r.to);
  }
  function activityList() {
    let list = periodEntries(ui.actPeriod);
    if (ui.actAccount) list = list.filter((e) => e.account === ui.actAccount || e.to === ui.actAccount);
    if (ui.actPerson) list = list.filter((e) => personKey(e.person) === ui.actPerson);
    if (ui.actMethod) list = list.filter((e) => e.method === ui.actMethod);
    const ty = ui.actType;
    if (ty === "expense") list = list.filter((e) => e.type === "expense" || e.type === "refund");
    else if (ty === "people") list = list.filter((e) => TYPES[e.type].person);
    else if (ty !== "all") list = list.filter((e) => e.type === ty);
    if (ui.actCat !== "all") list = list.filter((e) => e.category === ui.actCat);
    const q = ui.actQuery.trim().toLowerCase();
    if (q) list = list.filter((e) => searchText(e).includes(q));
    return list;
  }
  function renderActivity() {
    const p = ui.actPeriod, all = p === "all", cal = ui.actView === "calendar" && p === "month";
    const cats = catTotals(periodEntries(p)).slice(0, 8).map((c) => c.id);
    if (ui.actCat !== "all" && !cats.includes(ui.actCat)) cats.unshift(ui.actCat);
    const tchip = (k, label) => `<button type="button" class="chip" data-act="act-type" data-k="${k}" aria-pressed="${ui.actType === k}">${label}</button>`;
    const cchip = (id) => { const c = catById(id); return `<button type="button" class="chip" data-act="act-cat" data-cat="${esc(id)}" aria-pressed="${ui.actCat === id}"><i style="background:${c.color}"></i>${esc(c.name)}</button>`; };
    const pinned = [];
    if (ui.actAccount) pinned.push(`<button type="button" class="chip" data-act="act-clear-acct" aria-pressed="true" aria-label="${esc(`Showing ${acctName(ui.actAccount)} only. Show every account`)}">${esc(acctName(ui.actAccount))}${svg("x")}</button>`);
    if (ui.actPerson) { const name = people().find((x) => x.key === ui.actPerson)?.name || ui.actPerson; pinned.push(`<button type="button" class="chip" data-act="act-clear-person" aria-pressed="true" aria-label="${esc(`Showing ${name} only. Show everyone`)}">${esc(name)}${svg("x")}</button>`); }
    const seg = (k, label, cur, act) => `<button type="button" data-act="${act}" data-k="${k}" aria-pressed="${cur === k}">${label}</button>`;
    const searchWhat = all ? "everything" : p === "month" ? fMonthName(monthOf(ui.anchor)) : `this ${PERIOD_WORD[p]}`;
    $("#view-activity").innerHTML = `<div class="wrap view-body">
      <header class="view-head"><div><p class="eyebrow">Activity</p><h1 class="large-title">${esc(periodLabel(p, ui.anchor))}</h1><p class="view-sub" id="act-summary"></p></div>${all ? "" : periodNav(p)}</header>
      <div class="toolbar">
        <label class="search"><span class="sr">Search entries</span>${svg("search")}<input id="act-search" type="search" placeholder="Search ${esc(searchWhat)}" value="${esc(ui.actQuery)}" autocomplete="off"></label>
        <button type="button" class="btn primary" data-act="add-entry">${svg("plus")}Add entry</button>
      </div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Period">${Object.entries(PERIODS).map(([k, l]) => seg(k, l, p, "act-period")).join("")}</div>
        <div class="seg" role="group" aria-label="Show as">${seg("list", "List", cal ? "calendar" : "list", "act-view")}${seg("calendar", `${svg("calendar")}Calendar`, cal ? "calendar" : "list", "act-view")}</div>
        <label class="select-wrap"><span class="sr">Payment method</span><select id="act-method" class="select">${opts([["", "Every method"], ...methodChoices()], ui.actMethod)}</select>${svg("down")}</label>
        ${cal ? "" : `<label class="select-wrap"><span class="sr">Sort entries</span><select id="act-sort" class="select">${opts([["new", "Newest first"], ["old", "Oldest first"], ["high", "Highest amount"], ["low", "Lowest amount"]], ui.actSort)}</select>${svg("down")}</label>`}
      </div>
      <div class="chips" role="group" aria-label="Filter entries">${pinned.join("")}${tchip("all", "All")}${tchip("expense", "Spending")}${tchip("income", "Income")}${tchip("transfer", "Transfers")}${tchip("people", "People")}${cats.length ? `<span class="chip-sep" aria-hidden="true"></span>${cats.map(cchip).join("")}` : ""}</div>
      <div id="act-list" class="exp-list"></div></div>`;
    renderActList();
  }
  function itemRow(e, withDate) {
    const v = entryVisual(e), a = entryAmount(e);
    return `<button type="button" class="item" data-act="edit-entry" data-id="${esc(e.id)}"><span class="ico" style="--c:${v.color}">${svg(v.icon)}</span><span class="min0"><span class="item-title">${esc(entryTitle(e))}</span><span class="item-meta">${entryMeta(e, withDate)}</span></span><span class="item-amt ${a.cls}">${esc(a.text)}${e.cur ? `<small>${esc(fmtCur(e.orig, e.cur))}</small>` : ""}</span></button>`;
  }
  function renderActList() {
    const el = $("#act-list"); if (!el) return;
    const p = ui.actPeriod, all = p === "all";
    const found = activityList();
    const tt = totals(found);
    const bits = [];
    if (tt.spent > 0) bits.push(`<b>${esc(money(tt.spent))}</b> spent`);
    if (tt.income > 0) bits.push(`<b>${esc(money(tt.income))}</b> came in`);
    bits.push(plural(found.length, "entry", "entries"));
    $("#act-summary").innerHTML = found.length ? bits.join(" · ") : "";
    if (ui.actView === "calendar" && p === "month") { el.innerHTML = calendarHTML(monthOf(ui.anchor), found); return; }
    const filtered = ui.actType !== "all" || ui.actCat !== "all" || ui.actQuery.trim() || ui.actAccount || ui.actPerson || ui.actMethod;
    const where = all ? "" : p === "day" ? ` on ${fDateLong(ui.anchor)}` : p === "month" ? ` in ${fMonthName(monthOf(ui.anchor))}` : ` this ${PERIOD_WORD[p]}`;
    if (!found.length && !filtered) {
      el.innerHTML = `<div class="empty"><h3>${all ? "Nothing logged yet" : `Nothing logged${esc(where)}`}</h3><p>Add what you spend, earn, move or lend as you go, and it lands here grouped by day.</p><button type="button" class="btn primary" data-act="add-entry">${svg("plus")}Add entry</button></div>`;
      return;
    }
    if (!found.length) {
      el.innerHTML = `<div class="empty"><h3>No matches</h3><p>Nothing${all ? " you've logged" : esc(where)} matches your search or filters.</p><button type="button" class="btn" data-act="clear-filters">Clear search and filters</button></div>`;
      return;
    }
    const CAP = 400;
    const more = found.length > CAP ? `<p class="hint list-note">Showing ${CAP} of ${found.length} entries. Search or filter to narrow them down.</p>` : "";
    if (ui.actSort === "high" || ui.actSort === "low") {
      const list = [...found].sort((a, b) => (ui.actSort === "high" ? b.amount - a.amount : a.amount - b.amount)).slice(0, CAP);
      el.innerHTML = `<div class="list">${list.map((e) => itemRow(e, true)).join("")}</div>${more}`;
      return;
    }
    let list = [...found].sort(byNewest);
    if (ui.actSort === "old") list.reverse();
    list = list.slice(0, CAP);
    const groups = [];
    for (const e of list) { const g = groups[groups.length - 1]; if (g && g.date === e.date) g.items.push(e); else groups.push({ date: e.date, items: [e] }); }
    const longDates = p === "all" || p === "year";
    el.innerHTML = groups.map((g) => {
      const d = totals(g.items);
      const right = [d.income > 0 ? "+" + money(d.income) : "", d.spent > 0 ? money(d.spent) : ""].filter(Boolean).join(" · ");
      const label = relDay(g.date) === fDate(g.date) ? (longDates ? fDateLong(g.date) : fDay(g.date)) : `${relDay(g.date)} · ${fDay(g.date)}`;
      return `<section class="day"><div class="day-head"><span>${esc(label)}</span><span>${esc(right)}</span></div><div class="list">${g.items.map((e) => itemRow(e, false)).join("")}</div></section>`;
    }).join("") + more;
  }
  /* A month as a calendar: what went out each day, with no-spend days marked. Recurring bills don't break a no-spend day. */
  function calendarHTML(m, found) {
    const days = daysInMonth(m), t = todayISO(), first = firstEntryDate();
    const lead = (parseISO(`${m}-01`).getDay() + 6) % 7;
    const spent = new Map(), count = new Map(), income = new Map(), disc = new Set();
    for (const e of found) {
      spent.set(e.date, (spent.get(e.date) || 0) + spendOf(e));
      if (e.type === "expense") count.set(e.date, (count.get(e.date) || 0) + 1);
      if (e.type === "income") income.set(e.date, (income.get(e.date) || 0) + e.amount);
    }
    for (const e of entriesIn(m)) if (e.type === "expense" && !e.recurringId) disc.add(e.date);
    const max = Math.max(0, ...spent.values());
    const monday = weekStart(t);
    const heads = Array.from({ length: 7 }, (_, i) => `<span class="cal-h" aria-hidden="true">${esc(DF.wd.format(parseISO(addDays(monday, i))))}</span>`).join("");
    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="cal-pad" aria-hidden="true"></span>`;
    for (let d = 1; d <= days; d++) {
      const date = `${m}-${pad(d)}`, sp = Math.max(0, round2(spent.get(date) || 0)), n = count.get(date) || 0, inc = income.get(date) || 0;
      const future = date > t, tracked = first && date >= first;
      const free = !future && tracked && !disc.has(date);
      const heat = max > 0 ? Math.round((sp / max) * 34) : 0;
      const label = `${fDay(date)}: ${sp > 0 ? `spent ${money(sp)} across ${plural(n, "entry", "entries")}` : future ? "still to come" : free ? "no spending" : "nothing spent"}${inc > 0 ? `, ${money(inc)} came in` : ""}`;
      cells += `<button type="button" class="cal-day${date === t ? " today" : ""}${future ? " future" : ""}${free ? " free" : ""}" style="--heat:${heat}%" data-act="cal-day" data-d="${date}" aria-label="${esc(label)}">
        <span class="cal-n">${d}</span>${sp > 0 ? `<span class="cal-amt">${esc(compact(sp))}</span>` : free ? `<span class="cal-free">${svg("check")}<span>No spend</span></span>` : ""}${inc > 0 ? `<span class="cal-in">+${esc(compact(inc))}</span>` : ""}</button>`;
    }
    const ns = noSpendStats(`${m}-01`, `${m}-${pad(days)}`);
    const streak = inPeriod("month", `${m}-01`) ? noSpendStreak() : 0;
    const stats = ns.counted ? `<div class="cal-stats"><span><b>${ns.count}</b> no-spend ${ns.count === 1 ? "day" : "days"} out of ${ns.counted}</span><span>Longest run <b>${plural(ns.longest, "day")}</b></span>${streak ? `<span>Current streak <b>${plural(streak, "day")}</b></span>` : ""}<span class="hint">Recurring bills don't count as spending here.</span></div>` : "";
    return `${stats}<div class="cal" role="group" aria-label="${esc(`${fMonth(m)} calendar. Pick a day to see its entries.`)}">${heads}${cells}</div>`;
  }

  /* ---------- recurring ---------- */
  function recRows() { const t = todayISO(); return state.recurring.map((r) => ({ r, st: cycleStatus(r, t) })); }
  function renderRecurring() {
    const rows = recRows();
    const active = rows.filter((x) => x.r.active !== false);
    const overdue = active.filter((x) => x.st?.overdue), soon = active.filter((x) => x.st?.soon);
    const perMonth = (kind) => round2(active.filter((x) => x.r.kind === kind && x.st).reduce((n, x) => n + x.r.amount * FREQ[x.r.frequency].perMonth, 0));
    const out = perMonth("expense"), inc = perMonth("income");
    const paused = rows.length - active.length;
    const subs = subscriptions();
    const subsCard = subs.list.length ? `<section class="card subs" aria-label="Subscriptions">
        <div class="card-head split"><div><h3>Subscriptions</h3><p><b>${esc(W(subs.monthly))}</b> a month · ${esc(W(subs.yearly))} a year · ${plural(subs.list.length, "active subscription")}</p></div><button type="button" class="btn small" data-act="rec-filter" data-f="subs">Show only these</button></div>
        <div class="subs-list">${subs.list.map(({ r, st, monthly }) => `<button type="button" class="sub-chip" data-act="edit-rec" data-id="${esc(r.id)}"><span class="sub-name">${esc(r.name)}</span><span class="sub-amt">${esc(money(monthly))}<small>/mo</small></span><span class="sub-next">Next ${esc(fDate(st.due))}${r.frequency !== "monthly" ? ` · ${esc(FREQ[r.frequency].label.toLowerCase())}` : ""}</span></button>`).join("")}</div>
      </section>` : "";
    const seg = (k, label, n) => `<button type="button" data-act="rec-filter" data-f="${k}" aria-pressed="${ui.recFilter === k}">${esc(label)}<span class="count">${n}</span></button>`;
    $("#view-recurring").innerHTML = `<div class="wrap view-body">
      <header class="view-head"><div><p class="eyebrow">Recurring</p><h1 class="large-title">Bills and regulars</h1><p class="view-sub">Rent, subscriptions, salary, savings and anything else that comes round again. Deal with one and it lands in your activity.</p></div>
        <button type="button" class="btn primary" data-act="add-rec">${svg("plus")}Add recurring</button></header>
      <div class="kpis">
        ${kpi("Going out each month", W(out), `${W(out * 12)} a year`)}
        ${kpi("Coming in each month", W(inc), inc > 0 ? (inc >= out ? `${W(inc - out)} left after bills` : `${W(out - inc)} less than your bills`) : "Add your salary to see it here")}
        ${kpi("Overdue", String(overdue.length), overdue.length ? W(sum(overdue.map((x) => x.r.amount))) : "Nothing late", overdue.length ? "bad" : "")}
        ${kpi("Due in 7 days", String(soon.length), soon.length ? W(sum(soon.map((x) => x.r.amount))) : "Nothing this week", soon.length ? "warn" : "")}
      </div>
      ${subsCard}
      <div class="toolbar">
        <label class="search"><span class="sr">Search recurring items</span>${svg("search")}<input id="rec-search" type="search" placeholder="Search recurring" value="${esc(ui.recQuery)}" autocomplete="off"></label>
        <div class="seg" role="group" aria-label="Show">${seg("all", "All", rows.length)}${seg("overdue", "Overdue", overdue.length)}${seg("soon", "Due in 7 days", soon.length)}${seg("subs", "Subscriptions", subs.list.length)}${seg("paused", "Paused", paused)}</div>
        <label class="select-wrap"><span class="sr">Sort recurring items</span><select id="rec-sort" class="select">${opts([["due", "Next due"], ["amount", "Amount"], ["name", "Name"], ["status", "Status"]], ui.recSort)}</select>${svg("down")}</label>
      </div>
      <div id="rec-list"></div></div>`;
    renderRecList();
  }
  function renderRecList() {
    const el = $("#rec-list"); if (!el) return;
    const all = recRows();
    if (!all.length) { el.innerHTML = `<div class="empty"><h3>Nothing recurring yet</h3><p>Add rent, subscriptions, bills and your salary, and you'll see what's coming up.</p><button type="button" class="btn primary" data-act="add-rec">${svg("plus")}Add recurring</button></div>`; return; }
    let rows = all;
    const f = ui.recFilter;
    if (f === "paused") rows = rows.filter((x) => x.r.active === false);
    else if (f === "subs") rows = rows.filter((x) => isSubscription(x.r));
    else if (f !== "all") rows = rows.filter((x) => x.r.active !== false && x.st && (f === "overdue" ? x.st.overdue : x.st.soon));
    const q = ui.recQuery.trim().toLowerCase();
    if (q) rows = rows.filter((x) => `${x.r.name} ${x.r.category ? catById(x.r.category, x.r.kind).name : ""} ${RKIND[x.r.kind].label} ${x.r.note}`.toLowerCase().includes(q));
    const pausedLast = (a, b) => (a.r.active === false) - (b.r.active === false);
    const cmp = {
      due: (a, b) => pausedLast(a, b) || (a.st?.due || "9").localeCompare(b.st?.due || "9"),
      amount: (a, b) => b.r.amount - a.r.amount,
      name: (a, b) => a.r.name.localeCompare(b.r.name),
      status: (a, b) => pausedLast(a, b) || (a.st?.days ?? 1e9) - (b.st?.days ?? 1e9),
    }[ui.recSort] || (() => 0);
    rows = [...rows].sort(cmp);
    if (!rows.length) { el.innerHTML = `<div class="empty"><h3>No matches</h3><p>Nothing recurring matches this view.</p><button type="button" class="btn" data-act="clear-rec-filters">Show all</button></div>`; return; }
    const head = `<div class="rrow head" role="row"><span role="columnheader">Name</span><span role="columnheader">Next due</span><span role="columnheader">How often</span><span role="columnheader">Account</span><span role="columnheader" class="num">Amount</span><span role="columnheader">Status</span><span role="columnheader"><span class="sr">Actions</span></span></div>`;
    el.innerHTML = `<div class="rtable" role="table" aria-label="Recurring items">${head}${rows.map(({ r, st }) => {
      const K = RKIND[r.kind], on = r.active !== false, s = statusInfo(r, st);
      const c = r.kind === "transfer" ? { name: "Transfer", color: acctColor(acctById(r.to)), icon: "swap" } : catById(r.category, r.kind);
      const where = r.kind === "transfer" ? `${acctName(r.account)} to ${acctName(r.to)}` : acctName(r.account);
      const subBits = [r.kind === "income" ? `Income · ${c.name}` : c.name, r.variable ? "Varies" : "", r.auto ? "Adds itself" : "", r.end ? `Ends ${fDateLong(r.end)}` : "", r.note].filter(Boolean).map(esc).join(" · ");
      const mobile = [st ? `Due ${fDate(st.due)}` : "", FREQ[r.frequency].label, where].filter(Boolean).map(esc).join(" · ");
      const act = !on ? `<button type="button" class="btn small" data-act="toggle-rec" data-id="${esc(r.id)}">${svg("play")}Resume</button>` : st ? `<button type="button" class="btn small primary" data-act="pay" data-id="${esc(r.id)}">${svg("check")}${K.action}</button>` : "";
      return `<div class="rrow${on ? "" : " inactive"}" role="row">
        <div class="c-name" role="cell"><span class="ico" style="--c:${c.color}">${svg(c.icon)}</span><div class="min0"><span class="rname">${esc(r.name)}</span><span class="rsub">${subBits}</span><span class="rsub m-only">${mobile}</span></div></div>
        <div class="c-due" role="cell">${st ? esc(fDateLong(st.due)) : "None"}</div>
        <div class="c-freq" role="cell">${esc(FREQ[r.frequency].label)}</div>
        <div class="c-method" role="cell">${esc(where)}</div>
        <div class="c-amt num${r.kind === "income" ? " in" : ""}" role="cell">${r.variable ? `<span class="rsub">about </span>` : ""}${r.kind === "income" ? "+" : ""}${esc(money(r.amount))}</div>
        <div class="c-status" role="cell"><span class="pill ${s.cls}">${esc(s.text)}</span></div>
        <div class="c-act" role="cell">${act}<button type="button" class="icon-btn sm" data-act="rec-menu" data-id="${esc(r.id)}" aria-label="More actions for ${esc(r.name)}" aria-haspopup="menu">${svg("more")}</button></div>
      </div>`;
    }).join("")}</div>`;
  }

  /* ---------- wallet: accounts, goals and people ---------- */
  function renderWallet() {
    const bal = balances(), ppl = people(), wo = worth(bal, ppl);
    const live = state.accounts.filter((a) => !a.archived);
    const accts = live.filter((a) => a.type !== "goal"), goals = live.filter((a) => a.type === "goal");
    const archived = state.accounts.filter((a) => a.archived);
    const targets = sum(goals.map((a) => a.target));
    const prow = (p) => {
      const tone = p.balance > 0 ? "in" : p.balance < 0 ? "warn" : "";
      const text = p.balance > 0 ? `Owes you ${money(p.balance)}` : p.balance < 0 ? `You owe ${money(-p.balance)}` : "Settled up";
      const initials = p.name.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join("").toUpperCase();
      const ds = debtStatus(p), dueText = ds ? debtText(ds) || `Due ${fDate(p.due)}` : "";
      return `<div class="prow"><button type="button" class="pmain" data-act="person" data-k="${esc(p.key)}" aria-label="${esc(`${p.name}. ${text}${dueText ? `. ${dueText}` : ""}. Show history`)}"><span class="avatar" aria-hidden="true">${esc(initials)}</span><span class="min0"><span class="item-title">${esc(p.name)}</span><span class="item-meta">${plural(p.count, "entry", "entries")} · last ${esc(fDate(p.last))}</span></span></button>${dueText ? `<span class="pill ${ds.overdue ? "overdue" : ds.soon ? "soon" : "paused"}">${esc(dueText)}</span>` : ""}<span class="p-bal ${tone}">${esc(text)}</span>${p.balance ? `<button type="button" class="btn small" data-act="settle" data-k="${esc(p.key)}">Settle up</button>` : ""}</div>`;
    };
    $("#view-wallet").innerHTML = `<div class="wrap view-body">
      <header class="view-head"><div><p class="eyebrow">Wallet · Net worth</p><h1 class="large-title">${esc(signed(wo.net))}</h1><p class="view-sub">Everything in your accounts and goals, plus what you're owed, minus what you owe.</p></div></header>
      <div class="kpis">
        ${kpi("In accounts and goals", W(wo.assets), `${plural(accts.length, "account")} and ${plural(goals.length, "goal")}`)}
        ${kpi("You owe", W(wo.debts + wo.owe), wo.debts + wo.owe > 0 ? [wo.debts > 0 ? `${W(wo.debts)} on cards and overdrafts` : "", wo.owe > 0 ? `${W(wo.owe)} to people` : ""].filter(Boolean).join(", ") : "Nothing. Nice.", wo.debts + wo.owe > 0 ? "warn" : "")}
        ${kpi("Owed to you", W(wo.owed), wo.owed > 0 ? `By ${plural(ppl.filter((p) => p.balance > 0).length, "person", "people")}` : "Nobody owes you", wo.owed > 0 ? "good" : "")}
        ${kpi("Saved in goals", W(wo.goals), targets > 0 ? `${Math.round((wo.goals / targets) * 100)}% of ${W(targets)} in targets` : "No goals yet")}
      </div>
      <section class="sec"><div class="sec-head"><div><h2>Accounts</h2><p>Where your money sits. Tap one to edit it or see its activity.</p></div><button type="button" class="btn" data-act="add-acct">${svg("plus")}Add account</button></div>
        ${accts.length ? `<div class="acct-grid">${accts.map((a) => acctCard(a, bal.get(a.id) || 0)).join("")}</div>` : `<div class="empty"><h3>No accounts</h3><p>Add the places you keep money: cash, a bank account, a card.</p></div>`}</section>
      <section class="sec"><div class="sec-head"><div><h2>Goals</h2><p>Money you're putting aside for something. Add to a goal with a transfer.</p></div><button type="button" class="btn" data-act="add-goal">${svg("plus")}Add goal</button></div>
        ${goals.length ? `<div class="acct-grid">${goals.map((a) => goalCard(a, bal.get(a.id) || 0)).join("")}</div>` : `<div class="empty"><h3>Saving for something?</h3><p>Set a target, move money into it when you can, and watch it fill up.</p><button type="button" class="btn primary" data-act="add-goal">${svg("plus")}Add goal</button></div>`}</section>
      <section class="sec"><div class="sec-head"><div><h2>People</h2><p>Money you've lent or borrowed. It stays out of your spending and income.</p></div><button type="button" class="btn" data-act="lend">${svg("plus")}Lent or borrowed</button></div>
        ${ppl.length ? `<div class="list">${ppl.map(prow).join("")}</div>` : `<div class="empty"><h3>Nobody owes anybody</h3><p>When you lend or borrow money, add it here and settle up later.</p></div>`}</section>
      ${archived.length ? `<section class="sec"><div class="sec-head"><div><h2>Archived</h2><p>Hidden from pickers, still counted in your totals.</p></div></div><div class="list">${archived.map((a) => `<div class="prow"><span class="pmain static"><span class="ico" style="--c:${acctColor(a)}">${svg((ACCT[a.type] || ACCT.bank).icon)}</span><span class="min0"><span class="item-title">${esc(a.name)}</span><span class="item-meta">${esc((ACCT[a.type] || ACCT.bank).label)}</span></span></span><span class="p-bal">${esc(balText(a, bal.get(a.id) || 0))}</span><button type="button" class="btn small" data-act="restore-acct" data-id="${esc(a.id)}">Restore</button></div>`).join("")}</div></section>` : ""}
    </div>`;
  }

