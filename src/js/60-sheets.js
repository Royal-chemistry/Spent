  /* ================= sheets ================= */
  let sheetSubmit = null, sheetDelete = null, sheetAct = null, lastFocus = null;
  function openSheet({ title, body, foot, onSubmit = null, onDelete = null, onMount = null, onAct = null }) {
    closeMenu();
    if ($("#sheet").hidden) lastFocus = document.activeElement;
    $("#sheet-title").textContent = title;
    $("#sheet-body").innerHTML = body;
    $("#sheet-foot").innerHTML = foot || "";
    $("#sheet-foot").hidden = !foot;
    sheetSubmit = onSubmit; sheetDelete = onDelete; sheetAct = onAct;
    $("#scrim").hidden = false; $("#sheet").hidden = false;
    document.body.classList.add("locked");
    $("#sheet-body").scrollTop = 0;
    if (onMount) onMount($("#sheet-card"));
    setTimeout(() => { const f = $("#sheet-card [autofocus]") || $("#sheet-body input, #sheet-body select, #sheet-body button"); f?.focus({ preventScroll: true }); }, 40);
  }
  function closeSheet() {
    if ($("#sheet").hidden) return;
    $("#sheet").hidden = true; $("#scrim").hidden = true;
    document.body.classList.remove("locked");
    $("#sheet-body").innerHTML = ""; $("#sheet-foot").innerHTML = "";
    sheetSubmit = sheetDelete = sheetAct = null;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function showErr(id, msg) { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.hidden = !msg; }
  const val = (id) => (document.getElementById(id)?.value ?? "").trim();
  const stop = (id) => { document.getElementById(id)?.focus(); return false; };
  function parseSigned(v) { const n = parseAmount(v); return /^\s*[-−(]/.test(String(v ?? "")) ? -n : n; }
  const FOOT_ADD = (label) => `<button type="button" class="btn" data-sheet-close>Cancel</button><button type="submit" class="btn primary">${label}</button>`;
  const FOOT_EDIT = (del = `${svg("trash")}Delete`) => `<button type="button" class="btn danger" data-sheet-del>${del}</button><span class="spacer"></span><button type="button" class="btn" data-sheet-close>Cancel</button><button type="submit" class="btn primary">Save</button>`;

  function categoryPicker(sel, kind) {
    return `<fieldset class="field"><legend class="lab">Category</legend><div class="catpick">${state.categories.filter((c) => c.kind === kind).map((c) => `<label><input type="radio" name="category" value="${esc(c.id)}"${c.id === sel ? " checked" : ""}><span class="opt"><span class="ico" style="--c:${c.color}">${svg(c.icon)}</span>${esc(c.name)}</span></label>`).join("")}</div></fieldset>`;
  }
  const select = (id, list, sel, extra = "") => `<span class="select-wrap full"><select id="${id}" class="select"${extra}>${opts(list, sel)}</select>${svg("down")}</span>`;
  const acctOptions = (pool) => pool.map((a) => [a.id, a.type === "goal" ? `${a.name} (goal)` : a.name]);

  /* ---------- an entry of any type ---------- */
  function entryForm(item = null, preset = {}) {
    const d = item
      ? { type: item.type, amount: String(item.amount), title: item.title, category: item.category, date: item.date, account: item.account, to: item.to, person: item.person, note: item.note }
      : { type: TYPES[preset.type] ? preset.type : "expense", amount: preset.amount ? String(preset.amount) : "", title: "", category: preset.category || "", date: preset.date || todayISO(), account: preset.account || "", to: preset.to || "", person: preset.person || "", note: "" };
    const pool = () => state.accounts.filter((a) => !a.archived || a.id === d.account || a.id === d.to);
    const fix = () => { // keep the draft valid for its type
      const T = TYPES[d.type], list = pool();
      if (!list.some((a) => a.id === d.account)) d.account = (list.find((a) => a.id === ui.lastAccount) || list.find((a) => a.type !== "goal" && a.id !== d.to) || list[0] || {}).id || "";
      if (T.cat && !state.categories.some((c) => c.id === d.category && c.kind === T.cat)) {
        d.category = (state.categories.find((c) => c.id === ui.lastCat[T.cat] && c.kind === T.cat) || state.categories.find((c) => c.kind === T.cat)).id;
      }
      if (d.type === "transfer" && (d.to === d.account || !list.some((a) => a.id === d.to))) d.to = (list.find((a) => a.id !== d.account) || {}).id || "";
    };
    const read = () => { // pull what's been typed back into the draft
      const get = (id, key) => { const el = document.getElementById(id); if (el) d[key] = el.value; };
      get("f-amount", "amount"); get("f-title", "title"); get("f-date", "date"); get("f-note", "note"); get("f-account", "account"); get("f-to", "to"); get("f-person", "person");
      const c = $("#sheet-card input[name=category]:checked");
      if (c) d.category = c.value;
    };
    const body = () => {
      const T = TYPES[d.type], list = acctOptions(pool());
      return `
        <div class="field"><div class="typepick" role="group" aria-label="Type of entry">${Object.entries(TYPES).map(([k, x]) => `<button type="button" class="chip" data-act="sheet" data-k="${k}" aria-pressed="${d.type === k}">${x.label}</button>`).join("")}</div><p class="hint">${TYPE_HINT[d.type]}</p></div>
        <div class="field"><label class="amount-field" for="f-amount"><span class="sym">${esc(curSymbol())}</span><input id="f-amount" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(d.amount)}" aria-label="Amount" aria-describedby="e-amount"${item ? "" : " autofocus"}></label><p class="err" id="e-amount" hidden></p></div>
        ${T.person ? `<label class="field"><span class="lab">${T.person}</span><input class="input" id="f-person" maxlength="40" list="people-list" placeholder="Their name" value="${esc(d.person)}" autocomplete="off" aria-describedby="e-person"><datalist id="people-list">${people().map((p) => `<option value="${esc(p.name)}"></option>`).join("")}</datalist><span class="err" id="e-person" hidden></span></label>` : ""}
        <label class="field"><span class="lab">${d.type === "transfer" ? "Label" : "What for?"} <span class="opt-lab">(optional)</span></span><input class="input" id="f-title" maxlength="80" placeholder="${TYPE_EG[d.type]}" value="${esc(d.title)}" autocomplete="off"></label>
        ${T.cat ? categoryPicker(d.category, T.cat) : ""}
        <div class="grid2">
          <label class="field"><span class="lab">${T.verb}</span>${select("f-account", list, d.account)}</label>
          ${d.type === "transfer" ? `<label class="field"><span class="lab">To</span>${select("f-to", list, d.to, ' aria-describedby="e-to"')}<span class="err" id="e-to" hidden></span></label>` : ""}
          <label class="field"><span class="lab">Date</span><input class="input" type="date" id="f-date" value="${esc(d.date)}" aria-describedby="e-date"><span class="err" id="e-date" hidden></span></label>
          <label class="field"><span class="lab">Note <span class="opt-lab">(optional)</span></span><input class="input" id="f-note" maxlength="140" value="${esc(d.note)}" autocomplete="off"></label>
        </div>
        ${item?.recurringId && state.recurring.some((r) => r.id === item.recurringId) ? `<p class="hint">This entry belongs to a recurring item. Deleting it marks that cycle as not done.</p>` : ""}`;
    };
    fix();
    openSheet({
      title: item ? "Edit entry" : "Add entry",
      body: body(),
      foot: item ? FOOT_EDIT() : FOOT_ADD("Add entry"),
      onAct(k) {
        if (!TYPES[k]) return;
        read(); d.type = k; fix();
        $("#sheet-body").innerHTML = body();
        $(`#sheet-body [data-k="${k}"]`)?.focus();
      },
      onSubmit() {
        read();
        const T = TYPES[d.type], amount = parseAmount(d.amount), person = d.person.trim();
        const toOk = d.type !== "transfer" || (d.to && d.to !== d.account);
        showErr("e-amount", amount > 0 ? "" : "Enter an amount above zero.");
        showErr("e-person", !T.person || person ? "" : "Add the person's name.");
        showErr("e-date", isDate(d.date) ? "" : "Choose a date.");
        showErr("e-to", toOk ? "" : state.accounts.length < 2 ? "Add a second account in Wallet first." : "Choose a different account to move the money into.");
        if (!(amount > 0)) return stop("f-amount");
        if (T.person && !person) return stop("f-person");
        if (!toOk) return stop("f-to");
        if (!isDate(d.date)) return stop("f-date");
        const data = { type: d.type, title: d.title.trim(), amount, category: T.cat ? d.category : "", date: d.date, account: d.account, to: d.type === "transfer" ? d.to : "", person: T.person ? person : "", note: d.note.trim() };
        if (T.cat) ui.lastCat[T.cat] = d.category;
        ui.lastAccount = d.account;
        if (item) {
          const e = state.entries.find((x) => x.id === item.id);
          if (e) Object.assign(e, data);
          commit(); toast("Saved");
        } else {
          state.entries.push({ id: uid(), ...data, recurringId: null });
          commit();
          toast(monthOf(d.date) === monthOf(todayISO()) ? `${entryTitle(data)} added` : `${entryTitle(data)} added to ${fMonth(monthOf(d.date))}`);
        }
      },
      onDelete: item ? () => { closeSheet(); deleteEntry(item.id); } : null,
    });
  }
  function deleteEntry(id) {
    const e = state.entries.find((x) => x.id === id); if (!e) return;
    withUndo(() => {
      state.entries = state.entries.filter((x) => x.id !== id);
      for (const r of state.recurring) for (const [k, v] of Object.entries(r.paid)) if (v === id) delete r.paid[k];
    }, `${entryTitle(e)} deleted`);
  }

  /* ---------- recurring ---------- */
  function recurringForm(item = null) {
    const d = item
      ? { kind: item.kind, name: item.name, amount: String(item.amount), category: item.category, frequency: item.frequency, start: item.start, end: item.end, variable: item.variable, auto: item.auto, account: item.account, to: item.to, note: item.note, active: item.active !== false }
      : { kind: "expense", name: "", amount: "", category: "", frequency: "monthly", start: todayISO(), end: "", variable: false, auto: false, account: "", to: "", note: "", active: true };
    const pool = () => state.accounts.filter((a) => !a.archived || a.id === d.account || a.id === d.to);
    const fix = () => {
      const list = pool();
      if (!list.some((a) => a.id === d.account)) d.account = (list.find((a) => a.type === "bank") || list.find((a) => a.type !== "goal") || list[0] || {}).id || "";
      if (d.kind !== "transfer" && !state.categories.some((c) => c.id === d.category && c.kind === d.kind)) {
        d.category = (state.categories.find((c) => c.id === (d.kind === "income" ? "salary" : "bills") && c.kind === d.kind) || state.categories.find((c) => c.kind === d.kind)).id;
      }
      if (d.kind === "transfer" && (d.to === d.account || !list.some((a) => a.id === d.to))) d.to = (list.find((a) => a.id !== d.account && a.type === "goal") || list.find((a) => a.id !== d.account) || {}).id || "";
    };
    const read = () => {
      const get = (id, key) => { const el = document.getElementById(id); if (el) d[key] = el.type === "checkbox" ? el.checked : el.value; };
      get("r-name", "name"); get("r-amount", "amount"); get("r-category", "category"); get("r-frequency", "frequency"); get("r-start", "start"); get("r-end", "end");
      get("r-account", "account"); get("r-to", "to"); get("r-variable", "variable"); get("r-auto", "auto"); get("r-note", "note"); get("r-active", "active");
    };
    const TEXT = {
      expense: { eg: "e.g. Rent", acct: "Usually paid from", auto: "Add it by itself on the due date, like a subscription that charges your card" },
      income: { eg: "e.g. Salary", acct: "Usually received in", auto: "Add it by itself on the day it arrives" },
      transfer: { eg: "e.g. Holiday savings", acct: "From", auto: "Move it by itself on the due date, like a standing order" },
    };
    const body = () => {
      const X = TEXT[d.kind], list = acctOptions(pool());
      return `
        <div class="field"><div class="seg" role="group" aria-label="Kind of recurring item">${Object.entries(RKIND).map(([k, x]) => `<button type="button" data-act="sheet" data-k="${k}" aria-pressed="${d.kind === k}">${x.label}</button>`).join("")}</div></div>
        <label class="field"><span class="lab">Name</span><input class="input" id="r-name" maxlength="60" placeholder="${X.eg}" value="${esc(d.name)}" autocomplete="off"${item ? "" : " autofocus"} aria-describedby="e-name"><span class="err" id="e-name" hidden></span></label>
        <div class="grid2">
          <label class="field"><span class="lab">Amount</span><input class="input" id="r-amount" inputmode="decimal" placeholder="0" value="${esc(d.amount)}" autocomplete="off" aria-describedby="e-ramount"><span class="err" id="e-ramount" hidden></span></label>
          <label class="field"><span class="lab">How often</span>${select("r-frequency", Object.entries(FREQ).map(([k, f]) => [k, f.label]), d.frequency)}</label>
          <label class="field"><span class="lab">First due on</span><input class="input" type="date" id="r-start" value="${esc(d.start)}" aria-describedby="e-start h-start"><span class="hint" id="h-start">Later dates follow from this one.</span><span class="err" id="e-start" hidden></span></label>
          <label class="field"><span class="lab">Ends on <span class="opt-lab">(optional)</span></span><input class="input" type="date" id="r-end" value="${esc(d.end)}" aria-describedby="e-end h-end"><span class="hint" id="h-end">For loans and instalments.</span><span class="err" id="e-end" hidden></span></label>
          ${d.kind === "transfer" ? "" : `<label class="field"><span class="lab">Category</span>${select("r-category", state.categories.filter((c) => c.kind === d.kind).map((c) => [c.id, c.name]), d.category)}</label>`}
          <label class="field"><span class="lab">${X.acct}</span>${select("r-account", list, d.account)}</label>
          ${d.kind === "transfer" ? `<label class="field"><span class="lab">To</span>${select("r-to", list, d.to, ' aria-describedby="e-rto"')}<span class="err" id="e-rto" hidden></span></label>` : ""}
        </div>
        <label class="check"><input type="checkbox" id="r-variable"${d.variable ? " checked" : ""}><span>The amount changes each time, like an electricity bill</span></label>
        <label class="check"><input type="checkbox" id="r-auto"${d.auto ? " checked" : ""}><span>${X.auto}</span></label>
        <label class="field"><span class="lab">Note <span class="opt-lab">(optional)</span></span><input class="input" id="r-note" maxlength="140" value="${esc(d.note)}" autocomplete="off"></label>
        ${item ? `<label class="check"><input type="checkbox" id="r-active"${d.active ? " checked" : ""}><span>Active (untick to pause reminders)</span></label>` : ""}`;
    };
    fix();
    openSheet({
      title: item ? `Edit ${item.name}` : "Add recurring",
      body: body(),
      foot: item ? FOOT_EDIT() : FOOT_ADD("Add recurring"),
      onAct(k) {
        if (!RKIND[k]) return;
        read(); d.kind = k; fix();
        $("#sheet-body").innerHTML = body();
        $(`#sheet-body [data-k="${k}"]`)?.focus();
      },
      onSubmit() {
        read();
        const name = d.name.trim(), amount = parseAmount(d.amount);
        const endOk = !d.end || (isDate(d.end) && isDate(d.start) && d.end >= d.start);
        const toOk = d.kind !== "transfer" || (d.to && d.to !== d.account);
        showErr("e-name", name ? "" : "Give it a name, like Rent.");
        showErr("e-ramount", amount > 0 ? "" : "Enter an amount above zero.");
        showErr("e-start", isDate(d.start) ? "" : "Choose the first due date.");
        showErr("e-end", endOk ? "" : "The end date has to be on or after the first due date.");
        showErr("e-rto", toOk ? "" : state.accounts.length < 2 ? "Add a second account in Wallet first." : "Choose a different account to move the money into.");
        if (!name) return stop("r-name");
        if (!(amount > 0)) return stop("r-amount");
        if (!isDate(d.start)) return stop("r-start");
        if (!endOk) return stop("r-end");
        if (!toOk) return stop("r-to");
        const data = {
          kind: d.kind, name, amount, category: d.kind === "transfer" ? "" : d.category, frequency: FREQ[d.frequency] ? d.frequency : "monthly",
          start: d.start, day: item && item.start === d.start ? item.day : Number(d.start.slice(8)), end: d.end || "",
          variable: !!d.variable, auto: !!d.auto, account: d.account, to: d.kind === "transfer" ? d.to : "", note: d.note.trim(),
        };
        if (item) {
          const r = state.recurring.find((x) => x.id === item.id);
          if (r) Object.assign(r, data, { active: !!d.active });
          commit(); toast("Saved");
        } else {
          state.recurring.push({ id: uid(), ...data, active: true, paid: {} });
          commit(); toast(`${name} added`);
        }
        runAuto();
      },
      onDelete: item ? () => { closeSheet(); deleteRecurring(item.id); } : null,
    });
  }
  function deleteRecurring(id) {
    const r = state.recurring.find((x) => x.id === id); if (!r) return;
    withUndo(() => { state.recurring = state.recurring.filter((x) => x.id !== id); }, `${r.name} deleted. Its past entries stay in your activity`);
  }
  function toggleRecurring(id) {
    const r = state.recurring.find((x) => x.id === id); if (!r) return;
    r.active = r.active === false;
    commit();
    toast(`${r.name} ${r.active ? "resumed" : "paused"}`);
  }
  function payForm(r) {
    const st = cycleStatus(r, todayISO());
    if (!st) return;
    const K = RKIND[r.kind], monthly = !FREQ[r.frequency].days;
    const pool = state.accounts.filter((a) => !a.archived || a.id === r.account);
    openSheet({
      title: `${K.action} ${r.name}`,
      body: `<p class="sheet-intro">${monthly ? `For ${esc(fMonth(st.key))}, due` : "Due"} ${esc(fDateLong(st.due))}.${r.kind === "transfer" ? ` Moves into ${esc(acctName(r.to))}.` : ""}${r.variable ? " This amount varies, so check it matches." : ""}</p>
        <div class="field"><label class="amount-field" for="p-amount"><span class="sym">${esc(curSymbol())}</span><input id="p-amount" inputmode="decimal" autocomplete="off" value="${esc(String(r.amount))}" aria-label="Amount" aria-describedby="e-pamount"></label><p class="err" id="e-pamount" hidden></p></div>
        <div class="grid2">
          <label class="field"><span class="lab">${r.kind === "income" ? "Received on" : r.kind === "transfer" ? "Moved on" : "Paid on"}</span><input class="input" type="date" id="p-date" value="${esc(todayISO())}"></label>
          <label class="field"><span class="lab">${r.kind === "income" ? "Received in" : r.kind === "transfer" ? "From" : "Paid from"}</span>${select("p-account", acctOptions(pool.filter((a) => a.id !== r.to)), r.account)}</label>
        </div>`,
      foot: `<button type="button" class="btn" data-act="sheet" data-k="skip">${svg("skip")}Skip this one</button><span class="spacer"></span><button type="button" class="btn" data-sheet-close>Cancel</button><button type="submit" class="btn primary">${svg("check")}Mark ${K.done}</button>`,
      onAct(k) {
        if (k !== "skip") return;
        closeSheet();
        withUndo(() => { const rr = state.recurring.find((x) => x.id === r.id); if (rr) rr.paid[st.key] = "skipped"; }, `Skipped ${r.name} for ${monthly ? fMonth(st.key) : fDate(st.due)}`);
      },
      onSubmit() {
        const amount = parseAmount(val("p-amount"));
        showErr("e-pamount", amount > 0 ? "" : "Enter an amount above zero.");
        if (!(amount > 0)) return stop("p-amount");
        const date = isDate(val("p-date")) ? val("p-date") : todayISO();
        const account = val("p-account") || r.account;
        withUndo(() => {
          const id = uid();
          state.entries.push(entryFromRecurring(r, id, date, amount, account));
          const rr = state.recurring.find((x) => x.id === r.id);
          if (rr) rr.paid[st.key] = id;
        }, `${r.name} ${K.done} and added to your activity`);
      },
    });
  }
  function historySheet(r) {
    const entries = state.entries.filter((e) => e.recurringId === r.id).sort(byNewest);
    openSheet({
      title: `${r.name}: history`,
      body: entries.length
        ? `<div class="lines">${entries.map((e) => `<div class="line"><span>${esc(fDateLong(e.date))} · ${esc(acctName(e.account))}</span><span class="v">${esc(money(e.amount))}</span></div>`).join("")}<div class="line total"><span>Total</span><span class="v">${esc(money(sum(entries.map((e) => e.amount))))}</span></div></div>`
        : `<p class="sheet-intro">Nothing recorded yet. Each time you mark this ${RKIND[r.kind].done}, it shows up here.</p>`,
      foot: `<button type="button" class="btn primary" data-sheet-close>Done</button>`,
    });
  }

  /* ---------- accounts and goals ---------- */
  function accountForm(item = null, goal = false) {
    const isGoal = item ? item.type === "goal" : goal;
    const bal = item ? balances().get(item.id) || 0 : 0;
    const used = item ? state.entries.filter((e) => e.account === item.id || e.to === item.id).length : 0;
    const usedRec = item ? state.recurring.filter((r) => r.account === item.id || r.to === item.id).length : 0;
    const v = item || { name: "", type: isGoal ? "goal" : "bank", opening: 0, target: 0, deadline: "", archived: false };
    const keep = used + usedRec > 0;
    openSheet({
      title: item ? `Edit ${item.name}` : isGoal ? "Add goal" : "Add account",
      body: `
        ${item ? `<p class="sheet-intro">${isGoal ? "Saved so far" : "Balance now"}: <b>${esc(balText(item, bal))}</b> · ${plural(used, "entry", "entries")}${used ? ` · <button type="button" class="linkish" data-act="acct-activity" data-id="${esc(item.id)}">See its activity</button>` : ""}</p>` : ""}
        <label class="field"><span class="lab">Name</span><input class="input" id="a-name" maxlength="32" placeholder="${isGoal ? "e.g. New laptop" : "e.g. Main account"}" value="${esc(v.name)}" autocomplete="off"${item ? "" : " autofocus"} aria-describedby="e-aname"><span class="err" id="e-aname" hidden></span></label>
        <div class="grid2">
          ${isGoal
            ? `<label class="field"><span class="lab">Target</span><input class="input" id="a-target" inputmode="decimal" placeholder="0" value="${v.target ? esc(String(v.target)) : ""}" autocomplete="off" aria-describedby="e-atarget"><span class="err" id="e-atarget" hidden></span></label>
               <label class="field"><span class="lab">Target date <span class="opt-lab">(optional)</span></span><input class="input" type="date" id="a-deadline" value="${esc(v.deadline)}"></label>`
            : `<label class="field"><span class="lab">Type</span>${select("a-type", Object.entries(ACCT).filter(([k]) => k !== "goal").map(([k, a]) => [k, a.label]), v.type)}</label>`}
          <label class="field"><span class="lab">${isGoal ? "Already saved" : "Starting balance"}</span><input class="input" id="a-opening" inputmode="decimal" placeholder="0" value="${v.opening ? esc(String(v.opening)) : ""}" autocomplete="off" aria-describedby="h-opening"><span class="hint" id="h-opening">${isGoal ? "What you had put aside before tracking it here." : "What it held before your first entry here. For money you owe on a card, enter it with a minus sign."}</span></label>
        </div>
        ${item && keep ? `<p class="hint">${v.archived ? "This account is archived." : "This one has history, so it can be archived but not deleted."} Archived accounts are hidden from pickers and still count in your totals.</p>` : ""}`,
      foot: item ? FOOT_EDIT(keep ? `${svg("archive")}${v.archived ? "Restore" : "Archive"}` : `${svg("trash")}Delete`) : FOOT_ADD(isGoal ? "Add goal" : "Add account"),
      onSubmit() {
        const name = val("a-name"), target = isGoal ? parseAmount(val("a-target")) : 0;
        showErr("e-aname", name ? "" : "Give it a name.");
        showErr("e-atarget", !isGoal || target > 0 ? "" : "Enter the amount you're aiming for.");
        if (!name) return stop("a-name");
        if (isGoal && !(target > 0)) return stop("a-target");
        const data = { name: name.slice(0, 32), type: isGoal ? "goal" : ACCT[val("a-type")] ? val("a-type") : "bank", opening: parseSigned(val("a-opening")), target, deadline: isGoal && isDate(val("a-deadline")) ? val("a-deadline") : "" };
        if (item) {
          const a = state.accounts.find((x) => x.id === item.id);
          if (a) Object.assign(a, data);
          commit(); toast("Saved");
        } else {
          const nGoals = state.accounts.filter((a) => a.type === "goal").length;
          state.accounts.push(newAccount((isGoal ? "g" : "a") + uid(), data.name, data.type, data.opening, { target, deadline: data.deadline, color: isGoal ? GOAL_COLORS[nGoals % GOAL_COLORS.length] : "" }));
          commit(); toast(`${data.name} added`);
        }
      },
      onDelete: item ? () => {
        closeSheet();
        if (keep) {
          const a = state.accounts.find((x) => x.id === item.id); if (!a) return;
          a.archived = !a.archived;
          commit(); toast(`${a.name} ${a.archived ? "archived" : "restored"}`);
        } else {
          withUndo(() => { state.accounts = state.accounts.filter((x) => x.id !== item.id); }, `${item.name} deleted`);
        }
      } : null,
    });
  }

  /* ---------- budgets ---------- */
  function budgetSheet() {
    const cats = state.categories.filter((c) => c.kind === "expense");
    const spent = new Map(catTotals(entriesIn(monthOf(todayISO()))).map((c) => [c.id, c.total]));
    openSheet({
      title: "Budgets",
      body: `<p class="sheet-intro">Set a limit for the whole month, for single categories, or both. Leave a box empty for no limit.</p>
        <label class="bfield total"><span class="min0"><b>Whole month</b><small>Everything you spend</small></span><input class="input" id="b-total" inputmode="decimal" placeholder="No limit" value="${state.settings.budget ? esc(String(state.settings.budget)) : ""}" autocomplete="off"></label>
        <div class="bfields">${cats.map((c) => `<label class="bfield"><span class="bname"><span class="ico" style="--c:${c.color}">${svg(c.icon)}</span><span class="min0"><b>${esc(c.name)}</b><small>${spent.get(c.id) ? `${esc(W(spent.get(c.id)))} spent this month` : "Nothing spent this month"}</small></span></span><input class="input" id="b-${esc(c.id)}" data-budget="${esc(c.id)}" inputmode="decimal" placeholder="No limit" value="${c.budget ? esc(String(c.budget)) : ""}" autocomplete="off" aria-label="${esc(c.name)} budget"></label>`).join("")}</div>`,
      foot: FOOT_ADD("Save budgets"),
      onSubmit() {
        state.settings.budget = parseAmount(val("b-total"));
        for (const el of $$("#sheet-body [data-budget]")) { const c = state.categories.find((x) => x.id === el.dataset.budget); if (c) c.budget = parseAmount(el.value); }
        commit(); toast("Budgets saved");
      },
    });
  }

  /* ---------- appearance: lives inside Settings ---------- */
  function appearanceHTML() {
    const mode = effMode();
    return `<h3>Appearance</h3>
      <div class="seg" role="group" aria-label="Mode">${[["system", "Match device"], ["dark", "Dark"], ["light", "Light"]].map(([k, l]) => `<button type="button" data-act="sheet" data-k="mode:${k}" aria-pressed="${state.settings.mode === k}">${l}</button>`).join("")}</div>
      <div class="skins" role="group" aria-label="Theme">${SKINS.map((k) => {
        const c = k[mode], glow = k.glow?.[mode];
        return `<button type="button" class="skin${k.glass ? " glass" : ""}" data-act="sheet" data-k="skin:${k.id}" aria-pressed="${state.settings.skin === k.id}" aria-label="${esc(`${k.name} theme. ${k.note}`)}" style="${glow ? `--s-glow:${glow[0]};--s-glow-2:${glow[1]};` : ""}--s-bg:${c[0]};--s-card:${c[2]};--s-fg:${c[4]};--s-fg2:${c[5]};--s-accent:${c[7]};--s-ink:${c[9]};--s-font:${esc(k.display)}">
          <span class="skin-demo"><span class="skin-num">Aa</span><span class="skin-btn">Add</span></span>
          <span class="skin-bars" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="skin-name">${esc(k.name)}</span><span class="skin-note">${esc(k.note)}</span></button>`;
      }).join("")}</div>`;
  }

  /* ---------- settings ---------- */
  function settingsSheet() {
    const s = state.settings;
    const nb = state.categories.filter((c) => c.budget > 0).length;
    openSheet({
      title: "Settings",
      body: `
        <section class="set-group" id="set-appearance">${appearanceHTML()}</section>
        <section class="set-group"><h3>Money</h3>
          <label class="field"><span class="lab">Currency</span>${select("set-currency", CURRENCIES.map((c) => [c, `${c} · ${currencyName(c)}`]), s.currency)}</label>
          <div class="set-line"><span>Budgets<small>${s.budget ? `${esc(W(s.budget))} a month` : "No monthly budget"}${nb ? ` · ${plural(nb, "category budget")}` : ""}</small></span><button type="button" class="btn small" data-act="budgets">Edit budgets</button></div></section>
        <section class="set-group"><h3>Categories</h3>
          <p class="lab">Spending</p><div class="cat-list" id="set-cats-expense"></div>
          <p class="lab">Income</p><div class="cat-list" id="set-cats-income"></div>
          <div class="add-cat"><input class="input" id="set-newcat" maxlength="28" placeholder="New category name" autocomplete="off" aria-label="New category name" aria-describedby="e-newcat"><span class="select-wrap"><select id="set-newkind" class="select" aria-label="Kind of category"><option value="expense">Spending</option><option value="income">Income</option></select>${svg("down")}</span><button type="button" class="btn" data-act="add-cat">${svg("plus")}Add</button></div><p class="err" id="e-newcat" hidden></p></section>
        <section class="set-group"><h3>Your data</h3>
          <p class="sync-line"><span class="sync-dot" id="sync-dot" data-s="${!storageOK && !cloud.col ? "nostore" : cloud.status}"></span><span id="sync-status">${esc(syncText())}</span></p>
          <p class="hint">${cloud.col ? "Only you can see what you save here." : "Data saved in this browser stays on this device. Clearing your browser data erases it, so download a backup now and then."}</p>
          <div class="data-btns">
            <button type="button" class="btn" data-act="export-csv">${svg("download")}Export CSV</button>
            <button type="button" class="btn" data-act="backup">${svg("download")}Download backup</button>
            <label class="btn">${svg("upload")}Restore backup<input type="file" id="set-restore" class="sr" accept=".json,application/json"></label>
          </div>
          <div id="data-confirm"></div>
          <div><button type="button" class="btn danger" data-act="erase">${svg("trash")}${state.sample ? "Clear sample data" : "Erase everything"}</button></div>
        </section>`,
      foot: `<button type="submit" class="btn primary">Done</button>`,
      onAct(k) {
        const [what, v] = k.split(":");
        if (what === "mode") state.settings.mode = v; else if (what === "skin") state.settings.skin = v; else return;
        commit();
        $("#set-appearance").innerHTML = appearanceHTML();
        $(`#set-appearance [data-k="${k}"]`)?.focus({ preventScroll: true });
      },
      onMount(card) {
        renderSetCats();
        $("#set-currency", card).addEventListener("change", (e) => { state.settings.currency = e.target.value; commit(); });
        $("#set-newcat", card).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } });
        $("#set-restore", card).addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) readBackup(f); });
      },
    });
  }
  const FIXED_CATS = ["other", "other-in"];
  function renderSetCats() {
    for (const kind of ["expense", "income"]) {
      const el = $("#set-cats-" + kind); if (!el) return;
      el.innerHTML = state.categories.filter((c) => c.kind === kind).map((c) => FIXED_CATS.includes(c.id)
        ? `<span class="cat-chip fixed"><i style="background:${c.color}"></i>${esc(c.name)}</span>`
        : `<span class="cat-chip"><i style="background:${c.color}"></i>${esc(c.name)}<button type="button" data-act="del-cat" data-cat="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">${svg("x")}</button></span>`).join("");
    }
  }
  function addCategory() {
    const name = val("set-newcat"), kind = val("set-newkind") === "income" ? "income" : "expense";
    if (!name) { showErr("e-newcat", "Type a name for the category."); return; }
    if (state.categories.some((c) => c.kind === kind && c.name.toLowerCase() === name.toLowerCase())) { showErr("e-newcat", "You already have a category with that name."); return; }
    showErr("e-newcat", "");
    const custom = state.categories.filter((c) => !DEFAULT_CATS.some((d) => d[0] === c.id)).length;
    const cat = { id: "c" + uid(), name: name.slice(0, 28), color: CUSTOM_COLORS[custom % CUSTOM_COLORS.length], icon: kind === "income" ? "coins" : "other", kind, budget: 0 };
    const at = state.categories.findIndex((c) => c.id === (kind === "income" ? "other-in" : "other"));
    state.categories.splice(at < 0 ? state.categories.length : at, 0, cat);
    commit();
    $("#set-newcat").value = "";
    renderSetCats();
    toast(`${cat.name} added`);
  }
  function removeCategory(id) {
    const c = state.categories.find((x) => x.id === id); if (!c || FIXED_CATS.includes(id)) return;
    const other = c.kind === "income" ? "other-in" : "other";
    const used = state.entries.filter((e) => e.category === id).length + state.recurring.filter((r) => r.category === id).length;
    withUndo(() => {
      state.categories = state.categories.filter((x) => x.id !== id);
      for (const e of state.entries) if (e.category === id) e.category = other;
      for (const r of state.recurring) if (r.category === id) r.category = other;
    }, used ? `${c.name} removed. ${plural(used, "item")} moved to ${catById(other).name}` : `${c.name} removed`);
    renderSetCats();
  }
  function confirmBox(html, yesLabel, onYes) {
    const box = $("#data-confirm"); if (!box) return;
    box.innerHTML = `<div class="confirm"><p>${html}</p><div class="row-btns"><button type="button" class="btn small primary" id="cf-yes">${esc(yesLabel)}</button><button type="button" class="btn small" id="cf-no">Cancel</button></div></div>`;
    $("#cf-yes").onclick = () => { box.innerHTML = ""; onYes(); };
    $("#cf-no").onclick = () => { box.innerHTML = ""; };
    $("#cf-no").focus();
  }
  function startFresh(msg) {
    withUndo(() => { state = emptyState(state.settings.currency, state.settings.skin, state.settings.mode); }, msg);
    ui.bannerHidden = false;
  }
  function readBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data = null;
      try { data = JSON.parse(String(reader.result)); } catch { data = null; }
      const next = data && (Array.isArray(data.entries) || Array.isArray(data.expenses) || Array.isArray(data.recurring)) ? normalize(data) : null;
      if (!next) { confirmBox("That file isn't a Spent backup. Choose a .json file you downloaded from Spent.", "OK", () => {}); return; }
      confirmBox(`Replace everything here with this backup? It has <b>${plural(next.entries.length, "entry", "entries")}</b>, <b>${plural(next.accounts.length, "account")}</b> and <b>${plural(next.recurring.length, "recurring item")}</b>.`, "Replace my data", () => {
        withUndo(() => { state = next; state.sample = false; }, "Backup restored");
        closeSheet();
      });
    };
    reader.onerror = () => confirmBox("That file couldn't be read. Try downloading the backup again.", "OK", () => {});
    reader.readAsText(file);
  }
  const csvCell = (v, text) => { let s = String(v ?? ""); if (text && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function toCSV() {
    const rows = [["Date", "Type", "Description", "Category", "Amount", "Currency", "Account", "To account", "Person", "Note", "Recurring"].join(",")];
    const list = [...state.entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const e of list) {
      rows.push([
        e.date, TYPES[e.type].label, csvCell(entryTitle(e), true), csvCell(e.category ? catById(e.category).name : "", true), e.amount.toFixed(2), state.settings.currency,
        csvCell(acctName(e.account), true), csvCell(e.to ? acctName(e.to) : "", true), csvCell(e.person, true), csvCell(e.note, true), e.recurringId ? "Yes" : "",
      ].join(","));
    }
    return rows.join("\r\n");
  }
