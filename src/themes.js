/* Themes. Each one is ten colours per mode plus a few type and shape settings; every other token is derived from those.
   This runs before the page is drawn, so a returning visitor never sees a flash of the wrong theme. */
(() => {
  const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const ARCHIVO = '"Archivo", "Helvetica Neue", Arial, sans-serif';
  const INSTRUMENT = '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const BRICOLAGE = '"Bricolage Grotesque", "Trebuchet MS", "Segoe UI", sans-serif';
  const SERIF = '"Fraunces", "Iowan Old Style", Georgia, "Times New Roman", serif';
  const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  // Colour order: page, raised, card, hover, text, text 2, text 3, accent, accent hover, text on accent.
  const SKINS = [
    { id: "cinema", name: "Cinema", note: "Black, red and wide headlines", display: ARCHIVO, text: INSTRUMENT,
      dark: ["#09090B", "#131317", "#1C1C22", "#25252D", "#F4F4F6", "#A9A9B4", "#85858F", "#E11D2E", "#F43F4F", "#FFFFFF"],
      light: ["#FFFFFF", "#F4F4F6", "#EAEAEF", "#E2E2E9", "#0B0B10", "#52525E", "#6B6B77", "#D8102C", "#EE1F3A", "#FFFFFF"] },
    { id: "cupertino", name: "Cupertino", note: "Calm greys, blue and system type", display: SYS, text: SYS, ls: .5, hero: 700, head: 600, brand: 800, numw: .6, r: [10, 18, 26],
      dark: ["#000000", "#1C1C1E", "#2C2C2E", "#3A3A3C", "#F5F5F7", "#AEAEB2", "#8E8E93", "#0071E3", "#2B8DF5", "#FFFFFF"],
      light: ["#F5F5F7", "#FFFFFF", "#E8E8ED", "#DEDEE4", "#1D1D1F", "#515154", "#6A6A70", "#0068D1", "#0A7BF0", "#FFFFFF"] },
    { id: "aurora", name: "Aurora", note: "Deep green with a mint glow", display: BRICOLAGE, text: INSTRUMENT, ls: .6, numw: .58,
      dark: ["#06100D", "#0D1A16", "#14251F", "#1C3229", "#ECF7F2", "#9FBDB1", "#7D9A8E", "#34D399", "#5EE4B0", "#04130D"],
      light: ["#F3FAF6", "#FFFFFF", "#E1F0E8", "#D3E7DC", "#0A1F17", "#3F5B50", "#566E63", "#0B7A4B", "#0E9459", "#FFFFFF"] },
    { id: "ultraviolet", name: "Ultraviolet", note: "Indigo night, violet light", display: ARCHIVO, text: INSTRUMENT,
      dark: ["#0B0814", "#151026", "#1F1836", "#2A2147", "#F1EEFB", "#B1A9CC", "#8D85AB", "#7C4DEE", "#946BF5", "#FFFFFF"],
      light: ["#F7F5FF", "#FFFFFF", "#EBE6FB", "#DFD8F6", "#150F2B", "#4C4468", "#665E84", "#6D3FE0", "#7C4DEE", "#FFFFFF"] },
    { id: "ember", name: "Ember", note: "Warm charcoal and orange", display: BRICOLAGE, text: INSTRUMENT, ls: .6, numw: .58,
      dark: ["#100B08", "#1A130E", "#261C15", "#33261C", "#FBF3EC", "#C7B3A3", "#9E8A7A", "#FF8A3D", "#FFA366", "#1F0E02"],
      light: ["#FFF8F2", "#FFFFFF", "#F6E9DD", "#EEDCCC", "#23140A", "#5E4A3C", "#756051", "#C2500A", "#D9601A", "#FFFFFF"] },
    { id: "ledger", name: "Ledger", note: "Ink on paper, serif figures", display: SERIF, text: INSTRUMENT, ls: .3, hero: 600, head: 600, brand: 700, numw: .56, r: [4, 8, 12],
      dark: ["#11100C", "#1A1813", "#25221B", "#312D24", "#F3EEE1", "#BDB5A2", "#968E7B", "#8FD4B4", "#A9E2C7", "#0A1A12"],
      light: ["#F6F3EA", "#FFFDF7", "#EBE6D8", "#E0DACA", "#1B1A16", "#565243", "#6E6957", "#1F5F4A", "#287A5F", "#FFFFFF"] },
    { id: "terminal", name: "Terminal", note: "Green phosphor, monospace", display: MONO, text: MONO, ls: 0, hero: 700, head: 700, brand: 800, numw: .66, r: [3, 5, 8],
      dark: ["#040704", "#0A100A", "#111A11", "#182418", "#D8F5D8", "#8FBF8F", "#709A70", "#3DDC84", "#6BE9A3", "#021207"],
      light: ["#F1F6EE", "#FBFDF9", "#E2EBDD", "#D5E0CF", "#0B1A0B", "#3C553C", "#536B53", "#0B6E32", "#0E8A3F", "#FFFFFF"] },
    { id: "sakura", name: "Sakura", note: "Soft pink, rounder corners", display: BRICOLAGE, text: INSTRUMENT, ls: .6, numw: .58, r: [12, 20, 30],
      dark: ["#130A0F", "#1E1118", "#2A1822", "#37202D", "#FBEFF4", "#CDAEBC", "#A68998", "#F472B6", "#F892C6", "#2A0A1A"],
      light: ["#FFF5F9", "#FFFFFF", "#FAE4EE", "#F3D5E3", "#2A0F1C", "#6B4658", "#825D70", "#C2256E", "#D63B83", "#FFFFFF"] },
    { id: "graphite", name: "Graphite", note: "No colour, just contrast", display: ARCHIVO, text: INSTRUMENT,
      dark: ["#0C0C0C", "#161616", "#202020", "#2B2B2B", "#F2F2F2", "#ABABAB", "#878787", "#F2F2F2", "#FFFFFF", "#0C0C0C"],
      light: ["#FAFAFA", "#FFFFFF", "#EDEDED", "#E2E2E2", "#111111", "#555555", "#6B6B6B", "#111111", "#333333", "#FFFFFF"] },
  ];

  const alpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
  function tokens(c, mode) {
    const [bg, raise, card, hover, fg, fg2, fg3, accent, accentHi, ink] = c;
    const dark = mode === "dark";
    return {
      "--bg": bg, "--bg-raise": raise, "--bg-card": card, "--bg-hover": hover,
      "--line": alpha(fg, dark ? .09 : .1), "--line-strong": alpha(fg, dark ? .22 : .24),
      "--fg": fg, "--fg-2": fg2, "--fg-3": fg3,
      "--accent": accent, "--accent-hi": accentHi, "--accent-ink": ink, "--accent-soft": alpha(accent, dark ? .2 : .12),
      "--good": dark ? "#42D893" : "#087A49", "--good-soft": dark ? "rgba(66, 216, 147, .14)" : "rgba(8, 122, 73, .1)",
      "--warn": dark ? "#F7B538" : "#8F5000", "--warn-soft": dark ? "rgba(247, 181, 56, .15)" : "rgba(200, 120, 0, .13)",
      "--bad": dark ? "#FF6B7A" : "#C8102E", "--bad-soft": dark ? "rgba(255, 107, 122, .16)" : "rgba(200, 16, 46, .1)", "--bad-ink": dark ? "#2A0509" : "#FFFFFF",
      "--glass": alpha(bg, dark ? .74 : .8), "--scrim": dark ? "rgba(0, 0, 0, .6)" : "rgba(10, 10, 20, .4)",
      "--shadow": dark ? "0 28px 60px -22px rgba(0, 0, 0, .85)" : "0 28px 60px -26px rgba(20, 20, 45, .35)",
      "--play-bg": fg, "--play-fg": bg, "--ghost-bg": dark ? "rgba(128, 128, 142, .32)" : alpha(fg, .08), "--ghost-fg": dark ? "#FFFFFF" : fg,
    };
  }
  function skinCSS(k) {
    const sel = `:root[data-skin="${k.id}"]`;
    const colours = (mode) => Object.entries(tokens(k[mode], mode)).map(([p, v]) => `${p}:${v}`).join(";") + `;color-scheme:${mode}`;
    const r = k.r || [8, 14, 22];
    const shape = `--font-display:${k.display};--font-text:${k.text};--ls:${k.ls ?? 1};--w-hero:${k.hero || 800};--w-head:${k.head || 700};--w-brand:${k.brand || 900};--num-w:${k.numw || .64};--r-s:${r[0]}px;--r-m:${r[1]}px;--r-l:${r[2]}px`;
    return `${sel}{${shape};${colours("dark")}}\n@media (prefers-color-scheme: light){${sel}:not([data-theme="dark"]){${colours("light")}}}\n${sel}[data-theme="light"]{${colours("light")}}\n${sel}[data-theme="dark"]{${colours("dark")}}`;
  }

  const style = document.createElement("style");
  style.id = "skins";
  style.textContent = SKINS.map(skinCSS).join("\n");
  document.currentScript.insertAdjacentElement("afterend", style);

  const root = document.documentElement;
  const hostTheme = root.getAttribute("data-theme");
  let settings = {};
  try { settings = (JSON.parse(localStorage.getItem("spent.v2") || "null") || {}).settings || {}; } catch { settings = {}; }
  root.setAttribute("data-skin", SKINS.some((k) => k.id === settings.skin) ? settings.skin : "cinema");
  if (settings.mode === "dark" || settings.mode === "light") root.setAttribute("data-theme", settings.mode);
  window.__spent = { SKINS, tokens, hostTheme };
})();
