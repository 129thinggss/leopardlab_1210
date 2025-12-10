/* ==========================================================
   상수 & 공용 유틸
========================================================== */
const SVG_NS = "http://www.w3.org/2000/svg";

// 자주 쓰는 DOM(한 번만 찾고 계속 재사용)
let previewSvgEl;
let resultImageEl;
let resultTypeEl;
let resultStatsEl;
let resultDescEl;
let resultSectionEl;
let archiveSectionEl;
let archiveListEl;
let btnGenerateEl;
let btnSaveArchiveEl;
let btnSavePngEl;
let sortSelectEl;
let viewMyBtnEl;
let viewAllBtnEl;

// 슬라이더 캐시
let sliderEls = null;

/* ==========================================================
   공용 유틸: frame 단위 스로틀
   - 같은 frame 안에서는 여러 번 호출돼도 1번만 실행
========================================================== */
function throttleFrame(fn) {
  let scheduled = false;
  let lastArgs = null;
  return function throttled(...args) {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...lastArgs);
    });
  };
}

/* ==========================================================
   SPA NAV
========================================================== */
function goPage(id) {
  const pages = document.querySelectorAll(".page");
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  const page = document.getElementById(id);
  if (page) page.classList.add("active");

  const navButtons = document.querySelectorAll(".nav button");
  for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].classList.remove("active-tab");
  }
  const tabBtn = document.getElementById("tab-" + id);
  if (tabBtn) tabBtn.classList.add("active-tab");

  if (id === "archive") loadArchive();

  if (id !== "result") {
    document.body.classList.remove("leopard-bg");
    document.body.style.backgroundImage = "none";
  }
}

/* ==========================================================
   슬라이더 값 읽기 (DOM 재검색 X, 캐시 사용)
========================================================== */
function getSliderValues() {
  // sliderEls는 load 시점에 캐싱됨
  return {
    complexity: Number(sliderEls.complexity.value),
    softness:   Number(sliderEls.softness.value),
    display:    Number(sliderEls.display.value),
    chaos:      Number(sliderEls.chaos.value),
    quirk:      Number(sliderEls.quirk.value),
    rest:       Number(sliderEls.rest.value)
  };
}

/* ==========================================================
   내부 엔진 파라미터
   - chaos → turb(0~100)
   - quirk → disp(0~100)
   - count 상한 걸어서 Voronoi O(n^2) 폭주 방지
========================================================== */
function getEngineParams(v, quality = "high") {
  const densityFactor = quality === "low" ? 0.5 : 1;

  let count = Math.round((10 + v.complexity * 1.1) * densityFactor);
  const maxCount = quality === "low" ? 40 : 80; // 🔥 상한 (시각적 밀도 유지 + 계산량 제한)
  if (count > maxCount) count = maxCount;

  const round = (v.softness / 100) * 40;
  const band  = 5 + (v.display / 100) * 30;
  const gap   = -10 + (v.rest / 100) * 30;

  const turb = v.chaos; // 0~100
  const disp = v.quirk; // 0~100

  return { count, round, band, gap, turb, disp };
}

/* ==========================================================
   ●●○○○ 표시
========================================================== */
function toDots(v) {
  let n = Math.round(v / 20);
  if (n < 1) n = 1;
  if (n > 5) n = 5;
  return "●".repeat(n) + "○".repeat(5 - n);
}

