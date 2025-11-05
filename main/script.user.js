// ==UserScript==
// @name         Office Productivity Script
// @namespace    https://github.com/DealerOnGirmada/office-tampermonkey-scripts
// @description  Revolutionary performance analyzer with GTM deep inspection, multi-format compression, AI recommendations, keyboard shortcuts & settings
// @version      1.0.0
// @author       Pratik Chabria
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/DealerOnGirmada/office-tampermonkey-scripts/main/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/DealerOnGirmada/office-tampermonkey-scripts/main/main/script.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  // ============================================================================
  // SECTION 1: GLOBAL STATE & SETTINGS
  // Modify this section to add new global variables or settings
  // ============================================================================

  const CURRENT_VERSION = "1.0.0";
  let analysisActive = false;
  let analysisCancelled = false;
  let overlays = [];
  let imageData = [];
  let videoData = [];
  let hiddenImagesModal = null;
  let summaryBox = null;
  let hiddenOverlays = new Set();
  let currentFilter = "all";
  let performanceScore = 0;
  let analysisHistory = [];
  let gtmDeepAnalysis = {};
  let resizeObserver = null;

  let userSettings = {
    autoAnalyze: false,
    defaultQuality: 85,
    showVideos: true,
    enableSounds: true,
    defaultFilter: "all",
    showImagePreviews: true,
  };

  function loadSettings() {
    const saved = GM_getValue("userSettings", null);
    if (saved) {
      userSettings = { ...userSettings, ...saved };
    }
  }

  function saveSettings() {
    GM_setValue("userSettings", userSettings);
  }

  function isNewVersion(remote, local) {
    const r = remote.split(".").map(Number);
    const l = local.split(".").map(Number);
    for (let i = 0; i < r.length; i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  }

  function checkForUpdate() {
    const lastChecked = GM_getValue("lastUpdateCheck", 0);
    const now = Date.now();
    if (now - lastChecked < 6 * 60 * 60 * 1000) return;

    GM_setValue("lastUpdateCheck", now);

    GM_xmlhttpRequest({
      method: "GET",
      url: "https://raw.githubcontent.com/DealerOnGirmada/office-tampermonkey-scripts/main/version.json",
      onload: (res) => {
        try {
          const latest = JSON.parse(res.responseText);
          if (isNewVersion(latest.version, CURRENT_VERSION)) {
            GM_notification({
              title: `Version ${latest.version} available`,
              text: latest.notes + "\nClick to update",
              timeout: 10000,
              onclick: () => {
                window.open(
                  "https://raw.githubcontent.com/DealerOnGirmada/office-tampermonkey-scripts/main/script.user.js",
                  _blank
                );
              },
            });
          }
        } catch (e) {
          console.error("UPDATE CHECK FAILED:", e);
        }
      },
    });
  }

  checkForUpdate();

  // ============================================================================
  // SECTION 2: KEYBOARD SHORTCUTS & ANIMATIONS
  // Modify this section to add new shortcuts or animation effects
  // ============================================================================

  // Keyboard shortcuts removed - Section reserved for future features

  function triggerConfetti() {
    const colors = ["#2ecc71", "#3498db", "#f39c12", "#e74c3c", "#9b59b6"];
    const confettiCount = 50;
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.style.cssText = `
        position: fixed; width: 10px; height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        top: -10px; left: ${Math.random() * 100}%;
        opacity: 1; z-index: 9999999; pointer-events: none;
        animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
      `;
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }
  }

  function playSound(frequency = 523.25, duration = 200) {
    if (!userSettings.enableSounds) return;
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.warn("Sound not supported:", e);
    }
  }

  // ============================================================================
  // SECTION 3: STYLES INJECTION
  // Modify this section to add new CSS classes or animations
  // NEW: Added styles for image preview and crop tool
  // ============================================================================

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
@keyframes criticalPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); } 50% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); } }

