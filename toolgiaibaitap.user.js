// ==UserScript==
// @name         AI Giải Bài Tập - Improved
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  AI studio - Material Design (Compact & Smooth)
// @author       Tran Minh Dung
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js
// ==/UserScript==

(async function() {
'use strict';

let GEMINI_API_KEY = GM_getValue('geminiApiKey', "");
let DEVIL_MODE = false;

const DEVIL_PROMPT = `
Bạn là một AI trợ giúp học tập cực kỳ thông minh và chi tiết.
Hãy giải thích mọi thứ một cách sâu sắc, phân tích từng bước,
đưa ra nhiều cách giải khác nhau, và giải thích tại sao mỗi bước lại đúng.
Không bỏ qua bất kỳ chi tiết nào, dù là nhỏ nhất.
`;

// === UI Material Design - COMPACT VERSION ===
const ui = document.createElement('div');
ui.id = 'aiPanel';
ui.innerHTML = `
  <div class="ai-header">
    <div class="header-content">
      <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.6"/>
        <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="currentColor"/>
      </svg>
      <div class="header-text">
        <h2>AI Giải Bài Tập</h2>
      </div>
      <button class="btn-resize" id="btnResize" title="Thay đổi kích thước">⇲</button>
      <button class="btn-minimize" id="btnMinimize" title="Thu gọn">−</button>
    </div>
    <div class="status-chip" id="aiStatus">
      <span class="status-dot"></span>
      <span class="status-text">Ready</span>
    </div>
  </div>

  <div class="ai-content" id="aiContent">
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
          <select id="modelSelect" class="material-select">
            <option value="gemini-flash-latest">⚡ Flash</option>
            <option value="gemini-2.5-pro">💎 Pro 2.5</option>
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
`;
document.body.appendChild(ui);

// === Lấy các phần tử DOM ===
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
const resizeHandle = document.getElementById('resizeHandle');
const aiContent = document.getElementById('aiContent');
const allActionButtons = [btnShot, btnFullPage, btnToggleTextMode];

let currentRequest = null;
let isMinimized = false;
let currentAnswerText = '';

// === Copy functionality ===
btnCopy.addEventListener('click', async (e) => {
  e.stopPropagation();
  
  if (!currentAnswerText) return;
  
  try {
    await navigator.clipboard.writeText(currentAnswerText);
    
    // Visual feedback
    const originalHTML = btnCopy.innerHTML;
    btnCopy.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    btnCopy.style.background = 'rgba(52, 168, 83, 0.2)';
    btnCopy.style.color = '#81c995';
    
    setTimeout(() => {
      btnCopy.innerHTML = originalHTML;
      btnCopy.style.background = '';
      btnCopy.style.color = '';
    }, 1500);
  } catch (err) {
    console.error('Copy failed:', err);
    alert('⚠️ Không thể copy. Vui lòng chọn và copy thủ công.');
  }
});

// === Resize Functionality - IMPROVED ===
let isResizing = false;
let resizeType = 'none'; // none, corner, right, bottom
let startResizeX, startResizeY, startWidth, startHeight;

// Load saved size
const savedWidth = GM_getValue('panelWidth', 280);
const savedHeight = GM_getValue('panelHeight', 'auto');

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
    btnResize.textContent = '⇱';
  } else if (currentWidth <= 450) {
    ui.style.width = '650px';
    btnResize.textContent = '⇱';
  } else {
    ui.style.width = '280px';
    btnResize.textContent = '⇲';
  }
  
  GM_setValue('panelWidth', parseInt(ui.style.width));
});

// Enhanced resize handle with multiple resize zones
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

// Add right edge resize
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