/* ==========================================================
   타입 판별 (그대로)
========================================================== */
function getLeopardType(v) {
  const hi = x => x >= 60;
  const lo = x => x <= 40;

  if (hi(v.softness) && hi(v.display) && !hi(v.chaos)) {
    return {
      name: "부드러운 존재감의 호피",
      line1: "현재 당신은 부드럽지만, 나를 살짝 보여주고 싶은 상태예요.",
      line2: "부드러운 얼룩으로 조용히 존재감을 드러내는 호피입니다."
    };
  }

  if (hi(v.softness) && lo(v.display) && hi(v.rest)) {
    return {
      name: "조용한 휴식의 호피",
      line1: "현재 당신은 다정하지만, 조금은 숨고 싶어 보여요.",
      line2: "패턴은 부드럽게 퍼지지만, 소리는 낮게 깔려 있는 호피입니다."
    };
  }

  if (lo(v.softness) && hi(v.display) && hi(v.chaos)) {
    return {
      name: "단단한 자기표현의 호피",
      line1: "현재 당신은 선명하게 말하고 싶고, 에너지도 강한 상태예요.",
      line2: "각진 얼룩과 대비로 존재감을 또렷하게 새기는 호피입니다."
    };
  }

  if (lo(v.softness) && lo(v.display) && hi(v.rest)) {
    return {
      name: "고요한 힘의 호피",
      line1: "겉으로는 조용하지만, 안쪽은 단단히 정돈된 상태예요.",
      line2: "조용하지만 쉽게 흔들리지 않는 내면의 무게가 느껴지는 호피입니다."
    };
  }

  if (hi(v.chaos) && hi(v.complexity)) {
    return {
      name: "빽빽한 흐름의 호피",
      line1: "생각도, 일도, 자극도 한꺼번에 많이 들어온 것 같아요.",
      line2: "패턴도 겹겹이 쌓여 어디를 봐도 바쁜 느낌이 나는 호피입니다."
    };
  }

  if (lo(v.chaos) && lo(v.complexity) && lo(v.display)) {
    return {
      name: "차분한 미니멀 호피",
      line1: "현재 당신은 덜어내고, 꼭 필요한 것만 남기고 싶은 상태예요.",
      line2: "패턴 밀도는 낮지만, 여백의 힘을 가지고 있는 차분한 호피입니다."
    };
  }

  if (!hi(v.complexity) && !lo(v.complexity) && hi(v.chaos) && hi(v.quirk)) {
    return {
      name: "흐린 꿈결같은 호피",
      line1: "현실과 상상 사이 어딘가에서 살짝 붕 떠 있는 상태예요.",
      line2: "얼룩들이 제멋대로 흩어져 있지만, 어딘가 몽환적인 균형을 가진 호피입니다."
    };
  }

  if (lo(v.display) && lo(v.chaos) && !hi(v.complexity)) {
    return {
      name: "차가운 균형의 호피",
      line1: "현재 당신은 감정보다 구조와 균형에 더 가까워 보이네요.",
      line2: "필요한 만큼만 드러내고, 선을 넘지 않는 절제된 호피입니다."
    };
  }

  if (hi(v.quirk) && hi(v.display)) {
    return {
      name: "엉뚱한 사건의 호피",
      line1: "조용한 흐름 속에서도 예상치 못한 작은 틈이 톡 하고 나타나요.",
      line2: "얼룩 사이사이에 불규칙한 변화가 반짝이는 호피입니다."
    };
  }

  return {
    name: "담담한 시선의 호피",
    line1: "강한 감정 없이, 주변을 천천히 관찰하는 순간이에요.",
    line2: "강하지만 고르게 번지며 담백하게 자리를 잡는 호피입니다."
  };
}

/* ==========================================================
   🔥 패턴 엔진 (filter 재사용 + DOM 최소화)
========================================================== */
function initSvgFilter(svg) {
  if (svg._filterInitialized) return;

  const defs = document.createElementNS(SVG_NS, "defs");
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.id = "noiseFilter";
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feT = document.createElementNS(SVG_NS, "feTurbulence");
  feT.setAttribute("type", "fractalNoise");
  feT.setAttribute("numOctaves", "2");
  feT.setAttribute("result", "noise");

  const feD = document.createElementNS(SVG_NS, "feDisplacementMap");
  feD.setAttribute("in", "SourceGraphic");
  feD.setAttribute("in2", "noise");
  feD.setAttribute("xChannelSelector", "R");
  feD.setAttribute("yChannelSelector", "G");

  filter.append(feT, feD);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 레퍼런스 캐싱
  svg._feT = feT;
  svg._feD = feD;
  svg._filterInitialized = true;
}

function clearSvgExceptDefs(svg) {
  // Array.from 대신 역순으로 child 제거 (할당 줄이기)
  let node = svg.lastChild;
  while (node) {
    const prev = node.previousSibling;
    if (node.nodeName.toLowerCase() !== "defs") {
      svg.removeChild(node);
    }
    node = prev;
  }
}

