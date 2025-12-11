// ========================================
// Result 페이지로 돌아가기
// ========================================
function goResultPage() {
  window.location.href = "generator.html#result";
}

// ========================================
// 패턴 SVG 불러오기
// ========================================

// 1) 먼저 latestPatternData(JSON)에서 svg 가져오기
let svgString = null;
const latestDataRaw = localStorage.getItem("latestPatternData");
if (latestDataRaw) {
  try {
    const parsed = JSON.parse(latestDataRaw);
    if (parsed && parsed.svg) {
      svgString = parsed.svg;
    }
  } catch (e) {
    console.warn("failed to parse latestPatternData", e);
  }
}

// 2) 혹시 몰라서 예전 키가 있으면 그걸 예비용으로 사용
if (!svgString) {
  svgString = localStorage.getItem("latestPatternSVG");
}

const wrap = document.getElementById("patternTile");

// 기본 타일 크기
let currentTileSize = 180;

if (!wrap) {
  console.warn("patternTile element not found.");
} else {
  // ========================================
  // 패턴 로드
  // ========================================
  if (!svgString) {
    wrap.innerHTML =
      "<p style='color:#999;font-size:14px;'>패턴 데이터가 없습니다.</p>";
  } else {
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");

    wrap.style.backgroundImage = `url("data:image/svg+xml,${encoded}")`;
    wrap.style.backgroundRepeat = "repeat";
    wrap.style.backgroundSize = `auto ${currentTileSize}px`;
  }

  // ========================================
  // 타일 크기 슬라이더 (왼쪽=크게, 오른쪽=작게)
  // ========================================
  const tileSlider = document.getElementById("tileSize");

  if (tileSlider) {
    const sliderMin = Number(tileSlider.min) || 50;
    const sliderMax = Number(tileSlider.max) || 400;

    function updateTileSizeFromSlider() {
      const raw = Number(tileSlider.value);
      // 방향 반전: 왼쪽 = 크게, 오른쪽 = 작게
      currentTileSize = sliderMin + sliderMax - raw;
      wrap.style.backgroundSize = `auto ${currentTileSize}px`;
    }

    updateTileSizeFromSlider();
    tileSlider.addEventListener("input", updateTileSizeFromSlider);
  }

  // ========================================
  // 배경 반전 토글
  // ========================================
  const card = document.querySelector(".pattern-card");
  const invertBtn = document.getElementById("btnToggleInvert");

  if (card && invertBtn) {
    invertBtn.addEventListener("click", () => {
      card.classList.toggle("invert");
    });
  }

  // ========================================
  // 패턴 이미지 저장 (PNG)
  // ========================================
  const saveBtn = document.getElementById("btnSavePattern");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!svgString) {
        alert("저장할 패턴이 없습니다.");
        return;
      }

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = function () {
        const size = 520;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        URL.revokeObjectURL(url);

        const pngURL = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = pngURL;
        a.download = `momentary_pattern_${stamp}.png`;
        a.click();
      };
      img.src = url;
    });
  }
}
