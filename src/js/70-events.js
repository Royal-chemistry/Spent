  /* ================= routing and events ================= */
  function route() {
    let h = location.hash.slice(1);
    if (h === "expenses") h = "activity"; // links from the first version
    const v = VIEWS.includes(h) ? h : "home";
    const changed = v !== ui.view;
    ui.view = v;
    for (const id of VIEWS) $("#view-" + id).hidden = id !== v;
    $$("[data-view]").forEach((a) => { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    closeMenu(); hideTip();
    render();
    onScroll();
    if (changed) window.scrollTo(0, 0);
  }
  const topbar = $("#topbar");
  function onScroll() { topbar.classList.toggle("scrolled", window.scrollY > 8 || ui.view !== "home"); }
  window.addEventListener("scroll", () => { onScroll(); hideTip(); if (menuEl) closeMenu(); }, { passive: true });
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => { $$(".row-track").forEach((tr) => tr._upd?.()); hideTip(); closeMenu(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && $("#sheet").hidden) { render(); runAuto(); checkReminders(); } });
  const setTopH = () => rootEl.style.setProperty("--top-h", topbar.offsetHeight + "px");
  try { new ResizeObserver(setTopH).observe(topbar); } catch { window.addEventListener("resize", setTopH); }
  setTopH();

  function setMonth(m) { ui.month = m; render(); }
  function showActivity({ account = "", person = "", cat = "all", month = "", method = "", period = "month" } = {}) {
    Object.assign(ui, { actAccount: account, actPerson: person, actCat: cat, actMethod: method, actType: "all", actQuery: "", actView: "list", actPeriod: account || person ? "all" : period });
    if (month) ui.month = month;
    if (location.hash === "#activity") route(); else location.hash = "activity";
  }
  /* What a new entry should start as, given what the person is looking at. */
  function addPreset() {
    const p = {}, cur = monthOf(todayISO());
    if (ui.view === "activity") {
      if (ui.actPeriod !== "all" && !inPeriod(ui.actPeriod, ui.anchor)) p.date = periodRange(ui.actPeriod, ui.anchor).from;
      if (ui.actMethod) p.method = ui.actMethod;
      if (ui.actType === "people") p.type = "lent"; else if (ui.actType !== "all") p.type = ui.actType;
      if (ui.actCat !== "all") p.category = ui.actCat;
      if (ui.actAccount) p.account = ui.actAccount;
      if (ui.actPerson) { p.type = "lent"; p.person = people().find((x) => x.key === ui.actPerson)?.name || ""; }
    } else if (ui.view === "insights" && !inPeriod(ui.insPeriod, ui.anchor)) p.date = periodRange(ui.insPeriod, ui.anchor).from;
    return p;
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-sheet-close]")) { closeSheet(); return; }
    if (e.target.closest("[data-sheet-del]")) { sheetDelete?.(); return; }
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const id = el.dataset.id, k = el.dataset.k;
    const rec = () => state.recurring.find((r) => r.id === id);
    const acct = () => state.accounts.find((a) => a.id === id);
    switch (el.dataset.act) {
      case "sheet": sheetAct?.(k, el); break;
      case "add-entry": entryForm(null, addPreset()); break;
      case "edit-entry": { const x = state.entries.find((v) => v.id === id); if (x) entryForm(x); break; }
      case "add-rec": recurringForm(); break;
      case "edit-rec": { const r = rec(); if (r) recurringForm(r); break; }
      case "pay": { const r = rec(); if (r) payForm(r); break; }
      case "toggle-rec": toggleRecurring(id); break;
      case "rec-menu": {
        const r = rec(); if (!r) break;
        openMenu(el, [
          { label: "History", icon: "clock", run: () => historySheet(r) },
          { label: "Edit", icon: "edit", run: () => recurringForm(r) },
          { label: r.active === false ? "Resume" : "Pause", icon: r.active === false ? "play" : "pause", run: () => toggleRecurring(r.id) },
          { label: "Delete", icon: "trash", danger: true, run: () => deleteRecurring(r.id) },
        ]);
        break;
      }
      case "settings": settingsSheet(); break;
      case "budgets": budgetSheet(); break;
      case "add-acct": accountForm(null, false); break;
      case "add-goal": accountForm(null, true); break;
      case "edit-acct": { const a = acct(); if (a) accountForm(a); break; }
      case "fund": entryForm(null, { type: "transfer", to: id }); break;
      case "acct-activity": closeSheet(); showActivity({ account: id }); break;
      case "restore-acct": { const a = acct(); if (a) { a.archived = false; commit(); toast(`${a.name} restored`); } break; }
      case "person": showActivity({ person: k }); break;
      case "settle": {
        const p = people().find((x) => x.key === k);
        if (p && p.balance) entryForm(null, { type: p.balance > 0 ? "collected" : "repaid", person: p.name, amount: Math.abs(p.balance) });
        break;
      }
      case "lend": entryForm(null, { type: "lent" }); break;
      case "import": importSheet(); break;
      case "install": installApp(); break;
      case "export-menu": {
        const what = periodLabel(ui.insPeriod, ui.anchor);
        openMenu(el, [
          { label: `PDF report for ${what}`, icon: "download", run: () => runExport("pdf") },
          { label: `Excel workbook for ${what}`, icon: "download", run: () => runExport("xlsx") },
          { label: `CSV of entries for ${what}`, icon: "download", run: () => runExport("csv") },
        ]);
        break;
      }
      case "go-insights": if (location.hash === "#insights") route(); else location.hash = "insights"; break;
      case "go-health": ui.insPeriod = "month"; ui.anchor = todayISO(); if (location.hash === "#insights") route(); else location.hash = "insights"; setTimeout(() => $(".health")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 60); break;
      case "go-subs": ui.recFilter = "subs"; ui.recQuery = ""; if (location.hash === "#recurring") route(); else location.hash = "recurring"; break;
      case "go-calendar": ui.actPeriod = "month"; ui.actView = "calendar"; ui.anchor = todayISO(); if (location.hash === "#activity") route(); else location.hash = "activity"; break;
      case "start-fresh": startFresh("Sample data cleared. Add your first entry when you're ready"); break;
      case "hide-banner": ui.bannerHidden = true; renderBanner(); break;
      case "month-prev": setMonth(addMonths(ui.month, -1)); break;
      case "month-next": setMonth(addMonths(ui.month, 1)); break;
      case "month-now": setMonth(monthOf(todayISO())); break;
      case "act-type": ui.actType = k; if (k !== "all" && k !== "expense") ui.actCat = "all"; renderActivity(); break;
      case "act-cat": ui.actCat = ui.actCat === el.dataset.cat ? "all" : el.dataset.cat; if (ui.actCat !== "all" && ui.actType !== "expense") ui.actType = "all"; renderActivity(); break;
      case "act-period": ui.actPeriod = PERIODS[k] ? k : "month"; renderActivity(); break;
      case "act-view": ui.actView = k === "calendar" ? "calendar" : "list"; if (ui.actView === "calendar") ui.actPeriod = "month"; renderActivity(); break;
      case "cal-day": ui.anchor = el.dataset.d; ui.actPeriod = "day"; ui.actView = "list"; renderActivity(); break;
      case "ins-period": ui.insPeriod = ["week", "month", "year"].includes(k) ? k : "month"; renderInsights(); break;
      case "period-prev": case "period-next": ui.anchor = stepAnchor(el.dataset.p, ui.anchor, el.dataset.act === "period-next" ? 1 : -1); render(); break;
      case "period-now": ui.anchor = todayISO(); render(); break;
      case "go-method": showActivity({ method: k, period: ui.view === "insights" ? ui.insPeriod : "month" }); break;
      case "act-clear-acct": ui.actAccount = ""; renderActivity(); break;
      case "act-clear-person": ui.actPerson = ""; renderActivity(); break;
      case "clear-filters": Object.assign(ui, { actType: "all", actCat: "all", actQuery: "", actAccount: "", actPerson: "", actMethod: "" }); renderActivity(); break;
      case "rec-filter": ui.recFilter = el.dataset.f; renderRecurring(); break;
      case "clear-rec-filters": ui.recFilter = "all"; ui.recQuery = ""; renderRecurring(); break;
      case "go-cat": showActivity({ cat: el.dataset.cat, month: ui.view === "home" ? monthOf(todayISO()) : "", period: ui.view === "insights" ? ui.insPeriod : "month" }); break;
      case "row-prev": case "row-next": {
        const tr = el.parentElement.querySelector(".row-track");
        tr.scrollBy({ left: (el.dataset.act === "row-next" ? 1 : -1) * tr.clientWidth * 0.82, behavior: reduced ? "auto" : "smooth" });
        break;
      }
      case "add-cat": addCategory(); break;
      case "del-cat": removeCategory(el.dataset.cat); break;
      case "export-csv": saveFile(`spent-entries-${stamp()}.csv`, toCSV(), "text/csv"); break;
      case "backup": saveFile(`spent-backup-${stamp()}.json`, JSON.stringify({ app: "Spent", exported: new Date().toISOString(), ...state }, null, 2), "application/json"); break;
      case "erase": confirmBox(state.sample ? "Clear the sample data and start with an empty tracker?" : "Erase every entry, account and recurring item? You can undo this for a few seconds afterwards.", state.sample ? "Clear sample data" : "Erase everything", () => { startFresh(state.sample ? "Sample data cleared" : "Everything erased"); closeSheet(); }); break;
      default: break;
    }
  });
  $("#scrim").addEventListener("click", closeSheet);
  $("#sheet-card").addEventListener("submit", (e) => {
    e.preventDefault();
    if (sheetSubmit) { if (sheetSubmit() === false) return; }
    closeSheet();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "quick-form") return;
    e.preventDefault();
    const input = $("#quick-input"), text = input.value.trim();
    if (!text) { input.focus(); return; }
    if (quickAdd(text)) input.value = "";
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "quick-input") {
      const q = parseQuick(e.target.value), out = $("#quick-preview");
      if (out) out.textContent = !e.target.value.trim() ? "Write it the way you'd say it. You can add the date, how you paid, or who you lent money to." : q.amount ? `${quickSummary(q)}${TYPES[q.type].person && !q.person ? ". Add who it's with." : ""}` : "Add an amount, like ₹250.";
    }
    if (e.target.id === "act-search") { ui.actQuery = e.target.value; renderActList(); }
    else if (e.target.id === "rec-search") { ui.recQuery = e.target.value; renderRecList(); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "act-sort") { ui.actSort = e.target.value; renderActList(); }
    else if (e.target.id === "act-method") { ui.actMethod = e.target.value; renderActivity(); }
    else if (e.target.id === "rec-sort") { ui.recSort = e.target.value; renderRecList(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (menuEl) { closeMenu(); return; } if (!$("#sheet").hidden) { closeSheet(); return; } }
    if (!$("#sheet").hidden) {
      if (e.key === "Tab") {
        const f = $$("#sheet-card button, #sheet-card input, #sheet-card select, #sheet-card textarea").filter((x) => !x.disabled && x.getClientRects().length && !(x.type === "radio" && !x.checked));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); entryForm(null, addPreset()); }
    else if (e.key === "/") { const s = $(".view:not([hidden]) input[type=search]"); if (s) { e.preventDefault(); s.focus(); } }
  });
  document.addEventListener("pointerover", (e) => { const t = e.target.closest?.("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("pointerout", (e) => { const t = e.target.closest?.("[data-tip]"); if (t && !t.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest?.("[data-tip]"); if (t) showTip(t); else hideTip(); });

  /* ================= start ================= */
  $$("[data-icon]").forEach((el) => { const s = svg(el.dataset.icon); if (el.tagName === "I") el.outerHTML = s; else el.innerHTML = s; });
  applyTheme();
  route();
  setSync("local");
  runAuto();
  initCloud();
  syncReminders().then(checkReminders);
