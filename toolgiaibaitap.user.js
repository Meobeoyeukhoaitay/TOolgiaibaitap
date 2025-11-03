// ==UserScript==
// @name         AI Giải Bài Tập - Ultimate v4.1 (Full Fix & Models)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  AI studio với Glassmorphism UI. Fix lỗi CSP, chụp vùng, font KaTeX. Thêm model Gemini 2.5, Pro. Thêm nút dừng và tự động check API.
// @author       Tran Minh Dung (UI & Fix by Gemini)
// @match        https://*/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @connect      cdnjs.cloudflare.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js
// ==/UserScript==

(async function() {
'use strict';

// === FIX v3.6: TrustedHTML Policy ===
let safeHTMLPolicy = { createHTML: (s) => s };
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
        safeHTMLPolicy = window.trustedTypes.createPolicy('ai-solver-policy', {
            createHTML: (string) => string,
        });
    } catch (e) {
        try {
             safeHTMLPolicy = window.trustedTypes.policy.default || safeHTMLPolicy;
        } catch (err) {}
    }
}
// ======================================

// === DEFAULT VALUES & HELPERS (v4.0) ===
const DEFAULT_PRIMARY_COLOR = '#4285f4';
const DEFAULT_DEVIL_COLOR = '#dc2626';

// Helper: Chuyển HEX sang R,G,B (dùng cho CSS variables)
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '66, 133, 244'; // Fallback to default blue
}

// === LOAD SAVED SETTINGS (v4.0) ===
let GEMINI_API_KEY = GM_getValue('geminiApiKey', "");
let DEVIL_MODE = false;
let SAVED_THEME = GM_getValue('theme', 'dark');
let SAVED_PRIMARY_COLOR = GM_getValue('primaryColor', DEFAULT_PRIMARY_COLOR);
let SAVED_DEVIL_COLOR = GM_getValue('devilColor', DEFAULT_DEVIL_COLOR);


// === PROMPTS CHUYÊN BIỆT CHO TỪNG MÔN ===
const SUBJECT_PROMPTS = {
  'Toán': `Bạn là chuyên gia Toán học. Khi giải toán:
- Phân tích đề bài kỹ lưỡng, xác định dạng toán
- Liệt kê công thức, định lý cần dùng
- Giải từng bước logic, rõ ràng
- Sử dụng LaTeX cho MỌI công thức: $...$ (inline), $$...$$ (display)
- Kiểm tra đáp án, đơn vị, điều kiện
- Đưa ra cách giải khác nếu có`,

  'Lý': `Bạn là chuyên gia Vật lý. Khi giải bài tập Lý:
- Phân tích hiện tượng vật lý, vẽ sơ đồ (nếu cần)
- Liệt kê các đại lượng đã cho, cần tìm
- Áp dụng định luật, công thức vật lý phù hợp
- Tính toán chi tiết từng bước với đơn vị chuẩn
- Sử dụng LaTeX cho công thức
- Kiểm tra tính hợp lý của kết quả`,

  'Hóa': `Bạn là chuyên gia Hóa học. Khi giải Hóa:
- Xác định loại phản ứng, chất tham gia
- Viết và cân bằng phương trình hóa học đầy đủ
- Tính toán mol, khối lượng, nồng độ chính xác
- Phân tích tính chất, ứng dụng các chất
- Sử dụng LaTeX cho phương trình và công thức
- Lưu ý điều kiện phản ứng, hiện tượng`,

  'Sinh': `Bạn là chuyên gia Sinh học. Khi giải Sinh:
- Phân tích cơ chế sinh học, quá trình diễn ra
- Giải thích khái niệm, thuật ngữ chuyên môn
- Liên hệ lý thuyết với thực tế sinh động
- Vẽ sơ đồ, bảng phân tích (nếu cần)
- Tổng hợp kiến thức một cách hệ thống`,

  'Sử': `Bạn là nhà sử học. Khi giải Sử:
- Xác định giai đoạn lịch sử, bối cảnh
- Phân tích nguyên nhân, diễn biến, kết quả, ý nghĩa
- Nêu mốc thời gian, nhân vật, sự kiện chính xác
- Liên hệ với các sự kiện khác trong lịch sử
- Đánh giá khách quan, toàn diện`,

  'Địa': `Bạn là chuyên gia Địa lý. Khi giải Địa:
- Xác định vị trí địa lý, đặc điểm tự nhiên
- Phân tích các yếu tố tự nhiên, kinh tế, xã hội
- Giải thích mối quan hệ giữa các yếu tố địa lý
- Sử dụng số liệu, bản đồ (nếu có)
- Liên hệ thực tế Việt Nam và thế giới`,

  'Văn': `Bạn là giáo viên Ngữ văn. Khi phân tích Văn:
- Xác định tác giả, tác phẩm, hoàn cảnh sáng tác
- Phân tích nội dung, nghệ thuật chi tiết
- Nêu cảm nhận, liên hệ bản thân, thực tế
- Trích dẫn chính xác từ văn bản
- Diễn đạt văn học, có cảm xúc`,

  'Anh': `You are an English expert. When solving English exercises:
- Identify the grammar structure, vocabulary topic
- Explain grammar rules, usage clearly
- Provide examples, synonyms, antonyms
- Analyze sentence structure step by step
- Give pronunciation guide if needed
- Explain cultural context when relevant`,

  'GDCD': `Bạn là giáo viên GDCD. Khi giải GDCD:
- Phân tích khái niệm, giá trị đạo đức
- Giải thích ý nghĩa, tầm quan trọng
- Liên hệ thực tế cuộc sống, xã hội
- Đưa ra ví dụ minh họa sinh động
- Rút ra bài học, giáo dục ý nghĩa`,

  'Tin học': `Bạn là chuyên gia lập trình. Khi giải Tin học:
- Phân tích yêu cầu bài toán, input/output
- Thiết kế thuật toán chi tiết, rõ ràng
- Viết code mẫu với giải thích từng bước
- Phân tích độ phức tạp thuật toán
- Đưa ra test case, xử lý edge case
- Tối ưu hóa code nếu có thể`
};

const DEVIL_PROMPT = `
🔥 CHẾ ĐỘ ÁC QUỶ KÍCH HOẠT 🔥
Giải thích CỰC KỲ CHI TIẾT, KHÔNG BỎ QUA BẤT KỲ ĐIỀU GÌ:
- Phân tích sâu từng khái niệm, công thức
- Giải thích TẠI SAO mỗi bước lại đúng
- Đưa ra NHIỀU cách giải khác nhau
- So sánh ưu nhược điểm các cách
- Giải thích mọi chi tiết nhỏ nhất
- Cung cấp kiến thức mở rộng liên quan
`;

// === Floating Toggle Button ===
const floatingBtn = document.createElement('div');
floatingBtn.id = 'aiFloatingBtn';
floatingBtn.innerHTML = safeHTMLPolicy.createHTML(`
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.6"/>
    <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
  </svg>
`);
document.body.appendChild(floatingBtn);

