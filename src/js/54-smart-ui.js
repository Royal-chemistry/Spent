  /* ================= smart features on screen ================= */
  const TONE = { bad: ["alert", "Needs attention"], warn: ["bell", "Heads up"], info: ["spark", "Worth knowing"], good: ["check", "Good news"] };
  Object.assign(ICONS, { spark: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.5l-1.8-5.8L4.5 10.8 10.2 9z"/>', heart: '<path d="M20.4 8.7c0 5-8.4 10.8-8.4 10.8S3.6 13.7 3.6 8.7A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.4 2.1z"/>' });

  function insightCard(x) {
    const [icon, label] = TONE[x.tone];
    const tag = x.act ? "button" : "div";
    return `<${tag}${x.act ? ` type="button" ${x.act}` : ""} class="insight t-${x.tone}">
      <span class="insight-tag">${svg(icon)}${label}</span>
      <span class="insight-title">${esc(x.title)}</span>
      <span class="insight-body">${esc(x.body)}</span>
      ${x.how ? `<span class="insight-how">${esc(x.how)}</span>` : ""}
    </${tag}>`;
  }
  /* The score as a ring, drawn to scale: the arc covers score/100 of the circle. */
  function scoreRing(score, size = 132) {
    const r = 52, c = 2 * Math.PI * r, f = score === null ? 0 : score / 100;
    const tone = score === null ? "none" : score >= 80 ? "good" : score >= 60 ? "ok" : score >= 40 ? "warn" : "bad";
    return `<svg class="ring ring-${tone}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${score === null ? "No score yet" : `Score ${score} out of 100`}">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line-strong)" stroke-width="10"/>
      <circle class="ring-arc" cx="60" cy="60" r="${r}" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" class="ring-num">${score === null ? "–" : score}</text>
      <text x="60" y="80" text-anchor="middle" class="ring-of">out of 100</text></svg>`;
  }
  function healthCard(h) {
    const parts = h.parts.map((p) => `<div class="hpart${p.pts === null ? " none" : ""}">
        <div class="hpart-top"><span class="hpart-name">${esc(p.name)}</span><span class="hpart-pts">${p.pts === null ? "Not scored" : `${Math.round(p.pts)} / 20`}</span></div>
        <span class="meter${p.pts === null ? "" : p.pts >= 16 ? " good" : p.pts >= 8 ? " warn" : " bad"}" role="img" aria-label="${p.pts === null ? "Not scored" : `${Math.round(p.pts)} of 20 points`}"><i style="width:${p.pts === null ? 0 : (p.pts / 20) * 100}%"></i></span>
        <span class="hpart-value">${esc(p.value)}</span>
        ${p.tip ? `<span class="hpart-tip">${esc(p.tip)}</span>` : ""}
      </div>`).join("");
    const how = h.parts.map((p) => `<li><b>${esc(p.name)}.</b> ${esc(p.how)}</li>`).join("");
    return `<section class="card health span2" aria-label="Money health score">
      <div class="health-top">
        ${scoreRing(h.score)}
        <div class="health-sum"><p class="eyebrow">Money health</p><h3>${esc(h.label)}</h3>
          <p>${h.score === null ? "Add a few weeks of entries, with your income, to see a score." : h.tips.length ? `To improve it: ${esc(h.tips.map((t) => t.tip.replace(/\.$/, "")).join(". "))}.` : "Everything we can measure looks healthy. Keep it up."}</p>
          <p class="hint">This isn't a credit score. It's worked out only from what you've entered in Spent${h.partial ? ", and for now only from this month so far" : `, over the last ${plural(h.months, "month")}`}. Nothing is sent anywhere.</p></div>
      </div>
      <div class="hparts">${parts}</div>
      <details class="tbl"><summary>How the score is worked out</summary><ul class="how-list"><li>Five parts, each scored out of 20. Parts without enough data are left out and the rest are scaled to 100.</li>${how}</ul></details>
    </section>`;
  }
  /* Home: the score and the top few insights */
  function forYouRow() {
    const h = healthScore(), list = findInsights().slice(0, 4);
    if (h.score === null && !list.length) return "";
    const scoreTile = `<button type="button" class="tile score-tile" data-act="go-health">${scoreRing(h.score, 64)}<span class="min0"><span class="tile-title">Money health: ${esc(h.label)}</span><span class="tile-meta">${h.tips[0] ? esc(h.tips[0].name) + " has the most room to improve" : "See how it's worked out"}</span></span></button>`;
    const tiles = list.map((x) => `<button type="button" class="tile insight-tile t-${x.tone}" ${x.act || 'data-act="go-insights"'}><span class="insight-tag">${svg(TONE[x.tone][0])}${TONE[x.tone][1]}</span><span class="tile-title">${esc(x.title)}</span><span class="tile-meta">${esc(x.body)}</span></button>`).join("");
    return row("For you", "#insights", "All insights", scoreTile + tiles);
  }
  /* Insights page: the score, then what stands out this month */
  function smartSection(p) {
    const h = healthScore();
    const m = monthOf(ui.anchor);
    const list = p === "month" ? findInsights(m) : [];
    return `${healthCard(h)}${p === "month" ? `<section class="card span2" aria-label="What stands out"><div class="card-head"><h3>What stands out</h3><p>Worked out from your own entries for ${esc(fMonth(m))}. Each one says how.</p></div>${list.length ? `<div class="insight-grid">${list.map(insightCard).join("")}</div>` : `<p class="hint">Nothing unusual this month. Insights appear as patterns show up in your entries.</p>`}</section>` : ""}`;
  }
  /* Home quick add */
  function quickForm() {
    return `<form class="quick" id="quick-form" autocomplete="off" aria-label="Quick add">
      <label class="quick-field"><span class="sr">Type an entry</span>${svg("spark")}<input id="quick-input" placeholder="Type it: “Spent ₹250 on food today”" maxlength="160" aria-describedby="quick-preview"></label>
      <button type="submit" class="btn primary">${svg("plus")}Add</button>
      <p class="quick-preview" id="quick-preview" aria-live="polite">Write it the way you'd say it. You can add the date, how you paid, or who you lent money to.</p>
    </form>`;
  }
  function quickAdd(text) {
    const q = parseQuick(text);
    const T = TYPES[q.type];
    const complete = q.amount > 0 && !q.cur && (!T.person || q.person) && (q.type !== "transfer" || (q.account && q.to && q.account !== q.to));
    const preset = { type: q.type, amount: q.amount || "", title: q.title, category: q.category, date: q.date, account: q.account, to: q.to, person: q.person, method: q.method, cur: q.cur };
    if (!complete) { entryForm(null, preset); return false; }
    const live = state.accounts.filter((a) => !a.archived);
    const account = q.account || (live.find((a) => a.id === ui.lastAccount) || live.find((a) => a.type !== "goal") || live[0] || {}).id;
    if (!account) { entryForm(null, preset); return false; }
    const kind = T.cat;
    const category = kind ? q.category || (state.categories.find((c) => c.id === ui.lastCat[kind] && c.kind === kind) || state.categories.find((c) => c.kind === kind && /^other/.test(c.id)) || {}).id || "" : "";
    const e = {
      id: uid(), type: q.type, title: q.title, amount: q.amount, category, date: q.date, account, to: q.type === "transfer" ? q.to : "", person: T.person ? q.person : "", note: "",
      recurringId: null, method: q.type === "transfer" ? "" : q.method || methodFor(acctById(account)?.type, state.settings.currency), due: "", cur: "", orig: 0, rate: 0,
    };
    const m = monthOf(e.date), before = budgetStatus(m);
    state.entries.push(e); const after = budgetStatus(m); state.entries.pop();
    const crossed = state.settings.alerts ? crossedLevels(before, after).sort((a, b) => b.level - a.level) : [];
    withUndo(() => { state.entries.push(e); }, crossed.length ? `${entryTitle(e)} added. ${levelText(crossed[0])}` : `${entryTitle(e)}, ${money(e.amount)}, added`);
    return true;
  }