// Update mousemove cursor feedback
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
      
      GM_setValue('panelWidth', newWidth);
      GM_setValue('panelHeight', newHeight);
    } else if (resizeType === 'right') {
      const newWidth = Math.max(280, Math.min(1000, startWidth + (e.clientX - startResizeX)));
      ui.style.width = newWidth + 'px';
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

// === Minimize Toggle ===
btnMinimize.addEventListener('click', (e) => {
  e.stopPropagation();
  isMinimized = !isMinimized;
  
  if (isMinimized) {
    aiContent.style.maxHeight = '0';
    aiContent.style.opacity = '0';
    btnMinimize.textContent = '+';
    ui.style.width = '200px';
  } else {
    aiContent.style.maxHeight = '600px';
    aiContent.style.opacity = '1';
    btnMinimize.textContent = '−';
    ui.style.width = '280px';
  }
});

// === Devil Mode Toggle ===
btnDevilMode.addEventListener('click', () => {
  DEVIL_MODE = !DEVIL_MODE;
  btnDevilMode.classList.toggle('active', DEVIL_MODE);
  
  if (DEVIL_MODE) {
    ui.classList.add('devil-active');
  } else {
    ui.classList.remove('devil-active');
  }
});

// === Hàm Gửi Yêu Cầu Đến Gemini ===
function sendToGemini(prompt, base64Image = null) {
    const model = document.getElementById('modelSelect').value;
    const ansBox = document.getElementById('ansBox');
    const imgBox = document.getElementById('imgBox');
    const imgCard = document.getElementById('imgCard');

    if (DEVIL_MODE) {
      prompt = DEVIL_PROMPT + "\n\n" + prompt;
    }

    prompt += "\n\nLƯU Ý QUAN TRỌNG: Nếu bạn không thể trả lời câu hỏi (do thiếu thông tin, không rõ ràng, hoặc nằm ngoài khả năng), hãy thẳng thắn nói 'Tôi không thể trả lời câu hỏi này' và giải thích lý do. KHÔNG bịa đặt hoặc đoán mò thông tin.";

    ansBox.innerHTML = `
      <div class="loading-state compact">
        <div class="spinner small"></div>
        <p>Đang xử lý...</p>
        <button id="btnCancelRequest" class="btn-cancel small">Hủy</button>
      </div>
    `;

    const btnCancel = document.getElementById('btnCancelRequest');
    if (btnCancel) {
      btnCancel.onclick = () => {
        if (currentRequest) {
          currentRequest.abort();
          ansBox.innerHTML = `
            <div class="empty-state compact">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p>Đã hủy</p>
            </div>
          `;
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

          typeEffect(ansBox, result.trim());
        } catch (err) {
          ansBox.innerHTML = `
            <div class="error-state compact">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              <p>${err.message || "Lỗi API"}</p>
            </div>
          `;
          console.error("Lỗi Gemini:", r.responseText);
        }
      },
      onerror: err => {
        currentRequest = null;
        ansBox.innerHTML = `
          <div class="error-state compact">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <p>Lỗi kết nối</p>
          </div>
        `;
      },
      onabort: () => {
        currentRequest = null;
      }
    });
}

// === Hàm tạo Prompt ===
function createPrompt(isImage = true) {
    const subj = document.getElementById('subject').value.replace(/[^\w\s]/gi, '');
    const lang = document.getElementById('lang').value;
    const mode = document.getElementById('outputMode').value;
    const langStr = lang === 'vi' ? 'Tiếng Việt' : 'English';
    const source = isImage ? 'trong ảnh' : 'được cung cấp';

    if (mode === 'custom') {
        const customText = customPromptInput.value.trim();
        if (!customText) {
             document.getElementById('ansBox').innerHTML = `
               <div class="error-state compact">
                 <p>Vui lòng nhập yêu cầu</p>
               </div>
             `;
            return null;
        }
        return `${customText} (Trả lời bằng ${langStr})`;
    } else if (mode === 'answer') {
        return `Với bài tập môn ${subj} ${source}, chỉ đưa ra đáp án cuối cùng. Không giải thích. Không dùng markdown. Trả lời bằng ${langStr}.`;
    } else {
        return `Phân tích và giải chi tiết bài tập môn ${subj} ${source}. Suy nghĩ từng bước, đưa ra công thức và lời giải rõ ràng. Trả lời bằng ${langStr}.`;
    }
}

