  /* ================= state + commit ================= */
  let state;
  const saved = readLocal();
  state = (saved && normalize(saved)) || sampleState();
  if (pristineSample(state)) state = sampleState(state.settings); // keep the chosen look, refresh the example to this month
  unsynced = !!(saved && saved._unsynced);

  const ui = {
    view: "home", month: monthOf(todayISO()),
    actQuery: "", actType: "all", actCat: "all", actAccount: "", actPerson: "", actScope: "month", actSort: "new",
    recQuery: "", recFilter: "all", recSort: "due",
    bannerHidden: false, lastCat: {}, lastAccount: "",
  };

  function commit() {
    unsynced = true;
    writeLocal();
    applyTheme();
    render();
    queueSync();
    setSync(cloud.col ? cloud.status : "local");
  }
  function withUndo(mutate, msg) {
    const snap = JSON.stringify(state);
    mutate();
    commit();
    toast(msg, { undo: () => { state = normalize(JSON.parse(snap)); commit(); toast("Restored"); } });
  }
  function runAuto() {
    const n = autoPost();
    if (!n) return;
    commit();
    toast(`${plural(n, "recurring entry", "recurring entries")} added automatically`);
  }

  const rootEl = document.documentElement;
  function applyTheme() {
    const { skin, mode } = state.settings;
    rootEl.setAttribute("data-skin", skin);
    rootEl.toggleAttribute("data-glass", !!SKINS.find((k) => k.id === skin)?.glass);
    if (mode === "dark" || mode === "light") rootEl.setAttribute("data-theme", mode);
    else if (hostTheme) rootEl.setAttribute("data-theme", hostTheme);
    else rootEl.removeAttribute("data-theme");
  }
  function effMode() {
    const t = rootEl.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    try { return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; } catch { return "dark"; }
  }