// === Main UI ===
const ui = document.createElement('div');
ui.id = 'aiPanel';
ui.innerHTML = safeHTMLPolicy.createHTML(`
  <div class="ai-header">
    <div class="header-content">
      <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.6"/>
        <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
      </svg>
      <div class="header-text">
        <h2>AI Giải Bài Tập</h2>
      </div>
      <button class="btn-header" id="btnSettings" title="Cài đặt">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.14 12.94C19.06 12.65 19 12.33 19 12C19 11.67 19.06 11.35 19.14 11.06L21.12 9.42C21.27 9.3 21.32 9.1 21.23 8.93L19.34 5.7C19.25 5.53 19.06 5.45 18.89 5.52L16.58 6.36C16.18 6.06 15.74 5.81 15.25 5.61L14.93 3.23C14.9 3.05 14.75 2.91 14.56 2.91H10.44C10.25 2.91 10.1 3.05 10.07 3.23L9.75 5.61C9.26 5.81 8.82 6.06 8.42 6.36L6.11 5.52C5.94 5.45 5.75 5.53 5.66 5.7L3.77 8.93C3.68 9.1 3.73 9.3 3.88 9.42L5.86 11.06C5.94 11.35 6 11.67 6 12C6 12.33 5.94 12.65 5.86 12.94L3.88 14.58C3.73 14.7 3.68 14.9 3.77 15.07L5.66 18.3C5.75 18.47 5.94 18.55 6.11 18.48L8.42 17.64C8.82 17.94 9.26 18.19 9.75 18.39L10.07 20.77C10.1 20.95 10.25 21.09 10.44 21.09H14.56C14.75 21.09 14.9 20.95 14.93 20.77L15.25 18.39C15.74 18.19 16.18 17.94 16.58 17.64L18.89 18.48C19.06 18.55 19.25 18.47 19.34 18.3L21.23 15.07C21.32 14.9 21.27 14.7 21.12 14.58L19.14 12.94ZM12.5 14.5C11.12 14.5 10 13.38 10 12C10 10.62 11.12 9.5 12.5 9.5C13.88 9.5 15 10.62 15 12C15 13.38 13.88 14.5 12.5 14.5Z" fill="currentColor"/>
        </svg>
      </button>
      <button class="btn-header" id="btnResize" title="Thay đổi kích thước">⇲</button>
      <button class="btn-header" id="btnMinimize" title="Thu gọn">−</button>
    </div>
    <div class="status-chip" id="aiStatus">
      <span class="status-dot"></span>
      <span class="status-text">Ready</span>
    </div>
  </div>

  <div class="ai-content" id="aiContent">

    <div id="settingsSection" class="section" style="display:none;">
      <h3 class="settings-title">Cài đặt Giao diện</h3>
      <div class="setting-item">
        <label for="themeSelect">Giao diện</label>
        <div class="select-card compact">
          <select id="themeSelect" class="material-select">
            <option value="dark">🌙 Tối (Glass)</option>
            <option value="light">☀️ Sáng (Opaque)</option>
          </select>
        </div>
      </div>
      <div class="setting-item">
        <label for="primaryColorPicker">Màu nhấn</label>
        <input type="color" id="primaryColorPicker" class="color-picker" value="${SAVED_PRIMARY_COLOR}">
      </div>
      <div class="setting-item">
        <label for="devilColorPicker">Màu Ác Quỷ</label>
        <input type="color" id="devilColorPicker" class="color-picker" value="${SAVED_DEVIL_COLOR}">
      </div>
      <hr class="settings-divider">
    </div>

    <div id="apiKeySection" class="section">
      <div class="input-field compact">
        <input type="password" id="apiKeyInput" value="${GEMINI_API_KEY}" placeholder=" " />
        <label>API Key Gemini</label>
      </div>
    </div>

    <div id="changeApiSection" style="display:none;" class="section">
      <button id="changeApiBtn" class="btn btn-text btn-small">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
        Đổi Key
      </button>
    </div>

    <div class="devil-mode-section">
      <button id="btnDevilMode" class="btn-devil compact">
        <span class="devil-icon">👿</span>
        <div class="devil-text">
          <span class="devil-title">Chế độ Ác Quỷ</span>
        </div>
        <div class="devil-toggle">
          <div class="devil-toggle-track">
            <div class="devil-toggle-thumb"></div>
          </div>
        </div>
      </button>
    </div>

    <div class="section">
      <div class="select-grid">
        <div class="select-card compact">
          <!-- v4.1: Cập nhật Model -->
          <select id="modelSelect" class="material-select">
            <option value="gemini-2.5-flash-preview-09-2025">⚡ Gemini 2.5 Flash</option>
            <option value="gemini-pro">🚀 Gemini Pro</option>
            <option value="gemini-2.0-flash-exp">⚙️ Flash 2.0 (Exp)</option>
            <option value="gemini-exp-1206">⚙️ Exp 1206</option>
            <option value="gemini-2.0-flash-thinking-exp-1219">⚙️ Thinking (Exp)</option>
            <option value="" disabled>-- ChatGPT (Chưa hỗ trợ) --</option>
            <option value="" disabled>-- Claude (Chưa hỗ trợ) --</option>
          </select>
        </div>

        <div class="select-card compact">
          <select id="lang" class="material-select">
            <option value="vi">🇻🇳 Việt</option>
            <option value="en">🇬🇧 Eng</option>
          </select>
        </div>

        <div class="select-card compact full">
          <select id="subject" class="material-select">
            <option>📐 Toán</option><option>⚛️ Lý</option><option>🧪 Hóa</option><option>🧬 Sinh</option>
            <option>📜 Sử</option><option>🌍 Địa</option><option>📝 Văn</option><option>🗣️ Anh</option>
            <option>⚖️ GDCD</option><option>💻 Tin học</option>
          </select>
        </div>

        <div class="select-card compact full">
          <select id="outputMode" class="material-select">
            <option value="answer">💡 Chỉ đáp án</option>
            <option value="explain">📚 Chi tiết</option>
            <option value="custom">⚙️ Tùy chỉnh</option>
          </select>
        </div>
      </div>
    </div>

    <div id="customPromptSection" class="section" style="display:none;">
      <div class="input-field compact">
        <textarea id="customPromptInput" rows="2" placeholder=" "></textarea>
        <label>Yêu cầu tùy chỉnh</label>
      </div>
    </div>

    <div class="action-buttons">
      <button id="btnShot" class="btn btn-primary btn-compact" disabled>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
        </svg>
        Kéo vùng
      </button>
      <button id="btnFullPage" class="btn btn-primary btn-compact" disabled>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
        </svg>
        Toàn trang
      </button>
    </div>

    <button id="btnToggleTextMode" class="btn btn-secondary btn-compact full-width" disabled>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25Z" fill="currentColor"/>
      </svg>
      Nhập câu hỏi
    </button>

    <div id="textInputSection" class="section" style="display: none;">
      <div class="input-field compact">
        <textarea id="textQuestionInput" rows="2" placeholder=" "></textarea>
        <label>Câu hỏi của bạn</label>
      </div>
      <button id="btnSendTextQuestion" class="btn btn-primary btn-compact full-width">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
        </svg>
        Gửi
      </button>
    </div>

    <div class="result-section">
      <div class="result-card compact" id="imgCard" style="display:none;">
        <div class="card-header compact">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2"/>
          </svg>
          Ảnh
        </div>
        <div class="card-content compact" id="imgBox"></div>
      </div>

      <div class="result-card compact">
        <div class="card-header compact">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          Đáp án
          <!-- v4.1: Thêm nút Dừng (Stop Typing) -->
          <button class="btn-copy" id="btnCancelTyping" style="display:none;" title="Dừng gõ chữ">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
            </svg>
          </button>
          <button class="btn-copy" id="btnCopy" style="display:none;" title="Copy đáp án">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="card-content compact" id="ansBox">
          <div class="empty-state compact">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>Chờ câu hỏi...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="resize-handle" id="resizeHandle"></div>
`);
document.body.appendChild(ui);

// === DOM Elements ===
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeySection = document.getElementById('apiKeySection');
const changeApiBtn = document.getElementById('changeApiBtn');
const changeApiSection = document.getElementById('changeApiSection');
const aiStatus = document.getElementById('aiStatus');
const btnShot = document.getElementById('btnShot');
const btnFullPage = document.getElementById('btnFullPage');
const btnToggleTextMode = document.getElementById('btnToggleTextMode');
const textInputSection = document.getElementById('textInputSection');
const textQuestionInput = document.getElementById('textQuestionInput');
const btnSendTextQuestion = document.getElementById('btnSendTextQuestion');
const outputModeSelect = document.getElementById('outputMode');
const customPromptSection = document.getElementById('customPromptSection');
const customPromptInput = document.getElementById('customPromptInput');
const btnDevilMode = document.getElementById('btnDevilMode');
const btnMinimize = document.getElementById('btnMinimize');
const btnResize = document.getElementById('btnResize');
const btnCopy = document.getElementById('btnCopy');
const btnCancelTyping = document.getElementById('btnCancelTyping'); // v4.1: Nút dừng gõ
const resizeHandle = document.getElementById('resizeHandle');
const aiContent = document.getElementById('aiContent');
const allActionButtons = [btnShot, btnFullPage, btnToggleTextMode];

// v4.0: Settings DOM
const btnSettings = document.getElementById('btnSettings');
const settingsSection = document.getElementById('settingsSection');
const themeSelect = document.getElementById('themeSelect');
const primaryColorPicker = document.getElementById('primaryColorPicker');
const devilColorPicker = document.getElementById('devilColorPicker');


let currentRequest = null;
let isMinimized = false;
let currentAnswerText = ''; // Toàn bộ text (dùng để copy)
let currentTypingTimeout = null; // v4.1: Biến kiểm soát setTimeout
let isTyping = false; // v4.1: Cờ báo đang gõ
let apiCheckInterval = null; // v4.1: Biến kiểm soát check API

let savedWidth = GM_getValue('panelWidth', 280);
let beforeMinimizeWidth = savedWidth;

const savedHeight = GM_getValue('panelHeight', 'auto');
let beforeMinimizeHeight = savedHeight;

// === v4.0: Cập nhật CSS Variables ===
function updateCssVariables(primaryColor, devilColor) {
    const primaryRgb = hexToRgb(primaryColor);
    const devilRgb = hexToRgb(devilColor);

    ui.style.setProperty('--ai-primary-color-hex', primaryColor);
    ui.style.setProperty('--ai-primary-rgb', primaryRgb);

    ui.style.setProperty('--ai-devil-color-hex', devilColor);
    ui.style.setProperty('--ai-devil-rgb', devilRgb);
}

// === v4.0: Áp dụng Theme ===
function applyTheme(theme) {
    ui.classList.toggle('ai-panel-light', theme === 'light');
    GM_setValue('theme', theme);
}

// === v4.0: Xử lý Cài đặt ===
btnSettings.addEventListener('click', () => {
    const isVisible = settingsSection.style.display !== 'none';
    settingsSection.style.display = isVisible ? 'none' : 'block';
});

themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

primaryColorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;
    updateCssVariables(newColor, devilColorPicker.value);
    GM_setValue('primaryColor', newColor);
});

devilColorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;
    updateCssVariables(primaryColorPicker.value, newColor);
    GM_setValue('devilColor', newColor);
});

// === v4.1 FIX: Tải KaTeX CSS (fix CSP & font paths) ===
function loadExternalCSS(url) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            if (response.status === 200) {
                // === v4.1 FIX: Rewrite relative font paths in CSS ===
                let cssText = response.responseText;
                // Lấy URL base (ví dụ: https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/)
                const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

                // Regex để tìm url(fonts/...) và thay thế
                // Tìm url() với đường dẫn bắt đầu bằng 'fonts/'
                cssText = cssText.replace(/url\((['"]?)(fonts\/)(.*?)\1\)/g, (match, quote, fontDir, filename) => {
                    const newUrl = `${baseUrl}${fontDir}${filename}`;
                    // Trả về url(https://.../fonts/...)
                    return `url(${quote}${newUrl}${quote})`;
                });

                GM_addStyle(cssText);
                // ===================================================
            } else {
                console.error(`Failed to load CSS from ${url}`);
            }
        },
        onerror: function(error) {
            console.error(`Error loading CSS from ${url}:`, error);
        }
    });
}
// Gọi hàm fix CSP
loadExternalCSS('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css');


