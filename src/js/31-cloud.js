  /* Optional sync to the viewer's own private space when the page runs on claude.ai and they can save there.
     Everyone else keeps their data in this browser, like the reference app. */
  const cloud = { col: null, unsub: null, ready: false, last: {}, timer: 0, writing: false, again: false, status: "local", wrote: false };
  const SYNC_TEXT = {
    local: "Saved in this browser",
    connecting: "Connecting to your account…",
    slow: "Can't reach your account yet, so changes are saved in this browser",
    saving: "Saving…",
    synced: "Synced to your Claude account",
    offline: "Offline. Changes are saved in this browser and sync when you're back",
    full: "Your account storage is full. Changes are saved in this browser",
  };
  function syncText() { return state.sample && cloud.col ? "Sample data stays in this browser. Start fresh to save to your Claude account." : !storageOK && !cloud.col ? "This browser isn't keeping your data. Download a backup before you close the page." : SYNC_TEXT[cloud.status]; }
  function setSync(s) {
    cloud.status = s;
    const text = syncText();
    const ft = $("#foot-sync"); if (ft) ft.textContent = text;
    const st = $("#sync-status"); if (st) st.textContent = text;
    const dot = $("#sync-dot"); if (dot) dot.dataset.s = !storageOK && !cloud.col ? "nostore" : s;
  }
  async function initCloud() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const can = await user.can("data.write").catch(() => null);
      if (can === false) return;
      cloud.col = db.collection("data/users/" + id);
      setSync("connecting");
      const timer = setTimeout(() => { if (!cloud.ready) setSync("slow"); }, 10000);
      cloud.unsub = cloud.col.onSnapshot(
        (snap) => {
          if (snap.metadata.fromCache && !cloud.ready) return;
          clearTimeout(timer);
          onCloud(snap);
        },
        () => { clearTimeout(timer); cloud.col = null; cloud.ready = false; setSync("local"); }
      );
    } catch { cloud.col = null; setSync("local"); }
  }
  function onCloud(snap) {
    if (snap.metadata.hasPendingWrites) return;
    const docs = {};
    for (const d of snap.docs) if (d.exists) docs[d.id] = JSON.parse(JSON.stringify(d.data()));
    const first = !cloud.ready;
    if (!first && (cloud.timer || cloud.writing)) return; // local edits still on their way; they win
    cloud.ready = true;
    cloud.last = {};
    for (const [k, v] of Object.entries(docs)) cloud.last[k] = JSON.stringify(v);
    const remote = stateFromDocs(docs);
    if (first) {
      if (!remote) { if (!state.sample) queueSync(); setSync("synced"); return; }
      if (unsynced && !state.sample) { state = mergeStates(remote, state); writeLocal(); applyTheme(); render(); queueSync(); setSync("synced"); return; }
    }
    if (!remote) return;
    const before = JSON.stringify(state);
    const after = JSON.stringify(remote);
    unsynced = false;
    if (before !== after) { state = remote; ui.bannerHidden = ui.bannerHidden && state.sample; writeLocal(); applyTheme(); render(); }
    else writeLocal();
    setSync("synced");
    runAuto();
  }
  function queueSync() {
    if (!cloud.col || !cloud.ready || state.sample) return; // sample data stays on this device
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(flush, 600);
  }
  async function writeDoc(k, body) {
    try { await cloud.col.doc(k).set(body); }
    catch (e) {
      if (e && e.code === "unavailable") { await new Promise((r) => setTimeout(r, 700 + Math.random() * 900)); await cloud.col.doc(k).set(body); }
      else throw e;
    }
    cloud.wrote = true;
  }
  async function flush() {
    cloud.timer = 0;
    if (!cloud.col) return;
    if (cloud.writing) { cloud.again = true; return; }
    cloud.writing = true;
    setSync("saving");
    try {
      const docs = docsOf(state);
      const keys = new Set([...Object.keys(docs), ...Object.keys(cloud.last)]);
      for (const k of keys) {
        const body = docs[k] || { month: k.slice(1), entries: [] };
        const json = JSON.stringify(body);
        if (cloud.last[k] === json) continue;
        await writeDoc(k, body);
        cloud.last[k] = json;
      }
      unsynced = false;
      writeLocal();
      setSync("synced");
    } catch (e) {
      if (e && e.code === "invalid_argument" && !cloud.wrote) { try { cloud.unsub?.(); } catch { /* ignore */ } cloud.col = null; cloud.ready = false; setSync("local"); }
      else if (e && e.code === "quota_exceeded") { setSync("full"); toast("Your account storage is full. Your latest changes are saved in this browser."); }
      else setSync("offline");
    } finally {
      cloud.writing = false;
      if (cloud.again) { cloud.again = false; queueSync(); }
    }
  }
  window.addEventListener("online", () => { if (cloud.col && cloud.ready) queueSync(); });