// === Hàm kiểm tra API Key ===
function checkApiKey(key) {
  const statusDot = aiStatus.querySelector('.status-dot');
  const statusText = aiStatus.querySelector('.status-text');

  if (!key) {
    statusText.textContent = 'Chưa có Key';
    aiStatus.className = 'status-chip status-error';
    allActionButtons.forEach(b => b.disabled = true);
    apiKeySection.style.display = 'block';
    changeApiSection.style.display = 'none';
    return;
  }

  statusText.textContent = 'Kiểm tra...';
  aiStatus.className = 'status-chip status-checking';
  allActionButtons.forEach(b => b.disabled = true);

  GM_xmlhttpRequest({
    method: "POST",
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
    onload: function(response) {
      try {
        const data = JSON.parse(response.responseText || "{}");

        if (response.status === 200 && data?.candidates) {
          statusText.textContent = 'Kết nối';
          aiStatus.className = 'status-chip status-success';
          GEMINI_API_KEY = key;
          GM_setValue('geminiApiKey', key);
          apiKeySection.style.display = 'none';
          changeApiSection.style.display = 'block';
          allActionButtons.forEach(b => b.disabled = false);
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
        statusText.textContent = e.message;
        aiStatus.className = 'status-chip status-error';
        allActionButtons.forEach(b => b.disabled = true);
        apiKeySection.style.display = 'block';
        changeApiSection.style.display = 'none';
      }
    },
    onerror: function() {
      statusText.textContent = 'Lỗi mạng';
      aiStatus.className = 'status-chip status-error';
      allActionButtons.forEach(b => b.disabled = true);
      apiKeySection.style.display = 'block';
      changeApiSection.style.display = 'none';
    }
  });
}

// === Hàm xử lý chụp ảnh ===
async function handleScreenshot(options = {}) {
  const imgBox = document.getElementById('imgBox');
  const imgCard = document.getElementById('imgCard');
  const ansBox = document.getElementById('ansBox');

  imgCard.style.display = 'block';
  imgBox.innerHTML = `
    <div class="loading-state compact">
      <div class="spinner small"></div>
      <p>Đang chụp...</p>
      <button id="btnCancelCapture" class="btn-cancel small">Hủy</button>
    </div>
  `;

  let cancelled = false;
  const btnCancelCapture = document.getElementById('btnCancelCapture');
  if (btnCancelCapture) {
    btnCancelCapture.onclick = () => {
      cancelled = true;
      imgCard.style.display = 'none';
      ansBox.innerHTML = `
        <div class="empty-state compact">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Đã hủy</p>
        </div>
      `;
    };
  }

  ansBox.innerHTML = `
    <div class="empty-state compact">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Chuẩn bị...</p>
    </div>
  `;

  try {
    // Thêm scroll offset cho tọa độ chính xác
    let captureOptions = { ...options };
    
    if (options.x !== undefined && options.y !== undefined) {
      // Điều chỉnh tọa độ theo scroll position
      captureOptions.x = options.x + window.pageXOffset;
      captureOptions.y = options.y + window.pageYOffset;
    } else {
      // Nếu chụp toàn trang, scroll về đầu
      window.scrollTo(0, 0);
      // Đợi scroll hoàn tất
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const canvas = await html2canvas(document.body, {
      ...captureOptions,
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      ignoreElements: (element) => {
        return element.id === 'aiPanel' ||
               element.id === 'aiSnipOverlay' ||
               element.id === 'aiSnipBox' ||
               element.id === 'sizeIndicator' ||
               element.id === 'captureGuide' ||
               element.classList.contains('ai-screenshot-ignore');
      },
      onclone: (clonedDoc) => {
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach(el => {
          const computedStyle = window.getComputedStyle(el);
          ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
            const value = computedStyle[prop];
            if (value && (value.includes('oklch') || value.includes('lab') || value.includes('lch'))) {
              el.style[prop] = 'rgb(128, 128, 128)';
            }
          });
        });
      }
    });

    if (cancelled) return;

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    imgBox.innerHTML = `<img src="${canvas.toDataURL()}" style="cursor: pointer;" id="capturedImage">`;

    const capturedImg = document.getElementById('capturedImage');
    if (capturedImg) {
      capturedImg.onclick = () => {
        const imgWindow = window.open('', '_blank');
        imgWindow.document.write(`
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
        `);
      };
    }

    const prompt = createPrompt(true);
    if (prompt) {
        sendToGemini(prompt, base64);
    }
  } catch (err) {
    if (cancelled) return;
    imgBox.innerHTML = `
      <div class="error-state compact">
        <p>Lỗi: ${err.message}</p>
      </div>
    `;
    ansBox.innerHTML = '';
  }
}

// === Xử lý sự kiện ===
apiKeyInput.addEventListener('blur', () => checkApiKey(apiKeyInput.value.trim()));

changeApiBtn.addEventListener('click', () => {
  apiKeySection.style.display = 'block';
  changeApiSection.style.display = 'none';
  apiKeyInput.focus();
  allActionButtons.forEach(b => b.disabled = true);
  const statusText = aiStatus.querySelector('.status-text');
  statusText.textContent = "Nhập key";
  aiStatus.className = 'status-chip status-checking';
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
        document.getElementById('ansBox').innerHTML = `
          <div class="error-state compact">
            <p>Nhập câu hỏi</p>
          </div>
        `;
        return;
    }
    const prompt = createPrompt(false);
    if (prompt) {
        const fullPrompt = `Câu hỏi: "${question}".\n\n${prompt}`;
        document.getElementById('imgCard').style.display = 'none';
        sendToGemini(fullPrompt, null);
    }
});