// === Render LaTeX ===
function renderMathInElement(element) {
  // v4.1: Thêm kiểm tra window.renderMathInElement
  if (typeof window.renderMathInElement === 'undefined' || typeof window.katex === 'undefined') {
    console.warn('KaTeX hoặc auto-render chưa load xong, đang chờ...');
    setTimeout(() => renderMathInElement(element), 100); // Thử lại sau 100ms
    return;
  }

  try {
    window.renderMathInElement(element, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\[', right: '\\]', display: true},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false,
      trust: true, // Cần thiết cho một số macro
      macros: {
        "\\RR": "\\mathbb{R}",
        "\\NN": "\\mathbb{N}",
        "\\ZZ": "\\mathbb{Z}",
        "\\QQ": "\\mathbb{Q}",
        "\\CC": "\\mathbb{C}"
      }
    });
  } catch (e) {
    console.error('Lỗi render KaTeX:', e);
  }
}

// === Copy ===
btnCopy.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!currentAnswerText) return;

  try {
    await navigator.clipboard.writeText(currentAnswerText);
    const originalHTML = btnCopy.innerHTML;
    // FIX v3.6: TrustedHTML
    btnCopy.innerHTML = safeHTMLPolicy.createHTML(`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `);
    btnCopy.classList.add('copied'); // v4.0: Dùng class cho style

    setTimeout(() => {
      // FIX v3.6: TrustedHTML
      btnCopy.innerHTML = safeHTMLPolicy.createHTML(originalHTML);
      btnCopy.classList.remove('copied'); // v4.0: Dùng class cho style
    }, 1500);
  } catch (err) {
    console.error('Copy failed:', err);
    // v4.1: Dùng modal tùy chỉnh thay vì alert
    showCustomAlert('⚠️ Không thể copy. Vui lòng chọn và copy thủ công.');
  }
});

// === v4.1: Custom Alert (thay thế alert()) ===
function showCustomAlert(message) {
    let alertBox = document.getElementById('aiCustomAlert');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'aiCustomAlert';
        document.body.appendChild(alertBox);
    }
    alertBox.innerHTML = safeHTMLPolicy.createHTML(`<p>${message}</p><button>OK</button>`);
    alertBox.style.display = 'block';
    alertBox.querySelector('button').onclick = () => {
        alertBox.style.display = 'none';
    };
}

// === Resize ===
let isResizing = false;
let resizeType = 'none';
let startResizeX, startResizeY, startWidth, startHeight;

ui.style.width = savedWidth + 'px';
if (savedHeight !== 'auto') {
  ui.style.height = savedHeight + 'px';
  aiContent.style.maxHeight = (savedHeight - 100) + 'px';
}

btnResize.addEventListener('click', (e) => {
  e.stopPropagation();
  const currentWidth = parseInt(ui.style.width);

  if (currentWidth <= 280) {
    ui.style.width = '450px';
    savedWidth = 450;
    btnResize.textContent = '⇱';
  } else if (currentWidth <= 450) {
    ui.style.width = '650px';
    savedWidth = 650;
    btnResize.textContent = '⇱';
  } else {
    ui.style.width = '280px';
    savedWidth = 280;
    btnResize.textContent = '⇲';
  }

  beforeMinimizeWidth = savedWidth;
  GM_setValue('panelWidth', savedWidth);
});

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing = true;
  resizeType = 'corner';
  startResizeX = e.clientX;
  startResizeY = e.clientY;
  startWidth = ui.offsetWidth;
  startHeight = ui.offsetHeight;
  ui.classList.add('resizing');
  document.body.style.cursor = 'nwse-resize';
});

ui.addEventListener('mousedown', (e) => {
  const rect = ui.getBoundingClientRect();
  const isRightEdge = e.clientX > rect.right - 8 && e.clientX < rect.right;
  const isBottomEdge = e.clientY > rect.bottom - 8 && e.clientY < rect.bottom;
  const isHeader = e.target.closest('.ai-header');

  if (isHeader) return;

  if (isRightEdge && !isBottomEdge) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeType = 'right';
    startResizeX = e.clientX;
    startWidth = ui.offsetWidth;
    ui.classList.add('resizing');
    document.body.style.cursor = 'ew-resize';
  } else if (isBottomEdge && !isRightEdge) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeType = 'bottom';
    startResizeY = e.clientY;
    startHeight = ui.offsetHeight;
    ui.classList.add('resizing');
    document.body.style.cursor = 'ns-resize';
  }
});

ui.addEventListener('mousemove', (e) => {
  if (isResizing) return;

  const rect = ui.getBoundingClientRect();
  const isRightEdge = e.clientX > rect.right - 8 && e.clientX < rect.right;
  const isBottomEdge = e.clientY > rect.bottom - 8 && e.clientY < rect.bottom;
  const isCorner = isRightEdge && isBottomEdge;
  const isHeader = e.target.closest('.ai-header');

  if (isHeader) {
    ui.style.cursor = 'move';
  } else if (isCorner) {
    ui.style.cursor = 'nwse-resize';
  } else if (isRightEdge) {
    ui.style.cursor = 'ew-resize';
  } else if (isBottomEdge) {
    ui.style.cursor = 'ns-resize';
  } else {
    ui.style.cursor = 'default';
  }
});