.spa-glass-panel {
  background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.98));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.spa-btn {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.spa-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.spa-btn:active {
  transform: scale(0.98);
}

.spa-image-overlay.critical {
  animation: criticalPulse 2s infinite;
}

.spa-tooltip {
  position: absolute;
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 999999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.spa-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.spa-progress {
  height: 4px;
  background: rgba(0,0,0,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.spa-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #fb741c, #ff8c42);
  transition: width 0.3s ease;
}

/* NEW: Tab styles for Info/Crop tabs */
.spa-modal-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid rgba(0,0,0,0.08);
  margin-bottom: 16px;
}

.spa-modal-tab {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  user-select: none;
}

.spa-modal-tab:hover {
  color: #19325d;
  background: rgba(0,0,0,0.02);
}

.spa-modal-tab.active {
  color: #19325d;
  border-bottom-color: #fb741c;
}

.spa-tab-content {
  display: none;
}

.spa-tab-content.active {
  display: block;
}

/* NEW: Image preview in Info tab */
.spa-image-preview {
  width: 100%;
  max-height: 300px;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.spa-image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

/* NEW: Crop tool styles */
.spa-crop-container {
  position: relative;
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.spa-crop-image {
  max-width: 100%;
  height: auto;
  display: block;
  user-select: none;
}

.spa-crop-box {
  position: absolute;
  border: 2px dashed #fb741c;
  background: rgba(251, 116, 28, 0.1);
  cursor: move;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
}

.spa-crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fb741c;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0,0,0,0.3);
}

.spa-crop-handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
.spa-crop-handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
.spa-crop-handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
.spa-crop-handle.se { bottom: -6px; right: -6px; cursor: nwse-resize; }
.spa-crop-handle.n { top: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
.spa-crop-handle.s { bottom: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
.spa-crop-handle.w { top: 50%; left: -6px; margin-top: -6px; cursor: ew-resize; }
.spa-crop-handle.e { top: 50%; right: -6px; margin-top: -6px; cursor: ew-resize; }

.spa-crop-controls {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.spa-crop-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spa-crop-control label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
}

.spa-crop-control input,
.spa-crop-control select {
  padding: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .spa-crop-controls {
    grid-template-columns: repeat(2, 1fr);
  }
  /* Bulk Compression Modal Styles */
.spa-bulk-item {
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  margin-bottom: 8px;
  background: white;
  overflow: hidden;
  transition: all 0.2s;
}

.spa-bulk-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.spa-bulk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.spa-bulk-header:hover {
  background: rgba(0,0,0,0.02);
}

.spa-bulk-expand-icon {
  transition: transform 0.2s;
  font-weight: 700;
  color: #19325d;
}

.spa-bulk-item.expanded .spa-bulk-expand-icon {
  transform: rotate(90deg);
}

.spa-bulk-preview {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  border-top: 1px solid rgba(0,0,0,0.06);
}

.spa-bulk-item.expanded .spa-bulk-preview {
  max-height: 250px;
}

.spa-bulk-preview-content {
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.02);
}

.spa-bulk-preview-content img {
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
}
    `;
    document.head.appendChild(style);
  }

  // ============================================================================
  // SECTION 4: UTILITY FUNCTIONS
  // ============================================================================

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  }

  function generateId() {
    return "spa_" + Math.random().toString(36).substr(2, 9);
  }

  function showToast(message, type = "info") {
    const colors = {
      success: "#2ecc71",
      error: "#e74c3c",
      warning: "#f39c12",
      info: "#3498db",
    };
    const toast = document.createElement("div");
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999999; background: ${colors[type]}; color: white; padding: 14px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideIn 0.3s; max-width: 350px;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === "success") playSound(523.25, 100);
    if (type === "error") playSound(200, 200);
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function copyToClipboard(text, successMessage = "Copied to clipboard!") {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(successMessage, "success");
      })
      .catch(() => {
        showToast("Failed to copy", "error");
      });
  }

  function detectPageBlocks() {
    const blocks = [];
    const seenIds = new Set();

    // Detect elements with ID starting with 'block'
    const blockElements = document.querySelectorAll("[id^='block']");
    blockElements.forEach((el) => {
      if (!seenIds.has(el.id)) {
        seenIds.add(el.id);
        blocks.push({
          id: el.id,
          type: "block",
          element: el,
          name: el.id.charAt(0).toUpperCase() + el.id.slice(1),
          images: [],
        });
      }
    });

    // Detect elements with class containing 'contentSection'
    const contentSectionElements = document.querySelectorAll(
      "[class*='contentSection']"
    );
    contentSectionElements.forEach((el) => {
      const classList = Array.from(el.classList);
      const contentSectionClass = classList.find((cls) =>
        cls.includes("contentSection")
      );
      if (contentSectionClass && !seenIds.has(contentSectionClass)) {
        seenIds.add(contentSectionClass);
        let name = contentSectionClass
          .replace("contentSection", "")
          .replace(/([A-Z])/g, " $1")
          .trim();
        if (!name || name.length <= 2)
          name = `Section ${contentSectionClass.replace("contentSection", "")}`;
        blocks.push({
          id: contentSectionClass,
          type: "contentSection",
          element: el,
          name: name,
          images: [],
        });
      }
    });

    // Detect elements with class 'quickIntro'
    const quickIntroElements = document.querySelectorAll(".quickIntro");
    quickIntroElements.forEach((el, idx) => {
      const id = `quickIntro-${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        blocks.push({
          id: id,
          type: "class",
          element: el,
          name: "Quick Intro",
          images: [],
        });
      }
    });

    // Detect elements with class 'introSec'
    const introSecElements = document.querySelectorAll(".introSec");
    introSecElements.forEach((el, idx) => {
      const id = `introSec-${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        blocks.push({
          id: id,
          type: "class",
          element: el,
          name: "Intro Section",
          images: [],
        });
      }
    });

    // Detect elements with class 'bonusBlock'
    const bonusBlockElements = document.querySelectorAll(".bonusBlock");
    bonusBlockElements.forEach((el, idx) => {
      const id = `bonusBlock-${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        blocks.push({
          id: id,
          type: "class",
          element: el,
          name: "Bonus Block",
          images: [],
        });
      }
    });

    return blocks;
  }

  function getImagesInBlock(blockElement) {
    const images = [];
    const imgElements = blockElement.querySelectorAll("img");
    imgElements.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const style = getComputedStyle(img);
      const isVisible =
        !!img.offsetParent &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;
      images.push({
        element: img,
        src: img.currentSrc || img.src,
        type: "img",
        visible: isVisible,
        lazyLoaded: img.hasAttribute("loading") || img.hasAttribute("data-src"),
        responsive: img.hasAttribute("srcset"),
        dimensions: {
          natural: { width: img.naturalWidth, height: img.naturalHeight },
          display: { width: img.width, height: img.height },
        },
      });
    });
    const allElements = blockElement.querySelectorAll("*");
    const uniqueBgSrcs = new Set();
    allElements.forEach((el) => {
      const style = getComputedStyle(el);
      const bgImage = style.backgroundImage || "";
      if (bgImage && bgImage !== "none") {
        const urlMatches = bgImage.match(/url\((['"]?)(.*?)\1\)/g) || [];
        urlMatches.forEach((match) => {
          const url = match.replace(/url\(['"]?/, "").replace(/['"]?\)/, "");
          if (!url || url.startsWith("data:") || uniqueBgSrcs.has(url)) return;
          uniqueBgSrcs.add(url);
          const rect = el.getBoundingClientRect();
          images.push({
            element: el,
            src: url,
            type: "background",
            visible: rect.width > 0 && rect.height > 0,
            dimensions: { display: { width: rect.width, height: rect.height } },
          });
        });
      }
    });
    return images;
  }

  async function analyzeBlock(block) {
    const blockAnalysis = {
      blockId: block.id,
      blockName: block.name,
      blockType: block.type,
      images: [],
      score: 0,
      breakdown: {},
      grade: "N/A",
    };
    const blockImages = getImagesInBlock(block.element);
    for (const img of blockImages) {
      const size = await getImageSize(img.src);
      if (!size) continue;
      blockAnalysis.images.push({
        ...img,
        size,
        optimization: getOptimizationLevel(size),
      });
    }
    const blockScore = calculatePerformanceScore(blockAnalysis.images, []);
    blockAnalysis.score = blockScore.score;
    blockAnalysis.breakdown = blockScore.breakdown;
    blockAnalysis.grade = blockScore.grade;
    return blockAnalysis;
  }

  // END SECTION 4

  // ============================================================================
  // SECTION 5: IMAGE COMPRESSION & FORMAT DETECTION
  // Modify this section to change compression logic or add new formats
  // ============================================================================

  async function compressImage(
    img,
    quality,
    maxWidth,
    maxHeight,
    format = "jpeg"
  ) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const mimeTypes = {
          jpeg: "image/jpeg",
          webp: "image/webp",
          png: "image/png",
        };

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject("Compression failed");
          },
          mimeTypes[format] || "image/jpeg",
          quality
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function detectFormatSupport() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    return {
      webp: canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0,
      jpeg: true,
      png: true,
    };
  }
  // ============================================================================
  // SECTION 6: COMPRESSION MODAL
  // Modify this section to change the compression UI
  // ============================================================================

  async function showCompressionModal(imgData) {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 28px; border-radius: 16px; max-width: 700px; width: 100%;
      max-height: 90vh; overflow-y: auto; animation: slideIn 0.3s;
    `;

    let loadedImage;
    try {
      if (imgData.type === "img") {
        loadedImage = imgData.element;
      } else {
        loadedImage = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject("CORS or load error");
          img.src = imgData.src;
        });
      }
    } catch (error) {
      showToast("Failed to load image: " + error, "error");
      return;
    }

    const formats = detectFormatSupport();
    const formatOptions = [];
    if (formats.webp) formatOptions.push("webp");
    formatOptions.push("jpeg");
    formatOptions.push("png");

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <h2 style="margin:0; font-size:20px; color:#19325d;">🗜️ Advanced Image Compression</h2>
        <button id="closeCompression" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:24px;">
        <div style="padding:14px; background:rgba(25,50,93,0.05); border-radius:10px; text-align:center;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">Original</div>
          <div style="font-size:20px; font-weight:700; color:#19325d;">${formatBytes(
            imgData.size
          )}</div>
        </div>
        <div style="padding:14px; background:rgba(46,204,113,0.05); border-radius:10px; text-align:center;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">Compressed</div>
          <div id="compressedSize" style="font-size:20px; font-weight:700; color:#2ecc71;">
            <div class="spa-progress" style="width:60px; margin:8px auto;">
              <div class="spa-progress-bar" style="width:50%; animation:pulse 1s infinite;"></div>
            </div>
          </div>
        </div>
        <div style="padding:14px; background:rgba(251,116,28,0.05); border-radius:10px; text-align:center;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">Savings</div>
          <div id="savingsAmount" style="font-size:20px; font-weight:700; color:#fb741c;">-</div>
        </div>
      </div>

      <div style="background:rgba(0,0,0,0.03); padding:12px; border-radius:8px; margin-bottom:20px;">
        <div style="font-size:12px; color:#666; margin-bottom:8px;">
          📐 Dimensions: ${loadedImage.naturalWidth} × ${
      loadedImage.naturalHeight
    }px
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; color:#666; display:block; margin-bottom:4px;">Max Width</label>
            <input type="number" id="maxWidth" value="${
              loadedImage.naturalWidth
            }" min="100"
              style="width:100%; padding:8px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:13px;">
          </div>
          <div>
            <label style="font-size:11px; color:#666; display:block; margin-bottom:4px;">Max Height</label>
            <input type="number" id="maxHeight" value="${
              loadedImage.naturalHeight
            }" min="100"
              style="width:100%; padding:8px; border:1px solid rgba(0,0,0,0.1); border-radius:6px; font-size:13px;">
          </div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="font-size:12px; font-weight:600; color:#19325d; display:block; margin-bottom:10px;">📦 Output Format</label>
        <div style="display:grid; grid-template-columns: repeat(${
          formatOptions.length
        }, 1fr); gap:8px;">
          ${formatOptions
            .map(
              (fmt, i) => `
            <button class="format-btn spa-btn" data-format="${fmt}"
              style="padding:10px; border:2px solid ${
                i === 0 ? "#fb741c" : "rgba(0,0,0,0.1)"
              };
              background:${
                i === 0 ? "rgba(251,116,28,0.1)" : "white"
              }; border-radius:8px;
              cursor:pointer; font-size:12px; font-weight:600; text-transform:uppercase;">
              ${fmt}${
                fmt === "webp"
                  ? " • Best"
                  : fmt === "jpeg"
                  ? " • Compatible"
                  : ""
              }
            </button>
          `
            )
            .join("")}
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <label style="display:block; margin-bottom:10px; font-weight:600; font-size:13px; color:#19325d;">
          ⚡ Quality <span id="qualityValue" style="color:#fb741c;">${
            userSettings.defaultQuality
          }</span>
        </label>
        <input type="range" id="qualitySlider" min="10" max="100" value="${
          userSettings.defaultQuality
        }" step="5"
          style="width:100%; height:6px; border-radius:5px; outline:none; cursor:pointer;
          background:linear-gradient(to right, #fb741c ${
            userSettings.defaultQuality
          }%, #e0e0e0 ${userSettings.defaultQuality}%);">
        <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:10px; color:#999;">
          <span>Low Quality</span><span>Recommended</span><span>High Quality</span>
        </div>
      </div>

      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button id="cancelBtn" class="spa-btn"
          style="padding:12px 24px; background:linear-gradient(135deg,#95a5a6,#7f8c8d); color:white;
          border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Cancel
        </button>
        <button id="downloadBtn" class="spa-btn"
          style="padding:12px 24px; background:linear-gradient(135deg,#fb741c,#ff8c42); color:white;
          border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          💾 Download Compressed
        </button>
      </div>

      <div id="compressionStatus" style="display:none; margin-top:16px; padding:12px; border-radius:8px;"></div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    let selectedFormat = formatOptions[0];
    let debounceTimer;
    let cachedBlob = null;

    const qualitySlider = modal.querySelector("#qualitySlider");
    const qualityValue = modal.querySelector("#qualityValue");
    const compressedSize = modal.querySelector("#compressedSize");
    const savingsAmount = modal.querySelector("#savingsAmount");
    const maxWidthInput = modal.querySelector("#maxWidth");
    const maxHeightInput = modal.querySelector("#maxHeight");

    async function updatePreview() {
      try {
        compressedSize.innerHTML = `
          <div class="spa-progress" style="width:60px; margin:8px auto;">
            <div class="spa-progress-bar" style="width:50%; animation:pulse 1s infinite;"></div>
          </div>
        `;

        const quality = parseInt(qualitySlider.value || "80", 10) / 100;
        const maxW = parseInt(
          maxWidthInput.value || String(loadedImage.naturalWidth),
          10
        );
        const maxH = parseInt(
          maxHeightInput.value || String(loadedImage.naturalHeight),
          10
        );

        const blob = await compressImage(
          loadedImage,
          quality,
          maxW,
          maxH,
          selectedFormat
        );
        cachedBlob = blob;
        const newSize = blob.size;
        const savings = imgData.size - newSize;
        const savingsPercent = (savings / imgData.size) * 100;

        compressedSize.textContent = formatBytes(newSize);
        if (savings >= 0) {
          savingsAmount.textContent = `${formatBytes(
            savings
          )} (${savingsPercent.toFixed(1)}%)`;
          savingsAmount.style.color = "#2ecc71";
        } else {
          savingsAmount.textContent = `${formatBytes(
            Math.abs(savings)
          )} larger`;
          savingsAmount.style.color = "#e74c3c";
        }
      } catch (error) {
        compressedSize.textContent = "Error";
        savingsAmount.textContent = "Failed";
        console.error("Compression error:", error);
      }
    }

    function scheduleUpdate() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updatePreview, 400);
    }

    updatePreview();

    qualitySlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value || "80", 10);
      qualityValue.textContent = String(val);
      const pct = ((val - 10) / 90) * 100;
      e.target.style.background = `linear-gradient(to right, #fb741c ${pct}%, #e0e0e0 ${pct}%)`;
      scheduleUpdate();
    });

    modal.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        modal.querySelectorAll(".format-btn").forEach((b) => {
          b.style.border = "2px solid rgba(0,0,0,0.1)";
          b.style.background = "white";
        });
        this.style.border = "2px solid #fb741c";
        this.style.background = "rgba(251,116,28,0.1)";
        selectedFormat = this.dataset.format;
        scheduleUpdate();
      });
    });

    maxWidthInput.addEventListener("change", scheduleUpdate);
    maxHeightInput.addEventListener("change", scheduleUpdate);

    modal.querySelector("#downloadBtn").addEventListener("click", async () => {
      const btn = modal.querySelector("#downloadBtn");
      const status = modal.querySelector("#compressionStatus");
      btn.disabled = true;
      btn.textContent = "Processing...";

      try {
        let blob = cachedBlob;
        if (!blob) {
          const quality = parseInt(qualitySlider.value || "80", 10) / 100;
          const maxW = parseInt(
            maxWidthInput.value || String(loadedImage.naturalWidth),
            10
          );
          const maxH = parseInt(
            maxHeightInput.value || String(loadedImage.naturalHeight),
            10
          );
          blob = await compressImage(
            loadedImage,
            quality,
            maxW,
            maxH,
            selectedFormat
          );
        }

        const filename = (imgData.src.split("/").pop() || "image")
          .split("?")[0]
          .replace(/\.[^.]*$/, "");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = selectedFormat === "jpeg" ? "jpg" : selectedFormat;
        a.download = `compressed-${filename}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        status.style.display = "block";
        status.style.background = "rgba(46,204,113,0.1)";
        status.style.color = "#2ecc71";
        status.innerHTML = `<strong>✅ Downloaded!</strong> Original: ${formatBytes(
          imgData.size
        )} • Compressed: ${formatBytes(blob.size)}`;
        showToast("Image compressed and downloaded!", "success");
        setTimeout(() => document.body.removeChild(backdrop), 2000);
      } catch (error) {
        status.style.display = "block";
        status.style.background = "rgba(231,76,60,0.1)";
        status.style.color = "#e74c3c";
        status.innerHTML = `<strong>❌ Error:</strong> ${error}`;
        btn.disabled = false;
        btn.textContent = "💾 Download Compressed";
        showToast("Compression failed", "error");
      }
    });

    modal.querySelector("#cancelBtn").addEventListener("click", () => {
      clearTimeout(debounceTimer);
      document.body.removeChild(backdrop);
    });

    modal.querySelector("#closeCompression").addEventListener("click", () => {
      clearTimeout(debounceTimer);
      document.body.removeChild(backdrop);
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        clearTimeout(debounceTimer);
        document.body.removeChild(backdrop);
      }
    });
  }
  // ============================================================================
  // SECTION 7: OPTIMIZATION LEVELS & RECOMMENDATIONS
  // Modify this section to change scoring thresholds or recommendation logic
  // ============================================================================

  function getOptimizationLevel(size) {
    if (size > 500 * 1024) {
      return {
        level: "CRITICAL",
        color: "#e74c3c",
        bgColor: "rgba(231,76,60,0.15)",
        score: 0,
      };
    } else if (size > 200 * 1024) {
      return {
        level: "WARNING",
        color: "#f39c12",
        bgColor: "rgba(243,156,18,0.15)",
        score: 50,
      };
    } else if (size > 100 * 1024) {
      return {
        level: "NOTICE",
        color: "#3498db",
        bgColor: "rgba(52,152,219,0.15)",
        score: 75,
      };
    }
    return {
      level: "GOOD",
      color: "#2ecc71",
      bgColor: "rgba(46,204,113,0.15)",
      score: 100,
    };
  }

  function getImageRecommendations(imgData, size, format) {
    const recommendations = [];
    const support = detectFormatSupport();

    // Format recommendation
    if (
      (format === "jpg" || format === "jpeg" || format === "png") &&
      support.webp
    ) {
      recommendations.push({
        type: "format",
        priority: "high",
        icon: "🗜️",
        message: "Convert to WebP for 25–35% size reduction",
        impact: "High",
      });
    }

    // Lazy loading
    if (imgData.type === "img" && !imgData.lazyLoaded) {
      recommendations.push({
        type: "loading",
        priority: "medium",
        icon: "⏳",
        message: 'Add loading="lazy" attribute',
        impact: "Medium",
      });
    }

    // Responsive images
    if (imgData.type === "img" && !imgData.responsive) {
      recommendations.push({
        type: "responsive",
        priority: "medium",
        icon: "📱",
        message: "Use srcset for responsive images",
        impact: "Medium",
      });
    }

    // Oversized images
    if (imgData.type === "img") {
      const naturalWidth =
        imgData.dimensions?.natural?.width ||
        imgData.element?.naturalWidth ||
        0;
      const naturalHeight =
        imgData.dimensions?.natural?.height ||
        imgData.element?.naturalHeight ||
        0;
      const displayWidth =
        imgData.dimensions?.display?.width || imgData.element?.width || 0;
      const displayHeight =
        imgData.dimensions?.display?.height || imgData.element?.height || 0;

      if (naturalWidth > displayWidth * 2) {
        recommendations.push({
          type: "resize",
          priority: "high",
          icon: "🔍",
          message: `Resize from ${naturalWidth}×${naturalHeight} to ~${Math.round(
            displayWidth
          )}×${Math.round(displayHeight)}`,
          impact: "High",
        });
      }
    }

    // Compression recommendation
    if (size > 100 * 1024) {
      const target = size > 500 * 1024 ? "200KB" : "100KB";
      recommendations.push({
        type: "compression",
        priority: size > 500 * 1024 ? "critical" : "medium",
        icon: "⚙️",
        message: `Compress image to under ${target}`,
        impact: size > 500 * 1024 ? "Critical" : "Medium",
      });
    }

    return recommendations;
  }
  // ============================================================================
  // SECTION 8: INFO MODAL WITH PREVIEW & CROP TAB
  // NEW: Added image preview in Info tab
  // NEW: Added Crop tab with interactive crop tool
  // Modify this section to change the Info/Crop modal behavior
  // ============================================================================

  function showImageInfoModal(imgData, size, recommendations) {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 28px; border-radius: 16px; max-width: 800px; width: 100%;
      max-height: 90vh; overflow-y: auto; animation: slideIn 0.3s;
    `;

    const opt = getOptimizationLevel(size);
    const format = (
      imgData.src.split(".").pop().split("?")[0] || ""
    ).toLowerCase();

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <h2 style="margin:0; font-size:20px; color:#19325d;">📊 Image Details</h2>
        <button class="close-info-modal" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div class="spa-modal-tabs">
        <div class="spa-modal-tab active" data-tab="info">ℹ️ Info</div>
        <div class="spa-modal-tab" data-tab="crop">✂️ Crop</div>
      </div>

      <div id="infoTab" class="spa-tab-content active">
        ${
          userSettings.showImagePreviews
            ? `
          <div class="spa-image-preview">
            <img src="${imgData.src}" alt="Image Preview" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;color:#999;\\'>Preview unavailable</div>'">
          </div>
        `
            : ""
        }

        <div style="margin-bottom: 16px; padding: 12px; background:${
          opt.bgColor
        }; border-left: 4px solid ${opt.color}; border-radius: 8px;">
          <div style="font-size:12px; font-weight:700; color:${
            opt.color
          }; margin-bottom: 8px; text-transform: uppercase;">
            ${opt.level} Priority
          </div>
          <div style="font-size:11px; color:#666; word-break: break-all;">
            ${imgData.src}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:16px;">
          <div style="padding:12px; background:rgba(0,0,0,0.03); border-radius:8px;">
            <div style="font-size:10px; color:#999; margin-bottom:4px;">📦 File Size</div>
            <div style="font-size:18px; font-weight:700; color:#19325d;">${formatBytes(
              size
            )}</div>
          </div>
          <div style="padding:12px; background:rgba(0,0,0,0.03); border-radius:8px;">
            <div style="font-size:10px; color:#999; margin-bottom:4px;">🖼️ Format</div>
            <div style="font-size:18px; font-weight:700; color:#19325d; text-transform: uppercase;">${
              format || "unknown"
            }</div>
          </div>
        </div>

        ${
          imgData.dimensions
            ? `
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:16px;">
            <div style="padding:12px; background:rgba(0,0,0,0.03); border-radius:8px;">
              <div style="font-size:10px; color:#999; margin-bottom:4px;">📐 Natural Size</div>
              <div style="font-size:14px; font-weight:700; color:#19325d;">
                ${imgData.dimensions.natural?.width || "-"} × ${
                imgData.dimensions.natural?.height || "-"
              }px
              </div>
            </div>
            <div style="padding:12px; background:rgba(0,0,0,0.03); border-radius:8px;">
              <div style="font-size:10px; color:#999; margin-bottom:4px;">📏 Display Size</div>
              <div style="font-size:14px; font-weight:700; color:#19325d;">
                ${imgData.dimensions.display?.width || "-"} × ${
                imgData.dimensions.display?.height || "-"
              }px
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          recommendations && recommendations.length > 0
            ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:12px; font-weight:700; color:#19325d; margin-bottom: 10px;">💡 AI-Powered Recommendations</div>
            ${recommendations
              .map(
                (rec) => `
              <div style="margin-bottom:8px; padding:12px; background:white; border-radius:8px; border:1px solid rgba(0,0,0,0.06);">
                <div style="font-size:12px; color:#19325d; margin-bottom: 4px; font-weight: 600;">
                  ${rec.icon || "•"} ${rec.message}
                </div>
                <div style="font-size:10px; color:#999;">
                  <span class="spa-badge" style="background:${
                    rec.priority === "critical" || rec.priority === "high"
                      ? "#e74c3c"
                      : rec.priority === "medium"
                      ? "#f39c12"
                      : "#3498db"
                  }; color:white;">
                    ${rec.impact || "Low"} Impact
                  </span>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="compress-from-info spa-btn" style="padding:10px 20px; background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
            🗜️ Compress
          </button>
          <button class="close-info-modal spa-btn" style="padding:10px 20px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
            Close
          </button>
        </div>
      </div>

      <div id="cropTab" class="spa-tab-content">
        <div class="spa-crop-container" id="cropContainer">
          <img src="${
            imgData.src
          }" class="spa-crop-image" id="cropImage" alt="Crop Preview">
          <div class="spa-crop-box" id="cropBox" style="left:10%; top:10%; width:80%; height:80%;">
            <div class="spa-crop-handle nw"></div>
            <div class="spa-crop-handle ne"></div>
            <div class="spa-crop-handle sw"></div>
            <div class="spa-crop-handle se"></div>
            <div class="spa-crop-handle n"></div>
            <div class="spa-crop-handle s"></div>
            <div class="spa-crop-handle w"></div>
            <div class="spa-crop-handle e"></div>
          </div>
        </div>

        <div class="spa-crop-controls">
          <div class="spa-crop-control">
            <label>Width (px)</label>
            <input type="number" id="cropWidth" min="1" value="800">
          </div>
          <div class="spa-crop-control">
            <label>Height (px)</label>
            <input type="number" id="cropHeight" min="1" value="600">
          </div>
          <div class="spa-crop-control">
            <label>Aspect Ratio</label>
            <select id="cropAspectRatio">
              <option value="free">Free</option>
              <option value="original">Original</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="3:2">3:2 (Photo)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>
          <div class="spa-crop-control">
            <label style="display:flex; align-items:center; gap:6px; margin-top:20px;">
              <input type="checkbox" id="lockAspectRatio" checked>
              Lock Aspect
            </label>
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button id="copyCroppedBtn" class="spa-btn" style="padding:10px 20px; background:linear-gradient(135deg,#3498db,#2980b9); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
            📋 Copy to Clipboard
          </button>
          <button id="downloadCroppedBtn" class="spa-btn" style="padding:10px 20px; background:linear-gradient(135deg,#fb741c,#ff8c42); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
            💾 Download Cropped
          </button>
        </div>

        <div style="margin-top:12px; padding:10px; background:rgba(52,152,219,0.1); border-left:3px solid #3498db; border-radius:6px; font-size:11px; color:#19325d;">
          💡 <strong>Tip:</strong> Drag the crop box or handles to adjust the selection. Use the inputs for precise control.
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Tab switching
    const tabs = modal.querySelectorAll(".spa-modal-tab");
    const tabContents = modal.querySelectorAll(".spa-tab-content");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        const targetTab = tab.getAttribute("data-tab");
        modal.querySelector(`#${targetTab}Tab`).classList.add("active");
      });
    });

    // Close handlers
    modal.querySelectorAll(".close-info-modal").forEach((btn) => {
      btn.addEventListener("click", () => document.body.removeChild(backdrop));
    });

    modal
      .querySelector(".compress-from-info")
      ?.addEventListener("click", () => {
        document.body.removeChild(backdrop);
        showCompressionModal(imgData);
      });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });

    // Initialize crop tool
    initCropTool(modal, imgData);
  }

  // ============================================================================
  // CROP TOOL INITIALIZATION AND LOGIC
  // ============================================================================

  function initCropTool(modal, imgData) {
    const cropContainer = modal.querySelector("#cropContainer");
    const cropImage = modal.querySelector("#cropImage");
    const cropBox = modal.querySelector("#cropBox");
    const widthInput = modal.querySelector("#cropWidth");
    const heightInput = modal.querySelector("#cropHeight");
    const aspectRatioSelect = modal.querySelector("#cropAspectRatio");
    const lockAspectCheckbox = modal.querySelector("#lockAspectRatio");
    const downloadBtn = modal.querySelector("#downloadCroppedBtn");
    const copyBtn = modal.querySelector("#copyCroppedBtn");

    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let startHeight = 0;
    let resizeHandle = null;
    let aspectRatio = null;

    // Wait for image to load
    cropImage.onload = function () {
      const naturalWidth = cropImage.naturalWidth;
      const naturalHeight = cropImage.naturalHeight;
      aspectRatio = naturalWidth / naturalHeight;

      // Initialize inputs with actual dimensions
      const cropBoxRect = cropBox.getBoundingClientRect();
      const containerRect = cropContainer.getBoundingClientRect();
      const scaleX = naturalWidth / containerRect.width;
      const scaleY = naturalHeight / containerRect.height;

      widthInput.value = Math.round(
        (cropBoxRect.width / containerRect.width) * naturalWidth
      );
      heightInput.value = Math.round(
        (cropBoxRect.height / containerRect.height) * naturalHeight
      );
    };

    // Crop box dragging
    cropBox.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("spa-crop-handle")) {
        isResizing = true;
        resizeHandle = e.target.className.split(" ")[1];
        startX = e.clientX;
        startY = e.clientY;
        const rect = cropBox.getBoundingClientRect();
        const containerRect = cropContainer.getBoundingClientRect();
        startLeft = rect.left - containerRect.left;
        startTop = rect.top - containerRect.top;
        startWidth = rect.width;
        startHeight = rect.height;
      } else {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = cropBox.getBoundingClientRect();
        const containerRect = cropContainer.getBoundingClientRect();
        startLeft = rect.left - containerRect.left;
        startTop = rect.top - containerRect.top;
      }
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const containerRect = cropContainer.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();

        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        newLeft = Math.max(
          0,
          Math.min(newLeft, containerRect.width - boxRect.width)
        );
        newTop = Math.max(
          0,
          Math.min(newTop, containerRect.height - boxRect.height)
        );

        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
      } else if (isResizing) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const containerRect = cropContainer.getBoundingClientRect();
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        const locked = lockAspectCheckbox.checked;
        const currentRatio = aspectRatio || startWidth / startHeight;

        switch (resizeHandle) {
          case "se":
            newWidth = Math.max(50, startWidth + deltaX);
            newHeight = locked
              ? newWidth / currentRatio
              : Math.max(50, startHeight + deltaY);
            break;
          case "sw":
            newWidth = Math.max(50, startWidth - deltaX);
            newHeight = locked
              ? newWidth / currentRatio
              : Math.max(50, startHeight + deltaY);
            newLeft = startLeft - (newWidth - startWidth);
            break;
          case "ne":
            newWidth = Math.max(50, startWidth + deltaX);
            newHeight = locked
              ? newWidth / currentRatio
              : Math.max(50, startHeight - deltaY);
            newTop = startTop - (newHeight - startHeight);
            break;
          case "nw":
            newWidth = Math.max(50, startWidth - deltaX);
            newHeight = locked
              ? newWidth / currentRatio
              : Math.max(50, startHeight - deltaY);
            newLeft = startLeft - (newWidth - startWidth);
            newTop = startTop - (newHeight - startHeight);
            break;
          case "e":
            newWidth = Math.max(50, startWidth + deltaX);
            if (locked) newHeight = newWidth / currentRatio;
            break;
          case "w":
            newWidth = Math.max(50, startWidth - deltaX);
            if (locked) newHeight = newWidth / currentRatio;
            newLeft = startLeft - (newWidth - startWidth);
            break;
          case "s":
            newHeight = Math.max(50, startHeight + deltaY);
            if (locked) newWidth = newHeight * currentRatio;
            break;
          case "n":
            newHeight = Math.max(50, startHeight - deltaY);
            if (locked) newWidth = newHeight * currentRatio;
            newTop = startTop - (newHeight - startHeight);
            break;
        }

        // Constrain to container
        newWidth = Math.min(newWidth, containerRect.width - newLeft);
        newHeight = Math.min(newHeight, containerRect.height - newTop);
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);

        cropBox.style.width = `${newWidth}px`;
        cropBox.style.height = `${newHeight}px`;
        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;

        // Update inputs
        updateInputsFromBox();
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      isResizing = false;
      resizeHandle = null;
    });

    function updateInputsFromBox() {
      const boxRect = cropBox.getBoundingClientRect();
      const containerRect = cropContainer.getBoundingClientRect();
      const naturalWidth = cropImage.naturalWidth;
      const naturalHeight = cropImage.naturalHeight;
      const scaleX = naturalWidth / containerRect.width;
      const scaleY = naturalHeight / containerRect.height;

      widthInput.value = Math.round(boxRect.width * scaleX);
      heightInput.value = Math.round(boxRect.height * scaleY);
    }

    // Aspect ratio selector
    aspectRatioSelect.addEventListener("change", () => {
      const value = aspectRatioSelect.value;
      if (value === "free") {
        aspectRatio = null;
        lockAspectCheckbox.checked = false;
      } else if (value === "original") {
        aspectRatio = cropImage.naturalWidth / cropImage.naturalHeight;
        lockAspectCheckbox.checked = true;
      } else {
        const [w, h] = value.split(":").map(Number);
        aspectRatio = w / h;
        lockAspectCheckbox.checked = true;
      }

      if (aspectRatio && lockAspectCheckbox.checked) {
        const boxRect = cropBox.getBoundingClientRect();
        const newHeight = boxRect.width / aspectRatio;
        cropBox.style.height = `${newHeight}px`;
        updateInputsFromBox();
      }
    });

    // Download cropped image - FIXED VERSION
    downloadBtn.addEventListener("click", async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const boxRect = cropBox.getBoundingClientRect();
        const containerRect = cropContainer.getBoundingClientRect();
        const imageRect = cropImage.getBoundingClientRect();

        const naturalWidth = cropImage.naturalWidth;
        const naturalHeight = cropImage.naturalHeight;

        // Calculate scale factors
        const scaleX = naturalWidth / imageRect.width;
        const scaleY = naturalHeight / imageRect.height;

        // Calculate crop area relative to image
        const cropX = (boxRect.left - imageRect.left) * scaleX;
        const cropY = (boxRect.top - imageRect.top) * scaleY;
        const cropWidth = boxRect.width * scaleX;
        const cropHeight = boxRect.height * scaleY;

        canvas.width = Math.max(1, Math.round(cropWidth));
        canvas.height = Math.max(1, Math.round(cropHeight));

        // Create a temporary image for CORS-friendly canvas export
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = () => {
            // Fallback: try without crossOrigin
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              tempImg.src = fallbackImg.src;
              resolve();
            };
            fallbackImg.onerror = reject;
            fallbackImg.src = imgData.src;
          };
          tempImg.src = imgData.src;
        });

        ctx.drawImage(
          tempImg,
          Math.max(0, cropX),
          Math.max(0, cropY),
          cropWidth,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob((blob) => {
          if (!blob) {
            showToast("Failed to create cropped image", "error");
            return;
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const filename = (imgData.src.split("/").pop() || "image")
            .split("?")[0]
            .replace(/\.[^.]*$/, "");
          a.href = url;
          a.download = `cropped-${filename}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast("Cropped image downloaded!", "success");
        }, "image/png");
      } catch (error) {
        console.error("Crop download error:", error);
        showToast(
          "Failed to download cropped image. CORS restriction may apply.",
          "error"
        );
      }
    });

    // Copy to clipboard
    copyBtn.addEventListener("click", async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const boxRect = cropBox.getBoundingClientRect();
        const containerRect = cropContainer.getBoundingClientRect();
        const imageRect = cropImage.getBoundingClientRect();

        const naturalWidth = cropImage.naturalWidth;
        const naturalHeight = cropImage.naturalHeight;

        const scaleX = naturalWidth / imageRect.width;
        const scaleY = naturalHeight / imageRect.height;

        const cropX = (boxRect.left - imageRect.left) * scaleX;
        const cropY = (boxRect.top - imageRect.top) * scaleY;
        const cropWidth = boxRect.width * scaleX;
        const cropHeight = boxRect.height * scaleY;

        canvas.width = Math.max(1, Math.round(cropWidth));
        canvas.height = Math.max(1, Math.round(cropHeight));

        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = imgData.src;
        });

        ctx.drawImage(
          tempImg,
          Math.max(0, cropX),
          Math.max(0, cropY),
          cropWidth,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(async (blob) => {
          if (!blob) {
            showToast("Failed to create cropped image", "error");
            return;
          }

          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            showToast("Cropped image copied to clipboard!", "success");
          } catch (clipError) {
            showToast("Clipboard not supported in this browser", "error");
          }
        }, "image/png");
      } catch (error) {
        console.error("Crop copy error:", error);
        showToast("Failed to copy cropped image", "error");
      }
    });
  }
  // ============================================================================
  // SECTION 9: IMAGE OVERLAYS
  // Modify this section to change overlay appearance or behavior
  // ============================================================================

  function createImageOverlay(imgData, size, index) {
    const opt = getOptimizationLevel(size);
    const format = (
      imgData.src.split(".").pop().split("?")[0] || ""
    ).toLowerCase();
    const recommendations = getImageRecommendations(imgData, size, format);

    const rect = imgData.element.getBoundingClientRect();
    const overlayId = generateId();

    const overlay = document.createElement("div");
    overlay.className = `spa-image-overlay ${
      opt.level === "CRITICAL" ? "critical" : ""
    }`;
    overlay.dataset.overlayId = overlayId;
    overlay.dataset.level = opt.level;
    overlay.style.cssText = `
      position: absolute;
      top: ${window.scrollY + rect.top}px;
      left: ${window.scrollX + rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px ${imgData.type === "background" ? "dashed" : "solid"} ${
      opt.color
    };
      background: ${opt.bgColor};
      z-index: 9998;
      pointer-events: none;
      box-sizing: border-box;
      transition: all 0.2s;
    `;

    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      background: ${opt.color};
      color: white;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      white-space: nowrap;
      z-index: 9999;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      cursor: pointer;
    `;

    const lazyIcon = imgData.lazyLoaded ? " 🔄" : "";
    const responsiveIcon = imgData.responsive ? " 📱" : "";
    label.textContent = `${imgData.type} • ${formatBytes(
      size
    )} • ${format.toUpperCase()}${lazyIcon}${responsiveIcon}`;

    const actionsContainer = document.createElement("div");
    actionsContainer.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      display: flex;
      gap: 4px;
      z-index: 9999;
      pointer-events: auto;
    `;

    const infoBtn = document.createElement("button");
    infoBtn.className = "spa-btn";
    infoBtn.innerHTML = "ℹ️";
    infoBtn.title = "View image details";
    infoBtn.style.cssText = `
      padding: 6px 10px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    const compressBtn = document.createElement("button");
    compressBtn.className = "spa-btn";
    compressBtn.innerHTML = "🗜️";
    compressBtn.title = "Compress this image";
    compressBtn.style.cssText = `
      padding: 6px 10px;
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    actionsContainer.appendChild(infoBtn);
    actionsContainer.appendChild(compressBtn);
    overlay.appendChild(label);
    overlay.appendChild(actionsContainer);

    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showImageInfoModal(imgData, size, recommendations);
    });

    compressBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showCompressionModal(imgData);
    });

    label.addEventListener("click", (e) => {
      e.stopPropagation();
      if (hiddenOverlays.has(overlayId)) {
        overlay.style.display = "block";
        hiddenOverlays.delete(overlayId);
      } else {
        overlay.style.display = "none";
        hiddenOverlays.add(overlayId);
      }
    });

    document.body.appendChild(overlay);
    return { overlay, overlayId };
  }

  function updateOverlayPosition(overlay, element) {
    const rect = element.getBoundingClientRect();
    overlay.style.top = `${window.scrollY + rect.top}px`;
    overlay.style.left = `${window.scrollX + rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
  // ============================================================================
  // SECTION 10: VIDEO OVERLAYS
  // Modify this section to change video overlay behavior
  // ============================================================================

  function getAllVideos() {
    const videos = [];
    const videoElements = document.querySelectorAll(
      "video, iframe[src*='youtube'], iframe[src*='vimeo']"
    );

    videoElements.forEach((el) => {
      let type = "html5";
      let src = "";
      let autoplay = false;

      if (el.tagName.toLowerCase() === "iframe") {
        type = "embedded";
        src = el.getAttribute("src") || "";
        autoplay = /\bautoplay=1\b/i.test(src);
      } else {
        src = el.currentSrc || el.src || el.querySelector("source")?.src || "";
        autoplay = el.hasAttribute("autoplay");
      }

      if (!src) return;

      const rect = el.getBoundingClientRect();
      videos.push({
        element: el,
        src,
        type,
        autoplay,
        hasPoster:
          el.tagName.toLowerCase() === "video"
            ? el.hasAttribute("poster")
            : false,
        dimensions: {
          display: {
            width: rect.width,
            height: rect.height,
          },
        },
      });
    });

    return videos;
  }

  function createVideoOverlay(video, index) {
    if (!userSettings.showVideos) return { overlay: null, overlayId: null };

    const rect = video.element.getBoundingClientRect();
    const overlayId = generateId();

    const overlay = document.createElement("div");
    overlay.className = "spa-video-overlay";
    overlay.dataset.overlayId = overlayId;
    overlay.style.cssText = `
      position: absolute;
      top: ${window.scrollY + rect.top}px;
      left: ${window.scrollX + rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #9b59b6;
      background: rgba(155, 89, 182, 0.15);
      z-index: 9998;
      pointer-events: auto;
      box-sizing: border-box;
      cursor: pointer;
    `;

    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      background: #9b59b6;
      color: white;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
    `;

    label.textContent = `🎥 ${
      video.type === "embedded" ? "Embedded Video" : "HTML5 Video"
    }${video.autoplay ? " • autoplay" : ""}`;

    overlay.appendChild(label);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
      if (hiddenOverlays.has(overlayId)) {
        overlay.style.display = "block";
        hiddenOverlays.delete(overlayId);
      } else {
        overlay.style.display = "none";
        hiddenOverlays.add(overlayId);
      }
    });

    return { overlay, overlayId };
  }
  // ============================================================================
  // SECTION 11: IMAGE DISCOVERY
  // Modify this section to change how images are detected
  // ============================================================================

  function getAllImages() {
    const allImages = document.querySelectorAll("img");
    const visible = [];
    const hidden = [];

    allImages.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const style = getComputedStyle(img);

      const isVisible =
        !!img.offsetParent &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity || "1") > 0 &&
        rect.width > 0 &&
        rect.height > 0;

      const imageDataObj = {
        element: img,
        type: "img",
        hidden: !isVisible,
        lazyLoaded: img.hasAttribute("loading") || img.hasAttribute("data-src"),
        responsive: img.hasAttribute("srcset"),
        dimensions: {
          natural: {
            width: img.naturalWidth,
            height: img.naturalHeight,
          },
          display: {
            width: img.width,
            height: img.height,
          },
        },
      };

      if (isVisible) {
        visible.push(imageDataObj);
      } else {
        hidden.push(imageDataObj);
      }
    });

    return {
      visible,
      hidden,
      all: [...visible, ...hidden],
    };
  }

  function getAllBackgroundImages() {
    const bgImages = [];
    const allElements = document.querySelectorAll("*");

    allElements.forEach((el) => {
      const style = getComputedStyle(el);
      const bgImage = style.backgroundImage || "";

      if (bgImage && bgImage !== "none") {
        const urlMatches = bgImage.match(/url\((['"]?)(.*?)\1\)/g) || [];
        urlMatches.forEach((match) => {
          const url = match.replace(/url\(['"]?/, "").replace(/['"]?\)/, "");
          if (!url || url.startsWith("data:")) return;

          const rect = el.getBoundingClientRect();
          bgImages.push({
            element: el,
            src: url,
            type: "background",
            visible: rect.width > 0 && rect.height > 0,
            dimensions: {
              display: {
                width: rect.width,
                height: rect.height,
              },
            },
          });
        });
      }
    });

    return bgImages;
  }

  async function getImageSize(imgSrc, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(imgSrc, {
          method: "HEAD",
          cache: "force-cache",
        });
        const contentLength = response.headers.get("content-length");
        if (contentLength) {
          return parseInt(contentLength, 10);
        }

        if (i === retries - 1) {
          const fullResponse = await fetch(imgSrc);
          const blob = await fullResponse.blob();
          return blob.size || null;
        }
      } catch (err) {
        if (i === retries - 1) return null;
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return null;
  }
  // ============================================================================
  // SECTION 12: PERFORMANCE SCORING
  // Modify this section to change scoring algorithm
  // ============================================================================

  function calculatePerformanceScore(images, videos) {
    let score = 100;
    const breakdown = {
      criticalImages: 0,
      warningImages: 0,
      noticeImages: 0,
      noLazyLoad: 0,
      noResponsive: 0,
      oversizedImages: 0,
      autoplayVideos: 0,
      totalSize: 0,
    };

    images.forEach((img) => {
      breakdown.totalSize += img.size || 0;
      const opt = getOptimizationLevel(img.size || 0);

      if (opt.level === "CRITICAL") {
        breakdown.criticalImages++;
        score -= 15;
      } else if (opt.level === "WARNING") {
        breakdown.warningImages++;
        score -= 8;
      } else if (opt.level === "NOTICE") {
        breakdown.noticeImages++;
        score -= 3;
      }

      if (img.type === "img" && !img.lazyLoaded) {
        breakdown.noLazyLoad++;
        score -= 2;
      }

      if (img.type === "img" && !img.responsive) {
        breakdown.noResponsive++;
        score -= 1;
      }

      if (img.type === "img") {
        const naturalWidth =
          img.dimensions?.natural?.width || img.element?.naturalWidth || 0;
        const displayWidth =
          img.dimensions?.display?.width || img.element?.width || 0;
        if (naturalWidth > displayWidth * 2) {
          breakdown.oversizedImages++;
          score -= 3;
        }
      }
    });

    videos.forEach((v) => {
      if (v.autoplay) {
        breakdown.autoplayVideos++;
        score -= 10;
      }
    });

    const finalScore = Math.max(0, Math.min(100, score));
    const grade =
      finalScore >= 90
        ? "A"
        : finalScore >= 80
        ? "B"
        : finalScore >= 70
        ? "C"
        : finalScore >= 60
        ? "D"
        : "F";

    return {
      score: finalScore,
      breakdown,
      grade,
    };
  }
  // ============================================================================
  // SECTION 13: MAIN ANALYSIS FUNCTION
  // Modify this section to change analysis flow
  // ============================================================================

  function createProgressBar() {
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 999999;
      min-width: 300px;
    `;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
        <div style="text-align:left;">
          <div style="font-size:16px; font-weight:700; color:#19325d; margin-bottom:4px;">🔍 Analyzing Assets</div>
          <div style="font-size:12px; color:#666;">Please wait...</div>
        </div>
        <button id="cancelAnalysisBtn" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s; padding:0; margin-left:20px;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'" title="Cancel Analysis">✕</button>
      </div>
      <div class="spa-progress" style="width:100%; height:8px;">
        <div class="spa-progress-bar" style="width:0; background:linear-gradient(90deg,#667eea,#764ba2)"></div>
      </div>
      <div id="progressText" style="text-align:center; font-size:11px; color:#999; margin-top:8px;">0%</div>
    `;

    document.body.appendChild(container);

    // Add cancel button handler
    const cancelBtn = container.querySelector("#cancelAnalysisBtn");
    cancelBtn.addEventListener("click", () => {
      analysisCancelled = true;
      cancelBtn.disabled = true;
      cancelBtn.style.opacity = "0.5";
      container.querySelector("#progressText").textContent = "Cancelling...";
      container.querySelector("#progressText").style.color = "#e74c3c";
    });

    return container;
  }

  function updateProgress(progressBar, percent) {
    const bar = progressBar.querySelector(".spa-progress-bar");
    const text = progressBar.querySelector("#progressText");
    bar.style.width = `${percent}%`;
    text.textContent = `${Math.round(percent)}%`;
  }

  function removeProgress(progressBar) {
    progressBar.style.opacity = "0";
    progressBar.style.transition = "opacity 0.3s";
    setTimeout(() => progressBar.remove(), 300);
  }

  async function performAnalysis() {
    if (analysisActive) return;
    analysisActive = true;

    // ← ADD THIS LINE
    analysisCancelled = false;

    overlays = [];
    imageData = [];
    videoData = [];
    hiddenOverlays.clear();
    currentFilter = "all";
    summaryBox = null;

    const progressBar = createProgressBar();

    try {
      const images = getAllImages();
      const backgrounds = getAllBackgroundImages();
      const videos = getAllVideos();

      let analyzed = 0;
      let hiddenImages = [];
      const total = images.all.length + backgrounds.length;

      for (let i = 0; i < images.all.length; i++) {
        const imgObj = images.all[i];
        const imgEl = imgObj.element;
        updateProgress(progressBar, ((analyzed + 1) / (total || 1)) * 100);
        // ← ADD THIS CANCEL CHECK
        if (analysisCancelled) {
          removeProgress(progressBar);
          showToast("❌ Analysis cancelled", "warning");
          analysisCancelled = false;
          return;
        }

        if (!imgEl || (!imgEl.src && !imgEl.currentSrc)) {
          analyzed++;
          continue;
        }

        const src = imgEl.currentSrc || imgEl.src;
        const size = await getImageSize(src);

        if (!size) {
          analyzed++;
          continue;
        }

        const data = { ...imgObj, size, src };
        imageData.push(data);

        if (imgObj.hidden) {
          hiddenImages.push(data);
          analyzed++;
          continue;
        }

        const { overlay, overlayId } = createImageOverlay(data, size, i);
        overlays.push({ overlay, element: imgEl, overlayId, data });
        analyzed++;
      }

      for (let i = 0; i < backgrounds.length; i++) {
        const bg = backgrounds[i];
        updateProgress(progressBar, ((analyzed + 1) / (total || 1)) * 100);

        // ← ADD THIS CANCEL CHECK
        if (analysisCancelled) {
          removeProgress(progressBar);
          showToast("❌ Analysis cancelled", "warning");
          analysisCancelled = false;
          return;
        }

        const size = await getImageSize(bg.src);
        if (!size) {
          analyzed++;
          continue;
        }

        const data = { ...bg, size, src: bg.src };
        imageData.push(data);

        if (!bg.visible) {
          hiddenImages.push(data);
          analyzed++;
          continue;
        }

        const { overlay, overlayId } = createImageOverlay(
          data,
          size,
          images.all.length + i
        );
        overlays.push({ overlay, element: bg.element, overlayId, data });
        analyzed++;
      }

      videos.forEach((v, i) => {
        const { overlay, overlayId } = createVideoOverlay(v, i);
        if (overlay) overlays.push({ overlay, element: v.element, overlayId });
        videoData.push(v);
      });

      removeProgress(progressBar);

      const scoreData = calculatePerformanceScore(imageData, videoData);
      performanceScore = scoreData.score;

      showEnhancedSummary(scoreData, hiddenImages, total);
      createHiddenImagesPanel(hiddenImages);

      analysisHistory.push({
        date: new Date().toISOString(),
        score: performanceScore,
        images: imageData.length,
        videos: videoData.length,
      });

      GM_setValue("analysisHistory", analysisHistory);

      if (scoreData.grade === "A") {
        triggerConfetti();
      }

      setupResizeObserver();
      showToast("✅ Analysis complete!", "success");

      analysisHistory.push({
        date: new Date().toISOString(),
        score: performanceScore,
        images: imageData.length,
        videos: videoData.length,
      });

      GM_setValue("analysisHistory", analysisHistory);

      if (scoreData.grade === "A") {
        triggerConfetti();
      }

      setupResizeObserver();
      showToast("✅ Analysis complete!", "success");

      // AUTO-HIDE TOOLBAR AFTER ANALYSIS
      const toolbar = document.getElementById("spaToolbar");
      const toggleBtn = document.getElementById("spaToggleBtn");
      if (toolbar && toggleBtn) {
        toolbar.style.left = "-280px";
        toggleBtn.textContent = "≡";
        // Reset toolbar state
        if (window.spaToolbarOpen !== undefined) {
          window.spaToolbarOpen = false;
        }
      }
    } catch (e) {
      console.error("Analysis failed:", e);
      try {
        removeProgress(progressBar);
      } catch (err) {}
      showToast("❌ Analysis failed", "error");
    } finally {
      analysisActive = false;
    }
  }

  function setupResizeObserver() {
    if (!window.ResizeObserver) return;

    resizeObserver = new ResizeObserver(() => {
      overlays.forEach(({ overlay, element, overlayId }) => {
        if (element && overlay.parentNode && !hiddenOverlays.has(overlayId)) {
          updateOverlayPosition(overlay, element);
        }
      });
    });

    overlays.forEach(({ element }) => {
      if (element) resizeObserver.observe(element);
    });

    window.addEventListener("resize", () => {
      overlays.forEach(({ overlay, element, overlayId }) => {
        if (element && overlay.parentNode && !hiddenOverlays.has(overlayId)) {
          updateOverlayPosition(overlay, element);
        }
      });
    });
  }
  // ============================================================================
  // SECTION 14: FILTER SYSTEM
  // Modify this section to change overlay filtering behavior
  // ============================================================================

  function filterOverlays(filter) {
    currentFilter = filter;
    overlays.forEach(({ overlay, data }) => {
      if (!overlay) return;
      const opt = getOptimizationLevel(data.size || 0);
      if (filter === "all" || opt.level === filter) {
        if (!hiddenOverlays.has(overlay.dataset.overlayId)) {
          overlay.style.display = "block";
        }
      } else {
        overlay.style.display = "none";
      }
    });
  }
  // ============================================================================
  // SECTION 15: BULK ACTIONS & EXPORT
  // Modify this section to change bulk operations
  // ============================================================================

  // ============================================================================
  // EXPORT REPORT FEATURE
  // ============================================================================

  function showExportModal(scoreData) {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 32px; border-radius: 16px; max-width: 500px; width: 100%;
      animation: slideIn 0.3s;
    `;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <h2 style="margin:0; font-size:20px; color:#19325d;">📥 Export Report</h2>
        <button id="closeExportModal" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div style="margin-bottom:24px;">
        <div style="font-size:13px; font-weight:700; color:#19325d; margin-bottom:12px;">📄 Choose Format:</div>

        <div style="display:grid; gap:12px;">
          <label style="display:flex; align-items:center; padding:14px; border:2px solid #3498db; border-radius:10px; cursor:pointer; background:rgba(52,152,219,0.05); transition:all 0.2s;">
            <input type="radio" name="exportFormat" value="html" checked style="width:18px; height:18px; cursor:pointer; margin-right:12px;">
            <div style="flex:1;">
              <div style="font-weight:700; color:#19325d; margin-bottom:2px;">📄 HTML Report</div>
              <div style="font-size:11px; color:#666;">Interactive, beautiful, shareable</div>
            </div>
          </label>

          <label style="display:flex; align-items:center; padding:14px; border:2px solid rgba(0,0,0,0.1); border-radius:10px; cursor:pointer; background:white; transition:all 0.2s;">
            <input type="radio" name="exportFormat" value="excel" style="width:18px; height:18px; cursor:pointer; margin-right:12px;">
            <div style="flex:1;">
              <div style="font-weight:700; color:#19325d; margin-bottom:2px;">📊 Excel Report</div>
              <div style="font-size:11px; color:#666;">Data-driven, editable, analysis-ready</div>
            </div>
          </label>
        </div>
      </div>

      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button id="cancelExportBtn" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#95a5a6,#7f8c8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Cancel
        </button>
        <button id="proceedExportBtn" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          ⬇️ Export
        </button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const formatRadios = modal.querySelectorAll('input[name="exportFormat"]');
    formatRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const labels = modal.querySelectorAll("label");
        labels.forEach((l) => {
          l.style.border = "2px solid rgba(0,0,0,0.1)";
          l.style.background = "white";
        });
        e.target.parentElement.style.border = "2px solid #2ecc71";
        e.target.parentElement.style.background = "rgba(46,204,113,0.05)";
      });
    });

    modal.querySelector("#closeExportModal").addEventListener("click", () => {
      document.body.removeChild(backdrop);
    });

    modal.querySelector("#cancelExportBtn").addEventListener("click", () => {
      document.body.removeChild(backdrop);
    });

    modal.querySelector("#proceedExportBtn").addEventListener("click", () => {
      const selectedFormat = modal.querySelector(
        'input[name="exportFormat"]:checked'
      ).value;
      document.body.removeChild(backdrop);
      if (selectedFormat === "html") {
        exportAsHTML(scoreData);
      } else {
        exportAsExcel(scoreData);
      }
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });
  }

  function exportAsHTML(scoreData) {
    const timestamp = new Date().toLocaleString();
    const totalSavings = imageData.reduce((sum, img) => {
      const opt = getOptimizationLevel(img.size);
      const savings =
        opt.level === "CRITICAL"
          ? img.size * 0.6
          : opt.level === "WARNING"
          ? img.size * 0.4
          : 0;
      return sum + savings;
    }, 0);

    const criticalCount = imageData.filter(
      (img) => getOptimizationLevel(img.size).level === "CRITICAL"
    ).length;
    const warningCount = imageData.filter(
      (img) => getOptimizationLevel(img.size).level === "WARNING"
    ).length;
    const noticeCount = imageData.filter(
      (img) => getOptimizationLevel(img.size).level === "NOTICE"
    ).length;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Site Speed Analysis Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
          .header { background: linear-gradient(135deg, #19325d 0%, #2a4a8d 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 40px; }
          .header h1 { font-size: 32px; margin-bottom: 8px; }
          .header p { opacity: 0.9; }
          .score-card { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .card.critical { border-color: #e74c3c; }
          .card.warning { border-color: #f39c12; }
          .card.notice { border-color: #3498db; }
          .card.success { border-color: #2ecc71; }
          .card-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          .card-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .section { margin-bottom: 40px; }
          .section-title { font-size: 20px; font-weight: 700; color: #19325d; padding: 12px 0; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
          td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
          tr:hover { background: #fafafa; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .badge-critical { background: #e74c3c; color: white; }
          .badge-warning { background: #f39c12; color: white; }
          .badge-notice { background: #3498db; color: white; }
          .recommendation { background: #f0f8ff; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #3498db; }
          .recommendation strong { color: #19325d; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; margin-top: 40px; }
          @media print { body { background: white; } .container { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Site Speed Analysis Report</h1>
            <p>Generated on ${timestamp}</p>
          </div>

          <div class="score-card">
            <div class="card success">
              <div class="card-value" style="color: #2ecc71;">${
                scoreData.score
              }</div>
              <div class="card-label">Performance Score</div>
            </div>
            <div class="card critical">
              <div class="card-value" style="color: #e74c3c;">${criticalCount}</div>
              <div class="card-label">Critical Issues</div>
            </div>
            <div class="card warning">
              <div class="card-value" style="color: #f39c12;">${warningCount}</div>
              <div class="card-label">Warnings</div>
            </div>
            <div class="card notice">
              <div class="card-value" style="color: #3498db;">${formatBytes(
                totalSavings
              )}</div>
              <div class="card-label">Potential Savings</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📌 Key Recommendations</div>
            <div class="recommendation">
              <strong>Priority 1:</strong> Compress ${criticalCount} critical images - potential savings of ${formatBytes(
      totalSavings
    )}
            </div>
            <div class="recommendation">
              <strong>Priority 2:</strong> Convert ${warningCount} images to WebP format for better compression
            </div>
            <div class="recommendation">
              <strong>Priority 3:</strong> Implement lazy loading for below-the-fold images
            </div>
          </div>

          <div class="section">
            <div class="section-title">🔴 Critical Images (Action Required)</div>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Current Size</th>
                  <th>Recommendation</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                ${imageData
                  .filter(
                    (img) => getOptimizationLevel(img.size).level === "CRITICAL"
                  )
                  .slice(0, 10)
                  .map(
                    (img) => `
                    <tr>
                      <td style="max-width: 300px; word-break: break-all; font-size: 12px;">${img.src.substring(
                        0,
                        80
                      )}...</td>
                      <td>${formatBytes(img.size)}</td>
                      <td>Compress & convert to WebP</td>
                      <td><span class="badge badge-critical">Critical</span></td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">🟠 Warning Images (Should Optimize)</div>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Current Size</th>
                  <th>Recommendation</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                ${imageData
                  .filter(
                    (img) => getOptimizationLevel(img.size).level === "WARNING"
                  )
                  .slice(0, 10)
                  .map(
                    (img) => `
                    <tr>
                      <td style="max-width: 300px; word-break: break-all; font-size: 12px;">${img.src.substring(
                        0,
                        80
                      )}...</td>
                      <td>${formatBytes(img.size)}</td>
                      <td>Optimize & consider WebP</td>
                      <td><span class="badge badge-warning">Warning</span></td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Site Speed Analyzer Pro | Report generated on ${timestamp}</p>
            <p>For more information, visit your analysis dashboard</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-speed-report-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("✅ HTML report exported successfully!", "success");
  }

  function exportAsExcel(scoreData) {
    // Simple CSV export (Excel compatible)
    let csv = "Site Speed Analysis Report\n";
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += "SUMMARY\n";
    csv += `Performance Score,${scoreData.score}\n`;
    csv += `Total Images,${imageData.length}\n`;
    csv += `Critical Images,${
      imageData.filter(
        (img) => getOptimizationLevel(img.size).level === "CRITICAL"
      ).length
    }\n`;
    csv += `Warning Images,${
      imageData.filter(
        (img) => getOptimizationLevel(img.size).level === "WARNING"
      ).length
    }\n\n`;

    csv += "CRITICAL IMAGES\n";
    csv += "Image URL,Size (Bytes),Size (MB),Priority\n";
    imageData
      .filter((img) => getOptimizationLevel(img.size).level === "CRITICAL")
      .forEach((img) => {
        csv += `"${img.src}",${img.size},${(img.size / 1024 / 1024).toFixed(
          2
        )},CRITICAL\n`;
      });

    csv += "\nWARNING IMAGES\n";
    csv += "Image URL,Size (Bytes),Size (MB),Priority\n";
    imageData
      .filter((img) => getOptimizationLevel(img.size).level === "WARNING")
      .forEach((img) => {
        csv += `"${img.src}",${img.size},${(img.size / 1024 / 1024).toFixed(
          2
        )},WARNING\n`;
      });

    csv += "\nALL IMAGES\n";
    csv += "Image URL,Size (MB),Priority\n";
    imageData.forEach((img) => {
      const opt = getOptimizationLevel(img.size);
      csv += `"${img.src}",${(img.size / 1024 / 1024).toFixed(2)},${
        opt.level
      }\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-speed-report-${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("✅ Excel report exported successfully!", "success");
  }

  async function bulkCompressCritical() {
    const criticalImages = imageData.filter((img) => {
      return getOptimizationLevel(img.size || 0).level === "CRITICAL";
    });

    if (criticalImages.length === 0) {
      showToast("No critical images to compress.", "info");
      return;
    }

    // Show the new bulk compression modal
    showBulkCompressionModal(criticalImages);
  }

  // ============================================================================
  // BLOCK ANALYSIS FEATURE
  // ============================================================================

  async function showBlockAnalysisModal() {
    const blocks = detectPageBlocks();

    if (blocks.length === 0) {
      showToast("❌ No blocks found on this page", "warning");
      return;
    }

    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s; overflow-y: auto;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 28px; border-radius: 16px; max-width: 900px; width: 100%;
      max-height: 85vh; overflow-y: auto; animation: slideIn 0.3s; margin:auto;
    `;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <div>
          <h2 style="margin:0 0 4px 0; font-size:22px; color:#19325d;">🔍 Block Analysis</h2>
          <div style="font-size:12px; color:#666;">Found ${
            blocks.length
          } block(s) to analyze</div>
        </div>
        <button id="closeBlockModal" style="background:none; border:none; font-size:28px; cursor:pointer; color:#999; transition: color 0.2s; line-height:1;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <!-- Block Selector & Run Button -->
      <div style="display:grid; grid-template-columns: 1fr 120px; gap:12px; margin-bottom:24px;">
        <div>
          <label style="font-size:12px; font-weight:700; color:#19325d; display:block; margin-bottom:8px;">📦 Select Block/Section</label>
          <select id="blockSelector" style="width:100%; padding:12px; border:2px solid #fb741c; border-radius:8px; font-size:13px; cursor:pointer; background:white; color:#19325d; font-weight:600;">
            <option value="">-- Choose a block --</option>
            ${blocks
              .map(
                (block, idx) => `<option value="${idx}">${block.name}</option>`
              )
              .join("")}
          </select>
        </div>
        <div style="display:flex; flex-direction:column; justify-content:flex-end;">
          <button id="runBlockAnalysis" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#fb741c,#ff8c42); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; width:100%;">
            🚀 Analyze
          </button>
        </div>
      </div>

      <!-- Results Container (Hidden Until Analysis Runs) -->
      <div id="blockAnalysisContainer" style="display:none;"></div>

      <!-- Loading Spinner (Hidden Initially) -->
      <div id="blockLoadingSpinner" style="text-align:center; padding:40px; display:none;">
        <div class="spa-progress" style="width:200px; margin:0 auto 20px;">
          <div class="spa-progress-bar" style="width:50%; animation:pulse 1s infinite;"></div>
        </div>
        <div style="color:#19325d; font-weight:600;">Analyzing block...</div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const blockSelector = modal.querySelector("#blockSelector");
    const runBtn = modal.querySelector("#runBlockAnalysis");
    const loadingSpinner = modal.querySelector("#blockLoadingSpinner");
    const resultsContainer = modal.querySelector("#blockAnalysisContainer");

    // Handle Run Analysis button
    runBtn.addEventListener("click", async () => {
      const selectedIndex = blockSelector.value;

      if (selectedIndex === "" || isNaN(selectedIndex)) {
        showToast("Please select a block first", "warning");
        return;
      }

      const selectedBlock = blocks[parseInt(selectedIndex)];
      loadingSpinner.style.display = "block";
      resultsContainer.style.display = "none";

      try {
        const analysis = await analyzeBlock(selectedBlock);
        displayBlockAnalysisResults(modal, analysis, resultsContainer);
        loadingSpinner.style.display = "none";
        resultsContainer.style.display = "block";
      } catch (error) {
        console.error("Block analysis error:", error);
        showToast("❌ Error analyzing block", "error");
        loadingSpinner.style.display = "none";
      }
    });

    // Close button
    modal.querySelector("#closeBlockModal").addEventListener("click", () => {
      document.body.removeChild(backdrop);
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });
  }

  function displayBlockAnalysisResults(modal, analysis, resultsContainer) {
    const formats = detectFormatSupport();
    const formatOptions = [];
    if (formats.webp) formatOptions.push("webp");
    formatOptions.push("jpeg");
    formatOptions.push("png");

    let scoreColor = "#2ecc71";
    if (analysis.score < 50) scoreColor = "#e74c3c";
    else if (analysis.score < 70) scoreColor = "#f39c12";
    else if (analysis.score < 85) scoreColor = "#3498db";

    // SIMPLIFIED HTML - No inline script tags or complex interpolations
    let imageHtml = "";
    const sortedImages = analysis.images.sort(
      (a, b) => (b.size || 0) - (a.size || 0)
    );

    sortedImages.forEach((img, i) => {
      const format = (
        img.src.split(".").pop().split("?")[0] || ""
      ).toLowerCase();
      const badgeColors = {
        CRITICAL: { bg: "rgba(231,76,60,0.15)", color: "#e74c3c", icon: "🔴" },
        WARNING: { bg: "rgba(243,156,18,0.15)", color: "#f39c12", icon: "🟠" },
        NOTICE: { bg: "rgba(52,152,219,0.15)", color: "#3498db", icon: "🔵" },
        GOOD: { bg: "rgba(46,204,113,0.15)", color: "#2ecc71", icon: "🟢" },
      };
      const badgeStyle =
        badgeColors[img.optimization.level] || badgeColors["GOOD"];

      imageHtml += `
        <div style="display:grid; grid-template-columns:30px 1fr auto; gap:12px; align-items:center; padding:12px; border:1px solid ${
          badgeStyle.color
        }33; border-left:3px solid ${
        badgeStyle.color
      }; border-radius:8px; background:${badgeStyle.bg};">
          <input type="checkbox" class="block-image-checkbox" data-index="${i}" style="width:18px; height:18px; cursor:pointer;">
          <div style="min-width:0;">
            <div style="font-size:11px; font-weight:600; color:${
              badgeStyle.color
            }; text-transform:uppercase; margin-bottom:3px;">${
        img.optimization.level
      }</div>
            <div style="font-size:10px; color:#19325d; word-break:break-all; margin-bottom:2px;">${
              img.src
            }</div>
            <div style="font-size:9px; color:#999;">${formatBytes(
              img.size
            )}</div>
          </div>
          <div style="font-size:20px;">${badgeStyle.icon}</div>
        </div>
      `;
    });

    let formatButtonsHtml = "";
    formatOptions.forEach((fmt, i) => {
      formatButtonsHtml += `
        <button class="block-format-btn spa-btn" data-format="${fmt}" style="padding:8px; border:2px solid ${
        i === 0 ? "#fb741c" : "rgba(0,0,0,0.1)"
      }; background:${
        i === 0 ? "rgba(251,116,28,0.1)" : "white"
      }; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; text-transform:uppercase;">
          ${fmt}
        </button>
      `;
    });

    resultsContainer.innerHTML = `
      <div style="background:white; border-radius:12px; padding:16px; margin-bottom:20px; border-left:4px solid ${scoreColor};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:12px; color:#666; margin-bottom:4px;">Block: ${
              analysis.blockName
            }</div>
            <div style="font-size:14px; font-weight:700; color:#19325d;">Performance Score</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:40px; font-weight:800; color:${scoreColor};">${
      analysis.score
    }</div>
            <div style="font-size:12px; color:#999;">/100</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; margin-top:12px; padding-top:12px; border-top:1px solid rgba(0,0,0,0.08);">
          <div style="text-align:center;">
            <div style="font-size:9px; color:#999;">Total</div>
            <div style="font-size:16px; font-weight:700; color:#19325d;">${
              analysis.images.length
            }</div>
          </div>
          <div style="text-align:center; background:rgba(231,76,60,0.1); padding:8px; border-radius:6px;">
            <div style="font-size:9px; color:#e74c3c;">Critical</div>
            <div style="font-size:16px; font-weight:700; color:#e74c3c;">${
              analysis.breakdown.criticalImages || 0
            }</div>
          </div>
          <div style="text-align:center; background:rgba(243,156,18,0.1); padding:8px; border-radius:6px;">
            <div style="font-size:9px; color:#f39c12;">Warning</div>
            <div style="font-size:16px; font-weight:700; color:#f39c12;">${
              analysis.breakdown.warningImages || 0
            }</div>
          </div>
          <div style="text-align:center; background:rgba(52,152,219,0.1); padding:8px; border-radius:6px;">
            <div style="font-size:9px; color:#3498db;">Notice</div>
            <div style="font-size:16px; font-weight:700; color:#3498db;">${
              analysis.breakdown.noticeImages || 0
            }</div>
          </div>
          <div style="text-align:center; background:rgba(46,204,113,0.1); padding:8px; border-radius:6px;">
            <div style="font-size:9px; color:#2ecc71;">Good</div>
            <div style="font-size:16px; font-weight:700; color:#2ecc71;">${
              analysis.images.length -
                (analysis.breakdown.criticalImages || 0) -
                (analysis.breakdown.warningImages || 0) -
                (analysis.breakdown.noticeImages || 0) || 0
            }</div>
          </div>
        </div>
      </div>

      <div style="background:rgba(251,116,28,0.05); padding:16px; border-radius:10px; margin-bottom:20px;">
        <div style="font-size:13px; font-weight:700; color:#fb741c; margin-bottom:12px;">⚙️ Compression Settings</div>

        <div style="margin-bottom:12px;">
          <label style="display:block; margin-bottom:8px; font-weight:600; font-size:12px; color:#19325d;">
            Quality <span id="blockQualityValue" style="color:#fb741c;">85</span>
          </label>
          <input type="range" id="blockQualitySlider" min="10" max="100" value="85" step="5" style="width:100%; height:6px; cursor:pointer;">
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; color:#19325d; display:block; margin-bottom:8px;">Format</label>
          <div style="display:grid; grid-template-columns:repeat(${
            formatOptions.length
          }, 1fr); gap:6px;">
            ${formatButtonsHtml}
          </div>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:13px; font-weight:700; color:#19325d;">📷 Images in Block (${
            analysis.images.length
          })</div>
          <label style="font-size:11px; color:#19325d; cursor:pointer; font-weight:600;">
            <input type="checkbox" id="blockSelectAll" style="margin-right:6px; cursor:pointer;">
            Select All
          </label>
        </div>

        <div id="blockImageList" style="max-height:350px; overflow-y:auto; display:grid; gap:8px; padding-right:8px;">
          ${imageHtml}
        </div>
      </div>

      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button id="blockCancelBtn" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#95a5a6,#7f8c8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Cancel
        </button>
        <button id="blockCompressSelectedBtn" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          💾 Compress Selected
        </button>
      </div>

      <div id="blockCompressionProgress" style="display:none; margin-top:16px; padding:12px; background:rgba(102,126,234,0.1); border-radius:8px;">
        <div style="font-size:12px; font-weight:600; color:#667eea; margin-bottom:8px;">
          Compressing: <span id="blockProgressText">0 / 0</span>
        </div>
        <div class="spa-progress" style="width:100%; height:8px;">
          <div id="blockProgressBar" class="spa-progress-bar" style="width:0;"></div>
        </div>
      </div>
    `;

    // NOW attach handlers
    attachBlockHandlers(resultsContainer, analysis);
  }

  function attachBlockHandlers(resultsContainer, analysis) {
    const qualitySlider = resultsContainer.querySelector("#blockQualitySlider");
    const qualityValue = resultsContainer.querySelector("#blockQualityValue");
    const selectAllCheckbox = resultsContainer.querySelector("#blockSelectAll");
    const imageCheckboxes = resultsContainer.querySelectorAll(
      ".block-image-checkbox"
    );
    let selectedFormat = "jpeg";

    // Quality slider
    qualitySlider.addEventListener("input", (e) => {
      qualityValue.textContent = e.target.value;
    });

    // Format buttons
    resultsContainer.querySelectorAll(".block-format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        resultsContainer.querySelectorAll(".block-format-btn").forEach((b) => {
          b.style.border = "2px solid rgba(0,0,0,0.1)";
          b.style.background = "white";
        });
        this.style.border = "2px solid #fb741c";
        this.style.background = "rgba(251,116,28,0.1)";
        selectedFormat = this.dataset.format;
      });
    });

    // Select all
    selectAllCheckbox.addEventListener("change", () => {
      imageCheckboxes.forEach((cb) => {
        cb.checked = selectAllCheckbox.checked;
      });
    });

    // Individual checkboxes
    imageCheckboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        const allChecked = Array.from(imageCheckboxes).every((c) => c.checked);
        const someChecked = Array.from(imageCheckboxes).some((c) => c.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
      });
    });

    // Compress selected
    resultsContainer
      .querySelector("#blockCompressSelectedBtn")
      .addEventListener("click", async () => {
        const selectedIndices = Array.from(imageCheckboxes)
          .map((cb, i) => (cb.checked ? i : -1))
          .filter((i) => i !== -1);

        if (selectedIndices.length === 0) {
          showToast("❌ Select images first", "warning");
          return;
        }

        const sortedImages = analysis.images.sort(
          (a, b) => (b.size || 0) - (a.size || 0)
        );
        const selectedImages = selectedIndices.map((i) => sortedImages[i]);
        const quality = parseInt(qualitySlider.value) / 100;
        const progressSection = resultsContainer.querySelector(
          "#blockCompressionProgress"
        );
        const progressBar = resultsContainer.querySelector("#blockProgressBar");
        const progressText =
          resultsContainer.querySelector("#blockProgressText");
        const compressBtn = resultsContainer.querySelector(
          "#blockCompressSelectedBtn"
        );

        compressBtn.disabled = true;
        progressSection.style.display = "block";

        let successCount = 0;

        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          progressText.textContent = `${i + 1} / ${selectedImages.length}`;
          progressBar.style.width = `${
            ((i + 1) / selectedImages.length) * 100
          }%`;

          try {
            let loadedImage;
            if (img.type === "img" && img.element) {
              loadedImage = img.element;
            } else {
              loadedImage = await new Promise((resolve, reject) => {
                const tempImg = new Image();
                tempImg.crossOrigin = "anonymous";
                tempImg.onload = () => resolve(tempImg);
                tempImg.onerror = () => reject("Load failed");
                tempImg.src = img.src;
              });
            }

            const blob = await compressImage(
              loadedImage,
              quality,
              loadedImage.naturalWidth,
              loadedImage.naturalHeight,
              selectedFormat
            );

            if (blob.size >= img.size && selectedFormat !== "jpeg") {
              continue;
            }

            const filename = (img.src.split("/").pop() || "image")
              .split("?")[0]
              .replace(/\.[^.]*$/, "");
            const ext = selectedFormat === "jpeg" ? "jpg" : selectedFormat;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `compressed-${filename}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            successCount++;
            await new Promise((r) => setTimeout(r, 100));
          } catch (error) {
            console.error(`Failed: ${img.src}`, error);
          }
        }

        showToast(`✅ ${successCount} images downloaded!`, "success");
        compressBtn.disabled = false;
        progressSection.style.display = "none";
      });

    resultsContainer
      .querySelector("#blockCancelBtn")
      .addEventListener("click", () => {
        resultsContainer.parentElement
          .querySelector("#closeBlockModal")
          ?.click();
      });
  }

  // NEW: Advanced Bulk Compression Modal
  function showBulkCompressionModal(images) {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 28px; border-radius: 16px; max-width: 800px; width: 100%;
      max-height: 90vh; overflow-y: auto; animation: slideIn 0.3s;
    `;

    const formats = detectFormatSupport();
    const formatOptions = [];
    if (formats.webp) formatOptions.push("webp");
    formatOptions.push("jpeg");
    formatOptions.push("png");

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <div>
          <h2 style="margin:0 0 4px 0; font-size:20px; color:#19325d;">🗜️ Bulk Compress Critical Images</h2>
          <div style="font-size:12px; color:#666;">${
            images.length
          } critical images detected</div>
        </div>
        <button class="close-bulk-modal" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

          <!-- Compression Settings -->
      <div style="background:rgba(251,116,28,0.05); padding:16px; border-radius:10px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:13px; font-weight:700; color:#fb741c;">⚙️ Compression Settings</div>
          <div style="text-align:right;">
            <div style="font-size:9px; color:#666;">Estimated Savings</div>
            <div id="bulkEstimatedSavings" style="font-size:14px; font-weight:700; color:#2ecc71;">Calculating...</div>
          </div>
        </div>

        <!-- Quality Slider -->
        <div style="margin-bottom:16px;">
          <label style="display:block; margin-bottom:8px; font-weight:600; font-size:12px; color:#19325d;">
            Quality <span id="bulkQualityValue" style="color:#fb741c;">${
              userSettings.defaultQuality
            }</span>
          </label>
          <input type="range" id="bulkQualitySlider" min="10" max="100" value="${
            userSettings.defaultQuality
          }" step="5"
            style="width:100%; height:6px; border-radius:5px; outline:none; cursor:pointer;">
          <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:9px; color:#999;">
            <span>Low</span><span>Recommended</span><span>High</span>
          </div>
        </div>

        <!-- Format Selection -->
        <div style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:600; color:#19325d; display:block; margin-bottom:8px;">Output Format</label>
          <div style="display:grid; grid-template-columns: repeat(${
            formatOptions.length + 1
          }, 1fr); gap:6px;">
            <button class="bulk-format-btn spa-btn" data-format="keep-original" style="padding:8px; border:2px solid #fb741c; background:rgba(251,116,28,0.1); border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; text-transform:uppercase;">
              Keep Original
            </button>
            ${formatOptions
              .map(
                (fmt, i) => `
              <button class="bulk-format-btn spa-btn" data-format="${fmt}"
                style="padding:8px; border:2px solid rgba(0,0,0,0.1); background:white; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; text-transform:uppercase;">
                ${fmt}
              </button>
            `
              )
              .join("")}
          </div>
          <div style="font-size:9px; color:#666; margin-top:6px;">
            💡 <strong>"Keep Original"</strong> will maintain each image's current format
          </div>
        </div>
      </div>


      <!-- Image List -->
      <div style="margin-bottom:16px;">
        <div style="font-size:13px; font-weight:700; color:#19325d; margin-bottom:10px;">
          📋 Critical Images (${images.length})
        </div>
        <div id="bulkImageList" style="max-height:350px; overflow-y:auto; padding-right:8px;">
          ${images
            .map((img, index) => {
              const filename = img.src.split("/").pop().split("?")[0];
              const format = (
                img.src.split(".").pop().split("?")[0] || ""
              ).toLowerCase();
              return `
                <div class="spa-bulk-item" data-index="${index}">
                  <div class="spa-bulk-header">
                    <div style="display:flex; align-items:center; gap:10px; flex:1;">
                      <span class="spa-bulk-expand-icon">▶</span>
                      <div style="flex:1; min-width:0;">
                        <div style="font-size:11px; font-weight:600; color:#19325d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${filename}</div>
                        <div style="font-size:9px; color:#666;">${formatBytes(
                          img.size
                        )} • ${format.toUpperCase()}</div>
                      </div>
                    </div>
                    <span class="spa-badge" style="background:#e74c3c; color:white; font-size:9px;">CRITICAL</span>
                  </div>
                  <div class="spa-bulk-preview">
                    <div class="spa-bulk-preview-content">
                      <img src="${
                        img.src
                      }" alt="${filename}" onerror="this.parentElement.innerHTML='<div style=\\'color:#999;font-size:11px;\\'>Preview unavailable</div>'">
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        <button class="close-bulk-modal spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#95a5a6,#7f8c8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Cancel
        </button>
        <button id="startBulkCompress" class="spa-btn" style="padding:12px 24px; background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          💾 Download All (${images.length})
        </button>
      </div>

      <!-- Progress Section (hidden initially) -->
      <div id="bulkProgressSection" style="display:none; margin-top:16px; padding:16px; background:rgba(102,126,234,0.1); border-radius:8px;">
        <div style="font-size:12px; font-weight:600; color:#667eea; margin-bottom:8px;">
          Compressing: <span id="bulkProgressText">0 / ${images.length}</span>
        </div>
        <div class="spa-progress" style="width:100%; height:8px;">
          <div id="bulkProgressBar" class="spa-progress-bar" style="width:0;"></div>
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // State management
    let selectedFormat = "keep-original";
    let selectedQuality = userSettings.defaultQuality;

    // Calculate total original size
    const totalOriginalSize = images.reduce(
      (sum, img) => sum + (img.size || 0),
      0
    );

    // Estimation function
    function updateEstimatedSavings() {
      const qualityFactor = selectedQuality / 100;
      let estimatedFactor = 0.4; // Default 60% reduction

      // Adjust estimation based on quality
      if (qualityFactor >= 0.9) {
        estimatedFactor = 0.2; // 20% reduction at high quality
      } else if (qualityFactor >= 0.75) {
        estimatedFactor = 0.35; // 35% reduction at good quality
      } else if (qualityFactor >= 0.5) {
        estimatedFactor = 0.5; // 50% reduction at medium quality
      } else {
        estimatedFactor = 0.7; // 70% reduction at low quality
      }

      // Additional reduction for WebP
      if (selectedFormat === "webp") {
        estimatedFactor += 0.1; // WebP saves extra 10%
      }

      const estimatedCompressedSize = totalOriginalSize * (1 - estimatedFactor);
      const estimatedSavings = totalOriginalSize - estimatedCompressedSize;
      const savingsPercent = (estimatedSavings / totalOriginalSize) * 100;

      const savingsDisplay = modal.querySelector("#bulkEstimatedSavings");
      if (savingsDisplay) {
        savingsDisplay.textContent = `~${formatBytes(
          estimatedSavings
        )} (${savingsPercent.toFixed(0)}%)`;
      }
    }

    // Quality slider handler
    const qualitySlider = modal.querySelector("#bulkQualitySlider");
    const qualityValue = modal.querySelector("#bulkQualityValue");
    qualitySlider.addEventListener("input", (e) => {
      selectedQuality = parseInt(e.target.value, 10);
      qualityValue.textContent = String(selectedQuality);
      updateEstimatedSavings(); // ← Update estimate when quality changes
    });

    // Format selection handler
    modal.querySelectorAll(".bulk-format-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        modal.querySelectorAll(".bulk-format-btn").forEach((b) => {
          b.style.border = "2px solid rgba(0,0,0,0.1)";
          b.style.background = "white";
        });
        this.style.border = "2px solid #fb741c";
        this.style.background = "rgba(251,116,28,0.1)";
        selectedFormat = this.dataset.format;
        updateEstimatedSavings(); // ← Update estimate when format changes
      });
    });

    // Initial estimation
    updateEstimatedSavings();

    // Expandable list handler
    modal.querySelectorAll(".spa-bulk-item").forEach((item) => {
      const header = item.querySelector(".spa-bulk-header");
      header.addEventListener("click", () => {
        item.classList.toggle("expanded");
      });
    });

    // Close handlers
    modal.querySelectorAll(".close-bulk-modal").forEach((btn) => {
      btn.addEventListener("click", () => document.body.removeChild(backdrop));
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });

    // Bulk compress and download
    modal
      .querySelector("#startBulkCompress")
      .addEventListener("click", async () => {
        const startBtn = modal.querySelector("#startBulkCompress");
        const progressSection = modal.querySelector("#bulkProgressSection");
        const progressBar = modal.querySelector("#bulkProgressBar");
        const progressText = modal.querySelector("#bulkProgressText");

        startBtn.disabled = true;
        startBtn.textContent = "⏳ Processing...";
        progressSection.style.display = "block";

        let processed = 0;
        const quality = selectedQuality / 100;

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          progressText.textContent = `${processed + 1} / ${images.length}`;
          progressBar.style.width = `${
            ((processed + 1) / images.length) * 100
          }%`;

          try {
            // Load image
            let loadedImage;
            if (img.type === "img" && img.element) {
              loadedImage = img.element;
            } else {
              loadedImage = await new Promise((resolve, reject) => {
                const tempImg = new Image();
                tempImg.crossOrigin = "anonymous";
                tempImg.onload = () => resolve(tempImg);
                tempImg.onerror = () => reject("Load failed");
                tempImg.src = img.src;
              });
            }

            // Determine format
            let outputFormat = selectedFormat;
            if (selectedFormat === "keep-original") {
              const originalFormat = (
                img.src.split(".").pop().split("?")[0] || ""
              ).toLowerCase();

              // Map to valid output formats
              if (originalFormat === "jpg" || originalFormat === "jpeg") {
                outputFormat = "jpeg";
              } else if (originalFormat === "png") {
                outputFormat = "png";
              } else if (originalFormat === "webp" && formats.webp) {
                outputFormat = "webp";
              } else {
                // Fallback: use jpeg for unknown formats
                outputFormat = "jpeg";
              }

              console.log(
                `Keep Original: ${img.src} → Format: ${originalFormat} → Output: ${outputFormat}`
              );
            }

            // Compress
            const blob = await compressImage(
              loadedImage,
              quality,
              loadedImage.naturalWidth,
              loadedImage.naturalHeight,
              outputFormat
            );

            // Size comparison with logging
            const originalSize = img.size;
            const compressedSize = blob.size;
            const sizeDiff = originalSize - compressedSize;
            const percentChange = ((sizeDiff / originalSize) * 100).toFixed(1);

            console.log(`${img.src}:`);
            console.log(`  Original: ${formatBytes(originalSize)}`);
            console.log(`  Compressed: ${formatBytes(compressedSize)}`);
            console.log(
              `  Change: ${sizeDiff >= 0 ? "-" : "+"}${formatBytes(
                Math.abs(sizeDiff)
              )} (${percentChange}%)`
            );

            // For "keep-original": Allow downloads if compressed or up to 5% larger (re-encoding tolerance)
            // For format changes: Only if actually smaller
            if (selectedFormat === "keep-original") {
              if (compressedSize > originalSize * 1.05) {
                console.warn(
                  `  ❌ SKIPPED: More than 5% larger after re-compression`
                );
                processed++;
                continue;
              }
            } else {
              if (compressedSize >= originalSize) {
                console.warn(
                  `  ❌ SKIPPED: Format conversion didn't reduce size`
                );
                processed++;
                continue;
              }
            }

            console.log(`  ✅ DOWNLOADING`);

            // Download
            const filename = (img.src.split("/").pop() || "image")
              .split("?")[0]
              .replace(/\.[^.]*$/, "");
            const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `compressed-${filename}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            processed++;
            await new Promise((r) => setTimeout(r, 100)); // Small delay between downloads
          } catch (error) {
            console.error(`Failed to compress ${img.src}:`, error);
            processed++;
          }
        }

        const skipped = images.length - processed;
        if (skipped > 0) {
          showToast(
            `✅ ${processed} images compressed! ${skipped} skipped (already optimal)`,
            "success"
          );
        } else {
          showToast(
            `✅ ${processed} images compressed and downloaded!`,
            "success"
          );
        }

        setTimeout(() => document.body.removeChild(backdrop), 1500);
      });
  }

  function exportReport(scoreData) {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      score: scoreData,
      images: imageData.map((i) => ({
        src: i.src,
        type: i.type,
        size: i.size,
        lazy: i.lazyLoaded,
        responsive: i.responsive,
        natural: i.element
          ? { width: i.element.naturalWidth, height: i.element.naturalHeight }
          : i.dimensions?.natural,
        display: i.element
          ? { width: i.element.width, height: i.element.height }
          : i.dimensions?.display,
      })),
      videos: videoData.map((v) => ({
        src: v.src,
        type: v.type,
        autoplay: v.autoplay,
        display: v.dimensions?.display,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-speed-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("📄 Report exported!", "success");
  }
  // ============================================================================
  // SECTION 16: HIDDEN IMAGES PANEL
  // Modify this section to change hidden images display
  // ============================================================================

  function createHiddenImagesPanel(hiddenImages) {
    const panel = document.createElement("div");
    panel.className = "spa-hidden-panel spa-glass-panel";
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 340px;
      max-height: 500px;
      overflow-y: auto;
      padding: 16px;
      border-radius: 12px;
      z-index: 10001;
      display: none;
      animation: slideIn 0.3s;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    `;

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <div style="font-size: 14px; font-weight: 800; color: #19325d;">👻 Hidden Images</div>
        <button class="toggle-hidden spa-btn" style="padding:6px 10px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700;">Close</button>
      </div>
      <div style="font-size:10px; color:#666; margin-bottom:10px;">
        These images didn't render in layout but were found in the DOM/CSS.
      </div>
            <div>
        ${hiddenImages
          .sort((a, b) => (b.size || 0) - (a.size || 0)) // Sort by size descending (largest first)
          .map((img, i) => {
            const format = (
              img.src.split(".").pop().split("?")[0] || ""
            ).toLowerCase();
            const opt = getOptimizationLevel(img.size || 0);
            const badgeColors = {
              CRITICAL: {
                bg: "rgba(231,76,60,0.15)",
                color: "#e74c3c",
                icon: "🔴",
              },
              WARNING: {
                bg: "rgba(243,156,18,0.15)",
                color: "#f39c12",
                icon: "🟠",
              },
              NOTICE: {
                bg: "rgba(52,152,219,0.15)",
                color: "#3498db",
                icon: "🔵",
              },
              GOOD: {
                bg: "rgba(46,204,113,0.15)",
                color: "#2ecc71",
                icon: "🟢",
              },
            };
            const badgeStyle = badgeColors[opt.level] || badgeColors["GOOD"];

            return `
              <div style="display:grid; grid-template-columns: auto 1fr auto auto; gap:8px; align-items:center; padding:10px; border:1px solid ${
                badgeStyle.color
              }33; border-left:3px solid ${
              badgeStyle.color
            }; border-radius:8px; margin-bottom:8px; background:${
              badgeStyle.bg
            };">
                <div style="font-size:14px; font-weight:700;">${
                  badgeStyle.icon
                }</div>
                <div style="min-width:0;">
                  <div style="font-size:10px; color:${
                    badgeStyle.color
                  }; font-weight:700; text-transform:uppercase; margin-bottom:2px;">${
              opt.level
            }</div>
                  <div style="font-size:10px; color:#19325d; word-break:break-all;">${
                    img.src
                  }</div>
                  <div style="font-size:9px; color:#999; margin-top:2px;">${formatBytes(
                    img.size
                  )}</div>
                </div>
                <button class="info-hidden-btn spa-btn" data-index="${i}" style="padding:6px 8px; background:linear-gradient(135deg,#3498db,#2980b9); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700;">ℹ️</button>
                <button class="compress-hidden-btn spa-btn" data-index="${i}" style="padding:6px 8px; background:linear-gradient(135deg,#2ecc71,#27ae60); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700;">🗜️</button>
              </div>
            `;
          })
          .join("")}
      </div>

    `;

    document.body.appendChild(panel);

    panel.querySelector(".toggle-hidden").addEventListener("click", () => {
      panel.style.display = "none";
    });

    // Create a sorted copy for button handlers
    const sortedHiddenImages = hiddenImages.sort(
      (a, b) => (b.size || 0) - (a.size || 0)
    );

    panel.querySelectorAll(".compress-hidden-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = parseInt(this.dataset.index, 10);
        const img = sortedHiddenImages[index];
        showCompressionModal(img);
      });
    });

    panel.querySelectorAll(".info-hidden-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = parseInt(this.dataset.index, 10);
        const img = sortedHiddenImages[index];
        const format = (
          img.src.split(".").pop().split("?")[0] || ""
        ).toLowerCase();
        const recs = getImageRecommendations(img, img.size || 0, format);
        showImageInfoModal(img, img.size || 0, recs);
      });
    });

    return panel;
  }
  // ============================================================================
  // SECTION 17: SUMMARY PANEL
  // Modify this section to change summary display
  // ============================================================================

  function showEnhancedSummary(scoreData, hiddenImages, totalAnalyzed) {
    const summary = document.createElement("div");
    summary.id = "spaSummaryBox";
    summary.className = "spa-glass-panel";
    summary.style.cssText = `
      padding: 16px;
      border-radius: 12px;
      width: 280px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    `;

    let scoreColor = "#2ecc71";
    if (scoreData.score < 50) scoreColor = "#e74c3c";
    else if (scoreData.score < 70) scoreColor = "#f39c12";
    else if (scoreData.score < 85) scoreColor = "#3498db";

    summary.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
          <div style="font-size:11px; color:#666; margin-bottom:2px;">Performance Score</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="font-size:32px; font-weight:800; color:${scoreColor};">${
      scoreData.score
    }</div>
            <span style="font-size:18px;">/100</span>
          </div>
          <div style="font-size:10px; color:#999;">Grade ${
            scoreData.grade
          }</div>
        </div>
        <div style="text-align:center; padding:12px; background:${scoreColor}22; border-radius:8px;">
          <div style="font-size:24px; margin-bottom:2px;">${
            scoreData.grade
          }</div>
          <div style="font-size:9px; color:${scoreColor}; font-weight:600; text-transform:uppercase;">Grade</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        <div style="padding:10px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div style="font-size:10px; color:#999;">Analyzed</div>
          <div style="font-size:16px; font-weight:700; color:#19325d;">${totalAnalyzed}</div>
        </div>
        <div style="padding:10px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div style="font-size:10px; color:#999;">Hidden</div>
          <div style="font-size:16px; font-weight:700; color:#19325d;">${
            hiddenImages.length
          }</div>
        </div>
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-size:11px; color:#666; margin-bottom:6px;">Filter Overlays</div>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px;">
          <button class="filter-btn spa-btn" data-filter="all" style="padding:6px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:700;">All</button>
          <button class="filter-btn spa-btn" data-filter="CRITICAL" style="padding:6px; background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:700;">🔴</button>
          <button class="filter-btn spa-btn" data-filter="WARNING" style="padding:6px; background:#f39c12; color:white; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:700;">🟠</button>
          <button class="filter-btn spa-btn" data-filter="NOTICE" style="padding:6px; background:#3498db; color:white; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:700;">🔵</button>
          <button class="filter-btn spa-btn" data-filter="GOOD" style="padding:6px; background:#2ecc71; color:white; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:700;">🟢</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <button id="bulkCompressBtn" class="spa-btn" style="padding:8px 12px; background:linear-gradient(135deg,#1e7e34,#28a745); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700; width:100%;">
          🗜️ Compress Critical
        </button>
        <button id="exportReportBtn" class="spa-btn" style="padding:8px 12px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700; width:100%;">
          📄 Export Report
        </button>
        ${
          hiddenImages.length
            ? `<button id="showHiddenBtn" class="spa-btn" style="padding:8px 12px; background:linear-gradient(135deg,#e74c3c,#c0392b); color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:700; width:100%;">
          👻 Hidden Images (${hiddenImages.length})
        </button>`
            : ""
        }
      </div>

      <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,0.08); font-size:8px; color:#999; text-align:center;">
        Click label to hide • Hover overlays for actions
      </div>
    `;

    // Create draggable toggle button (left side, like main toolbar)
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "spaSummaryToggle";
    toggleBtn.className = "spa-btn";
    toggleBtn.textContent = "⟨"; // Start with open state
    toggleBtn.title = "Show/Hide Report";

    // Get saved position or default
    let savedReportTop = GM_getValue("reportBtnTop", null);
    if (savedReportTop == null) {
      savedReportTop = Math.max(200, Math.floor(window.innerHeight / 2) + 50);
    }
    savedReportTop = Math.max(
      150,
      Math.min(savedReportTop, window.innerHeight - 100)
    );

    toggleBtn.style.cssText = `
      position: fixed;
      top: ${savedReportTop}px;
      left: 0px;
      z-index: 2147483644;
      background: linear-gradient(135deg,#19325d,#2a4a8d);
      color: white;
      border: none;
      padding: 8px 6px;
      border-radius: 0 8px 8px 0;
      cursor: grab;
      width: 28px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      box-shadow: 2px 0 12px rgba(0,0,0,0.6);
      transition: all 0.2s ease;
      writing-mode: vertical-rl;
      text-orientation: mixed;
    `;

    // Position summary on left side - OPEN BY DEFAULT
    summary.style.cssText = `
      position: fixed;
      top: ${savedReportTop}px;
      left: 28px;
      z-index: 2147483643;
      padding: 16px;
      border-radius: 0 12px 12px 0;
      width: 280px;
      box-shadow: 2px 0 32px rgba(0,0,0,0.3);
      transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    document.body.appendChild(toggleBtn);
    document.body.appendChild(summary);
    summaryBox = summary;

    // Dragging logic
    let summaryOpen = true; // START OPEN
    let isDraggingReport = false;
    let dragStartY = 0;
    let dragStartTop = 0;
    let hasMoved = false;

    toggleBtn.addEventListener("mousedown", (e) => {
      isDraggingReport = true;
      hasMoved = false;
      dragStartY = e.clientY;
      dragStartTop = parseInt(toggleBtn.style.top, 10);
      toggleBtn.style.cursor = "grabbing";
      toggleBtn.style.transition = "none";
      summary.style.transition = "none";
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDraggingReport) return;
      const deltaY = e.clientY - dragStartY;
      if (Math.abs(deltaY) > 3) hasMoved = true;
      let newTop = dragStartTop + deltaY;
      const maxTop = window.innerHeight - 48;
      newTop = Math.max(50, Math.min(newTop, maxTop));
      toggleBtn.style.top = `${newTop}px`;
      summary.style.top = `${newTop}px`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDraggingReport) return;
      isDraggingReport = false;
      toggleBtn.style.cursor = "grab";
      toggleBtn.style.transition = "all 0.2s ease";
      summary.style.transition = "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
      const currentTop = parseInt(toggleBtn.style.top, 10);
      GM_setValue("reportBtnTop", currentTop);

      if (!hasMoved) {
        summaryOpen = !summaryOpen;
        summary.style.left = summaryOpen ? "28px" : "-320px";
        toggleBtn.textContent = summaryOpen ? "⟨" : "Report";
      }
      hasMoved = false;
    });

    toggleBtn.addEventListener("mouseenter", () => {
      if (!isDraggingReport) toggleBtn.style.width = "32px";
    });

    toggleBtn.addEventListener("mouseleave", () => {
      if (!isDraggingReport) toggleBtn.style.width = "28px";
    });

    // Filter buttons
    summary.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const filter = this.getAttribute("data-filter");
        filterOverlays(filter);
        summary.querySelectorAll(".filter-btn").forEach((b) => {
          b.style.opacity = "0.5";
        });
        this.style.opacity = "1";
      });
    });

    summary
      .querySelector("#bulkCompressBtn")
      ?.addEventListener("click", bulkCompressCritical);
    summary
      .querySelector("#exportReportBtn")
      ?.addEventListener("click", () => showExportModal(scoreData));
    summary.querySelector("#showHiddenBtn")?.addEventListener("click", () => {
      const panel = document.querySelector(".spa-hidden-panel");
      if (panel) {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
      }
    });
  }
  // ============================================================================
  // SECTION 18: DRAGGABLE TOOLBAR
  // Modify this section to change toolbar appearance or position
  // ============================================================================

  function createToolbar() {
    const existingBtn = document.getElementById("spaToggleBtn");
    const existingToolbar = document.getElementById("spaToolbar");
    if (existingBtn) existingBtn.remove();
    if (existingToolbar) existingToolbar.remove();

    let savedTop = GM_getValue("toolbarTop", null);
    if (savedTop == null) {
      savedTop = Math.max(100, Math.floor(window.innerHeight / 2) - 24);
    }
    savedTop = Math.max(50, Math.min(savedTop, window.innerHeight - 100));

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "spaToggleBtn";
    toggleBtn.textContent = "≡";
    toggleBtn.title = "Open Analyzer";
    toggleBtn.style.cssText = `
      position: fixed;
      top: ${savedTop}px;
      left: 0px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #19325d, #2a4a8d);
      color: white;
      border: none;
      padding: 8px 6px;
      border-radius: 0 8px 8px 0;
      cursor: grab;
      width: 28px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 2px 0 12px rgba(0,0,0,0.6);
      transition: all 0.2s ease;
      margin: 0;
      font-family: Arial, sans-serif;
    `;

    const toolbar = document.createElement("div");
    toolbar.id = "spaToolbar";
    toolbar.className = "spa-glass-panel";
    toolbar.style.cssText = `
      position: fixed;
      top: ${savedTop}px;
      left: -280px;
      z-index: 2147483646;
      padding: 16px;
      border-radius: 0 12px 12px 0;
      width: 240px;
      box-shadow: 2px 0 32px rgba(0,0,0,0.3);
      transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    toolbar.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 16px; font-weight: 800; color: #19325d; margin-bottom: 4px;">⚡ Speed Analyzer Pro</div>
        <div style="font-size: 10px; color: #999;">Ultimate Edition v5.2</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px; padding-bottom:16px; border-bottom:2px solid rgba(0,0,0,0.06);">
        <button id="analyzeBtn" class="spa-btn"
          style="padding:12px; background:linear-gradient(135deg,#fb741c,#ff8c42); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>🚀</span><span style="flex:1">Analyze Page</span>
        </button>
        <button id="clearBtn" class="spa-btn"
          style="padding:12px; background:linear-gradient(135deg,#e74c3c,#c0392b); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:700; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>🧹</span><span style="flex:1">Clear Analysis</span>
        </button>
      </div>

      <div id="quickStats" style="display:none; margin-top:12px; padding:12px; background:linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1)); border-radius:8px;">
        <div style="font-size:10px; font-weight:700; color:#667eea; margin-bottom:8px; text-transform:uppercase;">Current Analysis</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:10px;">
          <div>
            <div style="color:#999;">Score</div>
            <div id="quickScore" style="font-size:16px; font-weight:700; color:#19325d;">-</div>
          </div>
          <div>
            <div style="color:#999;">Images</div>
            <div id="quickImages" style="font-size:16px; font-weight:700; color:#19325d;">-</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:8px; margin-top:16px;">
        <div style="font-size:10px; font-weight:700; color:#666; text-transform:uppercase; letter-spacing:.5px;">Advanced Tools</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">

        <button id="gtmBtn" class="spa-btn" style="padding:10px 12px; background:white; color:#19325d; border:2px solid rgba(0,0,0,0.08); border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>🧩</span><span style="flex:1">GTM Deep Analysis</span>
        </button>
        <button id="historyBtn" class="spa-btn" style="padding:10px 12px; background:white; color:#19325d; border:2px solid rgba(0,0,0,0.08); border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>🕒</span><span style="flex:1">View History</span>
        </button>
        <button id="settingsBtn" class="spa-btn" style="padding:10px 12px; background:white; color:#19325d; border:2px solid rgba(0,0,0,0.08); border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>⚙️</span><span style="flex:1">Settings</span>
        </button>
        <button id="blockAnalysisBtn" class="spa-btn" style="padding:10px 12px; background:white; color:#19325d; border:2px solid rgba(0,0,0,0.08); border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>🔍</span><span style="flex:1">Block Analysis</span>
        </button>
        <button id="legendBtn" class="spa-btn" style="padding:10px 12px; background:white; color:#19325d; border:2px solid rgba(0,0,0,0.08); border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; width:100%; text-align:left; display:flex; align-items:center; gap:8px;">
          <span>❓</span><span style="flex:1">Icon Legend</span>
        </button>
      </div>

      <div style="margin-top:16px; padding-top:12px; border-top:1px solid rgba(0,0,0,0.06); text-align:center;">
        <div style="font-size:8px; color:#999;">Made with ❤️ by Pratik Chabria</div>
      </div>
    `;

    document.body.appendChild(toggleBtn);
    document.body.appendChild(toolbar);

    let toolbarOpen = false;
    let isDragging = false;
    let dragStartY = 0;
    let dragStartTop = 0;
    let hasMoved = false;

    toggleBtn.addEventListener("mousedown", (e) => {
      isDragging = true;
      hasMoved = false;
      dragStartY = e.clientY;
      dragStartTop = parseInt(toggleBtn.style.top, 10);
      toggleBtn.style.cursor = "grabbing";
      toggleBtn.style.transition = "none";
      toolbar.style.transition = "none";
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - dragStartY;
      if (Math.abs(deltaY) > 3) hasMoved = true;
      let newTop = dragStartTop + deltaY;
      const maxTop = window.innerHeight - 48;
      newTop = Math.max(50, Math.min(newTop, maxTop));
      toggleBtn.style.top = `${newTop}px`;
      toolbar.style.top = `${newTop}px`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      toggleBtn.style.cursor = "grab";
      toggleBtn.style.transition = "all 0.2s ease";
      toolbar.style.transition = "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
      const currentTop = parseInt(toggleBtn.style.top, 10);
      GM_setValue("toolbarTop", currentTop);
      if (!hasMoved) {
        toolbarOpen = !toolbarOpen;
        toolbar.style.left = toolbarOpen ? "28px" : "-280px";
        toggleBtn.textContent = toolbarOpen ? "⟨" : "≡";
      }
      hasMoved = false;
    });

    toggleBtn.addEventListener("mouseenter", () => {
      if (!isDragging) toggleBtn.style.width = "32px";
    });
    toggleBtn.addEventListener("mouseleave", () => {
      if (!isDragging) toggleBtn.style.width = "28px";
    });

    const analyzeBtn = toolbar.querySelector("#analyzeBtn");
    const clearBtn = toolbar.querySelector("#clearBtn");

    analyzeBtn.addEventListener("click", async function () {
      if (analysisActive) return;
      this.innerHTML = `<span>⏳</span><span style="flex:1">Analyzing...</span>`;
      this.style.background = "linear-gradient(135deg,#f39c12,#e67e22)";
      this.disabled = true;
      await performAnalysis();
      this.innerHTML = `<span>🚀</span><span style="flex:1">Analyze Page</span>`;
      this.style.background = "linear-gradient(135deg,#fb741c,#ff8c42)";
      this.disabled = false;
      toolbar.querySelector("#quickStats").style.display = "block";
      toolbar.querySelector("#quickScore").textContent = performanceScore || 0;
      toolbar.querySelector("#quickImages").textContent = String(
        imageData.length
      );
    });

    clearBtn.addEventListener("click", () => {
      overlays.forEach(({ overlay }) => {
        try {
          overlay?.remove();
        } catch (e) {}
      });
      document
        .querySelectorAll(".spa-image-overlay, .spa-video-overlay")
        .forEach((el) => el.remove());
      document.getElementById("spaSummaryContainer")?.remove();
      document.querySelector(".spa-hidden-panel")?.remove();
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (e) {}
        resizeObserver = null;
      }
      overlays = [];
      imageData = [];
      videoData = [];
      hiddenOverlays.clear();
      currentFilter = "all";
      analysisActive = false;
      summaryBox = null;
      showToast("🧹 Analysis cleared", "info");
      toolbar.querySelector("#quickStats").style.display = "none";
    });

    toolbar
      .querySelector("#gtmBtn")
      .addEventListener("click", () => showGTMAnalysisModal());
    toolbar
      .querySelector("#historyBtn")
      .addEventListener("click", () => showHistoryModal());
    toolbar
      .querySelector("#settingsBtn")
      .addEventListener("click", () => showSettingsModal());
    toolbar
      .querySelector("#legendBtn")
      .addEventListener("click", () => showIconLegendModal());
    toolbar
      .querySelector("#blockAnalysisBtn")
      .addEventListener("click", () => showBlockAnalysisModal());
  }
  // ============================================================================
  // SECTION 19: SETTINGS MODAL
  // Modify this section to add new settings or change UI
  // ============================================================================

  function showSettingsModal() {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 24px; border-radius: 16px; max-width: 560px; width: 100%;
      animation: slideIn 0.3s;
    `;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
        <h2 style="margin:0; font-size:18px; color:#19325d;">⚙️ Settings</h2>
        <button class="close-settings" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div style="display:grid; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Auto-analyze on Load</div>
            <div style="font-size:10px; color:#999;">Run analysis automatically after page load</div>
          </div>
          <input type="checkbox" id="setAutoAnalyze" ${
            userSettings.autoAnalyze ? "checked" : ""
          }>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Default Quality</div>
            <div style="font-size:10px; color:#999;">Compression quality initial value</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span id="qualityDisplay" style="font-size:12px; color:#fb741c;">${
              userSettings.defaultQuality
            }</span>
            <input type="range" id="setDefaultQuality" min="10" max="100" step="5" value="${
              userSettings.defaultQuality
            }">
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Show Video Overlays</div>
            <div style="font-size:10px; color:#999;">Include video elements during analysis</div>
          </div>
          <input type="checkbox" id="setShowVideos" ${
            userSettings.showVideos ? "checked" : ""
          }>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Enable Sounds</div>
            <div style="font-size:10px; color:#999;">Play sounds on actions</div>
          </div>
          <input type="checkbox" id="setEnableSounds" ${
            userSettings.enableSounds ? "checked" : ""
          }>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Default Filter</div>
            <div style="font-size:10px; color:#999;">Which image level is shown initially</div>
          </div>
          <select id="setDefaultFilter" style="padding:8px; border:1px solid rgba(0,0,0,0.1); border-radius:6px;">
            <option value="all" ${
              userSettings.defaultFilter === "all" ? "selected" : ""
            }>All</option>
            <option value="CRITICAL" ${
              userSettings.defaultFilter === "CRITICAL" ? "selected" : ""
            }>Critical</option>
            <option value="WARNING" ${
              userSettings.defaultFilter === "WARNING" ? "selected" : ""
            }>Warning</option>
            <option value="NOTICE" ${
              userSettings.defaultFilter === "NOTICE" ? "selected" : ""
            }>Notice</option>
            <option value="GOOD" ${
              userSettings.defaultFilter === "GOOD" ? "selected" : ""
            }>Good</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(0,0,0,0.02); border-radius:8px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:#19325d;">Show Image Previews</div>
            <div style="font-size:10px; color:#999;">Display image preview in Info tab</div>
          </div>
          <input type="checkbox" id="setShowPreviews" ${
            userSettings.showImagePreviews ? "checked" : ""
          }>
        </div>
      </div>

      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
        <button class="close-settings spa-btn" style="padding:10px 16px; background:linear-gradient(135deg,#95a5a6,#7f8c8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">Cancel</button>
        <button class="save-settings spa-btn" style="padding:10px 16px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">💾 Save Settings</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const qSlider = modal.querySelector("#setDefaultQuality");
    const qDisp = modal.querySelector("#qualityDisplay");
    qSlider.addEventListener("input", () => {
      qDisp.textContent = String(qSlider.value);
    });

    modal
      .querySelectorAll(".close-settings")
      .forEach((btn) =>
        btn.addEventListener("click", () => document.body.removeChild(backdrop))
      );

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });

    modal.querySelector(".save-settings").addEventListener("click", () => {
      userSettings.autoAnalyze = modal.querySelector("#setAutoAnalyze").checked;
      userSettings.defaultQuality = parseInt(qSlider.value, 10);
      userSettings.showVideos = modal.querySelector("#setShowVideos").checked;
      userSettings.enableSounds =
        modal.querySelector("#setEnableSounds").checked;
      userSettings.defaultFilter =
        modal.querySelector("#setDefaultFilter").value;
      userSettings.showImagePreviews =
        modal.querySelector("#setShowPreviews").checked;
      saveSettings();
      showToast("✅ Settings saved!", "success");
      document.body.removeChild(backdrop);
    });
  }
  // ============================================================================
  // SECTION 20: HISTORY MODAL
  // Modify this section to change history display
  // ============================================================================

  function showHistoryModal() {
    const saved = GM_getValue("analysisHistory", []);
    if (Array.isArray(saved)) {
      analysisHistory = saved;
    }

    if (!analysisHistory.length) {
      showToast("No analysis history yet.", "info");
      return;
    }

    const recent = analysisHistory.slice(-20).reverse();
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 28px; border-radius: 16px; max-width: 720px; width: 100%;
      max-height: 85vh; overflow-y: auto; animation: slideIn 0.3s;
    `;

    const rows = recent
      .map((h) => {
        const when = h.date ? new Date(h.date) : new Date();
        const dateStr = when.toLocaleString();
        const total = typeof h.images === "number" ? h.images : "-";
        const score = typeof h.score === "number" ? h.score : "-";
        const videos = typeof h.videos === "number" ? h.videos : 0;
        return `
        <div style="display:grid; grid-template-columns: 1fr auto auto auto; gap:8px; align-items:center; padding:10px; border:1px solid rgba(0,0,0,0.06); border-radius:8px; background:white;">
          <div style="font-size:12px; color:#19325d;">${dateStr}</div>
          <div style="font-size:12px; color:#667eea; font-weight:700;">Score: ${score}</div>
          <div style="font-size:12px; color:#fb741c; font-weight:700;">Images: ${total}</div>
          <div style="font-size:12px; color:#9b59b6; font-weight:700;">Videos: ${videos}</div>
        </div>
      `;
      })
      .join("");

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
        <h2 style="margin:0; font-size:18px; color:#19325d;">🕒 Analysis History</h2>
        <button class="close-history" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <button id="exportHistory" class="spa-btn" style="padding:8px 12px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;">📥 Export JSON</button>
        <button id="clearHistory" class="spa-btn" style="padding:8px 12px; background:linear-gradient(135deg,#e74c3c,#c0392b); color:white; border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;">🗑️ Clear History</button>
      </div>
      <div style="display:grid; gap:8px;">${rows}</div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal
      .querySelectorAll(".close-history")
      .forEach((btn) =>
        btn.addEventListener("click", () => document.body.removeChild(backdrop))
      );

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });

    modal.querySelector("#exportHistory").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(analysisHistory, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ssa-history-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("📥 History exported!", "success");
    });

    modal.querySelector("#clearHistory").addEventListener("click", () => {
      analysisHistory = [];
      GM_setValue("analysisHistory", []);
      showToast("🗑️ History cleared.", "success");
      document.body.removeChild(backdrop);
    });
  }
  // ============================================================================
  // SECTION 21: GTM DEEP ANALYSIS MODAL (FULL VERSION FROM ORIGINAL)
  // This section contains the complete GTM source detection and deep analysis
  // Modify this section to change GTM detection logic or add new vendor signatures
  // ============================================================================

  // GTM SOURCE DETECTION
  async function detectGTMSource(containerId, scriptElement) {
    const analysis = {
      containerId: containerId,
      source: "Unknown",
      confidence: 0,
      evidence: [],
      isDealerOn: false,
      vendors: [],
      signatures: {
        dealerOnMarkers: 0,
        thirdPartyMarkers: 0,
      },
    };

    try {
      const gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
      const response = await fetch(gtmUrl);
      const containerCode = await response.text();

      // VENDOR SIGNATURE DATABASE
      const vendorSignatures = {
        CallRail: {
          domains: /callrail\.com|cdn\.callrail/i,
          keywords: /callrail|swap\.js|dynamic_number/i,
          category: "Call Tracking",
          weight: 5,
        },
        CallTrackingMetrics: {
          domains: /calltrackingmetrics\.com/i,
          keywords: /calltrackingmetrics/i,
          category: "Call Tracking",
          weight: 5,
        },
        Mongoose: {
          domains: /mongooseresearch\.com|callrevu\.com/i,
          keywords: /mongoose|callrevu/i,
          category: "Call Tracking",
          weight: 5,
        },
        ActivEngage: {
          domains: /activengage\.com|ae-cdn/i,
          keywords: /activengage|ae_chat/i,
          category: "Live Chat",
          weight: 5,
        },
        Gubagoo: {
          domains: /gubagoo\.com|gubagoo\.io/i,
          keywords: /gubagoo/i,
          category: "Live Chat",
          weight: 5,
        },
        CarNow: {
          domains: /carnow\.com|carnowcdn/i,
          keywords: /carnow|cn_chat/i,
          category: "Live Chat",
          weight: 5,
        },
        VinSolutions: {
          domains: /vinsolutions\.com|vincue/i,
          keywords: /vinsolutions|connect_cta/i,
          category: "CRM",
          weight: 4,
        },
        Elead: {
          domains: /elead-crm\.com|eleadcrm/i,
          keywords: /elead|eleadcrm/i,
          category: "CRM",
          weight: 4,
        },
        AutoSweet: {
          domains: /autosweet\.com|silentvisitor/i,
          keywords: /autosweet|silentvisitor|as_track/i,
          category: "Analytics",
          weight: 4,
        },
        FullStory: {
          domains: /fullstory\.com/i,
          keywords: /fullstory|_fs_/i,
          category: "Analytics",
          weight: 3,
        },
        Hotjar: {
          domains: /hotjar\.com/i,
          keywords: /hotjar|_hj_id/i,
          category: "Analytics",
          weight: 3,
        },
        Facebook: {
          domains: /facebook\.com|fbcdn/i,
          keywords: /fbevents/i,
          category: "Advertising",
          weight: 2,
        },
        AdRoll: {
          domains: /adroll\.com/i,
          keywords: /adroll|__adroll_adv/i,
          category: "Advertising",
          weight: 3,
        },
        Criteo: {
          domains: /criteo\.com|criteo\.net/i,
          keywords: /criteo|criteoq/i,
          category: "Advertising",
          weight: 3,
        },
        Conversica: {
          domains: /conversica\.com/i,
          keywords: /conversica/i,
          category: "AI Engagement",
          weight: 4,
        },
        Podium: {
          domains: /podium\.com|podium\.io/i,
          keywords: /podium|podium_widget/i,
          category: "Reviews",
          weight: 4,
        },
      };

      // DETECT VENDORS
      for (const [vendorName, sigs] of Object.entries(vendorSignatures)) {
        let score = 0;
        const vendorEvidence = [];

        if (sigs.domains.test(containerCode)) {
          score += 3;
          vendorEvidence.push("Domain found");
        }

        const keywordMatches = containerCode.match(sigs.keywords);
        if (keywordMatches && keywordMatches.length > 0) {
          score += 2;
          vendorEvidence.push(`${keywordMatches.length} keywords`);
        }

        if (score >= 3) {
          analysis.vendors.push({
            name: vendorName,
            category: sigs.category,
            confidence: Math.min(95, score * 15),
            evidence: vendorEvidence,
          });
        }
      }

      // DEALERON SIGNATURE DETECTION
      const dealerOnSignatures = {
        eventModelVars:
          /eventModel\.(item_make|item_model|item_year|cta_type|cta_name|page_type|event_owner)/g,
        automotiveDomains:
          /(kia|toyota|subaru|chrysler|dodge|jeep|ram|alfaromeo|fiat)\.(com|net)/gi,
        gaPropertyIds: /G-[A-Z0-9]{7,}/g,
        phoneTracking: /\d{3}-\d{3}-\d{4}/g,
        vehicleTracking:
          /(inventory_date|item_condition|item_price|item_number|item_variant|item_color)/gi,
        elementTracking:
          /(element_text|element_color|element_order|element_type|element_subtype)/gi,
        platformMarkers: /(dealeron|cosmos_dealer_id|dealertag)/gi,
      };

      const eventModelMatches = containerCode.match(
        dealerOnSignatures.eventModelVars
      );
      if (eventModelMatches && eventModelMatches.length >= 3) {
        analysis.signatures.dealerOnMarkers += 3;
        analysis.evidence.push(
          `${eventModelMatches.length} DealerOn eventModel variables`
        );
      }

      const domainMatches = containerCode.match(
        dealerOnSignatures.automotiveDomains
      );
      if (domainMatches && domainMatches.length >= 15) {
        analysis.signatures.dealerOnMarkers += 4;
        analysis.evidence.push(
          `${domainMatches.length} automotive dealership domains`
        );
      }

      const gaMatches = containerCode.match(dealerOnSignatures.gaPropertyIds);
      if (gaMatches && gaMatches.length >= 4) {
        analysis.signatures.dealerOnMarkers += 2;
        analysis.evidence.push(
          `${gaMatches.length} GA4 property IDs (multi-dealer)`
        );
      }

      const phoneMatches = containerCode.match(
        dealerOnSignatures.phoneTracking
      );
      if (phoneMatches && phoneMatches.length >= 10) {
        analysis.signatures.dealerOnMarkers += 2;
        analysis.evidence.push(`${phoneMatches.length} phone tracking numbers`);
      }

      const vehicleMatches = containerCode.match(
        dealerOnSignatures.vehicleTracking
      );
      if (vehicleMatches && vehicleMatches.length >= 5) {
        analysis.signatures.dealerOnMarkers += 2;
        analysis.evidence.push("Vehicle inventory tracking detected");
      }

      const elementMatches = containerCode.match(
        dealerOnSignatures.elementTracking
      );
      if (elementMatches && elementMatches.length >= 3) {
        analysis.signatures.dealerOnMarkers += 1;
        analysis.evidence.push("DealerOn element tracking found");
      }

      const platformMatches = containerCode.match(
        dealerOnSignatures.platformMarkers
      );
      if (platformMatches && platformMatches.length > 0) {
        analysis.signatures.dealerOnMarkers += 5;
        analysis.evidence.push("Direct DealerOn platform reference");
      }

      // DETERMINE SOURCE
      const dealerOnScore = analysis.signatures.dealerOnMarkers;
      if (dealerOnScore >= 8) {
        analysis.source = "DealerOn Platform (OEM)";
        analysis.confidence = Math.min(95, 60 + dealerOnScore * 5);
        analysis.isDealerOn = true;
      } else if (dealerOnScore >= 5) {
        analysis.source = "Likely DealerOn Platform";
        analysis.confidence = 70;
        analysis.isDealerOn = true;
      } else if (analysis.vendors.length > 0) {
        const topVendor = analysis.vendors[0];
        analysis.source = `Third-Party: ${topVendor.name}`;
        analysis.confidence = topVendor.confidence;
        analysis.isDealerOn = false;
      } else {
        analysis.source = "Custom Implementation";
        analysis.confidence = 50;
        analysis.isDealerOn = false;
      }
    } catch (error) {
      console.warn(`Failed to fetch GTM ${containerId}:`, error);
      analysis.source = "Unknown (Fetch Failed)";
      analysis.confidence = 0;
      analysis.evidence.push("Unable to fetch container");
    }

    return analysis;
  }

  // DEEP GTM CONTAINER ANALYSIS
  async function analyzeGTMContainer(containerId) {
    const analysis = {
      containerId,
      tags: [],
      triggers: [],
      variables: [],
      dataLayerEvents: [],
      performanceImpact: {},
      privacyIssues: [],
      recommendations: [],
    };

    try {
      const gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
      const response = await fetch(gtmUrl);
      const gtmCode = await response.text();

      const perfEntry = performance.getEntriesByName(gtmUrl)[0];
      if (perfEntry) {
        analysis.performanceImpact = {
          loadTime: Math.round(perfEntry.duration),
          size: perfEntry.transferSize,
          blocking: perfEntry.renderBlockingStatus === "blocking",
          cached: perfEntry.transferSize === 0,
        };
      }

      const tagPatterns = {
        GA4: /gtag\(|G-[A-Z0-9]{10}|google-analytics\.com\/analytics\.js/g,
        "Facebook Pixel": /facebook|fbq|connect\.facebook\.net/g,
        "LinkedIn Insight": /linkedin|snap\.licdn\.com/g,
        "TikTok Pixel": /tiktok|analytics\.tiktok\.com/g,
        Hotjar: /hotjar|static\.hotjar\.com/g,
        "Custom HTML": /<script|<iframe/g,
      };

      Object.entries(tagPatterns).forEach(([tagType, pattern]) => {
        const matches = gtmCode.match(pattern);
        if (matches && matches.length > 0) {
          analysis.tags.push({
            type: tagType,
            count: matches.length,
            detected: true,
          });
        }
      });

      if (window.dataLayer) {
        const events = new Set();
        window.dataLayer.forEach((item) => {
          if (item.event) {
            events.add(item.event);
          }
        });
        analysis.dataLayerEvents = Array.from(events).map((event) => ({
          name: event,
          type: event.toLowerCase().includes("page")
            ? "Pageview"
            : event.toLowerCase().includes("click")
            ? "Click"
            : "Custom",
        }));
      }

      if (analysis.performanceImpact.loadTime > 500) {
        analysis.recommendations.push({
          type: "performance",
          priority: "high",
          message: `GTM load time is ${analysis.performanceImpact.loadTime}ms. Consider lazy-loading non-critical tags.`,
        });
      }
    } catch (error) {
      console.error("GTM analysis error:", error);
      analysis.error = error.message;
    }

    return analysis;
  }

  // GTM ANALYSIS MODAL (FULL VERSION)
  async function showGTMAnalysisModal() {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s; overflow-y: auto;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 32px; border-radius: 16px; max-width: 1000px; width: 100%;
      max-height: 90vh; overflow-y: auto; animation: slideIn 0.3s;
    `;

    modal.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <div class="spa-progress" style="width:200px; margin:0 auto 20px;">
          <div class="spa-progress-bar" style="width:50%; animation:pulse 1s infinite;"></div>
        </div>
        <h3 style="color:#19325d; margin:0;">🔍 Analyzing GTM Containers...</h3>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const containers = [];
    const scripts = document.querySelectorAll("script");
    scripts.forEach((script) => {
      const src = script.src;
      if (src.includes("googletagmanager.com/gtm.js")) {
        const match = src.match(/id=(GTM-[A-Z0-9]+)/);
        if (match && !containers.find((c) => c.id === match[1])) {
          containers.push({ id: match[1], script: script });
        }
      }
    });

    const analyses = [];
    for (const container of containers) {
      const sourceInfo = await detectGTMSource(container.id, container.script);
      const deepAnalysis = await analyzeGTMContainer(container.id);
      analyses.push({ ...deepAnalysis, sourceInfo });
    }

    let reportHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <h2 style="margin:0; font-size:22px; color:#19325d;">🧩 GTM Deep Analysis Report</h2>
        <button id="closeGTM" style="background:none; border:none; font-size:28px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:24px;">
        <div style="padding:16px; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); border-radius:10px; color:white;">
          <div style="font-size:12px; opacity:0.9; margin-bottom:4px;">Containers Found</div>
          <div style="font-size:28px; font-weight:700;">${
            containers.length
          }</div>
        </div>
        <div style="padding:16px; background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%); border-radius:10px; color:white;">
          <div style="font-size:12px; opacity:0.9; margin-bottom:4px;">Total Tags</div>
          <div style="font-size:28px; font-weight:700;">${analyses.reduce(
            (sum, a) => sum + a.tags.length,
            0
          )}</div>
        </div>
        <div style="padding:16px; background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%); border-radius:10px; color:white;">
          <div style="font-size:12px; opacity:0.9; margin-bottom:4px;">Data Layer Events</div>
          <div style="font-size:28px; font-weight:700;">${analyses.reduce(
            (sum, a) => sum + a.dataLayerEvents.length,
            0
          )}</div>
        </div>
      </div>
    `;

    analyses.forEach((analysis, index) => {
      const source = analysis.sourceInfo;
      const perfImpact = analysis.performanceImpact;
      let impactColor =
        perfImpact.loadTime > 500
          ? "#e74c3c"
          : perfImpact.loadTime > 200
          ? "#f39c12"
          : "#2ecc71";

      reportHTML += `
        <div style="background:white; border:2px solid rgba(0,0,0,0.06); border-radius:12px; padding:20px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
            <div>
              <h3 style="margin:0 0 8px 0; font-size:18px; color:#19325d;">
                Container <code style="background:rgba(0,0,0,0.05); padding:4px 8px; border-radius:4px;">${
                  analysis.containerId
                }</code>
              </h3>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <span class="spa-badge" style="background:${
                  source.isDealerOn
                    ? "rgba(46,204,113,0.1)"
                    : "rgba(231,76,60,0.1)"
                }; color:${
        source.isDealerOn ? "#2ecc71" : "#e74c3c"
      }; border:2px solid ${
        source.isDealerOn ? "#2ecc71" : "#e74c3c"
      }; font-size:12px; font-weight:700;">${
        source.isDealerOn ? "✅ " : "⚠️ "
      }${source.source}</span>
                <span class="spa-badge" style="background:${impactColor}22; color:${impactColor};">${
        perfImpact.loadTime || 0
      }ms</span>
                <span class="spa-badge" style="background:rgba(52,152,219,0.1); color:#3498db; font-size:11px;">${
                  source.confidence
                }% confidence</span>
              </div>
            </div>
            <button class="copy-container-id spa-btn" data-id="${
              analysis.containerId
            }" style="padding:8px 14px; background:#3498db; color:white; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600;">
              📋 Copy ID
            </button>
          </div>

          ${
            source.evidence && source.evidence.length > 0
              ? `
            <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.02); border-radius:6px;">
              <div style="font-size:10px; font-weight:600; color:#19325d; margin-bottom:6px;">🔍 Detection Evidence</div>
              ${source.evidence
                .map(
                  (ev) =>
                    `<div style="font-size:9px; color:#666; margin:2px 0;">• ${ev}</div>`
                )
                .join("")}
            </div>
          `
              : ""
          }

          ${
            source.vendors && source.vendors.length > 0
              ? `
            <div style="margin-top:12px; padding:10px; background:rgba(251,116,28,0.05); border-left:3px solid #fb741c; border-radius:4px;">
              <div style="font-size:10px; font-weight:600; color:#fb741c; margin-bottom:6px;">🔌 Third-Party Vendors Detected: ${
                source.vendors.length
              }</div>
              ${source.vendors
                .map(
                  (v) => `
                <div style="margin:6px 0; padding:6px; background:white; border-radius:4px; border:1px solid rgba(0,0,0,0.06);">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <span style="font-size:11px; font-weight:700; color:#19325d;">${
                        v.name
                      }</span>
                      <span style="font-size:9px; color:#666; margin-left:6px;">${
                        v.category
                      }</span>
                    </div>
                    <span style="font-size:9px; color:#3498db; font-weight:600;">${
                      v.confidence
                    }%</span>
                  </div>
                  <div style="font-size:8px; color:#999; margin-top:2px;">${v.evidence.join(
                    ", "
                  )}</div>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }

          ${
            analysis.tags.length > 0
              ? `
            <div style="margin-bottom:12px;">
              <div style="font-size:11px; font-weight:600; color:#19325d; margin-bottom:6px;">🏷️ Tags Detected: ${
                analysis.tags.length
              }</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${analysis.tags
                  .map(
                    (tag) =>
                      `<span style="padding:4px 10px; background:rgba(251,116,28,0.1); color:#fb741c; border-radius:6px; font-size:10px; font-weight:600;">${tag.type}</span>`
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            analysis.recommendations.length > 0
              ? `
            <div style="background:rgba(46,204,113,0.05); border-left:4px solid #2ecc71; padding:12px; border-radius:4px;">
              <div style="font-size:11px; font-weight:600; color:#2ecc71; margin-bottom:6px;">💡 Recommendations</div>
              ${analysis.recommendations
                .map(
                  (rec) =>
                    `<div style="font-size:10px; color:#19325d; margin:4px 0;">• ${rec.message}</div>`
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>
      `;
    });

    reportHTML += `
      <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px;">
        <button id="exportGTMReport" class="spa-btn" style="padding:12px 20px; background:linear-gradient(135deg,#667eea,#764ba2); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          📥 Export Report
        </button>
        <button id="closeGTMModal" class="spa-btn" style="padding:12px 20px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Close
        </button>
      </div>
    `;

    modal.innerHTML = reportHTML;

    modal
      .querySelector("#closeGTM")
      ?.addEventListener("click", () => document.body.removeChild(backdrop));
    modal
      .querySelector("#closeGTMModal")
      ?.addEventListener("click", () => document.body.removeChild(backdrop));

    modal.querySelectorAll(".copy-container-id").forEach((btn) => {
      btn.addEventListener("click", function () {
        copyToClipboard(
          this.getAttribute("data-id"),
          "GTM Container ID copied!"
        );
      });
    });

    modal.querySelector("#exportGTMReport")?.addEventListener("click", () => {
      const report = JSON.stringify(analyses, null, 2);
      const blob = new Blob([report], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gtm-analysis-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("📥 GTM report exported!", "success");
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });
  }

  // ============================================================================
  // SECTION 22: ICON LEGEND MODAL
  // Modify this section to change help/legend content
  // ============================================================================

  function showIconLegendModal() {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); z-index: 999998;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; backdrop-filter: blur(8px); animation: fadeIn 0.2s;
    `;

    const modal = document.createElement("div");
    modal.className = "spa-glass-panel";
    modal.style.cssText = `
      padding: 24px; border-radius: 16px; max-width: 640px; width: 100%;
      animation: slideIn 0.3s;
    `;

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
        <h2 style="margin:0; font-size:18px; color:#19325d;">❓ Icon Legend & Shortcuts</h2>
        <button class="close-legend" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; transition: color 0.2s;" onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#999'">✕</button>
      </div>

      <div style="display:grid; gap:10px; margin-bottom:16px;">
        <div style="padding:12px; background:rgba(231,76,60,0.12); border-left:4px solid #e74c3c; border-radius:8px;">
          <div style="font-size:13px; font-weight:700; color:#e74c3c; margin-bottom:4px;">🔴 Critical (Red)</div>
          <div style="font-size:11px; color:#19325d;">Images over 500KB or extremely oversized</div>
        </div>
        <div style="padding:12px; background:rgba(243,156,18,0.12); border-left:4px solid #f39c12; border-radius:8px;">
          <div style="font-size:13px; font-weight:700; color:#f39c12; margin-bottom:4px;">🟠 Warning (Amber)</div>
          <div style="font-size:11px; color:#19325d;">Images over 200KB with medium issues</div>
        </div>
        <div style="padding:12px; background:rgba(52,152,219,0.12); border-left:4px solid #3498db; border-radius:8px;">
          <div style="font-size:13px; font-weight:700; color:#3498db; margin-bottom:4px;">🔵 Notice (Blue)</div>
          <div style="font-size:11px; color:#19325d;">Images over 100KB with minor improvements</div>
        </div>
        <div style="padding:12px; background:rgba(46,204,113,0.12); border-left:4px solid #2ecc71; border-radius:8px;">
          <div style="font-size:13px; font-weight:700; color:#2ecc71; margin-bottom:4px;">🟢 Good (Green)</div>
          <div style="font-size:11px; color:#19325d;">Well-optimized images</div>
        </div>
      </div>


      <div style="padding:12px; background:rgba(251,116,28,0.1); border-left:3px solid #fb741c; border-radius:6px; margin-bottom:16px;">
        <div style="font-size:12px; font-weight:700; color:#fb741c; margin-bottom:6px;">✨ New Features in v5.2</div>
        <ul style="margin:0; padding-left:18px; font-size:11px; color:#19325d; line-height:1.6;">
          <li><strong>Image Preview:</strong> View images directly in the Info modal</li>
          <li><strong>Crop Tool:</strong> Interactive crop tool with manual sizing and preset ratios</li>
          <li><strong>Download & Copy:</strong> Export cropped images or copy to clipboard</li>
        </ul>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:16px;">
        <button class="close-legend spa-btn" style="padding:10px 20px; background:linear-gradient(135deg,#19325d,#2a4a8d); color:white; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;">
          Got it!
        </button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal
      .querySelectorAll(".close-legend")
      .forEach((btn) =>
        btn.addEventListener("click", () => document.body.removeChild(backdrop))
      );

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) document.body.removeChild(backdrop);
    });
  }
  // ============================================================================
  // SECTION 23: INITIALIZATION
  // This is the entry point - modify carefully
  // ============================================================================

  function init() {
    console.log("🚀 Site Speed Analyzer Pro v5.2 initializing...");

    injectStyles();
    loadSettings();
    // Keyboard shortcuts removed

    // Responsive styles
    const responsiveStyle = document.createElement("style");
    responsiveStyle.textContent = `
      @media screen and (max-width: 1366px) {
        .spa-glass-panel { max-width: 90vw !important; }
        #spaSummaryBox { width: 240px !important; }
      }
      @media screen and (max-width: 1024px) {
        #spaSummaryBox { width: 200px !important; padding: 12px !important; }
        .spa-hidden-panel { width: 280px !important; }
      }
    `;
    document.head.appendChild(responsiveStyle);

    createToolbar();

    const savedHistory = GM_getValue("analysisHistory", []);
    if (Array.isArray(savedHistory)) {
      analysisHistory = savedHistory;
    }

    if (userSettings.autoAnalyze) {
      console.log("⚡ Auto-analyze enabled, running in 2 seconds...");
      setTimeout(() => {
        document.getElementById("analyzeBtn")?.click();
      }, 2000);
    }

    console.log("✅ Site Speed Analyzer Pro v5.2 initialized successfully!");
  }

  // Start the script
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ============================================================================
  // END OF SCRIPT
  // ============================================================================
})();
