  function niceScale(max) {
    if (!(max > 0)) return { top: 1, step: 0.25 };
    const raw = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    return { top: Math.ceil(max / step - 1e-9) * step, step };
  }
  function vchart({ values, labels, tips, showLabel, emph = () => false, valueLabel = () => "", ref = 0, refLabel = "", cls = "", aria }) {
    const { top, step } = niceScale(Math.max(...values, ref));
    let grid = "";
    for (let v = 0; v <= top + step / 2; v += step) grid += `<div class="gl" style="bottom:${(v / top) * 100}%"><span>${esc(compact(v))}</span></div>`;
    const cols = values.map((v, i) => {
      const h = v > 0 ? Math.max(1.5, (v / top) * 100) : 0;
      const lab = valueLabel(i);
      return `<div class="col${emph(i) ? " emph" : ""}" data-tip="${esc(tips[i])}"><div class="bar" style="height:${h}%"></div>${lab ? `<span class="vlab" style="--h:${h}%">${esc(lab)}</span>` : ""}</div>`;
    }).join("");
    const refEl = ref > 0 && ref <= top ? `<div class="refline" style="bottom:${(ref / top) * 100}%">${refLabel ? `<span>${esc(refLabel)}</span>` : ""}</div>` : "";
    return `<div class="vchart ${cls}" role="img" aria-label="${esc(aria)}"><div class="plot">${grid}${refEl}<div class="cols">${cols}</div></div><div class="xl" aria-hidden="true">${labels.map((l, i) => `<span>${showLabel(i) ? esc(l) : ""}</span>`).join("")}</div></div>`;
  }