// === CSS Material Design - COMPACT VERSION ===
GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

* {
  box-sizing: border-box;
}

#aiPanel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 280px;
  background: #1a1a1a;
  color: #e4e4e7;
  z-index: 999999;
  border-radius: 10px;
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
  display: none;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

#aiPanel.dragging {
  transition: none;
  cursor: grabbing !important;
}

#aiPanel.devil-active {
  box-shadow: 0 8px 32px rgba(220, 38, 38, 0.4), 0 0 0 2px rgba(220, 38, 38, 0.3);
}

.ai-header {
  background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
  padding: 10px 12px;
  border-radius: 10px 10px 0 0;
  cursor: move;
  user-select: none;
  transition: background 0.3s ease;
}

#aiPanel.dragging .ai-header {
  background: linear-gradient(135deg, #1557b0 0%, #2a6dd4 100%);
}

#aiPanel.devil-active .ai-header {
  background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.logo-icon {
  width: 22px;
  height: 22px;
  color: #fff;
  flex-shrink: 0;
}

.header-text {
  flex: 1;
}

.header-text h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.2px;
}

.btn-minimize {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  color: #fff;
  font-size: 18px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-minimize:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.05);
}

.btn-resize {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-right: 4px;
}

.btn-resize:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.05);
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(255,255,255,0.3);
  border-bottom: 2px solid rgba(255,255,255,0.3);
  transition: all 0.2s ease;
}

.resize-handle:hover::after,
#aiPanel.resizing .resize-handle::after {
  border-color: rgba(66, 133, 244, 0.6);
  width: 14px;
  height: 14px;
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
  gap: 5px;
  margin-top: 8px;
  padding: 3px 8px;
  background: rgba(255,255,255,0.12);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-chip.status-success {
  background: rgba(52, 168, 83, 0.2);
  color: #81c995;
}

.status-chip.status-success .status-dot {
  background: #81c995;
  box-shadow: 0 0 4px #81c995;
}

.status-chip.status-error {
  background: rgba(234, 67, 53, 0.2);
  color: #f28b82;
}

.status-chip.status-error .status-dot {
  background: #f28b82;
  animation: none;
}

.status-chip.status-checking {
  background: rgba(251, 188, 5, 0.2);
  color: #fdd663;
}

.ai-content {
  padding: 10px;
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-content::-webkit-scrollbar {
  width: 3px;
}

.ai-content::-webkit-scrollbar-track {
  background: transparent;
}

.ai-content::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.ai-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

.section {
  margin-bottom: 10px;
}

.devil-mode-section {
  margin-bottom: 10px;
}

.btn-devil.compact {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

.btn-devil.compact:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
}

.btn-devil.active {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.15), rgba(127, 29, 29, 0.15));
  border-color: #dc2626;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.2);
}

.devil-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.devil-text {
  flex: 1;
  display: flex;
  align-items: center;
}

.devil-title {
  font-size: 12px;
  font-weight: 500;
  color: #e4e4e7;
}

.btn-devil.active .devil-title {
  color: #fca5a5;
}

.devil-toggle {
  position: relative;
  flex-shrink: 0;
}

.devil-toggle-track {
  width: 32px;
  height: 16px;
  background: rgba(255,255,255,0.2);
  border-radius: 8px;
  position: relative;
  transition: all 0.2s ease;
}

.btn-devil.active .devil-toggle-track {
  background: #dc2626;
}

.devil-toggle-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.btn-devil.active .devil-toggle-thumb {
  left: 18px;
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.4);
}

.select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.select-card.compact {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 0;
  transition: all 0.2s ease;
  overflow: hidden;
}

.select-card.compact:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
}

.select-card.compact.full {
  grid-column: 1 / -1;
}

.material-select {
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: #e4e4e7;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  appearance: none;
  font-weight: 500;
  outline: none;
}

.material-select option {
  background: #2a2a2a;
  color: #e4e4e7;
  padding: 6px;
}

.input-field.compact {
  position: relative;
  margin-bottom: 4px;
}

.input-field.compact input,
.input-field.compact textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: #e4e4e7;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
  outline: none;
}