document.addEventListener('mousemove', (e) => {
  if (isResizing) {
    if (resizeType === 'corner') {
      const newWidth = Math.max(280, Math.min(1000, startWidth + (e.clientX - startResizeX)));
      const newHeight = Math.max(300, Math.min(window.innerHeight - 40, startHeight + (e.clientY - startResizeY)));

      ui.style.width = newWidth + 'px';
      ui.style.height = newHeight + 'px';
      aiContent.style.maxHeight = (newHeight - 100) + 'px';

      savedWidth = newWidth;
      beforeMinimizeWidth = newWidth;
      GM_setValue('panelWidth', newWidth);
      GM_setValue('panelHeight', newHeight);
    } else if (resizeType === 'right') {
      const newWidth = Math.max(280, Math.min(1000, startWidth + (e.clientX - startResizeX)));
      ui.style.width = newWidth + 'px';
      savedWidth = newWidth;
      beforeMinimizeWidth = newWidth;
      GM_setValue('panelWidth', newWidth);
    } else if (resizeType === 'bottom') {
      const newHeight = Math.max(300, Math.min(window.innerHeight - 40, startHeight + (e.clientY - startResizeY)));
      ui.style.height = newHeight + 'px';
      aiContent.style.maxHeight = (newHeight - 100) + 'px';
      GM_setValue('panelHeight', newHeight);
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizeType = 'none';
    ui.classList.remove('resizing');
    document.body.style.cursor = '';
  }
});

// === FIX: Cập nhật logic Thu nhỏ / Phóng to ===
btnMinimize.addEventListener('click', (e) => {
  e.stopPropagation();
  isMinimized = !isMinimized;

  if (isMinimized) {
    beforeMinimizeWidth = parseInt(ui.style.width);
    beforeMinimizeHeight = ui.style.height || savedHeight;

    aiContent.style.display = 'none';
    btnResize.style.display = 'none';
    btnSettings.style.display = 'none'; // v4.0: Ẩn Cài đặt
    resizeHandle.style.display = 'none';

    btnMinimize.innerHTML = safeHTMLPolicy.createHTML('□'); // FIX v3.6: TrustedHTML
    btnMinimize.title = 'Phóng to';

    ui.style.width = '210px';
    ui.style.height = 'auto';
    ui.classList.add('minimized');

  } else {
    aiContent.style.display = 'block';
    btnResize.style.display = 'flex';
    btnSettings.style.display = 'flex'; // v4.0: Hiện Cài đặt
    resizeHandle.style.display = 'block';

    btnMinimize.innerHTML = safeHTMLPolicy.createHTML('−'); // FIX v3.6: TrustedHTML
    btnMinimize.title = 'Thu gọn';

    ui.style.width = beforeMinimizeWidth + 'px';
    ui.style.height = beforeMinimizeHeight;

    ui.classList.remove('minimized');
  }
});

// === Devil Mode ===
btnDevilMode.addEventListener('click', () => {
  DEVIL_MODE = !DEVIL_MODE;
  btnDevilMode.classList.toggle('active', DEVIL_MODE);
  ui.classList.toggle('devil-active', DEVIL_MODE);
});

// === Tách hàm bật/tắt UI để dùng chung ===
function toggleUIVisibility() {
  const isVisible = ui.style.display !== 'none';

  if (isVisible) {
    ui.style.animation = 'panelExit 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    // v4.1: Dừng check API khi đóng panel
    if (apiCheckInterval) clearInterval(apiCheckInterval);
    apiCheckInterval = null;
    setTimeout(() => {
      ui.style.display = 'none';
      ui.style.animation = '';
      floatingBtn.classList.remove('active');
    }, 280);
  } else {
    ui.style.display = 'block';
    ui.style.animation = 'panelEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    floatingBtn.classList.add('active');
    checkApiKey(GM_getValue('geminiApiKey', "")); // v4.1: Sẽ tự khởi động interval khi check thành công
  }
}

// === Floating Button Toggle ===
floatingBtn.addEventListener('click', toggleUIVisibility);

// === Tạo Prompt với Subject-specific + Devil + Custom ===
function createPrompt(isImage = true) {
  const subj = document.getElementById('subject').value.replace(/[^\w\s]/gi, '').trim();
  const lang = document.getElementById('lang').value;
  const mode = document.getElementById('outputMode').value;
  const langStr = lang === 'vi' ? 'Tiếng Việt' : 'English';
  const source = isImage ? 'trong ảnh' : 'được cung cấp';

  let basePrompt = SUBJECT_PROMPTS[subj] || '';

  if (DEVIL_MODE) {
    basePrompt += '\n\n' + DEVIL_PROMPT;
  }

  if (mode === 'custom') {
    const customText = customPromptInput.value.trim();
    if (!customText) {
      document.getElementById('ansBox').innerHTML = safeHTMLPolicy.createHTML(`
        <div class="error-state compact">
          <p>Vui lòng nhập yêu cầu tùy chỉnh</p>
        </div>
      `);
      return null;
    }
    basePrompt += '\n\n' + customText;
  } else if (mode === 'answer') {
    basePrompt += `\n\nYêu cầu: Chỉ đưa ra đáp án cuối cùng, ngắn gọn.`;
  } else {
    basePrompt += `\n\nYêu cầu: Giải chi tiết từng bước.`;
  }

  basePrompt += `\n\nBài tập môn ${subj} ${source}. Trả lời bằng ${langStr}.`;
  basePrompt += `\n\n🔢 SỬ DỤNG LATEX/KATEX cho mọi công thức: $...$ (inline), $$...$$ (display).`;
  basePrompt += `\n\n⚠️ Nếu không thể trả lời (thiếu thông tin, không rõ ràng), hãy nói thẳng "Tôi không thể trả lời" và giải thích.`;

  return basePrompt;
}

// === Gửi Gemini ===
function sendToGemini(prompt, base64Image = null) {
  const model = document.getElementById('modelSelect').value;
  // v4.1: Kiểm tra nếu model bị disabled (ví dụ: ChatGPT)
  if (!model) {
      document.getElementById('ansBox').innerHTML = safeHTMLPolicy.createHTML(`
        <div class="error-state compact">
          <p>Model này chưa được hỗ trợ. Vui lòng chọn model Gemini.</p>
        </div>
      `);
      return;
  }

  const ansBox = document.getElementById('ansBox');
  const imgBox = document.getElementById('imgBox');
  const imgCard = document.getElementById('imgCard');

  ansBox.innerHTML = safeHTMLPolicy.createHTML(`
    <div class="loading-state compact">
      <div class="spinner small"></div>
      <p>Đang xử lý...</p>
      <button id="btnCancelRequest" class="btn-cancel small">Hủy</button>
    </div>
  `);

  const btnCancel = document.getElementById('btnCancelRequest');
  if (btnCancel) {
    btnCancel.onclick = () => {
      if (currentRequest) {
        currentRequest.abort();
        ansBox.innerHTML = safeHTMLPolicy.createHTML(`
          <div class="empty-state compact">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>Đã hủy</p>
          </div>
        `);
        currentRequest = null;
      }
    };
  }

  let parts = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
  }

  currentRequest = GM_xmlhttpRequest({
    method: "POST",
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: { "temperature": 0.2, "topP": 0.95, "topK": 40 }
    }),
    onload: r => {
      currentRequest = null;
      try {
        const data = JSON.parse(r.responseText);
        if (data.error) throw new Error(data.error.message);
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Không nhận được phản hồi.";

        if (base64Image) {
          imgCard.style.display = 'none';
        }

        typeEffectWithMath(ansBox, result.trim()); // v4.1: Sẽ kích hoạt nút Dừng Gõ
      } catch (err) {
        ansBox.innerHTML = safeHTMLPolicy.createHTML(`
          <div class="error-state compact">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <p>${err.message || "Lỗi API"}</p>
          </div>
        `);
        console.error("Lỗi Gemini:", r.responseText);
      }
    },
    onerror: err => {
      currentRequest = null;
      ansBox.innerHTML = safeHTMLPolicy.createHTML(`
        <div class="error-state compact">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <p>Lỗi kết nối</p>
        </div>
      `);
    },
    onabort: () => {
      currentRequest = null;
    }
  });
}