function drawPattern(v, quality = "high") {
  const svg = previewSvgEl || document.getElementById("previewSvg");
  if (!svg) return;

  initSvgFilter(svg);        // 필터 1회 초기화
  clearSvgExceptDefs(svg);   // defs 남기고 path만 제거

  const W = 520, H = 520;
  svg.setAttribute("viewBox", "0 0 520 520");

  const p = getEngineParams(v, quality);

  const chaosPower = p.turb / 100;
  const quirkPower = p.disp / 100;

  /* ---------- 필터 값 업데이트 ---------- */
  const feT = svg._feT;
  const feD = svg._feD;

  if (feT && feD) {
    const baseFreq =
      0.01 +
      chaosPower * 0.04 +
      quirkPower * 0.015;

    feT.setAttribute("baseFrequency", baseFreq.toFixed(4));

    const filterScale =
      5 +
      chaosPower * 40 +
      quirkPower * 80;

    feD.setAttribute("scale", filterScale.toFixed(1));
  }

  /* ---------- geometry jitter (quirk → 점 좌표 흔들기) ---------- */
  const clamp = (val, min, max) => (val < min ? min : val > max ? max : val);

  const count = p.count;
  const geomJitter = quirkPower * 30;  // 0~30px

  const pts = new Array(count);
  for (let i = 0; i < count; i++) {
    const baseX = Math.random() * W;
    const baseY = Math.random() * H;
    const jx = (Math.random() - 0.5) * 2 * geomJitter;
    const jy = (Math.random() - 0.5) * 2 * geomJitter;
    const x = clamp(baseX + jx, 0, W);
    const y = clamp(baseY + jy, 0, H);
    pts[i] = [x, y];
  }

  /* ---------- Voronoi + 도넛 ---------- */
  const centroid = (poly) => {
    let sx = 0, sy = 0;
    const len = poly.length;
    for (let i = 0; i < len; i++) {
      sx += poly[i][0];
      sy += poly[i][1];
    }
    return [sx / len, sy / len];
  };

  const insetPolygon = (poly, dist) => {
    const c = centroid(poly);
    const cx = c[0], cy = c[1];
    const len = poly.length;
    const out = new Array(len);
    for (let i = 0; i < len; i++) {
      const x = poly[i][0];
      const y = poly[i][1];
      out[i] = [
        x - (x - cx) * dist,
        y - (y - cy) * dist
      ];
    }
    return out;
  };

  const lineIntersect = (p1, p2, a, b, c) => {
    const x1 = p1[0], y1 = p1[1];
    const dx = p2[0] - x1;
    const dy = p2[1] - y1;
    const den = a * dx + b * dy;
    if (Math.abs(den) < 1e-6) return null;
    const t = -(a * x1 + b * y1 + c) / den;
    return [x1 + t * dx, y1 + t * dy];
  };

  const clipPolygon = (poly, a, b, c) => {
    const out = [];
    const len = poly.length;
    for (let i = 0; i < len; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % len];

      const d1 = a * p1[0] + b * p1[1] + c;
      const d2 = a * p2[0] + b * p2[1] + c;
      const in1 = d1 >= 0;
      const in2 = d2 >= 0;

      if (in1 && in2) {
        out.push(p2);
      } else if (in1 && !in2) {
        const inter = lineIntersect(p1, p2, a, b, c);
        if (inter) out.push(inter);
      } else if (!in1 && in2) {
        const inter = lineIntersect(p1, p2, a, b, c);
        if (inter) out.push(inter);
        out.push(p2);
      }
    }
    return out;
  };

  const makeRoundedPath = (pts, r) => {
    const n = pts.length;
    if (!n) return "";
    let d = "";
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];

      const v1x = p1[0] - p0[0];
      const v1y = p1[1] - p0[1];
      const v2x = p2[0] - p1[0];
      const v2y = p2[1] - p1[1];

      const l1 = Math.hypot(v1x, v1y) || 1;
      const l2 = Math.hypot(v2x, v2y) || 1;

      const r1 = r < l1 / 2 ? r : l1 / 2;
      const r2 = r < l2 / 2 ? r : l2 / 2;

      const p1a = [p1[0] - (v1x / l1) * r1, p1[1] - (v1y / l1) * r1];
      const p1b = [p1[0] + (v2x / l2) * r2, p1[1] + (v2y / l2) * r2];

      if (i === 0) d += "M" + p1a[0] + "," + p1a[1] + " ";
      else d += "L" + p1a[0] + "," + p1a[1] + " ";
      d += "Q" + p1[0] + "," + p1[1] + " " + p1b[0] + "," + p1b[1] + " ";
    }
    d += "Z";
    return d;
  };

  const round = p.round;
  const band  = p.band;
  const gap   = p.gap;

  const displayNorm = v.display / 100;

  for (let i = 0; i < count; i++) {
    let cell = [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H]
    ];
    const pi = pts[i];

    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      const pj = pts[j];

      let a = pj[0] - pi[0];
      let b = pj[1] - pi[1];
      const mx = (pi[0] + pj[0]) * 0.5;
      const my = (pi[1] + pj[1]) * 0.5;
      let c = -(a * mx + b * my);

      if (a * pi[0] + b * pi[1] + c < 0) {
        a = -a;
        b = -b;
        c = -c;
      }
      cell = clipPolygon(cell, a, b, c);
      if (!cell.length) break;
    }
    if (!cell.length) continue;

    cell = insetPolygon(cell, gap / 200);

    const outerRatio = 0.22;
    const innerRatio = Math.min(outerRatio + band / 100, 0.9);

    const outerPoly = insetPolygon(cell, outerRatio);
    const innerPoly = insetPolygon(cell, innerRatio);

    if (outerPoly.length < 3 || innerPoly.length < 3) continue;

    const dOuter = makeRoundedPath(outerPoly, round * 0.5);
    const dInner = makeRoundedPath(innerPoly, round * 0.35);

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", dOuter + " " + dInner);
    path.setAttribute("fill-rule", "evenodd");

    const jitter = (Math.random() - 0.5) * 0.15;
    const baseDark = 0.25 + displayNorm * 0.6;
    const darkness = baseDark + jitter;
    const clampedDark = darkness < 0.2 ? 0.2 : darkness > 1 ? 1 : darkness;
    const g = Math.round(255 * (1 - clampedDark));
    path.setAttribute("fill", "rgb(" + g + "," + g + "," + g + ")");

    const opacity = 0.25 + displayNorm * 0.6;
    path.setAttribute("fill-opacity", opacity.toFixed(2));

    path.setAttribute("filter", "url(#noiseFilter)");

    svg.appendChild(path);
  }
}

