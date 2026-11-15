  /* ---------- menu, toast, tooltip ---------- */
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener("pointerdown", outsideMenu, true); } }
  function outsideMenu(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
  function openMenu(anchor, items) {
    closeMenu();
    const m = document.createElement("div");
    m.className = "menu"; m.setAttribute("role", "menu");
    m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? "danger" : ""}">${svg(it.icon)}${esc(it.label)}</button>`).join("");
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - mw - 12, r.right - mw));
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 12) top = Math.max(12, r.top - mh - 6);
    m.style.left = left + "px"; m.style.top = top + "px";
    m.addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; closeMenu(); items[Number(b.dataset.i)].run(); anchor.focus?.(); });
    m.addEventListener("keydown", (e) => {
      const bs = $$("button", m), i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      if (e.key === "Tab") closeMenu();
    });
    menuEl = m;
    m.querySelector("button")?.focus();
    setTimeout(() => document.addEventListener("pointerdown", outsideMenu, true));
  }
  let toastTimer = 0;
  function toast(msg, o = {}) {
    const el = $("#toast");
    el.innerHTML = `<span>${esc(msg)}</span>${o.undo ? `<button type="button" id="toast-undo">Undo</button>` : ""}`;
    el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, o.undo ? 6500 : 3200);
    if (o.undo) $("#toast-undo").onclick = () => { el.hidden = true; o.undo(); };
  }
  const tip = $("#tip");
  function showTip(el) {
    const text = el.dataset.tip; if (!text) return;
    tip.textContent = text; tip.hidden = false;
    const anchor = el.querySelector(".bar") || el;
    const r = anchor.getBoundingClientRect();
    const box = r.height > 0 ? r : el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const x = Math.max(tw / 2 + 8, Math.min(window.innerWidth - tw / 2 - 8, box.left + box.width / 2));
    const y = r.height > 0 ? r.top : box.bottom - 4;
    tip.style.left = x + "px"; tip.style.top = Math.max(tip.offsetHeight + 12, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