// === v4.1: Check API Key (có cờ isSilent) ===
function checkApiKey(key, isSilent = false) {
  const statusDot = aiStatus.querySelector('.status-dot');
  const statusText = aiStatus.querySelector('.status-text');

  if (!key) {
    statusText.textContent = 'Chưa có Key';
    aiStatus.className = 'status-chip status-error';
    allActionButtons.forEach(b => b.disabled = true);
    apiKeySection.style.display = 'block';
    changeApiSection.style.display = 'none';
    if (apiCheckInterval) clearInterval(apiCheckInterval); // Dừng check nếu không có key
    apiCheckInterval = null;
    return;
  }

  // Chỉ hiển thị "Kiểm tra..." và vô hiệu hóa nút nếu là check chủ động
  if (!isSilent) {
    statusText.textContent = 'Kiểm tra...';
    aiStatus.className = 'status-chip status-checking';
    allActionButtons.forEach(b => b.disabled = true);
  }

  GM_xmlhttpRequest({
    method: "POST",
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`, // v4.1: Check bằng model mới nhất
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
    onload: function(response) {
      try {
        const data = JSON.parse(response.responseText || "{}");

        if (response.status === 200 && data?.candidates) {
          // Chỉ cập nhật UI nếu là check chủ động hoặc trạng thái *trước đó* là lỗi
          if (!isSilent || aiStatus.classList.contains('status-error')) {
            statusText.textContent = 'Kết nối';
            aiStatus.className = 'status-chip status-success';
          }
          GEMINI_API_KEY = key;
          GM_setValue('geminiApiKey', key);
          apiKeySection.style.display = 'none';
          changeApiSection.style.display = 'block';
          allActionButtons.forEach(b => b.disabled = false);

          // v4.1: Khởi động interval check *chỉ khi* check thành công
          if (apiCheckInterval) clearInterval(apiCheckInterval); // Xóa interval cũ (nếu có)
          apiCheckInterval = setInterval(() => {
              if (ui.style.display !== 'none') { // Chỉ check khi panel mở
                  checkApiKey(GM_getValue('geminiApiKey', ""), true); // Check "âm thầm"
              }
          }, 15000); // 15 giây
          return;
        }

        const errMsg = data?.error?.message || "";
        const errCode = data?.error?.code || response.status;

        if (errCode === 400 && errMsg.includes("API key not valid")) {
          throw new Error("Key không hợp lệ");
        } else if (errCode === 403) {
          throw new Error("Không có quyền");
        } else if (errCode === 429) {
          throw new Error("Vượt giới hạn");
        } else if (errCode >= 500) {
          throw new Error("Lỗi máy chủ");
        } else {
          throw new Error(errMsg || "Lỗi không rõ");
        }
      } catch (e) {
        // Luôn hiển thị lỗi, dù là check "âm thầm" hay không
        statusText.textContent = e.message;
        aiStatus.className = 'status-chip status-error';
        allActionButtons.forEach(b => b.disabled = true);
        apiKeySection.style.display = 'block';
        changeApiSection.style.display = 'none';
        if (apiCheckInterval) clearInterval(apiCheckInterval); // Dừng check nếu key lỗi
        apiCheckInterval = null;
      }
    },
    onerror: function() {
      statusText.textContent = 'Lỗi mạng';
      aiStatus.className = 'status-chip status-error';
      allActionButtons.forEach(b => b.disabled = true);
      apiKeySection.style.display = 'block';
      changeApiSection.style.display = 'none';
      if (apiCheckInterval) clearInterval(apiCheckInterval); // Dừng check nếu lỗi mạng
      apiCheckInterval = null;
    }
  });
}

// === Screenshot ===
async function handleScreenshot(options = {}) {
  const imgBox = document.getElementById('imgBox');
  const imgCard = document.getElementById('imgCard');
  const ansBox = document.getElementById('ansBox');

  imgCard.style.display = 'block';
  imgBox.innerHTML = safeHTMLPolicy.createHTML(`
    <div class="loading-state compact">
      <div class="spinner small"></div>
      <p>Đang chụp...</p>
      <button id="btnCancelCapture" class="btn-cancel small">Hủy</button>
    </div>
  `);

  let cancelled = false;
  const btnCancelCapture = document.getElementById('btnCancelCapture');
  if (btnCancelCapture) {
    btnCancelCapture.onclick = () => {
      cancelled = true;
      imgCard.style.display = 'none';
      ansBox.innerHTML = safeHTMLPolicy.createHTML(`
        <div class="empty-state compact">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Đã hủy</p>
        </div>
      `);
    };
  }

  ansBox.innerHTML = safeHTMLPolicy.createHTML(`
    <div class="empty-state compact">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Chuẩn bị...</p>
    </div>
  `);

  try {
    let captureOptions = { ...options };

    if (options.x !== undefined && options.y !== undefined) {
      // v4.1: Đã bao gồm pageXOffset trong logic mousedown/mousemove
      captureOptions.x = options.x;
      captureOptions.y = options.y;
    } else {
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const canvas = await html2canvas(document.body, {
      ...captureOptions,
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff', // Đảm bảo nền trắng nếu trang không có
      scrollX: 0, // Đã xử lý scroll trong logic
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      ignoreElements: (element) => {
        // v4.1: Hàm ignore này RẤT QUAN TRỌNG
        return element.id === 'aiPanel' ||
               element.id === 'aiFloatingBtn' ||
               element.id === 'aiSnipOverlay' ||
               element.id === 'aiSnipBox' ||
               element.id === 'sizeIndicator' ||
               element.id === 'captureGuide' ||
               element.id === 'aiCustomAlert' || // Thêm alert vào ignore
               element.classList.contains('ai-screenshot-ignore');
      }
    });

    if (cancelled) return;

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    imgBox.innerHTML = safeHTMLPolicy.createHTML(`<img src="${canvas.toDataURL()}" style="cursor: pointer;" id="capturedImage">`);

    const capturedImg = document.getElementById('capturedImage');
    if (capturedImg) {
      capturedImg.onclick = () => {
        const imgWindow = window.open('', '_blank');
        imgWindow.document.write(safeHTMLPolicy.createHTML(`
          <html>
            <head>
              <title>Ảnh đã chụp</title>
              <style>
                body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body><img src="${canvas.toDataURL()}" /></body>
          </html>
        `));
      };
    }

    const prompt = createPrompt(true);
    if (prompt) {
      sendToGemini(prompt, base64);
    }
  } catch (err) {
    if (cancelled) return;
    imgBox.innerHTML = safeHTMLPolicy.createHTML(`
      <div class="error-state compact">
        <p>Lỗi: ${err.message}</p>
      </div>
    `);
    ansBox.innerHTML = safeHTMLPolicy.createHTML('');
  }
}

// === Event Handlers ===
apiKeyInput.addEventListener('blur', () => checkApiKey(apiKeyInput.value.trim()));

changeApiBtn.addEventListener('click', () => {
  apiKeySection.style.display = 'block';
  changeApiSection.style.display = 'none';
  apiKeyInput.focus();
  allActionButtons.forEach(b => b.disabled = true);
  const statusText = aiStatus.querySelector('.status-text');
  statusText.textContent = "Nhập key";
  aiStatus.className = 'status-chip status-checking';

  // v4.1: Dừng check interval khi đổi key
  if (apiCheckInterval) clearInterval(apiCheckInterval);
  apiCheckInterval = null;
});

outputModeSelect.addEventListener('change', () => {
  customPromptSection.style.display = (outputModeSelect.value === 'custom') ? 'block' : 'none';
});

btnToggleTextMode.addEventListener('click', () => {
  const isVisible = textInputSection.style.display === 'block';
  textInputSection.style.display = isVisible ? 'none' : 'block';
});

btnSendTextQuestion.addEventListener('click', () => {
  const question = textQuestionInput.value.trim();
  if (!question) {
    document.getElementById('ansBox').innerHTML = safeHTMLPolicy.createHTML(`
      <div class="error-state compact">
        <p>Nhập câu hỏi</p>
      </div>
    `);
    return;
  }
  const prompt = createPrompt(false);
  if (prompt) {
    const fullPrompt = `Câu hỏi: "${question}".\n\n${prompt}`;
    document.getElementById('imgCard').style.display = 'none';
    sendToGemini(fullPrompt, null);
  }
});

// === CSS ===
GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

* {
  box-sizing: border-box;
}

@keyframes panelEnter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes panelExit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

#aiFloatingBtn {
  position: fixed !important;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  /* v4.0: Dùng CSS variable cho màu */
  background: linear-gradient(135deg, rgba(var(--ai-primary-rgb), 0.8), rgb(var(--ai-primary-rgb)));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* v4.1: Thêm shadow để tăng contrast trên nền trắng */
  box-shadow: 0 8px 24px rgba(var(--ai-primary-rgb), 0.4), 0 2px 4px rgba(0,0,0,0.15);
  z-index: 2147483640 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: bounceIn 0.6s ease, float 3s ease-in-out infinite;
}

#aiFloatingBtn:hover {
  transform: translateY(-5px) scale(1.1);
  box-shadow: 0 12px 32px rgba(var(--ai-primary-rgb), 0.6), 0 2px 4px rgba(0,0,0,0.15);
}

#aiFloatingBtn.active {
  background: linear-gradient(135deg, rgba(var(--ai-primary-rgb), 0.6), rgba(var(--ai-primary-rgb), 0.9));
}

#aiFloatingBtn svg {
  width: 32px;
  height: 32px;
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

/*
--- 💎 v4.0: THEME & COLOR VARS 💎 ---
*/
#aiPanel {
  /* v4.0: Thiết lập CSS variables cho màu sắc */
  --ai-primary-color-hex: ${DEFAULT_PRIMARY_COLOR};
  --ai-primary-rgb: ${hexToRgb(DEFAULT_PRIMARY_COLOR)};
  --ai-devil-color-hex: ${DEFAULT_DEVIL_COLOR};
  --ai-devil-rgb: ${hexToRgb(DEFAULT_DEVIL_COLOR)};

  /* v4.0: Biến màu cho Dark Mode (Default) */
  --ai-bg-color: rgba(28, 28, 30, 0.75);
  --ai-backdrop-blur: blur(24px) saturate(180%);
  --ai-border-color: rgba(255, 255, 255, 0.12);
  --ai-text-color-main: #e4e4e7;
  --ai-text-color-light: #71717a;
  --ai-text-color-heading: #fff;
  --ai-text-color-link: #8ab4f8;
  --ai-shadow: 0 16px 50px -12px rgba(0,0,0,0.6);
  --ai-header-bg: rgba(255, 255, 255, 0.08);
  --ai-header-border: rgba(255, 255, 255, 0.1);
  --ai-btn-header-bg: rgba(255,255,255,0.1);
  --ai-btn-header-bg-hover: rgba(255,255,255,0.2);
  --ai-status-bg: rgba(255,255,255,0.1);
  --ai-scroll-thumb: rgba(255,255,255,0.15);
  --ai-scroll-thumb-hover: rgba(255,255,255,0.25);
  --ai-devil-bg: rgba(255,255,255,0.05);
  --ai-devil-bg-hover: rgba(255,255,255,0.1);
  --ai-devil-border: rgba(255,255,255,0.1);
  --ai-devil-border-hover: rgba(255,255,255,0.15);
  --ai-devil-thumb-bg: #fff;
  --ai-devil-track-bg: rgba(255,255,255,0.2);
  --ai-select-card-bg: rgba(255,255,255,0.05);
  --ai-select-card-border: rgba(255,255,255,0.1);
  --ai-select-card-hover-bg: rgba(255,255,255,0.1);
  --ai-select-card-hover-border: rgba(255,255,255,0.15);
  --ai-select-dropdown-bg: #2a2a2a;
  --ai-input-bg: rgba(255,255,255,0.05);
  --ai-input-border: rgba(255,255,255,0.1);
  --ai-input-focus-bg: rgba(255,255,255,0.08);
  --ai-input-label-bg: rgba(28, 28, 30, 0.9);
  --ai-btn-secondary-bg: rgba(255,255,255,0.1);
  --ai-btn-secondary-border: rgba(255, 255, 255, 0.15);
  --ai-btn-secondary-hover-bg: rgba(255,255,255,0.15);
  --ai-btn-secondary-hover-border: rgba(255, 255, 255, 0.2);
  --ai-btn-text-hover-bg: rgba(138, 180, 248, 0.1);
  --ai-result-card-bg: rgba(255,255,255,0.03);
  --ai-result-card-border: rgba(255,255,255,0.06);
  --ai-result-card-hover-border: rgba(255,255,255,0.1);
  --ai-result-header-bg: rgba(255,255,255,0.04);
  --ai-result-header-border: rgba(255,255,255,0.06);
  --ai-btn-copy-bg: rgba(255,255,255,0.08);
  --ai-btn-copy-hover-bg: rgba(138, 180, 248, 0.2);
  --ai-img-shadow: 0 2px 8px rgba(0,0,0,0.3);
  --ai-img-hover-shadow: 0 4px 16px rgba(0,0,0,0.5);
  --ai-empty-svg-color: #52525b;
  --ai-settings-divider: rgba(255, 255, 255, 0.1);
}

/* v4.0: Light Mode Theme */
#aiPanel.ai-panel-light {
  --ai-bg-color: rgba(248, 249, 250, 0.9); /* Sáng, hơi trong */
  --ai-backdrop-blur: blur(20px) saturate(180%);
  --ai-border-color: rgba(0, 0, 0, 0.1);
  --ai-text-color-main: #3c4043;
  --ai-text-color-light: #5f6368;
  --ai-text-color-heading: #202124;
  --ai-text-color-link: rgb(var(--ai-primary-rgb));
  --ai-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
  --ai-header-bg: rgba(0, 0, 0, 0.03);
  --ai-header-border: rgba(0, 0, 0, 0.08);
  --ai-btn-header-bg: rgba(0,0,0,0.06);
  --ai-btn-header-bg-hover: rgba(0,0,0,0.1);
  --ai-status-bg: rgba(0,0,0,0.05);
  --ai-scroll-thumb: rgba(0,0,0,0.15);
  --ai-scroll-thumb-hover: rgba(0,0,0,0.25);
  --ai-devil-bg: rgba(0,0,0,0.03);
  --ai-devil-bg-hover: rgba(0,0,0,0.06);
  --ai-devil-border: rgba(0,0,0,0.08);
  --ai-devil-border-hover: rgba(0,0,0,0.12);
  --ai-devil-thumb-bg: #fff;
  --ai-devil-track-bg: rgba(0,0,0,0.1);
  --ai-select-card-bg: rgba(0,0,0,0.03);
  --ai-select-card-border: rgba(0,0,0,0.08);
  --ai-select-card-hover-bg: rgba(0,0,0,0.06);
  --ai-select-card-hover-border: rgba(0,0,0,0.12);
  --ai-select-dropdown-bg: #fff;
  --ai-input-bg: rgba(0,0,0,0.03);
  --ai-input-border: rgba(0,0,0,0.1);
  --ai-input-focus-bg: rgba(0,0,0,0.04);
  --ai-input-label-bg: rgba(248, 249, 250, 0.95);
  --ai-btn-secondary-bg: rgba(0,0,0,0.05);
  --ai-btn-secondary-border: rgba(0, 0, 0, 0.1);
  --ai-btn-secondary-hover-bg: rgba(0,0,0,0.08);
  --ai-btn-secondary-hover-border: rgba(0, 0, 0, 0.12);
  --ai-btn-text-hover-bg: rgba(var(--ai-primary-rgb), 0.1);
  --ai-result-card-bg: rgba(255,255,255, 0.7);
  --ai-result-card-border: rgba(0,0,0,0.06);
  --ai-result-card-hover-border: rgba(0,0,0,0.1);
  --ai-result-header-bg: rgba(0,0,0,0.02);
  --ai-result-header-border: rgba(0,0,0,0.06);
  --ai-btn-copy-bg: rgba(0,0,0,0.06);
  --ai-btn-copy-hover-bg: rgba(var(--ai-primary-rgb), 0.15);
  --ai-img-shadow: 0 2px 8px rgba(0,0,0,0.1);
  --ai-img-hover-shadow: 0 4px 16px rgba(0,0,0,0.15);
  --ai-empty-svg-color: #bdc1c6;
  --ai-settings-divider: rgba(0, 0, 0, 0.1);
}

/*
--- 💎 UI OVERHAUL (v4.0 CSS Vars) 💎 ---
*/

#aiPanel {
  position: fixed !important;
  top: 20px;
  right: 20px;
  width: 280px;

  /* v4.0: Dùng theme vars */
  background: var(--ai-bg-color);
  backdrop-filter: var(--ai-backdrop-blur);
  -webkit-backdrop-filter: var(--ai-backdrop-blur);
  border: 1px solid var(--ai-border-color);
  color: var(--ai-text-color-main);
  box-shadow: var(--ai-shadow);

  z-index: 2147483641 !important;
  border-radius: 14px;
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  display: none;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, height;
}

#aiPanel.minimized {
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
  transition: width 0.3s ease, height 0.3s ease, transform 0.3s ease, opacity 0.3s ease;
}
#aiPanel.ai-panel-light.minimized {
    box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
}

#aiPanel.minimized .ai-content {
  display: none !important;
}

#aiPanel.dragging {
  transition: none;
  cursor: grabbing !important;
  box-shadow: 0 16px 64px rgba(0,0,0,0.7), 0 0 0 2px rgba(var(--ai-primary-rgb), 0.4);
}
#aiPanel.ai-panel-light.dragging {
    box-shadow: 0 16px 64px rgba(0,0,0,0.3), 0 0 0 2px rgba(var(--ai-primary-rgb), 0.4);
}

#aiPanel.devil-active {
  box-shadow: 0 12px 48px rgba(var(--ai-devil-rgb), 0.5), 0 0 0 2px rgba(var(--ai-devil-rgb), 0.4);
}

#aiPanel.devil-active .ai-header {
  background: rgba(var(--ai-devil-rgb), 0.2);
  border-bottom: 1px solid rgba(var(--ai-devil-rgb), 0.3);
}

.ai-header {
  background: var(--ai-header-bg);
  padding: 12px 14px;
  border-radius: 14px 14px 0 0;
  cursor: move;
  user-select: none;
  transition: all 0.3s ease;
  border-bottom: 1px solid var(--ai-header-border);
}

#aiPanel.minimized .ai-header {
  border-bottom: none;
  border-radius: 14px;
}

#aiPanel.dragging .ai-header {
  background: rgba(var(--ai-primary-rgb), 0.15);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: var(--ai-text-color-heading);
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.header-text {
  flex: 1;
}

.header-text h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ai-text-color-heading);
  letter-spacing: -0.3px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
#aiPanel.ai-panel-light .header-text h2 {
    text-shadow: none;
}

/* v4.0: Đổi tên .btn-minimize/resize -> .btn-header */
.btn-header {
  background: var(--ai-btn-header-bg);
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  color: var(--ai-text-color-main);
  font-size: 18px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}
.btn-header svg { /* v4.0: Thêm style cho icon Cài đặt */
    width: 18px;
    height: 18px;
}
.btn-header:not(#btnMinimize) { /* v4.0: Fix font-size cho nút resize */
    font-size: 18px;
}
#btnMinimize {
    font-size: 20px;
    line-height: 1;
}

.btn-header:hover {
  background: var(--ai-btn-header-bg-hover);
  transform: scale(1.08);
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  cursor: nwse-resize;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(var(--ai-primary-rgb), 0.2);
  border-bottom: 2px solid rgba(var(--ai-primary-rgb), 0.2);
  transition: all 0.2s ease;
}

.resize-handle:hover::after,
#aiPanel.resizing .resize-handle::after {
  border-color: rgba(var(--ai-primary-rgb), 0.7);
}

#aiPanel.resizing {
  transition: none;
  user-select: none;
}
#aiPanel.resizing * {
  cursor: inherit !important;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 4px 10px;
  background: var(--ai-status-bg);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.3s ease;
  color: var(--ai-text-color-light); /* v4.0: Dùng var */
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-text-color-light); /* v4.0: Dùng var */
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.status-chip.status-success {
  background: rgba(52, 168, 83, 0.25);
  color: #81c995;
}
.status-chip.status-success .status-dot {
  background: #81c995;
  box-shadow: 0 0 6px #81c995;
}
.status-chip.status-error {
  background: rgba(234, 67, 53, 0.25);
  color: #f28b82;
}
.status-chip.status-error .status-dot {
  background: #f28b82;
  animation: none;
}
.status-chip.status-checking {
  background: rgba(251, 188, 5, 0.25);
  color: #fdd663;
}

.ai-content {
  padding: 12px;
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-content::-webkit-scrollbar { width: 4px; }
.ai-content::-webkit-scrollbar-track { background: transparent; }
.ai-content::-webkit-scrollbar-thumb {
  background: var(--ai-scroll-thumb);
  border-radius: 2px;
}
.ai-content::-webkit-scrollbar-thumb:hover {
  background: var(--ai-scroll-thumb-hover);
}

.section {
  margin-bottom: 12px;
}

/* v4.0: CSS Cài đặt */
#settingsSection {
    border-bottom: 1px solid var(--ai-settings-divider);
    padding-bottom: 12px;
}
.settings-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ai-text-color-heading);
    margin: 0 0 14px 0;
}
.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}
.setting-item label {
    font-size: 13px;
    color: var(--ai-text-color-light);
    flex: 1;
}
.setting-item .select-card {
    width: 140px;
    margin: 0;
}
.color-picker {
    width: 140px;
    height: 36px;
    border: 1px solid var(--ai-select-card-border);
    border-radius: 8px;
    background: var(--ai-select-card-bg);
    cursor: pointer;
    padding: 2px 4px;
}
.settings-divider {
    border: none;
    height: 1px;
    background: var(--ai-settings-divider);
    margin: 16px 0 4px 0;
}

.devil-mode-section {
  margin-bottom: 12px;
}

.btn-devil.compact {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--ai-devil-bg);
  border: 1.5px solid var(--ai-devil-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', sans-serif;
}

.btn-devil.compact:hover {
  background: var(--ai-devil-bg-hover);
  border-color: var(--ai-devil-border-hover);
  transform: translateY(-2px);
}

.btn-devil.active {
  background: rgba(var(--ai-devil-rgb), 0.15);
  border-color: rgba(var(--ai-devil-rgb), 0.5);
  box-shadow: 0 0 16px rgba(var(--ai-devil-rgb), 0.3);
  animation: devilPulse 2s ease-in-out infinite;
}
@keyframes devilPulse {
  0%, 100% { box-shadow: 0 0 16px rgba(var(--ai-devil-rgb), 0.3); }
  50% { box-shadow: 0 0 24px rgba(var(--ai-devil-rgb), 0.5); }
}

.devil-icon {
  font-size: 22px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.btn-devil.active .devil-icon {
  animation: devilShake 0.5s ease infinite;
}
@keyframes devilShake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.devil-text { flex: 1; display: flex; align-items: center; }
.devil-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ai-text-color-main);
  transition: color 0.3s;
}
.btn-devil.active .devil-title {
  color: rgb(var(--ai-devil-rgb));
}
#aiPanel.ai-panel-light .btn-devil.active .devil-title {
    color: rgb(var(--ai-devil-rgb)); /* Giữ màu đỏ cho text */
}

.devil-toggle { position: relative; flex-shrink: 0; }
.devil-toggle-track {
  width: 36px;
  height: 18px;
  background: var(--ai-devil-track-bg);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s ease;
}
.btn-devil.active .devil-toggle-track {
  background: rgb(var(--ai-devil-rgb));
}
.devil-toggle-thumb {
  width: 14px;
  height: 14px;
  background: var(--ai-devil-thumb-bg);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.btn-devil.active .devil-toggle-thumb {
  left: 20px;
  box-shadow: 0 0 8px rgba(var(--ai-devil-rgb), 0.5);
}

.select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.select-card.compact {
  position: relative;
  background: var(--ai-select-card-bg);
  border: 1px solid var(--ai-select-card-border);
  border-radius: 8px;
  padding: 0;
  transition: all 0.2s ease;
  overflow: hidden;
}

.select-card.compact:hover {
  background: var(--ai-select-card-hover-bg);
  border-color: var(--ai-select-card-hover-border);
  transform: translateY(-1px);
}

.select-card.compact.full {
  grid-column: 1 / -1;
}

.material-select {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--ai-text-color-main);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  appearance: none;
  font-weight: 500;
  outline: none;
}

/* v4.1: Style cho option disabled */
.material-select option:disabled {
    color: var(--ai-text-color-light);
    font-style: italic;
    background: rgba(0,0,0,0.1);
}

.material-select option {
  background: var(--ai-select-dropdown-bg);
  color: var(--ai-text-color-main);
  padding: 8px;
}

.input-field.compact {
  position: relative;
  margin-bottom: 4px;
}

.input-field.compact input,
.input-field.compact textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--ai-input-border);
  border-radius: 8px;
  background: var(--ai-input-bg);
  color: var(--ai-text-color-main);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.input-field.compact textarea {
  resize: vertical;
  min-height: 50px;
}

.input-field.compact input:focus,
.input-field.compact textarea:focus {
  background: var(--ai-input-focus-bg);
  border-color: rgb(var(--ai-primary-rgb));
  box-shadow: 0 0 0 3px rgba(var(--ai-primary-rgb), 0.2);
  transform: translateY(-1px);
}

.input-field.compact input:focus + label,
.input-field.compact textarea:focus + label,
.input-field.compact input:not(:placeholder-shown) + label,
.input-field.compact textarea:not(:placeholder-shown) + label {
  transform: translateY(-22px) scale(0.85);
  color: rgb(var(--ai-primary-rgb));
}

.input-field.compact label {
  position: absolute;
  left: 12px;
  top: 10px;
  font-size: 13px;
  color: var(--ai-text-color-light);
  pointer-events: none;
  transition: all 0.2s ease;
  transform-origin: left top;
  background: var(--ai-input-label-bg);
  padding: 0 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transform: translate(-50%, -50%);
  transition: width 0.5s, height 0.5s;
}
.btn:active::before { width: 300px; height: 300px; }
.btn svg { width: 16px; height: 16px; position: relative; z-index: 1; flex-shrink: 0; }
.btn span { position: relative; z-index: 1; }
.btn-compact { padding: 9px 14px; font-size: 12px; }
.btn-small { padding: 6px 12px; font-size: 11px; }

.btn-primary {
  background: rgb(var(--ai-primary-rgb));
  color: #fff;
  box-shadow: 0 2px 8px rgba(var(--ai-primary-rgb), 0.3);
}
.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(var(--ai-primary-rgb), 0.5);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--ai-btn-secondary-bg);
  color: var(--ai-text-color-main);
  border: 1px solid var(--ai-btn-secondary-border);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--ai-btn-secondary-hover-bg);
  border-color: var(--ai-btn-secondary-hover-border);
  transform: translateY(-1px);
}

.btn-text {
  background: transparent;
  color: var(--ai-text-color-link);
  padding: 6px 12px;
}
.btn-text:hover:not(:disabled) {
  background: var(--ai-btn-text-hover-bg);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}
.btn.full-width {
  width: 100%;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.result-section {
  margin-top: 12px;
}

.result-card.compact {
  background: var(--ai-result-card-bg);
  border: 1px solid var(--ai-result-card-border);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
}
.result-card.compact:hover {
  border-color: var(--ai-result-card-hover-border);
}
.card-header.compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--ai-result-header-bg);
  border-bottom: 1px solid var(--ai-result-header-border);
  font-weight: 500;
  font-size: 12px;
  color: var(--ai-text-color-link);
  position: relative;
}
.card-header.compact svg {
  width: 16px;
  height: 16px;
  color: var(--ai-text-color-link);
  flex-shrink: 0;
}

.btn-copy {
  margin-left: auto;
  background: var(--ai-btn-copy-bg);
  border: none;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  padding: 0;
  cursor: pointer;
  display: none; /* Ẩn mặc định, JS sẽ hiện */
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--ai-text-color-link);
}
/* v4.1: Nút Dừng Gõ */
#btnCancelTyping {
    margin-left: auto; /* Đẩy về bên phải */
    margin-right: 6px; /* Khoảng cách với nút copy */
    color: rgb(var(--ai-devil-rgb)); /* Màu đỏ */
}
#btnCancelTyping:hover {
    background: rgba(var(--ai-devil-rgb), 0.15);
}
/* v4.1: Nút Copy */
#btnCopy {
    margin-left: 0; /* Reset margin-left khi có nút Dừng */
}

.btn-copy:hover {
  background: var(--ai-btn-copy-hover-bg);
  transform: scale(1.1);
}
.btn-copy.copied { /* v4.0: Style 'copied' */
    background: rgba(52, 168, 83, 0.2);
    color: #81c995;
}
.btn-copy svg {
  width: 14px;
  height: 14px;
}

.card-content.compact {
  padding: 12px;
  min-height: 50px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ai-text-color-main);
  font-family: 'Inter', sans-serif;
  max-height: 500px;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.card-content.compact::-webkit-scrollbar { width: 4px; }
.card-content.compact::-webkit-scrollbar-track { background: var(--ai-result-card-bg); }
.card-content.compact::-webkit-scrollbar-thumb {
  background: var(--ai-scroll-thumb);
  border-radius: 2px;
}
.card-content.compact::-webkit-scrollbar-thumb:hover {
  background: var(--ai-scroll-thumb-hover);
}
.card-content.compact img {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 6px;
  box-shadow: var(--ai-img-shadow);
  cursor: pointer;
  transition: all 0.3s ease;
}
.card-content.compact img:hover {
  transform: scale(1.02);
  box-shadow: var(--ai-img-hover-shadow);
}

.card-content.compact .katex { font-size: 1.1em; }
.card-content.compact .katex-display {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 0;
}
.card-content.compact .katex-display::-webkit-scrollbar { height: 4px; }
.card-content.compact .katex-display::-webkit-scrollbar-thumb {
  background: var(--ai-scroll-thumb);
  border-radius: 2px;
}

.empty-state.compact,
.loading-state.compact,
.error-state.compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  text-align: center;
}
.empty-state.compact svg,
.loading-state.compact svg,
.error-state.compact svg {
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
  color: var(--ai-empty-svg-color);
}
.empty-state.compact p,
.loading-state.compact p {
  margin: 0;
  color: var(--ai-text-color-light);
  font-size: 12px;
}
.error-state.compact {
  color: #f28b82;
}
.error-state.compact svg {
  color: #f28b82;
}
.error-state.compact p {
  margin: 0;
  font-size: 12px;
  color: var(--ai-text-color-light);
}

.spinner.small {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(var(--ai-primary-rgb), 0.2);
  border-top-color: rgb(var(--ai-primary-rgb));
  border-radius: 50%;
  animation: spin 1.2s ease-in-out infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-cancel.small {
  margin-top: 10px;
  padding: 6px 14px;
  background: rgba(234, 67, 53, 0.12);
  border: 1px solid rgba(234, 67, 53, 0.25);
  border-radius: 6px;
  color: #f28b82;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}
.btn-cancel.small:hover {
  background: rgba(234, 67, 53, 0.2);
  border-color: rgba(234, 67, 53, 0.4);
  transform: translateY(-1px);
}

#aiPanel.minimized .header-content {
    flex-wrap: wrap;
    gap: 8px;
}
#aiPanel.minimized .header-text {
    flex: 1 1 auto;
    min-width: 100px;
}
#aiPanel.minimized .status-chip {
    margin-top: 0;
    flex-basis: 100%;
    order: 99;
    justify-content: center;
    background: var(--ai-header-bg); /* v4.0: Dùng var */
}

/* --- SNIP MODE (v4.1 FIX) --- */
#aiSnipOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* v4.1: Giảm độ tối, giữ hiệu ứng glass */
  background: rgba(0,0,0,0.3);
  z-index: 2147483646;
  display: none;
  cursor: crosshair;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

#aiSnipBox {
  position: fixed;
  border: 2px solid rgb(var(--ai-primary-rgb));
  background: rgba(var(--ai-primary-rgb), 0.1);
  z-index: 2147483647;
  display: none;
  pointer-events: none;
  /* v4.1: Bỏ box-shadow 9999px (nguyên nhân gây mờ) */
  box-shadow: 0 0 0 1px rgba(255,255,255,0.5);
  transition: none;
}

#aiSnipBox::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px dashed rgba(255,255,255,0.6);
  pointer-events: none;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -20;
  }
}

#sizeIndicator {
  position: fixed;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.9);
  color: #fff;
  padding: 8px 18px;
  border-radius: 8px;
  font-family: 'Inter', monospace;
  font-size: 14px;
  font-weight: 500;
  z-index: 2147483648;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

#captureGuide {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.95);
  color: #fff;
  padding: 20px 30px;
  border-radius: 12px;
  z-index: 2147483648;
  text-align: center;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 12px 48px rgba(0,0,0,0.7);
  backdrop-filter: blur(10px);
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

#captureGuide h3 {
  margin: 0 0 10px 0;
  font-size: 17px;
  font-weight: 600;
}

#captureGuide p {
  margin: 0 0 14px 0;
  font-size: 13px;
  color: #a1a1aa;
}

#cancelCaptureMode {
  background: rgb(var(--ai-devil-rgb)); /* v4.0: Dùng màu devil */
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

#cancelCaptureMode:hover {
  background: rgba(var(--ai-devil-rgb), 0.8);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--ai-devil-rgb), 0.5);
}

/* v4.1: CSS cho Custom Alert */
#aiCustomAlert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--ai-bg-color, rgba(28, 28, 30, 0.85));
    backdrop-filter: var(--ai-backdrop-blur, blur(10px));
    border: 1px solid var(--ai-border-color, rgba(255, 255, 255, 0.1));
    color: var(--ai-text-color-main, #e4e4e7);
    box-shadow: var(--ai-shadow, 0 16px 50px -12px rgba(0,0,0,0.6));
    z-index: 2147483649; /* Cao nhất */
    border-radius: 12px;
    padding: 20px;
    font-family: 'Inter', sans-serif;
    display: none;
    animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: center;
    max-width: 300px;
}
#aiPanel.ai-panel-light #aiCustomAlert {
    background: var(--ai-bg-color, rgba(248, 249, 250, 0.9));
    color: var(--ai-text-color-main, #3c4043);
    border-color: var(--ai-border-color, rgba(0, 0, 0, 0.1));
    box-shadow: var(--ai-shadow, 0 10px 40px -10px rgba(0,0,0,0.2));
}
#aiCustomAlert p {
    margin: 0 0 16px 0;
    font-size: 14px;
    line-height: 1.6;
}
#aiCustomAlert button {
    background: rgb(var(--ai-primary-rgb));
    color: #fff;
    border: none;
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
}
#aiCustomAlert button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--ai-primary-rgb), 0.5);
}

@media (max-width: 480px) {
  #aiPanel {
    width: calc(100vw - 32px);
    left: 16px;
    right: 16px;
  }
  .select-grid { grid-template-columns: 1fr; }
  .action-buttons { grid-template-columns: 1fr; }
  #aiFloatingBtn {
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
  }
}
`);

// === Overlay và Chụp ảnh ===
const overlay = document.createElement('div');
overlay.id = 'aiSnipOverlay';
document.body.appendChild(overlay);

const snipBox = document.createElement('div');
snipBox.id = 'aiSnipBox';
document.body.appendChild(snipBox);

let selecting = false, startX, startY, endX, endY;

btnShot.onclick = () => {
  selecting = true;
  overlay.style.display = 'block';
  snipBox.style.display = 'none';
  ui.style.display = 'none'; // Ẩn panel chính

  const guide = document.createElement('div');
  guide.id = 'captureGuide';

  const h3 = document.createElement('h3');
  h3.textContent = '📸 Chế độ chụp vùng';
  const p = document.createElement('p');
  p.textContent = 'Nhấn và kéo chuột để chọn vùng cần chụp';
  const btn = document.createElement('button');
  btn.id = 'cancelCaptureMode';
  btn.textContent = '✕ Hủy (ESC)';

  guide.appendChild(h3);
  guide.appendChild(p);
  guide.appendChild(btn);
  document.body.appendChild(guide);

  const cancelBtn = document.getElementById('cancelCaptureMode');
  if (cancelBtn) {
    cancelBtn.onclick = cancelCapture;
  }

  setTimeout(() => {
    if (guide && guide.parentNode) {
      guide.style.transition = 'opacity 0.3s ease';
      guide.style.opacity = '0';
      setTimeout(() => guide.remove(), 300);
    }
  }, 3000);
};

function cancelCapture() {
  selecting = false;
  overlay.style.display = 'none';
  snipBox.style.display = 'none';
  ui.style.display = 'block'; // Hiện lại panel
  startX = startY = endX = endY = undefined;

  const guide = document.getElementById('captureGuide');
  if (guide) guide.remove();

  const indicator = document.getElementById('sizeIndicator');
  if (indicator) indicator.remove();
}

// === Trình nghe sự kiện keydown (vẫn dùng Shift Phải) ===
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selecting) {
    cancelCapture();
    return;
  }

  const targetNode = e.target.nodeName;
  if (targetNode === 'INPUT' || targetNode === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }

  if (e.code === 'ShiftRight') {
    toggleUIVisibility();
  }
});