/* ==========================================================
   배경 타일링
========================================================== */
function setResultBackground(svgString) {
  if (!resultSectionEl) return;

  let bgSvg = svgString
    .replace(/fill-opacity="[^"]*"/g, 'fill-opacity="0.06"')
    .replace(/fill="[^"]*"/g, 'fill="#000000"');

  const encoded = encodeURIComponent(bgSvg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  resultSectionEl.style.backgroundImage =
    'url("data:image/svg+xml,' + encoded + '")';
}

/* ==========================================================
   전역 상태
========================================================== */
let currentLeopard = null;
let archiveSortMode = "time-desc";
let archiveViewMode = "local";

let localArchiveCache  = null;
let globalArchiveCache = null;
let globalArchiveLoading = false;

/* ==========================================================
   지금의 호피 생성
========================================================== */
function generateLeopard() {
  const sliders = getSliderValues();
  const engine  = getEngineParams(sliders, "high");
  const typeInfo = getLeopardType(sliders);

  drawPattern(sliders, "high");

  const previewSvg = previewSvgEl;
  const clone = previewSvg.cloneNode(true);

  resultImageEl.innerHTML = "";
  resultImageEl.appendChild(clone);

  resultTypeEl.textContent = `지금의 호피 타입: “${typeInfo.name}”`;

  resultStatsEl.innerHTML = "";
  const stats = [
    ["활기",    sliders.complexity],
    ["말랑함",  sliders.softness],
    ["드러냄",  sliders.display],
    ["혼란도",  sliders.chaos],
    ["엉뚱함",  sliders.quirk],
    ["여유",    sliders.rest]
  ];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < stats.length; i++) {
    const label = stats[i][0];
    const val   = stats[i][1];
    const row = document.createElement("div");
    row.className = "stat-line";
    row.innerHTML =
      '<span class="stat-label">' + label + '</span>' +
      '<span class="stat-dots">' + toDots(val) + '</span>';
    frag.appendChild(row);
  }
  resultStatsEl.appendChild(frag);

  resultDescEl.innerHTML = `“${typeInfo.line1}”<br>“${typeInfo.line2}”`;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(previewSvg);
  setResultBackground(svgString);

  currentLeopard = {
    timestamp: Date.now(),
    sliders,
    engineParams: engine,
    type: typeInfo.name,
    line1: typeInfo.line1,
    line2: typeInfo.line2,
    svg: svgString
  };

  goPage("result");
}