.input-field.compact textarea {
  resize: vertical;
  min-height: 40px;
}

.input-field.compact input:focus,
.input-field.compact textarea:focus {
  background: rgba(255,255,255,0.06);
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.input-field.compact input:focus + label,
.input-field.compact textarea:focus + label,
.input-field.compact input:not(:placeholder-shown) + label,
.input-field.compact textarea:not(:placeholder-shown) + label {
  transform: translateY(-20px) scale(0.85);
  color: #4285f4;
}

.input-field.compact label {
  position: absolute;
  left: 10px;
  top: 8px;
  font-size: 12px;
  color: #71717a;
  pointer-events: none;
  transition: all 0.2s ease;
  transform-origin: left top;
  background: #1a1a1a;
  padding: 0 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
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
  background: rgba(255,255,255,0.15);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.btn:active::before {
  width: 200px;
  height: 200px;
}

.btn svg {
  width: 14px;
  height: 14px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.btn span {
  position: relative;
  z-index: 1;
}

.btn-compact {
  padding: 7px 12px;
  font-size: 11px;
}

.btn-small {
  padding: 5px 10px;
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(135deg, #1a73e8, #4285f4);
  color: #fff;
  box-shadow: 0 1px 3px rgba(26, 115, 232, 0.3);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(26, 115, 232, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255,255,255,0.06);
  color: #8ab4f8;
  border: 1px solid rgba(138, 180, 248, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
  border-color: rgba(138, 180, 248, 0.4);
}

.btn-text {
  background: transparent;
  color: #8ab4f8;
  padding: 5px 10px;
}

.btn-text:hover:not(:disabled) {
  background: rgba(138, 180, 248, 0.1);
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
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.card-header.compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-weight: 500;
  font-size: 11px;
  color: #71717a;
  position: relative;
}

.card-header.compact svg {
  width: 14px;
  height: 14px;
  color: #8ab4f8;
  flex-shrink: 0;
}

.btn-copy {
  margin-left: auto;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #8ab4f8;
}

.btn-copy:hover {
  background: rgba(138, 180, 248, 0.15);
  transform: scale(1.05);
}

.btn-copy svg {
  width: 14px;
  height: 14px;
}

.card-content.compact {
  padding: 10px;
  min-height: 40px;
  font-size: 12px;
  line-height: 1.6;
  color: #e4e4e7;
  font-family: 'Inter', sans-serif;
  max-height: 500px;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.card-content.compact::-webkit-scrollbar {
  width: 4px;
}

.card-content.compact::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
  border-radius: 2px;
}

.card-content.compact::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

.card-content.compact::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}

.card-content.compact img {
  max-width: 100%;
  border-radius: 4px;
  margin-top: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-content.compact img:hover {
  transform: scale(1.01);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.empty-state.compact,
.loading-state.compact,
.error-state.compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 10px;
  text-align: center;
}

.empty-state.compact svg,
.loading-state.compact svg,
.error-state.compact svg {
  width: 32px;
  height: 32px;
  margin-bottom: 6px;
  color: #52525b;
}

.empty-state.compact p,
.loading-state.compact p {
  margin: 0;
  color: #71717a;
  font-size: 11px;
}

.error-state.compact {
  color: #f28b82;
}

.error-state.compact svg {
  color: #f28b82;
}

.error-state.compact p {
  margin: 0;
  font-size: 11px;
  color: #71717a;
}

.spinner.small {
  width: 28px;
  height: 28px;
  border: 2.5px solid rgba(138, 180, 248, 0.2);
  border-top-color: #8ab4f8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-cancel.small {
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(234, 67, 53, 0.12);
  border: 1px solid rgba(234, 67, 53, 0.25);
  border-radius: 5px;
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
}

#aiSnipOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  z-index: 2147483646;
  display: none;
  cursor: crosshair;
  backdrop-filter: blur(2px);
}

#aiSnipBox {
  position: fixed;
  border: 2px solid #4285f4;
  background: rgba(66, 133, 244, 0.08);
  z-index: 2147483647;
  display: none;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.4),
              0 0 0 9999px rgba(0,0,0,0.5);
  transition: none;
}

#aiSnipBox::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px dashed rgba(255,255,255,0.5);
  pointer-events: none;
}

#sizeIndicator {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  font-family: 'Inter', monospace;
  font-size: 13px;
  font-weight: 500;
  z-index: 2147483648;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
}