btnFullPage.onclick = () => {
  ui.style.display = 'none'; // Ẩn panel
  setTimeout(() => {
    handleScreenshot({}).finally(() => {
      ui.style.display = 'block'; // Hiện lại panel
    });
  }, 150);
};

overlay.addEventListener('mousedown', e => {
  if (!selecting) return;

  const guide = document.getElementById('captureGuide');
  if (guide) {
    guide.style.opacity = '0';
    setTimeout(() => guide.remove(), 200);
  }

  // v4.1: Luôn lấy tọa độ gốc bao gồm cả scroll
  startX = e.clientX + window.pageXOffset;
  startY = e.clientY + window.pageYOffset;

  // v4.1: Vị trí box thì không cần scroll
  snipBox.style.left = e.clientX + 'px';
  snipBox.style.top = e.clientY + 'px';
  snipBox.style.width = '0px';
  snipBox.style.height = '0px';
  snipBox.style.display = 'block';

  updateSizeIndicator(0, 0);
});

overlay.addEventListener('mousemove', e => {
  if (!selecting || startX === undefined) return;

  // v4.1: Luôn lấy tọa độ cuối bao gồm cả scroll
  endX = e.clientX + window.pageXOffset;
  endY = e.clientY + window.pageYOffset;

  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // v4.1: Cập nhật vị trí box (đã trừ đi scroll)
  snipBox.style.left = (left - window.pageXOffset) + 'px';
  snipBox.style.top = (top - window.pageYOffset) + 'px';
  snipBox.style.width = width + 'px';
  snipBox.style.height = height + 'px';

  updateSizeIndicator(width, height);
});

