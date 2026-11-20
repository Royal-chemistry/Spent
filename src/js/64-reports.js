  /* ================= reports: PDF, Excel and CSV for a week, a month or a year ================= */
  function reportData(p, anchor) {
    const r = periodRange(p, anchor), t = todayISO();
    const list = entriesBetween(r.from, r.to).sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
    const tt = totals(list), span = daysBetween(r.from, r.to) + 1;
    const elapsed = inPeriod(p, anchor) ? daysBetween(r.from, t) + 1 : r.to < t ? span : 0;
    const pr = periodRange(p, stepAnchor(p, anchor, -1));
    const prev = totals(entriesBetween(pr.from, inPeriod(p, anchor) ? addDays(pr.from, elapsed - 1) : pr.to)).spent;
    let series;
    if (p === "year") series = Array.from({ length: 12 }, (_, i) => { const mm = `${r.from.slice(0, 4)}-${pad(i + 1)}`, x = totals(entriesIn(mm)); return { label: fMon(mm), long: fMonth(mm), spent: Math.max(0, x.spent), income: x.income }; });
    else series = Array.from({ length: span }, (_, i) => { const d = addDays(r.from, i), x = totals(list.filter((e) => e.date === d)); return { label: p === "week" ? DF.wd.format(parseISO(d)) : String(i + 1), long: fDay(d), spent: Math.max(0, x.spent), income: x.income }; });
    const slug = p === "year" ? r.from.slice(0, 4) : p === "week" ? `week-of-${r.from}` : monthOf(anchor);
    return {
      p, r, label: periodLabel(p, anchor), slug, list, ...tt, elapsed, prev, prevName: p === "week" ? "the week before" : p === "year" ? pr.from.slice(0, 4) : fMonthName(monthOf(pr.from)),
      cats: catTotals(list), methods: methodTotals(list), top: list.filter((e) => e.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 10),
      series, budgets: p === "month" ? budgetStatus(monthOf(anchor)) : [],
    };
  }
  const outOf = (e) => !isIn(e) && e.type !== "transfer";

  /* PDFs use the built-in Helvetica, which has no ₹ sign, so amounts are written with the currency code. */
  const pdfText = (s) => String(s ?? "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—−]/g, "-").replace(/…/g, "...").replace(/₹/g, "Rs ").replace(/[^\x20-\x7E\xA0-\xFF]+/g, "?");
  function pdfMoney(n, whole = false) {
    const cur = state.settings.currency, v = Number(n) || 0, dec = whole || ZERO_DEC.includes(cur) ? 0 : 2;
    try { return new Intl.NumberFormat(locFor(cur), { style: "currency", currency: cur, currencyDisplay: "code", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v); }
    catch { return `${cur} ${v.toFixed(dec)}`; }
  }
  async function exportPDF(p, anchor) {
    const JsPDF = await loadLib("pdf");
    const d = reportData(p, anchor), cur = state.settings.currency;
    const doc = new JsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 46, TW = W - 2 * M;
    const INK = [17, 17, 22], GREY = [92, 92, 104], LIGHT = [236, 236, 241], ACC = [200, 16, 46];
    let y = M;
    const T = pdfText;
    const font = (style, size, color = INK) => { doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color); };
    const ensure = (h) => { if (y + h > H - M - 18) { doc.addPage(); y = M; return true; } return false; };
    const fit = (s, w) => { let t = T(s).slice(0, 90); while (t.length > 2 && doc.getTextWidth(t) > w) t = t.slice(0, -4) + "..."; return t; };
    const cell = (s, x, w, al, yy) => { const t = fit(s, w - 12); if (al === "r") doc.text(t, x + w - 6, yy, { align: "right" }); else doc.text(t, x + 6, yy); };
    const heading = (s) => { ensure(70); font("bold", 12.5); doc.text(T(s), M, y + 12); y += 24; };
    function table(title, head, rows, widths, align) {
      if (!rows.length) return;
      heading(title);
      const ws = widths.map((w) => w * TW);
      const drawHead = () => { doc.setFillColor(...LIGHT); doc.rect(M, y, TW, 20, "F"); font("bold", 8, GREY); let x = M; head.forEach((h, i) => { cell(h.toUpperCase(), x, ws[i], align[i], y + 13.5); x += ws[i]; }); y += 20; font("normal", 9.5); };
      drawHead();
      for (const row of rows) {
        if (ensure(18)) drawHead();
        let x = M;
        row.forEach((c, i) => { cell(c, x, ws[i], align[i], y + 12.5); x += ws[i]; });
        doc.setDrawColor(...LIGHT); doc.line(M, y + 18, M + TW, y + 18);
        y += 18;
      }
      y += 16;
    }

    // Title
    font("bold", 22, ACC); doc.text("Spent", M, y + 16);
    font("bold", 17); doc.text(T(`Report for ${d.label}`), M, y + 44);
    font("normal", 9.5, GREY); doc.text(T(`Created ${fDateLong(todayISO())}  ·  Amounts in ${cur}  ·  ${plural(d.list.length, "entry", "entries")}`), M, y + 61);
    y += 80;
    // Summary
    const boxes = [["Spent", pdfMoney(Math.max(0, d.spent))], ["Came in", pdfMoney(d.income)], [d.net >= 0 ? "Kept" : "Short by", pdfMoney(Math.abs(d.net))], ["Savings rate", d.income > 0 ? `${Math.round((d.net / d.income) * 100)}%` : "-"]];
    const bw = (TW - 30) / 4;
    boxes.forEach(([l, v], i) => { const x = M + i * (bw + 10); doc.setFillColor(...LIGHT); doc.roundedRect(x, y, bw, 56, 6, 6, "F"); font("normal", 8, GREY); doc.text(l.toUpperCase(), x + 10, y + 18); font("bold", 12.5); doc.text(fit(v, bw - 20), x + 10, y + 41); });
    y += 70;
    font("normal", 9.5, GREY);
    const notes = [];
    if (d.elapsed && d.spent > 0) notes.push(`${pdfMoney(Math.max(0, d.spent) / d.elapsed, true)} a day on average`);
    if (d.prev > 0) notes.push(`${d.spent >= d.prev ? "up" : "down"} ${Math.abs(Math.round((d.spent / d.prev - 1) * 100))}% on ${d.prevName}${inPeriod(p, anchor) ? " at the same point" : ""}`);
    if (notes.length) { doc.text(T(`Spending: ${notes.join(", ")}.`), M, y + 4); y += 22; }
    // Chart
    const max = Math.max(0, ...d.series.map((s) => s.spent));
    if (max > 0) {
      heading(p === "year" ? "Spending month by month" : "Spending day by day");
      const ch = 110, n = d.series.length, gap = n > 20 ? 2 : 8, bwid = (TW - gap * (n - 1)) / n;
      const peak = d.series.reduce((bi, s, i) => (s.spent > d.series[bi].spent ? i : bi), 0);
      font("normal", 8, GREY); doc.text(T(`Highest: ${pdfMoney(max, true)} (${d.series[peak].long})`), M, y + 2);
      y += 10;
      doc.setDrawColor(...LIGHT); doc.line(M, y + ch, M + TW, y + ch);
      d.series.forEach((s, i) => {
        const h = (s.spent / max) * ch, x = M + i * (bwid + gap);
        if (h > 0) { doc.setFillColor(...ACC); doc.rect(x, y + ch - h, bwid, h, "F"); }
        if (n <= 12 || i === 0 || (i + 1) % 5 === 0) doc.text(T(s.label), x + bwid / 2, y + ch + 11, { align: "center" });
      });
      y += ch + 28;
    }
    // Tables
    const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "-");
    table("By category", ["Category", "Entries", "Amount", "Share"], d.cats.map((c) => [catById(c.id).name, String(c.count), pdfMoney(c.total), pct(c.total, d.spent)]), [0.46, 0.14, 0.24, 0.16], ["l", "r", "r", "r"]);
    table("By payment method", ["Method", "Entries", "Amount", "Share"], d.methods.map((x) => [METHODS[x.id] || "Other", String(x.count), pdfMoney(x.total), pct(x.total, d.spent)]), [0.46, 0.14, 0.24, 0.16], ["l", "r", "r", "r"]);
    table("Budgets", ["Budget", "Spent", "Limit", "Left"], d.budgets.map((b) => [b.name, pdfMoney(b.spent), pdfMoney(b.total), b.total - b.spent >= 0 ? pdfMoney(b.total - b.spent) : `over by ${pdfMoney(b.spent - b.total)}`]), [0.34, 0.22, 0.22, 0.22], ["l", "r", "r", "r"]);
    table("Biggest expenses", ["Date", "Description", "Category", "Amount"], d.top.map((e) => [fDate(e.date), entryTitle(e), catById(e.category).name, pdfMoney(e.amount)]), [0.14, 0.42, 0.24, 0.2], ["l", "l", "l", "r"]);
    table("All entries", ["Date", "Type", "Description", "Method", "Account", "Amount"], d.list.map((e) => [fDate(e.date), TYPES[e.type].label, entryTitle(e), METHODS[e.method] || "", e.type === "transfer" ? `${acctName(e.account)} to ${acctName(e.to)}` : acctName(e.account), `${isIn(e) ? "+" : e.type === "transfer" ? "" : "-"}${pdfMoney(e.amount)}`]), [0.1, 0.1, 0.29, 0.15, 0.18, 0.18], ["l", "l", "l", "l", "l", "r"]);
    // Page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); font("normal", 8, GREY); doc.text(T(`Spent  ·  ${d.label}`), M, H - 24); doc.text(`Page ${i} of ${pages}`, W - M, H - 24, { align: "right" }); }
    await saveFile(`spent-report-${d.slug}.pdf`, doc.output("blob"), "application/pdf");
  }

  async function exportXLSX(p, anchor) {
    const XLSX = await loadLib("xlsx");
    const d = reportData(p, anchor), cur = state.settings.currency;
    const wb = XLSX.utils.book_new();
    const sheet = (name, rows, widths, formats = {}) => {
      const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd" });
      ws["!cols"] = widths.map((w) => ({ wch: w }));
      for (const [colIdx, z] of Object.entries(formats)) for (let r = 1; r < rows.length; r++) { const ref = XLSX.utils.encode_cell({ r, c: Number(colIdx) }); if (ws[ref] && typeof ws[ref].v === "number") ws[ref].z = z; }
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    const num = "#,##0.00";
    sheet("Summary", [["Spent report", d.label], ["Created", todayISO()], ["Currency", cur], ["Entries", d.list.length], [], ["Spent", Math.max(0, d.spent)], ["Came in", d.income], [d.net >= 0 ? "Kept" : "Short by", Math.abs(d.net)], ["Savings rate", d.income > 0 ? d.net / d.income : ""]], [16, 30]);
    const wsSum = wb.Sheets.Summary;
    for (const r of [6, 7, 8]) if (wsSum[`B${r}`]) wsSum[`B${r}`].z = num;
    if (wsSum.B9 && typeof wsSum.B9.v === "number") wsSum.B9.z = "0%";
    sheet("Entries", [["Date", "Type", "Description", "Category", "Money out", "Money in", "Moved", "Account", "To account", "Method", "Person", "Pay back by", "Note"],
      ...d.list.map((e) => [parseISO(e.date), TYPES[e.type].label, entryTitle(e), e.category ? catById(e.category).name : "", outOf(e) ? e.amount : "", isIn(e) ? e.amount : "", e.type === "transfer" ? e.amount : "", acctName(e.account), e.to ? acctName(e.to) : "", METHODS[e.method] || "", e.person, e.due ? parseISO(e.due) : "", e.note])],
      [12, 11, 32, 20, 12, 12, 12, 18, 18, 14, 14, 12, 30], { 4: num, 5: num, 6: num });
    sheet("Categories", [["Category", "Entries", "Amount", "Share"], ...d.cats.map((c) => [catById(c.id).name, c.count, c.total, d.spent > 0 ? c.total / d.spent : 0])], [24, 10, 14, 10], { 2: num, 3: "0%" });
    sheet("Payment methods", [["Method", "Entries", "Amount", "Share"], ...d.methods.map((x) => [METHODS[x.id] || "Other", x.count, x.total, d.spent > 0 ? x.total / d.spent : 0])], [18, 10, 14, 10], { 2: num, 3: "0%" });
    sheet(p === "year" ? "By month" : "By day", [[p === "year" ? "Month" : "Day", "Spent", "Came in"], ...d.series.map((s) => [s.long, s.spent, s.income])], [22, 14, 14], { 1: num, 2: num });
    if (d.budgets.length) sheet("Budgets", [["Budget", "Spent", "Limit", "Carried over", "Left"], ...d.budgets.map((b) => [b.name, b.spent, b.total, b.carry, round2(b.total - b.spent)])], [22, 14, 14, 14, 14], { 1: num, 2: num, 3: num, 4: num });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    await saveFile(`spent-report-${d.slug}.xlsx`, new Blob([out], { type: mime }), mime);
  }
  async function runExport(kind, p = ui.insPeriod, anchor = ui.anchor) {
    if (kind === "csv") { const r = periodRange(p, anchor); await saveFile(`spent-entries-${reportData(p, anchor).slug}.csv`, toCSV(entriesBetween(r.from, r.to)), "text/csv"); return; }
    toast(kind === "pdf" ? "Preparing your PDF report…" : "Preparing your Excel workbook…");
    try { await (kind === "pdf" ? exportPDF(p, anchor) : exportXLSX(p, anchor)); }
    catch (e) { toast(e && /network|timeout|missing/.test(e.message) ? `The ${kind === "pdf" ? "PDF" : "Excel"} tool couldn't load. Check your connection and try again.` : "That report couldn't be made. Try again, or export a CSV instead."); }
  }