#captureGuide {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.92);
  color: #fff;
  padding: 16px 24px;
  border-radius: 10px;
  z-index: 2147483648;
  text-align: center;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -45%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}

#captureGuide h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

#captureGuide p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #a1a1aa;
}

#cancelCaptureMode {
  background: #dc2626;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
}

#cancelCaptureMode:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

@media (max-width: 480px) {
  #aiPanel {
    width: calc(100vw - 32px);
    left: 16px;
    right: 16px;
  }

  .select-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: 1fr;
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
  ui.style.display = 'none';

  const guide = document.createElement('div');
  guide.id = 'captureGuide';
  guide.innerHTML = `
    <h3>📸 Chế độ chụp vùng</h3>
    <p>Nhấn và kéo chuột để chọn vùng cần chụp</p>
    <button id="cancelCaptureMode">✕ Hủy (ESC)</button>
  `;
  document.body.appendChild(guide);

  const cancelBtn = document.getElementById('cancelCaptureMode');
  if (cancelBtn) {
    cancelBtn.onclick = cancelCapture;
  }

  setTimeout(() => {
    if (guide && guide.parentNode) {
      guide.style.opacity = '0';
      setTimeout(() => guide.remove(), 200);
    }
  }, 2500);
};

function cancelCapture() {
  selecting = false;
  overlay.style.display = 'none';
  snipBox.style.display = 'none';
  ui.style.display = 'block';
  startX = startY = endX = endY = undefined;

  const guide = document.getElementById('captureGuide');
  if (guide) guide.remove();
  
  const indicator = document.getElementById('sizeIndicator');
  if (indicator) indicator.remove();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selecting) {
    cancelCapture();
  }
});

btnFullPage.onclick = () => {
    ui.style.display = 'none';
    setTimeout(() => {
        handleScreenshot({}).finally(() => {
            ui.style.display = 'block';
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

  // Lưu tọa độ tương đối với viewport + scroll position
  startX = e.clientX + window.pageXOffset;
  startY = e.clientY + window.pageYOffset;
  
  // Hiển thị box ở vị trí clientX/Y (viewport coordinates)
  snipBox.style.left = e.clientX + 'px';
  snipBox.style.top = e.clientY + 'px';
  snipBox.style.width = '0px';
  snipBox.style.height = '0px';
  snipBox.style.display = 'block';

  updateSizeIndicator(0, 0);
});

overlay.addEventListener('mousemove', e => {
  if (!selecting || startX === undefined) return;
  
  // Tính tọa độ với scroll
  endX = e.clientX + window.pageXOffset;
  endY = e.clientY + window.pageYOffset;

  // Tính vị trí và kích thước
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // Hiển thị box ở viewport coordinates
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
  ui.style.display = 'block';
  startX = startY = endX = endY = undefined;

  const indicator = document.getElementById('sizeIndicator');
  if (indicator) indicator.remove();

  if (width < 10 || height < 10) {
    alert('⚠️ Vùng chọn quá nhỏ! Vui lòng chọn vùng lớn hơn.');
    return;
  }

  // Truyền tọa độ đã tính với scroll offset
  handleScreenshot({ x: left, y: top, width: width, height: height });
});

// === Hiệu ứng gõ chữ ===
function typeEffect(el, text, speed = 8) {
  currentAnswerText = text; // Lưu text để copy
  btnCopy.style.display = 'block'; // Hiện nút copy
  
  el.innerHTML = "";
  let i = 0;
  function typing() {
    if (i < text.length) {
      el.innerHTML += text.charAt(i++);
      el.scrollTop = el.scrollHeight; // Auto scroll xuống
      setTimeout(typing, speed);
    }
  }
  typing();
}

// === Kéo thả panel - IMPROVED ===
let dragging = false, dragOffset = {x:0, y:0};
const header = ui.querySelector('.ai-header');

header.addEventListener('mousedown', e => {
  if (e.target.closest('.btn-minimize')) return;
  
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
  }
});

document.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    ui.classList.remove('dragging');
  }
});

// === Toggle bằng ShiftRight ===
document.addEventListener('keydown', e => {
  if (e.code === 'ShiftRight') {
      ui.style.display = ui.style.display === 'none' ? 'block' : 'none';
      if(ui.style.display === 'block') {
        checkApiKey(GM_getValue('geminiApiKey', ""));
      }
  }
});

// === Khởi chạy lần đầu ===
checkApiKey(GEMINI_API_KEY);

})();