/* ==========================================================
   PNG 저장
========================================================== */
function saveCurrentAsPNG() {
  const resultSvgEl = document.querySelector("#resultImage svg");
  const svgEl = resultSvgEl || previewSvgEl;

  if (!svgEl || !svgEl.querySelector("path")) {
    alert("먼저 호피를 생성해주세요.");
    return;
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = function() {
    const W = 520, H = 520;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    URL.revokeObjectURL(url);

    const pngURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = pngURL;
    a.download = `momentary_leopard_${stamp}.png`;
    a.click();
  };
  img.src = url;
}

/* ==========================================================
   Firestore + localStorage 저장
========================================================== */
function saveToArchive(silent) {
  if (!currentLeopard) {
    if (!silent) alert("먼저 지금의 호피를 생성해주세요.");
    return;
  }

  const key = "leopardArchive";
  const raw = localStorage.getItem(key);
  let list = [];
  if (raw) {
    try { list = JSON.parse(raw); } catch(e) { list = []; }
  }
  if (!Array.isArray(list)) list = [];
  list.push(currentLeopard);
  if (list.length > 100) list = list.slice(list.length - 100);
  localStorage.setItem(key, JSON.stringify(list));
  localArchiveCache = list;

  try {
    if (window.firebase && firebase.firestore) {
      const db = firebase.firestore();

      const svgString = currentLeopard.svg;
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = "data:image/svg+xml;base64," + base64;

      db.collection("archives").add({
        thumbnailUrl: dataUrl,
        svg: svgString,
        sliders: currentLeopard.sliders,
        engineParams: currentLeopard.engineParams,
        type: currentLeopard.type,
        line1: currentLeopard.line1,
        line2: currentLeopard.line2,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        globalArchiveCache = null;
      }).catch(e => {
        console.error("Firestore 저장 오류:", e);
      });
    }
  } catch (e) {
    console.error("Firestore 저장 오류:", e);
  }

  if (!silent) {
    alert("Leopard Moments에 저장되었습니다 🐆");
  }
}

/* ==========================================================
   아카이브 복원
========================================================== */
function showArchiveLeopard(item) {
  if (!item || !item.svg || !item.svg.trim().startsWith("<svg")) return;

  currentLeopard = {
    timestamp: item.timestamp || Date.now(),
    sliders: item.sliders || {},
    engineParams: item.engineParams || null,
    type: item.type || "",
    line1: item.line1 || "",
    line2: item.line2 || "",
    svg: item.svg
  };

  resultImageEl.innerHTML = item.svg;
  resultTypeEl.textContent = `지금의 호피 타입: “${currentLeopard.type}”`;

  resultStatsEl.innerHTML = "";
  const sliders = currentLeopard.sliders || {};
  const stats = [
    ["활기",    sliders.complexity ?? 0],
    ["말랑함",  sliders.softness   ?? 0],
    ["드러냄",  sliders.display    ?? 0],
    ["혼란도",  sliders.chaos      ?? 0],
    ["엉뚱함",  sliders.quirk      ?? 0],
    ["여유",    sliders.rest       ?? 0]
  ];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < stats.length; i++) {
    const label = stats[i][0];
    const val   = stats[i][1];

    const row = document.createElement("div");
    row.className = "stat-line";

    const left = document.createElement("span");
    left.className = "stat-label";
    left.textContent = label;

    const right = document.createElement("span");
    right.className = "stat-dots";
    right.textContent = toDots(val);

    row.appendChild(left);
    row.appendChild(right);
    frag.appendChild(row);
  }
  resultStatsEl.appendChild(frag);

  if (currentLeopard.line1 || currentLeopard.line2) {
    resultDescEl.innerHTML = `“${currentLeopard.line1}”<br>“${currentLeopard.line2}”`;
  } else {
    resultDescEl.textContent = "";
  }

  setResultBackground(currentLeopard.svg);
  goPage("result");
}

