  /* ================= helpers ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const sum = (a) => round2(a.reduce((t, n) => t + (Number(n) || 0), 0));
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + "s"}`;
  const reduced = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();

  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => iso(new Date());
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d || 1); };
  const monthOf = (s) => s.slice(0, 7);
  const addMonths = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const monthDiff = (a, b) => { const [ya, ma] = a.split("-").map(Number); const [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };
  const daysInMonth = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
  const dayInMonth = (m, day) => `${m}-${pad(Math.min(Math.max(1, day), daysInMonth(m)))}`;
  const utc = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
  const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isMonth = (s) => typeof s === "string" && /^\d{4}-\d{2}$/.test(s);

  function parseAmount(v) {
    let s = String(v ?? "").trim().replace(/\s/g, "");
    if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    s = s.replace(/[^0-9.]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? round2(n) : 0;
  }

  /* ================= locale, money, dates ================= */
  const LOCALE = (() => { try { const l = navigator.language || "en-US"; new Intl.DateTimeFormat(l); return l; } catch { return "en-US"; } })();
  const df = (o) => new Intl.DateTimeFormat(LOCALE, o);
  const DF = {
    short: df({ day: "numeric", month: "short" }),
    long: df({ day: "numeric", month: "short", year: "numeric" }),
    day: df({ weekday: "short", day: "numeric", month: "short" }),
    month: df({ month: "long", year: "numeric" }),
    monthName: df({ month: "long" }),
    mon: df({ month: "short" }),
  };
  const fDate = (s) => DF.short.format(parseISO(s));
  const fDateLong = (s) => DF.long.format(parseISO(s));
  const fDay = (s) => DF.day.format(parseISO(s));
  const fMonth = (m) => DF.month.format(parseISO(m + "-01"));
  const fMonthName = (m) => DF.monthName.format(parseISO(m + "-01"));
  const fMon = (m) => DF.mon.format(parseISO(m + "-01"));
  const relDay = (s) => { const d = daysBetween(todayISO(), s); return d === 0 ? "Today" : d === -1 ? "Yesterday" : d === 1 ? "Tomorrow" : fDate(s); };

  const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED", "CHF", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "ZAR", "NGN", "KES", "GHS", "EGP", "BRL", "MXN", "ARS", "COP", "PHP", "IDR", "MYR", "THB", "VND", "KRW", "PKR", "BDT", "LKR", "NPR", "SAR", "QAR", "TRY"];
  const SAMPLE_RATE = { USD: 1, INR: 30, EUR: .92, GBP: .79, JPY: 150, AUD: 1.52, CAD: 1.37, SGD: 1.34, AED: 3.67, CHF: .88, CNY: 7.2, HKD: 7.8, NZD: 1.65, SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 4, ZAR: 18, NGN: 1500, KES: 129, GHS: 15, EGP: 49, BRL: 5.5, MXN: 18, ARS: 950, COP: 4000, PHP: 57, IDR: 15800, MYR: 4.5, THB: 35, VND: 25000, KRW: 1350, PKR: 280, BDT: 120, LKR: 300, NPR: 133, SAR: 3.75, QAR: 3.64, TRY: 34 };
  const ZERO_DEC = ["JPY", "KRW", "VND", "IDR", "COP", "ARS"];

  function guessCurrency() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const exact = { "Asia/Kolkata": "INR", "Asia/Calcutta": "INR", "Europe/London": "GBP", "Asia/Tokyo": "JPY", "Asia/Singapore": "SGD", "Asia/Dubai": "AED", "Europe/Zurich": "CHF", "Asia/Shanghai": "CNY", "Asia/Hong_Kong": "HKD", "Pacific/Auckland": "NZD", "Europe/Stockholm": "SEK", "Europe/Oslo": "NOK", "Europe/Copenhagen": "DKK", "Europe/Warsaw": "PLN", "Africa/Johannesburg": "ZAR", "Africa/Lagos": "NGN", "Africa/Nairobi": "KES", "Africa/Accra": "GHS", "Africa/Cairo": "EGP", "America/Sao_Paulo": "BRL", "America/Mexico_City": "MXN", "America/Argentina/Buenos_Aires": "ARS", "America/Bogota": "COP", "Asia/Manila": "PHP", "Asia/Jakarta": "IDR", "Asia/Kuala_Lumpur": "MYR", "Asia/Bangkok": "THB", "Asia/Ho_Chi_Minh": "VND", "Asia/Seoul": "KRW", "Asia/Karachi": "PKR", "Asia/Dhaka": "BDT", "Asia/Colombo": "LKR", "Asia/Kathmandu": "NPR", "Asia/Katmandu": "NPR", "Asia/Riyadh": "SAR", "Asia/Qatar": "QAR", "Europe/Istanbul": "TRY", "America/Toronto": "CAD", "America/Vancouver": "CAD", "America/Edmonton": "CAD", "America/Winnipeg": "CAD", "America/Halifax": "CAD" };
      if (exact[tz]) return exact[tz];
      if (tz.startsWith("Australia/")) return "AUD";
      if (tz.startsWith("Europe/")) return "EUR";
      const region = (LOCALE.split("-")[1] || "").toUpperCase();
      const byRegion = { IN: "INR", US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", JP: "JPY", SG: "SGD", AE: "AED", NZ: "NZD", ZA: "ZAR", NG: "NGN", KE: "KES", PH: "PHP", ID: "IDR", MY: "MYR", PK: "PKR", BD: "BDT", LK: "LKR", BR: "BRL", MX: "MXN", KR: "KRW", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR" };
      if (byRegion[region]) return byRegion[region];
      if (tz.startsWith("America/")) return "USD";
    } catch { /* fall through */ }
    return "USD";
  }

  const nfCache = new Map();
  const locFor = (cur) => (cur === "INR" && /^en/i.test(LOCALE) ? "en-IN" : LOCALE);
  function nf(cur, dec, compact = false) {
    const key = `${cur}|${dec}|${compact}`;
    if (!nfCache.has(key)) {
      const o = compact ? { style: "currency", currency: cur, notation: "compact", maximumFractionDigits: dec } : { style: "currency", currency: cur, minimumFractionDigits: dec, maximumFractionDigits: dec };
      let f;
      try { f = new Intl.NumberFormat(locFor(cur), o); } catch { f = new Intl.NumberFormat("en-US", { ...o, currency: "USD" }); }
      nfCache.set(key, f);
    }
    return nfCache.get(key);
  }
  function money(n, opt = {}) {
    const v = Number(n) || 0;
    const whole = opt.whole || Math.abs(v - Math.round(v)) < 0.005;
    return nf(state.settings.currency, whole ? 0 : 2).format(whole ? Math.round(v) : v);
  }
  const compact = (v) => nf(state.settings.currency, v >= 1000 ? 1 : 0, true).format(v);
  function curSymbol() {
    try { return nf(state.settings.currency, 0).formatToParts(0).find((p) => p.type === "currency")?.value || state.settings.currency; }
    catch { return state.settings.currency; }
  }
  function currencyName(c) {
    try { return new Intl.DisplayNames([LOCALE], { type: "currency" }).of(c) || c; } catch { return c; }
  }

  /* ================= icons ================= */
  const ICONS = {
    food: '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 21V3c-2 1.2-3 3.6-3 6.5S15 14 17 14"/>',
    groceries: '<path d="M3 4h2.2l2.3 11h10.2l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    transport: '<path d="M4.5 16.5V12l1.8-4.6A2 2 0 0 1 8.2 6h7.6a2 2 0 0 1 1.9 1.4l1.8 4.6v4.5"/><path d="M3.5 12h17"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>',
    housing: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    bills: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    subscriptions: '<rect x="3" y="4.5" width="18" height="13" rx="3"/><path d="m10.5 8.5 4 2.5-4 2.5z"/><path d="M8 21h8"/>',
    shopping: '<path d="M5 8h14l-1.2 12.5H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    health: '<path d="M20.4 8.7c0 5-8.4 10.8-8.4 10.8S3.6 13.7 3.6 8.7A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.4 2.1z"/><path d="M7 11.5h2.5l1.2-2.2 2 4.2 1.3-2h3"/>',
    entertainment: '<path d="M3.5 9V6.5h17V9a2.5 2.5 0 0 0 0 5v2.5h-17V14a2.5 2.5 0 0 0 0-5z"/><path d="M14 7v2M14 11v2M14 15v1.5"/>',
    travel: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
    education: '<path d="M3.5 5.5H9a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5h-6z"/><path d="M20.5 5.5H15a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5h6z"/>',
    gifts: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5.5 12v8.5h13V12M12 8v12.5"/><path d="M12 8C10.5 4.5 7 4.5 7 6.5S10 8 12 8c2 0 5 .5 5-1.5S13.5 4.5 12 8z"/>',
    care: '<path d="M11 3.5 12.7 8l4.6 1.6-4.6 1.7L11 15.8 9.3 11.3 4.7 9.6 9.3 8z"/><path d="m18 14.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    pets: '<circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 11c-3 0-5.5 4.5-5.5 6.5 0 1.5 1.2 2.5 2.7 2.5 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.5 0 2.7-1 2.7-2.5 0-2-2.5-6.5-5.5-6.5z"/>',
    other: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z"/><circle cx="8" cy="8" r="1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pause: '<path d="M9 5.5v13M15 5.5v13"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/>',
    list: '<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11"/><circle cx="4.5" cy="6.5" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17.5" r="1"/>',
    repeat: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>',
    chart: '<path d="M4 20.5h16"/><path d="M6.5 17v-6M11 17V5.5M15.5 17V9M20 17v-4.5"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>',
    upload: '<path d="M12 15.5v-11M7 9l5-5 5 5M4.5 20h15"/>',
  };
  const CAT_ICONS = ["food", "groceries", "transport", "housing", "bills", "subscriptions", "shopping", "health", "entertainment", "travel", "education", "gifts", "care", "pets", "other"];
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.other}</svg>`;

