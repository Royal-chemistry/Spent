  /* ================= import from a bank statement, a spreadsheet or a CSV ================= */
  /* Files are read on this device only. Nothing is uploaded, and Spent never asks for bank logins, PINs or passwords. */
  const LIBS = {
    xlsx: { url: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", get: () => window.XLSX },
    pdf: { url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", get: () => window.jspdf && window.jspdf.jsPDF },
  };
  const libCache = {};
  /* Loads a library the first time it's needed, so the app itself stays small. */
  function loadLib(name) {
    const L = LIBS[name];
    if (L.get()) return Promise.resolve(L.get());
    if (!libCache[name]) {
      libCache[name] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = L.url; s.async = true;
        const timer = setTimeout(() => reject(new Error("timeout")), 25000);
        s.onload = () => { clearTimeout(timer); L.get() ? resolve(L.get()) : reject(new Error("missing")); };
        s.onerror = () => { clearTimeout(timer); reject(new Error("network")); };
        document.head.appendChild(s);
      }).catch((e) => { delete libCache[name]; throw e; });
    }
    return libCache[name];
  }

  /* ---------- reading rows ---------- */
  function csvRows(text, d) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"' && cell.trim() === "") { q = true; cell = ""; continue; }
      if (ch === d) { row.push(cell); cell = ""; continue; }
      if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
      cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
  }
  function parseDelimited(text) {
    text = String(text || "").replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 40);
    let best = ",", bestScore = -1;
    for (const d of [",", ";", "\t", "|"]) {
      const counts = lines.map((l) => csvRows(l, d)[0]?.length || 0);
      const freq = new Map(); for (const c of counts) freq.set(c, (freq.get(c) || 0) + 1);
      const [mode, n] = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] || [0, 0];
      const score = mode > 1 ? n * mode : 0;
      if (score > bestScore) { best = d; bestScore = score; }
    }
    return csvRows(text, best);
  }
  async function sheetRows(buf) {
    const XLSX = await loadLib("xlsx");
    // Dates stay as Excel's day numbers, which read the same in every country; text dates stay as text
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }).map((r) => r.map((c) => String(c ?? "").trim())).filter((r) => r.some(Boolean));
  }

  /* ---------- understanding the columns ---------- */
  const COLS = {
    date: /(^|\b)(txn|transaction|trans|tran|posting|value|booking)?\s*\.?\s*date\b|^date|dated/i,
    desc: /narration|description|particulars|details|remarks|merchant|payee|memo|^transaction$|^name$|^title$/i,
    debit: /debit|withdrawal|withdrawl|paid out|money out|^dr\.?$|^out$|spent/i,
    credit: /credit|deposit|paid in|money in|^cr\.?$|^in$|received/i,
    amount: /amount|^amt|^value$|^sum$/i,
    type: /^type$|dr\s*\/\s*cr|cr\s*\/\s*dr|debit\s*\/\s*credit|txn type|transaction type/i,
    category: /^category/i,
    note: /^notes?$|reference|ref\.?\s*no|cheque|chq/i,
  };
  const FIELDS = [["date", "Date", true], ["desc", "Description"], ["debit", "Money out"], ["credit", "Money in"], ["amount", "Amount (one column, in and out)"], ["type", "Debit or credit column"], ["category", "Category"], ["note", "Note or reference"]];
  const isSpentExport = (h) => ["date", "type", "description", "category", "amount", "account"].every((k) => h.map((x) => x.toLowerCase()).includes(k));
  function findHeader(rows) {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const r = rows[i];
      const hits = r.filter((c) => c && c.length < 40 && (COLS.date.test(c) || COLS.desc.test(c) || COLS.debit.test(c) || COLS.credit.test(c) || COLS.amount.test(c))).length;
      if (hits >= 2 && r.some((c) => COLS.date.test(c))) return i;
    }
    return 0;
  }
  function guessMap(header) {
    const map = {}, used = new Set();
    const pick = (key, test) => {
      const i = header.findIndex((h, j) => !used.has(j) && h && !/balance/i.test(h) && test(h));
      if (i >= 0) { map[key] = i; used.add(i); }
    };
    pick("date", (h) => COLS.date.test(h) && !/value/i.test(h));
    if (map.date === undefined) pick("date", (h) => COLS.date.test(h));
    pick("debit", (h) => COLS.debit.test(h) && !COLS.type.test(h));
    pick("credit", (h) => COLS.credit.test(h) && !COLS.type.test(h));
    pick("type", (h) => COLS.type.test(h));
    if (map.debit === undefined || map.credit === undefined) pick("amount", (h) => COLS.amount.test(h));
    pick("desc", (h) => COLS.desc.test(h));
    pick("category", (h) => COLS.category.test(h));
    pick("note", (h) => COLS.note.test(h));
    return map;
  }
  /* Reads the date order from the data: a first part above 12 means day first. */
  function guessOrder(values) {
    let dayFirst = 0, monthFirst = 0;
    for (const v of values) {
      const m = String(v).match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
      if (!m) continue;
      if (Number(m[1]) > 12) dayFirst++;
      if (Number(m[2]) > 12) monthFirst++;
    }
    if (dayFirst > monthFirst) return "dmy";
    if (monthFirst > dayFirst) return "mdy";
    return /^en-us$/i.test(LOCALE) ? "mdy" : "dmy";
  }
  function parseDateCell(v, order) {
    const s = String(v || "").trim();
    if (!s) return "";
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if ((m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/))) {
      let y = Number(m[3]); if (y < 100) y += 2000;
      return order === "mdy" ? validDate(y, Number(m[1]), Number(m[2])) : validDate(y, Number(m[2]), Number(m[1]));
    }
    if ((m = s.match(/^(\d{1,2})[\s\-/]*([a-z]{3,9})[\s\-/,]*(\d{2,4})/i))) { const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1; let y = Number(m[3]); if (y < 100) y += 2000; return mon ? validDate(y, mon, Number(m[1])) : ""; }
    if ((m = s.match(/^([a-z]{3,9})[\s\-/]*(\d{1,2}),?[\s\-/]*(\d{2,4})/i))) { const mon = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1; let y = Number(m[3]); if (y < 100) y += 2000; return mon ? validDate(y, mon, Number(m[2])) : ""; }
    if (/^\d{5}(\.\d+)?$/.test(s)) { const n = Math.floor(Number(s)); if (n > 20000 && n < 80000) { const dt = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return validDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); } }
    return "";
  }
  function validDate(y, m, d) {
    if (!(y > 1970 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return "";
    const s = `${y}-${pad(m)}-${pad(d)}`;
    return d <= daysInMonth(`${y}-${pad(m)}`) ? s : "";
  }
  /* "1,234.50", "(500)", "-₹200", "350 Dr" and "1.234,50" all read the way a bank means them. */
  function parseMoneyCell(v) {
    let s = String(v ?? "").trim();
    if (!s || s === "-") return null;
    let sign = 1;
    if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
    if (/\bdr\.?$/i.test(s)) { sign = -1; s = s.replace(/\bdr\.?$/i, ""); }
    s = s.replace(/\bcr\.?$/i, "");
    if (/^\s*[-−]/.test(s) || /[-−]\s*$/.test(s)) sign = -1;
    s = s.replace(/[^\d.,]/g, "");
    if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    s = s.replace(/,/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? round2(n * sign) : null;
  }
  /* Bank narrations are noisy: "UPI/DR/412345678901/SWIGGY/YESB/swiggy@ybl/Payment" becomes "Swiggy",
     "NEFT CR-ICIC0000003-RAHUL SHARMA-REPAY" becomes "Rahul Sharma". */
  const CHANNEL = /^(upi|neft|imps|rtgs|ach|nach|ecs|nwd|atm|pos|ecom|mmt|inb|bil|billpay|cms|ib)\b/i;
  const STOP = /^(upi|dr|cr|d|c|p2m|p2a|imps|neft|rtgs|ach|nach|ecs|neft cr|neft dr|rtgs cr|rtgs dr|imps p2a|imps p2m|ach d|ach c|ach dr|ach cr|nach dr|payment|pay|paid|sent|received|txn|ref|collect|upi intent|transfer|mmt|inb|bil|repay|onl)$/i;
  function cleanNarration(raw) {
    let s = String(raw || "").replace(/\s+/g, " ").trim().replace(/^(by|to)\s+transfer\s*[-:]?\s*/i, "");
    if (isAtm(s)) return "Cash withdrawal";
    const parts = s.split(/\s*[/\-|:*]+\s*/).filter(Boolean);
    if (parts.length > 1 && (CHANNEL.test(parts[0]) || /@[a-z]{2,}/i.test(s))) {
      const good = parts.filter((p) => /\p{L}{3,}/u.test(p) && !STOP.test(p) && !/@/.test(p) && !/\d{5,}/.test(p) && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(p));
      if (good.length) s = good[0];
    } else {
      s = s.replace(/\b(pos|ecom|txn|ref|purchase|debit card|card no)\b[:.#]?/gi, " ").replace(/\b\d{0,6}[x*]{4,}\d{0,4}\b/gi, " ").replace(/\b\d{6,}\b/g, " ").replace(/\s+/g, " ").trim();
    }
    if (s && s === s.toUpperCase() && /\p{L}/u.test(s)) s = s.toLowerCase().replace(/(^|[\s(&])\p{L}/gu, (c) => c.toUpperCase());
    return s.slice(0, 80) || "Imported entry";
  }
  function methodFromText(raw, acctType, type) {
    const s = String(raw || "");
    if (/\bupi\b|@(ok|ybl|ibl|axl|paytm|apl|upi)\w*/i.test(s)) return "upi";
    if (/\b(neft|imps|rtgs|ach|nach|ecs|bank transfer|salary)\b/i.test(s)) return "bank";
    if (/\b(atm|cash wdl|cash withdrawal|cwdr|nwd)\b/i.test(s)) return "cash";
    if (/\b(pos|visa|mastercard|rupay|card|ecom)\b/i.test(s)) return acctType === "card" ? "credit" : "debit";
    if (IN_TYPES.has(type) && acctType === "bank") return "bank";
    return methodFor(acctType, state.settings.currency);
  }
  const isAtm = (raw) => /\b(atm|cash wdl|cash withdrawal|cwdr|nwd)\b/i.test(String(raw || ""));
  const isReversal = (raw) => /\b(refund|reversal|reversed|cashback|rev)\b/i.test(String(raw || ""));

  /* Turns every row into an entry, or says why it couldn't. */
  function buildImport(imp) {
    const { rows, header, map, opts } = imp;
    const spentFile = isSpentExport(header);
    const H = header.map((h) => h.toLowerCase());
    const col = (r, key) => (map[key] === undefined || map[key] === "" ? "" : r[map[key]] ?? "");
    const spentCol = (r, name) => { const i = H.indexOf(name); return i >= 0 ? r[i] ?? "" : ""; };
    const account = acctById(opts.account);
    const cash = state.accounts.find((a) => a.type === "cash" && !a.archived && a.id !== opts.account);
    const byName = (n) => state.accounts.find((a) => a.name.toLowerCase() === String(n || "").trim().toLowerCase());
    const typeByLabel = Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [t.label.toLowerCase(), k]));
    const methodByLabel = Object.fromEntries(Object.entries(METHODS).map(([k, l]) => [l.toLowerCase(), k]));
    // Existing entries that a row could duplicate, counted so two real coffees on one day both stay
    const existing = new Map();
    for (const e of state.entries) { const k = `${e.date}|${e.amount}|${e.account}|${isIn(e) ? "in" : "out"}`; existing.set(k, (existing.get(k) || 0) + 1); }
    const out = [];
    for (const r of rows) {
      const raw = spentFile ? spentCol(r, "description") : col(r, "desc");
      const date = parseDateCell(col(r, "date"), opts.order);
      if (!date) { out.push({ status: "bad", why: "No date we could read", raw: r.join(" · ").slice(0, 80) }); continue; }
      let type, amount;
      if (spentFile) {
        type = typeByLabel[String(spentCol(r, "type")).toLowerCase()] || "expense";
        amount = Math.abs(parseMoneyCell(spentCol(r, "amount")) || 0);
      } else if (map.debit !== undefined || map.credit !== undefined) {
        const dr = Math.abs(parseMoneyCell(col(r, "debit")) || 0), cr = Math.abs(parseMoneyCell(col(r, "credit")) || 0);
        if (dr > 0) { type = "expense"; amount = dr; } else if (cr > 0) { type = "income"; amount = cr; }
      } else {
        const n = parseMoneyCell(col(r, "amount"));
        if (n) {
          amount = Math.abs(n);
          const t = String(col(r, "type")).trim();
          if (t) type = /^(dr|d|debit|withdrawal|out|expense|paid)/i.test(t) ? "expense" : "income";
          else type = (n < 0) === (opts.negative === "out") ? "expense" : "income";
        }
      }
      if (!(amount > 0)) { out.push({ status: "bad", why: "No amount", raw: r.join(" · ").slice(0, 80) }); continue; }
      let acct = account, to = "";
      if (spentFile) { acct = byName(spentCol(r, "account")) || account; const t = byName(spentCol(r, "to account")); if (type === "transfer") to = t && t.id !== acct.id ? t.id : ""; }
      if (type === "transfer" && !to) type = "expense";
      if (!spentFile && type === "expense" && opts.atm && cash && isAtm(raw)) { type = "transfer"; to = cash.id; }
      if (!spentFile && type === "income" && isReversal(raw)) type = "refund";
      const title = spentFile ? String(raw).slice(0, 80) : cleanNarration(raw);
      const kind = TYPES[type].cat;
      let category = "";
      if (kind) {
        const named = String(spentFile ? spentCol(r, "category") : col(r, "category")).trim().toLowerCase();
        const byCat = named && state.categories.find((c) => c.kind === kind && c.name.toLowerCase() === named);
        category = byCat ? byCat.id : (guessCategory(title, kind) || guessCategory(raw, kind) || { id: kind === "income" ? "other-in" : "other" }).id;
      }
      const method = type === "transfer" ? "" : spentFile ? methodByLabel[String(spentCol(r, "method")).toLowerCase()] || methodFor(acct.type, state.settings.currency) : methodFromText(raw, acct.type, type);
      const person = TYPES[type].person ? String(spentCol(r, "person")).trim().slice(0, 40) || "Someone" : "";
      const noteBits = [spentFile ? spentCol(r, "note") : col(r, "note"), !spentFile && title !== String(raw).trim() ? String(raw).trim() : ""].filter(Boolean);
      const e = {
        id: uid(), type, title: title === "Imported entry" ? "" : title, amount, category, date, account: acct.id, to, person, note: noteBits.join(" · ").slice(0, 140),
        recurringId: null, method, due: spentFile && isDate(spentCol(r, "pay back by")) ? spentCol(r, "pay back by") : "",
        ...(spentFile ? foreign({ cur: spentCol(r, "original currency"), orig: parseMoneyCell(spentCol(r, "original amount")), rate: parseRate(spentCol(r, "rate")) }, state.settings.currency) : { cur: "", orig: 0, rate: 0 }),
      };
      const key = `${e.date}|${e.amount}|${e.account}|${isIn(e) ? "in" : "out"}`;
      if (opts.skipDupes && existing.get(key) > 0) { existing.set(key, existing.get(key) - 1); out.push({ status: "dupe", e }); continue; }
      out.push({ status: "new", e });
    }
    return out;
  }

  /* ---------- the import sheet ---------- */
  function importSheet() {
    const live = state.accounts.filter((a) => !a.archived);
    const imp = { name: "", rows: [], header: [], map: {}, opts: { account: (live.find((a) => a.type === "bank") || live[0] || {}).id || "", order: "dmy", negative: "out", skipDupes: true, atm: true } };
    let result = [];
    const pickStep = (msg = "") => `
      <p class="sheet-intro">Bring in transactions from your bank's CSV or Excel download, or from a CSV exported from Spent. Most banks offer one under statements or account history.</p>
      <div class="import-drop">
        <label class="btn primary">${svg("upload")}Choose a file<input type="file" id="imp-file" class="sr" accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label>
        <span class="hint">CSV, TXT, XLSX or XLS</span>
      </div>
      <label class="field"><span class="lab">Or paste the rows here</span><textarea class="copybox" id="imp-paste" placeholder="Date,Description,Amount&#10;12/11/2026,Swiggy,-420"></textarea></label>
      <p class="err" id="imp-err"${msg ? "" : " hidden"}>${esc(msg)}</p>
      <p class="hint">Your file is read on this device only and never uploaded. Spent never asks for bank logins, UPI PINs or passwords.</p>`;
    const colOptions = () => [["", "Not in this file"], ...imp.header.map((h, i) => [String(i), `${h || `Column ${i + 1}`}${imp.rows[0]?.[i] ? ` (e.g. ${String(imp.rows[0][i]).slice(0, 24)})` : ""}`])];
    const mapStep = () => {
      result = buildImport(imp);
      const n = { new: 0, dupe: 0, bad: 0 }; for (const x of result) n[x.status]++;
      const spentFile = isSpentExport(imp.header);
      const preview = result.slice(0, 8).map((x) => x.e
        ? `<tr class="${x.status}"><td>${esc(fDate(x.e.date))}</td><td>${esc(entryTitle(x.e))}</td><td>${esc(x.e.category ? catById(x.e.category, TYPES[x.e.type].cat).name : TYPES[x.e.type].label)}</td><td class="${isIn(x.e) ? "in" : ""}">${isIn(x.e) ? "+" : ""}${esc(money(x.e.amount))}</td><td>${x.status === "dupe" ? "Already here" : "New"}</td></tr>`
        : `<tr class="bad"><td colspan="4">${esc(x.raw)}</td><td>${esc(x.why)}</td></tr>`).join("");
      return `
        <p class="sheet-intro"><b>${esc(imp.name)}</b>: ${plural(imp.rows.length, "row")}. ${spentFile ? "This is a Spent export, so its types, accounts and methods come across as they are." : "Check the columns below. They're matched from the file's headings."}</p>
        ${spentFile ? "" : `<div class="grid2">${FIELDS.map(([k, label, req]) => `<label class="field"><span class="lab">${label}${req ? "" : ' <span class="opt-lab">(if there is one)</span>'}</span>${select("imp-" + k, colOptions(), imp.map[k] === undefined ? "" : String(imp.map[k]), ` data-map="${k}"`)}</label>`).join("")}</div>`}
        <div class="grid2">
          <label class="field"><span class="lab">${spentFile ? "Account for rows without one" : "Import into"}</span>${select("imp-account", acctOptions(live), imp.opts.account)}</label>
          <label class="field"><span class="lab">Dates are written</span>${select("imp-order", [["dmy", "Day first (31/12/2026)"], ["mdy", "Month first (12/31/2026)"]], imp.opts.order)}</label>
          ${!spentFile && imp.map.amount !== undefined && imp.map.debit === undefined && imp.map.type === undefined ? `<label class="field"><span class="lab">A minus sign means</span>${select("imp-negative", [["out", "Money out"], ["in", "Money in"]], imp.opts.negative)}</label>` : ""}
        </div>
        <label class="check"><input type="checkbox" id="imp-dupes"${imp.opts.skipDupes ? " checked" : ""}><span>Skip rows that are already in Spent<small>Same date, amount and account as an existing entry.</small></span></label>
        ${spentFile ? "" : `<label class="check"><input type="checkbox" id="imp-atm"${imp.opts.atm ? " checked" : ""}><span>Treat ATM withdrawals as moving money into Cash<small>So they don't count as spending.</small></span></label>`}
        <div class="imp-sum"><span><b>${n.new}</b> to import</span>${n.dupe ? `<span><b>${n.dupe}</b> already here</span>` : ""}${n.bad ? `<span class="warn"><b>${n.bad}</b> couldn't be read</span>` : ""}</div>
        <div class="tbl-scroll imp-preview"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead><tbody>${preview}</tbody></table></div>
        ${result.length > 8 ? `<p class="hint">Showing the first 8 of ${plural(result.length, "row")}. Categories are picked from your past entries and common words; you can change any of them afterwards.</p>` : ""}`;
    };
    const step = (which, msg) => {
      $("#sheet-body").innerHTML = which === "pick" ? pickStep(msg) : mapStep();
      const n = result.filter((x) => x.status === "new").length;
      $("#sheet-foot").hidden = false;
      $("#sheet-foot").innerHTML = which === "pick"
        ? `<button type="button" class="btn" data-sheet-close>Cancel</button><button type="button" class="btn primary" data-act="sheet" data-k="paste">Read pasted rows</button>`
        : `<button type="button" class="btn" data-act="sheet" data-k="back">${svg("left")}Choose another file</button><span class="spacer"></span><button type="submit" class="btn primary"${n ? "" : " disabled"}>Import ${plural(n, "entry", "entries")}</button>`;
    };
    const loadRows = (rows, name) => {
      if (!rows.length) { step("pick", "That file has no rows we could read."); return; }
      if (rows.length > 5001) rows = rows.slice(0, 5001);
      const h = findHeader(rows);
      imp.name = name; imp.header = rows[h].map((c) => String(c)); imp.rows = rows.slice(h + 1).filter((r) => r.length > 1 || r[0]);
      imp.map = guessMap(imp.header);
      imp.opts.order = guessOrder(imp.rows.slice(0, 200).map((r) => r[imp.map.date ?? 0]));
      if (!imp.rows.length) { step("pick", "We found headings but no transactions under them."); return; }
      step("map");
    };
    openSheet({
      title: "Import transactions", body: pickStep(), foot: "",
      onMount(card) {
        step("pick");
        card.addEventListener("change", async (e) => {
          const t = e.target;
          if (t.id === "imp-file") {
            const f = t.files?.[0]; t.value = "";
            if (!f) return;
            if (f.size > 15 * 1024 * 1024) { step("pick", "That file is over 15 MB. Export a shorter date range from your bank."); return; }
            $("#sheet-body").innerHTML = `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>Reading ${esc(f.name)}…</div>`;
            try {
              if (/\.xlsx?$/i.test(f.name)) loadRows(await sheetRows(await f.arrayBuffer()), f.name);
              else loadRows(parseDelimited(await f.text()), f.name);
            } catch (err) {
              step("pick", err && /network|timeout|missing/.test(err.message) ? "The spreadsheet reader couldn't load. Check your connection, or save the file as CSV and try again." : "That file couldn't be read. Try saving it as CSV from your bank or spreadsheet app.");
            }
            return;
          }
          if (t.dataset.map) { if (t.value === "") delete imp.map[t.dataset.map]; else imp.map[t.dataset.map] = Number(t.value); step("map"); return; }
          if (t.id === "imp-account") { imp.opts.account = t.value; step("map"); }
          if (t.id === "imp-order") { imp.opts.order = t.value; step("map"); }
          if (t.id === "imp-negative") { imp.opts.negative = t.value; step("map"); }
          if (t.id === "imp-dupes") { imp.opts.skipDupes = t.checked; step("map"); }
          if (t.id === "imp-atm") { imp.opts.atm = t.checked; step("map"); }
        });
      },
      onAct(k) {
        if (k === "back") { step("pick"); return; }
        if (k === "paste") { const text = val("imp-paste"); if (!text) { step("pick", "Paste some rows first, or choose a file."); return; } loadRows(parseDelimited(text), "Pasted rows"); }
      },
      onSubmit() {
        const add = result.filter((x) => x.status === "new").map((x) => x.e);
        if (!add.length) return false;
        withUndo(() => { state.entries.push(...add); }, `${plural(add.length, "entry", "entries")} imported`);
      },
    });
  }