/* ==========================================================
   아카이브 정렬 & 렌더링
========================================================== */
function sortArchiveList(list, mode) {
  const arr = list.slice();

  const safeTime  = item => item && item.timestamp ? item.timestamp : 0;
  const safeSoft  = item => item && item.sliders ? (item.sliders.softness ?? 0) : 0;
  const safeChaos = item => item && item.sliders ? (item.sliders.chaos   ?? 0) : 0;
  const safeRest  = item => item && item.sliders ? (item.sliders.rest    ?? 0) : 0;

  switch (mode) {
    case "time-asc":
      arr.sort((a, b) => safeTime(a) - safeTime(b)); break;
    case "soft-desc":
      arr.sort((a, b) => safeSoft(b) - safeSoft(a)); break;
    case "soft-asc":
      arr.sort((a, b) => safeSoft(a) - safeSoft(b)); break;
    case "chaos-desc":
      arr.sort((a, b) => safeChaos(b) - safeChaos(a)); break;
    case "chaos-asc":
      arr.sort((a, b) => safeChaos(a) - safeChaos(b)); break;
    case "rest-desc":
      arr.sort((a, b) => safeRest(b) - safeRest(a)); break;
    case "rest-asc":
      arr.sort((a, b) => safeRest(a) - safeRest(b)); break;
    case "time-desc":
    default:
      arr.sort((a, b) => safeTime(b) - safeTime(a)); break;
  }
  return arr;
}

function renderArchiveListFromArray(list) {
  const oldInfo = archiveSectionEl.querySelectorAll(".archive-info, .archive-empty");
  for (let i = 0; i < oldInfo.length; i++) {
    oldInfo[i].remove();
  }
  archiveListEl.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "archive-empty";
    empty.textContent = "아직 저장된 호피가 없습니다.";
    archiveSectionEl.insertBefore(empty, archiveListEl);
    return;
  }

  const sorted = sortArchiveList(list, archiveSortMode);

  const info = document.createElement("p");
  info.className = "archive-info";
  info.textContent = `총 ${sorted.length}개의 Momentary Leopard가 기록되어 있어요.`;
  archiveSectionEl.insertBefore(info, archiveListEl);

  const frag = document.createDocumentFragment();

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item) continue;

    let bgImageCss = null;
    try {
      if (item.thumbnailUrl) {
        bgImageCss = 'url("' + item.thumbnailUrl + '")';
      } else if (item.svg && item.svg.trim().startsWith("<svg")) {
        const encodedSvg = encodeURIComponent(item.svg)
          .replace(/'/g, "%27")
          .replace(/"/g, "%22");
        bgImageCss = 'url("data:image/svg+xml,' + encodedSvg + '")';
      } else if (item.svg && item.svg.startsWith("data:")) {
        bgImageCss = 'url("' + item.svg + '")';
      }
    } catch (e) {
      bgImageCss = null;
    }
    if (!bgImageCss) continue;

    const tile = document.createElement("div");
    tile.className = "archive-tile";
    tile.style.backgroundImage = bgImageCss;
    tile.style.cursor = "pointer";

    const time = new Date(item.timestamp || Date.now());
    const timeStr = time.toLocaleString("ko-KR", {
      year: "2-digit", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });

    const overlay = document.createElement("div");
    overlay.className = "archive-tile-info";
    overlay.innerHTML =
      '<div class="archive-tile-type">' + (item.type || "") + '</div>' +
      '<div class="archive-tile-time">' + timeStr + '</div>';
    tile.appendChild(overlay);

    tile.addEventListener("click", () => {
      showArchiveLeopard(item);
    });

    frag.appendChild(tile);
  }

  archiveListEl.appendChild(frag);
}

/* ==========================================================
   로컬/글로벌 아카이브
========================================================== */
function loadLocalArchive() {
  if (Array.isArray(localArchiveCache)) {
    renderArchiveListFromArray(localArchiveCache);
    return;
  }
  const raw = localStorage.getItem("leopardArchive");
  let list = [];
  if (raw) {
    try { list = JSON.parse(raw); } catch (e) { list = []; }
  }
  if (!Array.isArray(list)) list = [];
  localArchiveCache = list;
  renderArchiveListFromArray(list);
}

