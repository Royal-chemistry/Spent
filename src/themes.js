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
    /* Glass: a fixed, grainy blue haze behind see-through surfaces. The colour arrays here are for previews and for
       the few places that need a solid colour; `extra` replaces the surface tokens with translucent ones. */
    { id: "mist", name: "Mist", note: "Grainy blue haze, frosted glass", display: INSTRUMENT, text: INSTRUMENT, ls: .5, hero: 600, head: 600, brand: 700, numw: .6, r: [12, 18, 24], glass: true,
      glow: { dark: ["rgba(104, 142, 186, .8)", "rgba(112, 106, 162, .6)"], light: ["rgba(255, 255, 255, .95)", "rgba(186, 180, 224, .75)"] },
      dark: ["#090D14", "#1B2535", "#2A3850", "#33425A", "#F4F7FB", "#DAE2EB", "#C2CCD8", "#E4ECF7", "#FFFFFF", "#0B1220"],
      light: ["#E8EDF3", "#F4F7FA", "#D5DEE8", "#C9D4E0", "#0D1622", "#2C3746", "#3F4A56", "#1B2E47", "#26405F", "#FFFFFF"],
      extra: {
        dark: {
          "--bg-raise": "rgba(9, 14, 22, .38)", "--bg-card": "rgba(9, 14, 22, .52)", "--bg-hover": "rgba(255, 255, 255, .1)",
          "--line": "rgba(255, 255, 255, .13)", "--line-strong": "rgba(255, 255, 255, .26)", "--glass": "rgba(8, 12, 19, .5)", "--scrim": "rgba(2, 4, 8, .5)",
          "--field": "rgba(4, 8, 14, .4)", "--sheet-bg": "rgba(13, 19, 30, .68)", "--opt-bg": "#121A27", "--series-2": "#6F98CF",
          "--glass-edge": "rgba(255, 255, 255, .17)", "--glass-hi": "rgba(255, 255, 255, .12)", "--hero-shade": "rgba(4, 7, 12, .32)",
          "--tint": "42%", "--tint-top": "26%", "--tint-ico": "62%", "--poster-floor": "rgba(255, 255, 255, .02)",
          "--mist-a": "#0A0F17", "--mist-b": "#1A2638", "--mist-c": "#152031", "--mist-d": "#07090E",
          "--mist-shaft": "rgba(104, 142, 186, .4)", "--mist-shaft-2": "rgba(122, 158, 200, .24)", "--mist-lav": "rgba(112, 106, 162, .34)",
          "--mist-low": "rgba(84, 104, 150, .26)", "--mist-ray": "rgba(158, 190, 228, .11)", "--mist-vig": "rgba(3, 5, 9, .8)", "--grain": ".32", "--grain-blend": "overlay",
        },
        light: {
          "--bg-raise": "rgba(255, 255, 255, .42)", "--bg-card": "rgba(255, 255, 255, .58)", "--bg-hover": "rgba(255, 255, 255, .72)",
          "--line": "rgba(16, 28, 46, .12)", "--line-strong": "rgba(16, 28, 46, .24)", "--glass": "rgba(236, 241, 247, .6)",
          "--field": "rgba(255, 255, 255, .58)", "--sheet-bg": "rgba(240, 244, 249, .76)", "--opt-bg": "#FFFFFF", "--series-2": "#5E7798",
          "--good": "#066B40", "--good-soft": "rgba(6, 107, 64, .12)",
          "--glass-edge": "rgba(255, 255, 255, .6)", "--glass-hi": "rgba(255, 255, 255, .7)", "--hero-shade": "rgba(255, 255, 255, .3)",
          "--tint": "86%", "--tint-top": "76%", "--tint-ico": "86%", "--poster-floor": "rgba(12, 18, 28, .34)",
          "--mist-a": "#EEF2F7", "--mist-b": "#D3DDE9", "--mist-c": "#DAE1EB", "--mist-d": "#EDF0F5",
          "--mist-shaft": "rgba(255, 255, 255, .72)", "--mist-shaft-2": "rgba(255, 255, 255, .5)", "--mist-lav": "rgba(186, 180, 224, .42)",
          "--mist-low": "rgba(170, 190, 222, .35)", "--mist-ray": "rgba(255, 255, 255, .4)", "--mist-vig": "rgba(118, 136, 164, .3)", "--grain": ".42", "--grain-blend": "soft-light",
        },
      } },
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
      "--field": bg, "--sheet-bg": raise, "--opt-bg": raise, "--series-2": fg3,
    };
  }
  function skinCSS(k) {
    const sel = `:root[data-skin="${k.id}"]`;
    const colours = (mode) => Object.entries({ ...tokens(k[mode], mode), ...(k.extra?.[mode] || {}) }).map(([p, v]) => `${p}:${v}`).join(";") + `;color-scheme:${mode}`;
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
  const skin = SKINS.find((k) => k.id === settings.skin) || SKINS[0];
  root.setAttribute("data-skin", skin.id);
  if (skin.glass) root.setAttribute("data-glass", "");
  if (settings.mode === "dark" || settings.mode === "light") root.setAttribute("data-theme", settings.mode);
  window.__spent = { SKINS, tokens, hostTheme };
})();
