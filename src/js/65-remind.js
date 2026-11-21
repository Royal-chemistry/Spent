  /* ================= reminders and installing the app ================= */
  /* Reminders use the browser's notifications, so they only work on Spent's own site or the installed app, not inside
     another page. There's no server: a reminder shows when Spent is open, and on phones that support it the installed
     app also checks once or twice a day while closed. */
  const inFrame = (() => { try { return window.top !== window.self; } catch { return true; } })();
  const canNotify = () => typeof Notification !== "undefined" && window.isSecureContext && !window.claude && !inFrame;
  const canWorker = () => "serviceWorker" in navigator && window.isSecureContext && !window.claude && !inFrame;
  const DATA_CACHE = "spent-data";

  /* Bills and repayments due within a week, overdue ones included. */
  function reminderItems() {
    const t = todayISO(), until = addDays(t, 7), items = [];
    for (const { r, st } of upcoming()) {
      if (r.kind === "income" || st.due > until) continue;
      const when = st.overdue ? `was due ${fDate(st.due)}` : st.days === 0 ? "is due today" : st.days === 1 ? "is due tomorrow" : `is due ${fDate(st.due)}`;
      items.push({ key: `${r.id}:${st.key}`, due: st.due, title: `${r.name} ${when}`, body: `${r.variable ? "About " : ""}${money(r.amount)}${r.kind === "transfer" ? ` to ${acctName(r.to)}` : ""}. Open Spent to mark it ${RKIND[r.kind].done}.`, url: "./#recurring" });
    }
    for (const p of people()) {
      const st = debtStatus(p);
      if (!st || p.due > until) continue;
      const owed = p.balance > 0;
      items.push({ key: `debt:${p.key}:${p.due}`, due: p.due, title: owed ? `${p.name} owes you ${money(p.balance)}` : `You owe ${p.name} ${money(-p.balance)}`, body: `${st.overdue ? "It was due" : "It's due"} ${fDate(p.due)}.`, url: "./#wallet" });
    }
    return items.sort((a, b) => a.due.localeCompare(b.due));
  }
  async function readSent() { try { const c = await caches.open(DATA_CACHE), r = await c.match("sent.json"); return r ? await r.json() : {}; } catch { return {}; } }
  async function writeSent(sent) { try { const c = await caches.open(DATA_CACHE); await c.put("sent.json", new Response(JSON.stringify(sent))); } catch { /* reminders still work, they may repeat */ } }
  /* The service worker can't read the app's storage, so the list of what's due is copied where it can. */
  async function syncReminders() {
    if (!canWorker() || typeof caches === "undefined") return;
    try { const c = await caches.open(DATA_CACHE); await c.put("reminders.json", new Response(JSON.stringify({ enabled: !!state.settings.remind && !state.sample, items: reminderItems() }))); } catch { /* not supported here */ }
  }
  /* Shows each due item at most once a day: on the day before, on the day, and on days it's overdue. */
  async function checkReminders() {
    if (!state.settings.remind || state.sample || !canNotify() || Notification.permission !== "granted") return;
    const t = todayISO(), tomorrow = addDays(t, 1), sent = await readSent();
    const due = reminderItems().filter((x) => x.due <= tomorrow && sent[x.key] !== t);
    if (!due.length) return;
    const reg = canWorker() ? await navigator.serviceWorker.getRegistration() : null;
    for (const x of due.slice(0, 4)) {
      const o = { body: x.body, tag: x.key, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: x.url } };
      try { if (reg) await reg.showNotification(x.title, o); else new Notification(x.title, o); sent[x.key] = t; } catch { /* the browser refused this one */ }
    }
    await writeSent(sent);
  }
  async function enableReminders(on) {
    if (!on) { state.settings.remind = false; commit(); syncReminders(); toast("Reminders turned off"); return; }
    if (!canNotify()) { toast("Reminders work on Spent's own website or the installed app."); return; }
    let perm = Notification.permission;
    if (perm === "default") { try { perm = await Notification.requestPermission(); } catch { perm = "denied"; } }
    if (perm !== "granted") { toast("Notifications are blocked for Spent. Allow them in your browser's site settings, then try again."); renderRemindSection(); return; }
    state.settings.remind = true;
    commit();
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg && "periodicSync" in reg) {
        const st = await navigator.permissions.query({ name: "periodic-background-sync" }).catch(() => null);
        if (!st || st.state === "granted") await reg.periodicSync.register("spent-reminders", { minInterval: 12 * 3600 * 1000 }).catch(() => {});
      }
    } catch { /* checking while closed isn't available here */ }
    await syncReminders();
    toast(state.sample ? "Reminders are on. They start once you track your own money." : "Reminders are on");
    checkReminders();
    renderRemindSection();
  }

  /* ---------- installing ---------- */
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; renderRemindSection(); });
  window.addEventListener("appinstalled", () => { installPrompt = null; toast("Spent is installed"); renderRemindSection(); });
  const standalone = () => { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch { return false; } };
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch { /* dismissed */ }
    installPrompt = null;
    renderRemindSection();
  }

  /* The Settings section for both */
  function remindHTML() {
    const notify = canNotify(), perm = notify ? Notification.permission : "unavailable", on = !!state.settings.remind && perm === "granted";
    let install = "";
    if (canWorker() && !standalone()) {
      if (installPrompt) install = `<div class="set-line"><span>Install Spent<small>Opens like an app and works without internet.</small></span><button type="button" class="btn small" data-act="install">${svg("download")}Install</button></div>`;
      else if (isIOS()) install = `<p class="hint">To install on iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen.</p>`;
      else install = `<p class="hint">Spent works offline once it has loaded. To install it, use your browser's Install or Add to Home Screen option.</p>`;
    } else if (standalone()) install = `<p class="hint">Spent is installed on this device and works without internet.</p>`;
    const remind = notify
      ? `<label class="check"><input type="checkbox" id="set-remind"${on ? " checked" : ""}><span>Remind me about bills and money that's due<small>${perm === "denied" ? "Notifications are blocked for this site. Allow them in your browser's site settings first." : "A notification the day before, on the day and while overdue. Reminders show when Spent is open; on some phones the installed app also checks while it's closed."}</small></span></label>`
      : `<p class="hint">Notifications work on Spent's own website or the installed app, not inside this page. Bills that are due always show at the top of Home.</p>`;
    return `<h3>Reminders${canWorker() ? " and offline" : ""}</h3>${remind}${install}`;
  }
  function renderRemindSection() { const el = $("#set-remind-group"); if (el) el.innerHTML = remindHTML(); }

  if (canWorker()) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode isn't available here */ });
    navigator.serviceWorker.addEventListener?.("message", (e) => { if (e.data?.type === "open" && e.data.url) location.hash = e.data.url.split("#")[1] || "home"; });
  }
  setInterval(() => { if (!document.hidden) checkReminders(); }, 30 * 60 * 1000);