function updateSizeIndicator(width, height) {
  let indicator = document.getElementById('sizeIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'sizeIndicator';
    document.body.appendChild(indicator);
  }
  indicator.textContent = `📐 ${Math.round(width)} × ${Math.round(height)} px`;
  indicator.style.display = width > 0 ? 'block' : 'none';
}

overlay.addEventListener('mouseup', async e => {
  if (!selecting || startX === undefined) return;

  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  selecting = false;
  overlay.style.display = 'none';
  snipBox.style.display = 'none';
  ui.style.display = 'block'; // Hiện lại panel
  startX = startY = endX = endY = undefined;

  const indicator = document.getElementById('sizeIndicator');
  if (indicator) indicator.remove();

  if (width < 10 || height < 10) {
    showCustomAlert('⚠️ Vùng chọn quá nhỏ! Vui lòng chọn vùng lớn hơn.');
    return;
  }

  // v4.1: Truyền tọa độ tuyệt đối (đã bao gồm scroll) vào handleScreenshot
  handleScreenshot({ x: left, y: top, width: width, height: height });
});

// === v4.1: Typing Effect (có thể Dừng) ===
function typeEffectWithMath(el, text, speed = 5) {
  currentAnswerText = text; // Lưu toàn bộ text để copy
  btnCopy.style.display = 'none'; // Ẩn nút copy
  btnCancelTyping.style.display = 'flex'; // Hiện nút dừng
  isTyping = true;

  if (currentTypingTimeout) {
      clearTimeout(currentTypingTimeout); // Xóa timeout cũ nếu có
  }

  el.innerHTML = safeHTMLPolicy.createHTML(""); // Xóa nội dung cũ
  let i = 0;
  let currentHTML = "";
  let stopTyping = false;

  btnCancelTyping.onclick = () => {
      stopTyping = true;
  };

  function typing() {
    // Dừng nếu:
    // 1. Đã nhấn nút Dừng
    // 2. Đã gõ xong
    if (stopTyping || i >= text.length) {
        el.innerHTML = safeHTMLPolicy.createHTML(text); // Hiển thị toàn bộ text
        renderMathInElement(el); // Render KaTeX lần cuối
        btnCancelTyping.style.display = 'none'; // Ẩn nút dừng
        btnCopy.style.display = 'flex'; // Hiện nút copy
        isTyping = false;
        if(currentTypingTimeout) clearTimeout(currentTypingTimeout);
        return; // Kết thúc
    }

    // Gõ ký tự tiếp theo
    currentHTML += text.charAt(i++);
    el.innerHTML = safeHTMLPolicy.createHTML(currentHTML);

    // Tự động cuộn xuống
    el.scrollTop = el.scrollHeight;

    // Render KaTeX định kỳ để không bị giật
    if (i % 50 === 0) {
        renderMathInElement(el);
    }

    // Lên lịch gõ ký tự tiếp theo
    currentTypingTimeout = setTimeout(typing, speed);
  }

  typing(); // Bắt đầu gõ
}


// === Dragging ===
let dragging = false, dragOffset = {x:0, y:0};
const header = ui.querySelector('.ai-header');

header.addEventListener('mousedown', e => {
  if (e.target.closest('.btn-header')) return; // v4.0: Cập nhật class

  dragging = true;
  dragOffset.x = e.clientX - ui.offsetLeft;
  dragOffset.y = e.clientY - ui.offsetTop;
  ui.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (dragging) {
    const newLeft = e.clientX - dragOffset.x;
    const newTop = e.clientY - dragOffset.y;

    const maxLeft = window.innerWidth - ui.offsetWidth;
    const maxTop = window.innerHeight - ui.offsetHeight;

    ui.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
    ui.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    ui.style.right = 'auto';
  }
});

document.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    ui.classList.remove('dragging');
  }
});

// === Init ===
// v4.0: Áp dụng settings đã lưu khi load
updateCssVariables(SAVED_PRIMARY_COLOR, SAVED_DEVIL_COLOR);
applyTheme(SAVED_THEME);
themeSelect.value = SAVED_THEME;

// Kiểm tra API key (hàm này sẽ tự khởi động interval check)
checkApiKey(GEMINI_API_KEY);

})();
