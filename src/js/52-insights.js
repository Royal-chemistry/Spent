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
  function budgetRows(cats, spent) {
    const budget = state.settings.budget;
    const spentBy = new Map(cats.map((c) => [c.id, c.total]));
    const line = (name, color, sp, bud) => {
      const left = round2(bud - sp), pct = Math.max(0, Math.min(100, (sp / bud) * 100));
      const tone = left < 0 ? "bad" : pct >= 85 ? "warn" : "";
      return `<div class="brow"><div class="brow-top"><span class="brow-name">${color ? `<i style="background:${color}"></i>` : ""}${esc(name)}</span><span class="brow-val"><b>${esc(W(sp))}</b> of ${esc(W(bud))}</span></div><span class="meter ${tone}" role="img" aria-label="${Math.round((sp / bud) * 100)}% used"><i style="width:${pct}%"></i></span><span class="brow-note ${tone}">${left < 0 ? `Over by ${esc(W(-left))}` : `${esc(W(left))} left`}</span></div>`;
    };
    const lines = [];
    if (budget > 0) lines.push(line("Whole month", "", Math.max(0, spent), budget));
    for (const c of state.categories) if (c.kind === "expense" && c.budget > 0) lines.push(line(c.name, c.color, spentBy.get(c.id) || 0, c.budget));
    return lines.length ? `<div class="brows">${lines.join("")}</div>` : `<p class="hint">No budgets yet. Set a limit for the month or for single categories and you'll see how you're doing here.</p>`;
  }

  /* ---------- insights ---------- */
  function renderInsights() {
    const m = ui.month, t = todayISO(), cur = monthOf(t), isCur = m === cur;
    const days = daysInMonth(m);
    const elapsed = isCur ? Number(t.slice(8)) : m < cur ? days : 0;
    const list = entriesIn(m);
    const { spent, income, net } = totals(list);
    const daily = Array.from({ length: days }, () => 0);
    for (const e of list) daily[Number(e.date.slice(8)) - 1] += spendOf(e);
    for (let i = 0; i < days; i++) daily[i] = Math.max(0, round2(daily[i]));
    const pm = addMonths(m, -1);
    const prev = totals(entriesIn(pm).filter((e) => !isCur || Number(e.date.slice(8)) <= elapsed)).spent;
    const change = prev > 0 ? (spent - prev) / prev : null;
    const cats = catTotals(list);
    const months = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
    const mt = months.map((mm) => totals(entriesIn(mm)));
    const budget = state.settings.budget;
    const changeText = change === null ? "Nothing to compare" : `${change > 0 ? "▲" : change < 0 ? "▼" : ""} ${Math.abs(Math.round(change * 100))}%`;
    const peak = daily.reduce((bi, v, i) => (v > daily[bi] ? i : bi), 0);
    const nIncome = list.filter((e) => e.type === "income").length;

    let body;
    if (!list.length) {
      body = `<div class="empty"><h3>Nothing to chart for ${esc(fMonthName(m))}</h3><p>Once you add entries for this month, you'll see daily spending, categories, budgets and how it compares with earlier months.</p><button type="button" class="btn primary" data-act="add-entry">${svg("plus")}Add entry</button></div>`;
    } else {
      const dailyChart = vchart({
        values: daily, labels: daily.map((_, i) => String(i + 1)),
        tips: daily.map((v, i) => `${fDay(`${m}-${pad(i + 1)}`)} · ${money(v)}`),
        showLabel: (i) => i === 0 || (i + 1) % 5 === 0,
        ref: budget > 0 ? budget / days : 0, refLabel: budget > 0 ? `Even share ${W(budget / days)} a day` : "",
        aria: `Daily spending in ${fMonth(m)}. The highest day was ${fDate(`${m}-${pad(peak + 1)}`)} at ${money(daily[peak])}.`,
      });
      const maxCat = cats[0]?.total || 1;
      const catBars = cats.length ? `<div class="hbars">${cats.map((ct) => {
        const c = catById(ct.id), pct = spent > 0 ? (ct.total / spent) * 100 : 0;
        return `<button type="button" class="hbar" data-act="go-cat" data-cat="${esc(c.id)}" data-tip="${esc(`${c.name} · ${plural(ct.count, "expense")}`)}"><span class="hbar-name"><i style="background:${c.color}"></i>${esc(c.name)}</span><span class="hbar-track"><span class="hbar-fill" style="width:${(ct.total / maxCat) * 100}%"></span></span><span class="hbar-val">${esc(W(ct.total))}<small>${pct > 0 && pct < 1 ? "<1" : Math.round(pct)}%</small></span></button>`;
      }).join("")}</div>` : `<p class="hint">No spending logged this month.</p>`;
      const dayRows = daily.map((v, i) => [i, v]).filter(([, v]) => v > 0).map(([i, v]) => `<tr><td>${esc(fDay(`${m}-${pad(i + 1)}`))}</td><td>${esc(money(v))}</td></tr>`).join("");
      body = `<div class="insights">
        <section class="card span2"><div class="card-head"><h3>Day by day</h3><p>What you spent each day in ${esc(fMonthName(m))}.${budget > 0 ? " The dashed line is your budget split evenly across the month." : ""}</p></div>${dailyChart}
          <details class="tbl"><summary>Show daily amounts</summary><div class="tbl-scroll"><table><thead><tr><th>Day</th><th>Spent</th></tr></thead><tbody>${dayRows}</tbody></table></div></details></section>
        <section class="card"><div class="card-head"><h3>By category</h3><p>Tap a category to see its entries.</p></div>${catBars}</section>
        <section class="card"><div class="card-head split"><div><h3>Budgets</h3><p>How ${esc(fMonthName(m))} compares with the limits you set.</p></div><button type="button" class="btn small" data-act="budgets">Edit budgets</button></div>${budgetRows(cats, spent)}</section>
        <section class="card span2"><div class="card-head"><h3>In and out</h3><p>What came in and what you spent over six months, ending with ${esc(fMonthName(m))}.</p></div>${flowChart(months, mt)}</section>
      </div>`;
    }
    $("#view-insights").innerHTML = `<div class="wrap view-body">
      <header class="view-head"><div><p class="eyebrow">Insights</p><h1 class="large-title">${esc(fMonth(m))}</h1></div>${monthNav()}</header>
      <div class="kpis">
        ${kpi("Spent", W(Math.max(0, spent)), elapsed ? `${W(Math.max(0, spent) / elapsed)} a day on average` : "This month hasn't started")}
        ${kpi("Came in", W(income), nIncome ? plural(nIncome, "income entry", "income entries") : "No income logged")}
        ${income > 0 ? kpi(net >= 0 ? "Kept" : "Short by", W(Math.abs(net)), net >= 0 ? `${Math.round((net / income) * 100)}% of what came in` : "You spent more than came in", net >= 0 ? "good" : "bad") : kpi("Kept", "None yet", "Add income to see what you keep")}
        ${kpi(`Spending against ${fMonthName(pm)}`, changeText, change === null ? `${fMonthName(pm)} had nothing logged` : isCur ? `${W(prev)} by day ${elapsed} last month` : `${W(prev)} in ${fMonthName(pm)}`, change === null ? "" : change > 0.05 ? "warn" : change < -0.05 ? "good" : "")}
      </div>${body}</div>`;
  }

