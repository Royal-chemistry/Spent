  /* Saves text or a file. Inside claude.ai it asks the viewer to confirm; on its own site it's a normal download. */
  async function saveFile(filename, text, type) {
    const binary = typeof text !== "string";
    const noSave = () => toast("Saving files isn't available in this view. Open Spent from its own web address to download it.");
    if (window.claude && typeof window.claude.use === "function") {
      let dl = null;
      try { dl = await window.claude.use("downloads"); } catch { dl = null; }
      if (dl) {
        try { const res = await dl.save({ filename, data: text }); if (res?.status === "saved") toast(`Saved ${filename}`); return; }
        catch (e) {
          const code = e?.code;
          if (code === "declined") return;
          if (code === "rate_limited") { toast("A save prompt is already open."); return; }
          if (code && !["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(code)) { toast("The file wasn't saved. Try again in a moment."); return; }
        }
      }
      if (binary) noSave(); else copyFallback(text, filename);
      return;
    }
    try {
      const url = URL.createObjectURL(binary ? text : new Blob([text], { type }));
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { if (binary) noSave(); else copyFallback(text, filename); }
  }
  async function copyFallback(text, filename) {
    try { await navigator.clipboard.writeText(text); toast(`Copied ${filename.endsWith(".csv") ? "the CSV" : "the backup"} to your clipboard. Paste it into a file to keep it.`); return; }
    catch { /* show it instead */ }
    const box = $("#data-confirm");
    if (!box) return;
    box.innerHTML = `<div class="confirm"><p>Saving files isn't available here. Copy this text and save it as <b>${esc(filename)}</b>.</p><textarea class="copybox" id="copybox" readonly aria-label="${esc(filename)} contents"></textarea></div>`;
    const ta = $("#copybox"); ta.value = text; ta.focus(); ta.select();
  }
  const stamp = () => todayISO();