async function loadGlobalArchive() {
  if (Array.isArray(globalArchiveCache)) {
    renderArchiveListFromArray(globalArchiveCache);
    return;
  }

  if (!window.firebase || !firebase.firestore) {
    renderArchiveListFromArray([]);
    return;
  }

  if (globalArchiveLoading) return;
  globalArchiveLoading = true;

  const db = firebase.firestore();

  let snap;
  try {
    snap = await db
      .collection("archives")
      .orderBy("createdAt", "desc")
      .limit(80)
      .get();
  } catch (e) {
    console.error("Firestore 불러오기 오류:", e);
    globalArchiveLoading = false;
    renderArchiveListFromArray([]);
    return;
  }

  globalArchiveLoading = false;

  if (snap.empty) {
    globalArchiveCache = [];
    renderArchiveListFromArray([]);
    return;
  }

  const list = snap.docs.map(doc => {
    const data = doc.data();
    return {
      timestamp: data.createdAt ? data.createdAt.toMillis() : Date.now(),
      sliders: data.sliders || {},
      engineParams: data.engineParams || null,
      type: data.type || "",
      line1: data.line1 || "",
      line2: data.line2 || "",
      svg: data.svg || "",
      thumbnailUrl: data.thumbnailUrl || ""
    };
  });

  globalArchiveCache = list;
  renderArchiveListFromArray(list);
}

function loadArchive() {
  if (archiveViewMode === "global") {
    loadGlobalArchive();
  } else {
    loadLocalArchive();
  }
}

/* ==========================================================
   초기 로딩
========================================================== */
window.addEventListener("load", () => {
  // DOM 캐싱
  previewSvgEl      = document.getElementById("previewSvg");
  resultImageEl     = document.getElementById("resultImage");
  resultTypeEl      = document.getElementById("resultType");
  resultStatsEl     = document.getElementById("resultStats");
  resultDescEl      = document.getElementById("resultDescription");
  resultSectionEl   = document.getElementById("result");
  archiveSectionEl  = document.getElementById("archive");
  archiveListEl     = document.getElementById("archiveList");
  btnGenerateEl     = document.getElementById("btn-generate");
  btnSaveArchiveEl  = document.getElementById("btn-save-archive");
  btnSavePngEl      = document.getElementById("btn-save-png");
  sortSelectEl      = document.getElementById("archiveSort");
  viewMyBtnEl       = document.getElementById("view-my");
  viewAllBtnEl      = document.getElementById("view-all");

  // 슬라이더 DOM 캐시
  sliderEls = {
    complexity: document.getElementById("s_complexity"),
    softness:   document.getElementById("s_softness"),
    display:    document.getElementById("s_display"),
    chaos:      document.getElementById("s_chaos"),
    quirk:      document.getElementById("s_quirk"),
    rest:       document.getElementById("s_rest")
  };

  // 첫 미리보기: low 퀄리티
  drawPattern(getSliderValues(), "low");

  const sliders = document.querySelectorAll('input[type="range"]');
  const throttledDraw = throttleFrame(() => {
    const v = getSliderValues();
    drawPattern(v, "low");
  });

  for (let i = 0; i < sliders.length; i++) {
    sliders[i].addEventListener("input", throttledDraw);
  }

  if (btnGenerateEl)
    btnGenerateEl.addEventListener("click", generateLeopard);
  if (btnSaveArchiveEl)
    btnSaveArchiveEl.addEventListener("click", () => saveToArchive(false));
  if (btnSavePngEl)
    btnSavePngEl.addEventListener("click", saveCurrentAsPNG);

  if (sortSelectEl) {
    sortSelectEl.addEventListener("change", (e) => {
      archiveSortMode = e.target.value;
      loadArchive();
    });
  }

  if (viewMyBtnEl && viewAllBtnEl) {
    viewMyBtnEl.addEventListener("click", () => {
      archiveViewMode = "local";
      viewMyBtnEl.classList.add("active");
      viewAllBtnEl.classList.remove("active");
      loadArchive();
    });

    viewAllBtnEl.addEventListener("click", () => {
      archiveViewMode = "global";
      viewAllBtnEl.classList.add("active");
      viewMyBtnEl.classList.remove("active");
      loadArchive();
    });
  }

  if (location.hash === "#archive") {
    goPage("archive");
  } else if (location.hash === "#result") {
    goPage("result");
  }
});
