  /* Money in against money out, month by month. Two series, so it carries a legend and a table. */
  function flowChart(months, mt) {
    const inc = mt.map((x) => x.income), out = mt.map((x) => Math.max(0, x.spent));
    const { top, step } = niceScale(Math.max(...inc, ...out));
    let grid = "";
    for (let v = 0; v <= top + step / 2; v += step) grid += `<div class="gl" style="bottom:${(v / top) * 100}%"><span>${esc(compact(v))}</span></div>`;
    const h = (v) => (v > 0 ? Math.max(1.5, (v / top) * 100) : 0);
    const cols = months.map((mm, i) => `<div class="col pair" data-tip="${esc(`${fMonth(mm)} · In ${money(inc[i])} · Spent ${money(out[i])}`)}"><div class="bar b-in" style="height:${h(inc[i])}%"></div><div class="bar b-out" style="height:${h(out[i])}%"></div></div>`).join("");
    const rows = months.map((mm, i) => `<tr><td>${esc(fMonth(mm))}</td><td>${esc(money(inc[i]))}</td><td>${esc(money(out[i]))}</td><td>${esc(signed(mt[i].net))}</td></tr>`).join("");
    return `<div class="legend" aria-hidden="true"><span><i class="k-in"></i>Came in</span><span><i class="k-out"></i>Spent</span></div>
      <div class="vchart flow" role="img" aria-label="${esc(`Money in and money spent for the six months to ${fMonth(months[5])}: ${months.map((mm, i) => `${fMon(mm)} in ${W(inc[i])}, spent ${W(out[i])}`).join("; ")}.`)}"><div class="plot">${grid}<div class="cols">${cols}</div></div><div class="xl" aria-hidden="true">${months.map((mm) => `<span>${esc(fMon(mm))}</span>`).join("")}</div></div>
      <details class="tbl wide"><summary>Show monthly amounts</summary><div class="tbl-scroll"><table><thead><tr><th>Month</th><th>Came in</th><th>Spent</th><th>Kept</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
  /* Budgets for a month, each with markers at 50% and 80%. */
  function budgetRows(m) {
    const rows = budgetStatus(m);
    if (!rows.length) return `<p class="hint">No budgets yet. Set a limit for the month or for single categories and you'll see how you're doing here.</p>`;
    const prevName = fMonthName(addMonths(m, -1));
    return `<div class="brows">${rows.map((b) => {
      const left = round2(b.total - b.spent), pct = Math.max(0, Math.min(100, b.pct));
      const tone = b.level >= 100 ? "bad" : b.level >= 80 ? "warn" : "";
      return `<div class="brow"><div class="brow-top"><span class="brow-name">${b.color ? `<i style="background:${b.color}"></i>` : ""}${esc(b.name === "Monthly budget" ? "Whole month" : b.name)}</span><span class="brow-val"><b>${esc(W(b.spent))}</b> of ${esc(W(b.total))}</span></div>
        <span class="meter marks ${tone}" role="img" aria-label="${Math.round(b.pct)}% used"><i style="width:${pct}%"></i></span>
        <span class="brow-note ${tone}">${left < 0 ? `Over by ${esc(W(-left))}` : `${esc(W(left))} left`}${b.carry ? ` · includes ${esc(W(b.carry))} carried over from ${esc(prevName)}` : ""}</span></div>`;
    }).join("")}</div>`;
  }
  function hbarList(items, total, nameOf, colorOf, act) {
    const max = items[0]?.total || 1;
    return `<div class="hbars">${items.map((x) => {
      const pct = total > 0 ? (x.total / total) * 100 : 0;
      return `<button type="button" class="hbar" ${act(x)} data-tip="${esc(`${nameOf(x)} · ${plural(x.count, "expense")}`)}"><span class="hbar-name"><i style="background:${colorOf(x)}"></i>${esc(nameOf(x))}</span><span class="hbar-track"><span class="hbar-fill" style="width:${(x.total / max) * 100}%"></span></span><span class="hbar-val">${esc(W(x.total))}<small>${pct > 0 && pct < 1 ? "<1" : Math.round(pct)}%</small></span></button>`;
    }).join("")}</div>`;
  }

  /* ---------- insights: a report for a week, a month or a year ---------- */
  function renderInsights() {
    const p = ui.insPeriod, t = todayISO(), r = periodRange(p, ui.anchor), isCur = inPeriod(p, ui.anchor);
    const m = monthOf(ui.anchor);
    const list = entriesBetween(r.from, r.to);
    const { spent, income, net } = totals(list);
    const span = daysBetween(r.from, r.to) + 1;
    const elapsed = isCur ? daysBetween(r.from, t) + 1 : r.to < t ? span : 0;
    const pr = periodRange(p, stepAnchor(p, ui.anchor, -1));
    const prev = totals(entriesBetween(pr.from, isCur ? addDays(pr.from, elapsed - 1) : pr.to)).spent;
    const change = prev > 0 ? (spent - prev) / prev : null;
    const prevName = p === "week" ? (isCur ? "last week" : "the week before") : p === "year" ? pr.from.slice(0, 4) : fMonthName(monthOf(pr.from));
    const cats = catTotals(list), methods = methodTotals(list);
    const B = budgetFor(m);
    const nIncome = list.filter((e) => e.type === "income").length;
    const changeText = change === null ? "Nothing to compare" : `${change > 0 ? "▲" : change < 0 ? "▼" : ""} ${Math.abs(Math.round(change * 100))}%`;

    // The spending chart: days for a week or a month, months for a year
    let chart;
    if (p === "year") {
      const months = Array.from({ length: 12 }, (_, i) => `${r.from.slice(0, 4)}-${pad(i + 1)}`);
      const vals = months.map((mm) => Math.max(0, totals(entriesIn(mm)).spent));
      const peak = vals.reduce((bi, v, i) => (v > vals[bi] ? i : bi), 0);
      chart = { title: "Month by month", sub: `What you spent each month in ${r.from.slice(0, 4)}.${state.settings.budget > 0 ? " The dashed line is your monthly budget." : ""}`, html: vchart({
        values: vals, labels: months.map(fMon), tips: months.map((mm, i) => `${fMonth(mm)} · ${money(vals[i])}`), showLabel: () => true,
        ref: state.settings.budget || 0, refLabel: "", aria: `Spending each month in ${r.from.slice(0, 4)}. The highest was ${fMonth(months[peak])} at ${money(vals[peak])}.`,
      }), rows: months.map((mm, i) => [fMonth(mm), vals[i]]) };
    } else {
      const dates = Array.from({ length: span }, (_, i) => addDays(r.from, i));
      const byDay = new Map(dates.map((d) => [d, 0]));
      for (const e of list) byDay.set(e.date, (byDay.get(e.date) || 0) + spendOf(e));
      const vals = dates.map((d) => Math.max(0, round2(byDay.get(d))));
      const peak = vals.reduce((bi, v, i) => (v > vals[bi] ? i : bi), 0);
      const daily = B.total > 0 ? B.total / daysInMonth(m) : 0;
      chart = { title: "Day by day", sub: `What you spent each day${p === "week" ? " this week" : ` in ${fMonthName(m)}`}.${daily ? " The dashed line is your budget split evenly across the month." : ""}`, html: vchart({
        values: vals, labels: dates.map((d) => (p === "week" ? DF.wd.format(parseISO(d)) : String(Number(d.slice(8))))),
        tips: dates.map((d, i) => `${fDay(d)} · ${money(vals[i])}`), showLabel: (i) => p === "week" || i === 0 || (i + 1) % 5 === 0,
        ref: daily, refLabel: daily ? `Even share ${W(daily)} a day` : "", aria: `Daily spending for ${periodLabel(p, ui.anchor)}. The highest day was ${fDate(dates[peak])} at ${money(vals[peak])}.`,
      }), rows: dates.filter((d, i) => vals[i] > 0).map((d) => [fDay(d), Math.max(0, round2(byDay.get(d)))]) };
    }
    const flowMonths = p === "year" ? Array.from({ length: 12 }, (_, i) => `${r.from.slice(0, 4)}-${pad(i + 1)}`) : Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
    const flowTotals = flowMonths.map((mm) => totals(entriesIn(mm)));

    let body;
    if (!list.length) {
      body = `<div class="empty"><h3>Nothing to chart for ${esc(periodLabel(p, ui.anchor))}</h3><p>Once you add entries for this ${PERIOD_WORD[p]}, you'll see your spending by day and category, budgets, payment methods and how it compares with before.</p><button type="button" class="btn primary" data-act="add-entry">${svg("plus")}Add entry</button></div>`;
    } else {
      const catBars = cats.length ? hbarList(cats, spent, (x) => catById(x.id).name, (x) => catById(x.id).color, (x) => `data-act="go-cat" data-cat="${esc(x.id)}"`) : `<p class="hint">No spending logged.</p>`;
      const methodBars = methods.length ? hbarList(methods, spent, (x) => METHODS[x.id] || "Other", (x) => METHOD_COLORS[x.id] || "#52525B", (x) => `data-act="go-method" data-k="${esc(x.id)}"`) : `<p class="hint">No spending logged.</p>`;
      body = `<div class="insights">
        <section class="card span2"><div class="card-head"><h3>${chart.title}</h3><p>${esc(chart.sub)}</p></div>${chart.html}
          <details class="tbl"><summary>Show the amounts</summary><div class="tbl-scroll"><table><thead><tr><th>${p === "year" ? "Month" : "Day"}</th><th>Spent</th></tr></thead><tbody>${chart.rows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(money(v))}</td></tr>`).join("")}</tbody></table></div></details></section>
        <section class="card"><div class="card-head"><h3>By category</h3><p>Tap a category to see its entries.</p></div>${catBars}</section>
        <section class="card"><div class="card-head split"><div><h3>Budgets</h3><p>${p === "month" ? `How ${esc(fMonthName(m))} compares with the limits you set.` : `Budgets are monthly. This is ${esc(fMonthName(m))}.`}</p></div><button type="button" class="btn small" data-act="budgets">Edit budgets</button></div>${budgetRows(m)}</section>
        <section class="card"><div class="card-head"><h3>By payment method</h3><p>How you paid: UPI, cards, cash and the rest.</p></div>${methodBars}</section>
        <section class="card"><div class="card-head"><h3>In and out</h3><p>What came in and what you spent ${p === "year" ? `each month of ${esc(r.from.slice(0, 4))}` : `over six months, ending with ${esc(fMonthName(m))}`}.</p></div>${flowChart(flowMonths, flowTotals)}</section>
      </div>`;
    }
    const seg = (k, l) => `<button type="button" data-act="ins-period" data-k="${k}" aria-pressed="${p === k}">${l}</button>`;
    $("#view-insights").innerHTML = `<div class="wrap view-body">
      <header class="view-head"><div><p class="eyebrow">Insights</p><h1 class="large-title">${esc(periodLabel(p, ui.anchor))}</h1></div>
        <div class="head-tools"><button type="button" class="btn" data-act="export-menu" aria-haspopup="menu">${svg("download")}Export</button><div class="seg" role="group" aria-label="Report period">${seg("week", "Week")}${seg("month", "Month")}${seg("year", "Year")}</div>${periodNav(p)}</div></header>
      <div class="kpis">
        ${kpi("Spent", W(Math.max(0, spent)), elapsed ? `${W(Math.max(0, spent) / elapsed)} a day on average` : `This ${PERIOD_WORD[p]} hasn't started`)}
        ${kpi("Came in", W(income), nIncome ? plural(nIncome, "income entry", "income entries") : "No income logged")}
        ${income > 0 ? kpi(net >= 0 ? "Kept" : "Short by", W(Math.abs(net)), net >= 0 ? `A savings rate of ${Math.round((net / income) * 100)}%` : "You spent more than came in", net >= 0 ? "good" : "bad") : kpi("Kept", "None yet", "Add income to see your savings rate")}
        ${kpi(`Spending against ${prevName}`, changeText, change === null ? `Nothing logged for ${prevName}` : isCur ? `${W(prev)} at the same point` : `${W(prev)} in ${prevName}`, change === null ? "" : change > 0.05 ? "warn" : change < -0.05 ? "good" : "")}
      </div><div class="insights smart">${smartSection(p)}</div>${body}</div>`;
  }

