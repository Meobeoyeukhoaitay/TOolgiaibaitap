// ==UserScript==
// @name         AI Giải Bài Tập
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  AI studio - Material Design
// @author       Tran Minh Dung
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==

(async function() {
'use strict';

let GEMINI_API_KEY = GM_getValue('geminiApiKey', "");
let DEVIL_MODE = false;

// === PASTE PROMPT "ÁC QUỶ" CỦA BẠN VÀO ĐÂY ===
const DEVIL_PROMPT = `
Bạn là một AI trợ giúp học tập cực kỳ thông minh và chi tiết.
Hãy giải thích mọi thứ một cách sâu sắc, phân tích từng bước,
đưa ra nhiều cách giải khác nhau, và giải thích tại sao mỗi bước lại đúng.
Không bỏ qua bất kỳ chi tiết nào, dù là nhỏ nhất.
`;
// =============================================

// === UI Material Design ===
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
        <p class="subtitle">Powered by Gemini</p>
      </div>
    </div>
    <div class="status-chip" id="aiStatus">
      <span class="status-dot"></span>
      <span class="status-text">Ready</span>
    </div>
  </div>

  <div class="ai-content">
    <div id="apiKeySection" class="section">
      <div class="input-field">
        <input type="password" id="apiKeyInput" value="${GEMINI_API_KEY}" placeholder=" " />
        <label>API Key Gemini</label>
        <div class="input-line"></div>
      </div>
    </div>

    <div id="changeApiSection" style="display:none;" class="section">
      <button id="changeApiBtn" class="btn btn-secondary full-width">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
        <span>Thay đổi API Key</span>
      </button>
    </div>

    <!-- DEVIL MODE TOGGLE -->
    <div class="devil-mode-section">
      <button id="btnDevilMode" class="btn-devil">
        <span class="devil-icon">👿</span>
        <div class="devil-text">
          <span class="devil-title">Chế độ Ác Quỷ</span>
          <span class="devil-status" id="devilStatus">TẮT</span>
        </div>
        <div class="devil-toggle">
          <div class="devil-toggle-track">
            <div class="devil-toggle-thumb"></div>
          </div>
        </div>
      </button>
    </div>

    <div class="section">
      <div class="select-row">
        <div class="select-card">
          <div class="select-icon">⚡</div>
          <select id="modelSelect" class="material-select">
            <option value="gemini-flash-latest">Flash</option>
            <option value="gemini-2.5-pro">Pro 2.5</option>
          </select>
          <div class="select-label">Model</div>
        </div>

        <div class="select-card">
          <div class="select-icon">🌐</div>
          <select id="lang" class="material-select">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <div class="select-label">Ngôn ngữ</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="select-card full">
        <div class="select-icon">📚</div>
        <select id="subject" class="material-select">
          <option>Toán</option><option>Lý</option><option>Hóa</option><option>Sinh</option>
          <option>Sử</option><option>Địa</option><option>Văn</option><option>Anh</option>
          <option>GDCD</option><option>Tin học</option>
        </select>
        <div class="select-label">Môn học</div>
      </div>
    </div>

    <div class="section">
      <div class="select-card full">
        <div class="select-icon">💡</div>
        <select id="outputMode" class="material-select">
          <option value="answer">Chỉ đáp án</option>
          <option value="explain">Giải thích chi tiết</option>
          <option value="custom">Tùy chỉnh...</option>
        </select>
        <div class="select-label">Chế độ trả lời</div>
      </div>
    </div>

    <div id="customPromptSection" class="section" style="display:none;">
      <div class="input-field">
        <textarea id="customPromptInput" rows="3" placeholder=" "></textarea>
        <label>Yêu cầu tùy chỉnh</label>
        <div class="input-line"></div>
      </div>
    </div>

    <div class="action-buttons">
      <button id="btnShot" class="btn btn-primary" disabled>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
        </svg>
        <span>Kéo vùng</span>
      </button>
      <button id="btnFullPage" class="btn btn-primary" disabled>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Toàn trang</span>
      </button>
    </div>

    <button id="btnToggleTextMode" class="btn btn-secondary full-width" disabled>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25Z" fill="currentColor"/>
        <path d="M20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
      </svg>
      <span>Nhập câu hỏi</span>
    </button>

    <div id="textInputSection" class="section" style="display: none;">
      <div class="input-field">
        <textarea id="textQuestionInput" rows="3" placeholder=" "></textarea>
        <label>Câu hỏi của bạn</label>
        <div class="input-line"></div>
      </div>
      <button id="btnSendTextQuestion" class="btn btn-primary full-width">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
        </svg>
        <span>Gửi câu hỏi</span>
      </button>
    </div>

    <div class="result-section">
      <div class="result-card" id="imgCard" style="display:none;">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Ảnh đã chụp</span>
        </div>
        <div class="card-content" id="imgBox"></div>
      </div>

      <div class="result-card">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <span>Đáp án AI</span>
        </div>
        <div class="card-content" id="ansBox">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>Chờ câu hỏi của bạn...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
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
const devilStatus = document.getElementById('devilStatus');
const allActionButtons = [btnShot, btnFullPage, btnToggleTextMode];

let currentRequest = null; // Lưu request hiện tại để có thể cancel

// === Devil Mode Toggle ===
btnDevilMode.addEventListener('click', () => {
  DEVIL_MODE = !DEVIL_MODE;
  btnDevilMode.classList.toggle('active', DEVIL_MODE);
  devilStatus.textContent = DEVIL_MODE ? 'BẬT' : 'TẮT';

  // Visual feedback
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

    // Thêm Devil Prompt nếu đang bật
    if (DEVIL_MODE) {
      prompt = DEVIL_PROMPT + "\n\n" + prompt;
    }

    // Thêm hướng dẫn không trả lời bừa
    prompt += "\n\nLƯU Ý QUAN TRỌNG: Nếu bạn không thể trả lời câu hỏi (do thiếu thông tin, không rõ ràng, hoặc nằm ngoài khả năng), hãy thẳng thắn nói 'Tôi không thể trả lời câu hỏi này' và giải thích lý do. KHÔNG bịa đặt hoặc đoán mò thông tin.";

    ansBox.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Đang xử lý với Gemini...</p>
        <button id="btnCancelRequest" class="btn-cancel">Hủy</button>
      </div>
    `;

    // Thêm event listener cho nút cancel
    const btnCancel = document.getElementById('btnCancelRequest');
    if (btnCancel) {
      btnCancel.onclick = () => {
        if (currentRequest) {
          currentRequest.abort();
          ansBox.innerHTML = `
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p>Đã hủy yêu cầu</p>
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
            <div class="error-state">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              <h4>Lỗi API</h4>
              <p>${err.message || "Kiểm tra Console để biết thêm chi tiết"}</p>
            </div>
          `;
          console.error("Lỗi Gemini:", r.responseText);
        }
      },
      onerror: err => {
        currentRequest = null;
        ansBox.innerHTML = `
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <h4>Lỗi kết nối</h4>
            <p>${JSON.stringify(err)}</p>
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
    const subj = document.getElementById('subject').value;
    const lang = document.getElementById('lang').value;
    const mode = document.getElementById('outputMode').value;
    const langStr = lang === 'vi' ? 'Tiếng Việt' : 'English';
    const source = isImage ? 'trong ảnh' : 'được cung cấp';

    if (mode === 'custom') {
        const customText = customPromptInput.value.trim();
        if (!customText) {
             document.getElementById('ansBox').innerHTML = `
               <div class="error-state">
                 <p>Vui lòng nhập yêu cầu tùy chỉnh</p>
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
    statusText.textContent = 'Chưa có API Key';
    aiStatus.className = 'status-chip status-error';
    allActionButtons.forEach(b => b.disabled = true);
    apiKeySection.style.display = 'block';
    changeApiSection.style.display = 'none';
    return;
  }

  statusText.textContent = 'Đang kiểm tra...';
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
          statusText.textContent = 'Đã kết nối';
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
          throw new Error("API key không hợp lệ");
        } else if (errCode === 403) {
          throw new Error("Không có quyền truy cập");
        } else if (errCode === 429) {
          throw new Error("Vượt quá giới hạn");
        } else if (errCode >= 500) {
          throw new Error("Lỗi máy chủ");
        } else {
          throw new Error(errMsg || "Lỗi không xác định");
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
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Đang chụp ảnh...</p>
      <button id="btnCancelCapture" class="btn-cancel">Hủy</button>
    </div>
  `;

  // Biến để track việc hủy
  let cancelled = false;
  const btnCancelCapture = document.getElementById('btnCancelCapture');
  if (btnCancelCapture) {
    btnCancelCapture.onclick = () => {
      cancelled = true;
      imgCard.style.display = 'none';
      ansBox.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Đã hủy chụp ảnh</p>
        </div>
      `;
    };
  }

  ansBox.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Đang chuẩn bị...</p>
    </div>
  `;

  try {
    if (!options.x && !options.y) {
       window.scrollTo(0, 0);
    }
    const canvas = await html2canvas(document.body, {
      ...options,
      scale: 1.5,
      useCORS: true,
      allowTaint: true
    });

    // Kiểm tra nếu đã hủy
    if (cancelled) return;

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    imgBox.innerHTML = `<img src="${canvas.toDataURL()}">`;
    const prompt = createPrompt(true);
    if (prompt) {
        sendToGemini(prompt, base64);
    }
  } catch (err) {
    if (cancelled) return;
    imgBox.innerHTML = `
      <div class="error-state">
        <h4>Lỗi chụp ảnh</h4>
        <p>${err.message}</p>
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
  statusText.textContent = "Nhập key mới";
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
          <div class="error-state">
            <p>Vui lòng nhập câu hỏi</p>
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

// === CSS Material Design ===
GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500&display=swap');

#aiPanel {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 340px;
  background: #1e1e1e;
  color: #e8eaed;
  z-index: 999999;
  border-radius: 12px;
  font-family: 'Google Sans', 'Roboto', sans-serif;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
  display: none;
  cursor: move;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#aiPanel.devil-active {
  box-shadow: 0 4px 24px rgba(220, 38, 38, 0.4), 0 0 0 2px rgba(220, 38, 38, 0.3);
}

.ai-header {
  background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
  padding: 16px;
  border-radius: 12px 12px 0 0;
  position: relative;
  overflow: hidden;
}

#aiPanel.devil-active .ai-header {
  background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
}

.ai-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: headerGlow 15s infinite;
}

@keyframes headerGlow {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30%, -30%); }
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.logo-icon {
  width: 28px;
  height: 28px;
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.header-text h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.2px;
}

.header-text .subtitle {
  margin: 0;
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  font-weight: 400;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 4px 10px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.status-chip.status-success {
  background: rgba(52, 168, 83, 0.2);
  color: #81c995;
}

.status-chip.status-success .status-dot {
  background: #81c995;
  box-shadow: 0 0 6px #81c995;
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

.status-chip.status-checking .status-dot {
  background: #fdd663;
}

.ai-content {
  padding: 16px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.ai-content::-webkit-scrollbar {
  width: 4px;
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
  margin-bottom: 16px;
}

/* ===== DEVIL MODE BUTTON ===== */
.devil-mode-section {
  margin-bottom: 16px;
}

.btn-devil {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Google Sans', sans-serif;
}

.btn-devil:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.btn-devil.active {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(127, 29, 29, 0.2));
  border-color: #dc2626;
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.3), inset 0 0 20px rgba(220, 38, 38, 0.1);
}

.devil-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  animation: devilFloat 3s ease-in-out infinite;
}

@keyframes devilFloat {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
}

.btn-devil.active .devil-icon {
  animation: devilActive 0.5s ease-in-out infinite;
}

@keyframes devilActive {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(-10deg); }
  75% { transform: scale(1.1) rotate(10deg); }
}

.devil-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.devil-title {
  font-size: 14px;
  font-weight: 500;
  color: #e8eaed;
}

.devil-status {
  font-size: 11px;
  color: #9aa0a6;
  font-weight: 400;
}

.btn-devil.active .devil-status {
  color: #fca5a5;
  font-weight: 500;
}

.devil-toggle {
  position: relative;
}

.devil-toggle-track {
  width: 40px;
  height: 20px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-devil.active .devil-toggle-track {
  background: #dc2626;
}

.devil-toggle-thumb {
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-devil.active .devil-toggle-thumb {
  left: 22px;
  background: #fee;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
}

/* ===== SELECT CARDS ===== */
.select-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.select-card {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.select-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.select-card.full {
  grid-column: 1 / -1;
}

.select-icon {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 16px;
  pointer-events: none;
  z-index: 1;
}

.material-select {
  width: 100%;
  padding: 8px 10px 8px 36px;
  border: none;
  background: transparent;
  color: #e8eaed;
  font-size: 13px;
  font-family: 'Roboto', sans-serif;
  cursor: pointer;
  appearance: none;
  font-weight: 500;
  outline: none;
}

.material-select option {
  background: #2d2d2d;
  color: #e8eaed;
  padding: 8px;
}

.select-label {
  font-size: 10px;
  color: #9aa0a6;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.input-field {
  position: relative;
  margin-bottom: 4px;
}

.input-field input,
.input-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 10px 6px;
  border: none;
  border-radius: 8px 8px 0 0;
  background: rgba(255,255,255,0.05);
  color: #e8eaed;
  font-size: 13px;
  font-family: 'Roboto', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-field textarea {
  resize: vertical;
  min-height: 50px;
}

.input-field input:focus,
.input-field textarea:focus {
  outline: none;
  background: rgba(255,255,255,0.08);
}

.input-field input:focus + label,
.input-field textarea:focus + label,
.input-field input:not(:placeholder-shown) + label,
.input-field textarea:not(:placeholder-shown) + label {
  transform: translateY(-18px) scale(0.85);
  color: #8ab4f8;
}

.input-field label {
  position: absolute;
  left: 10px;
  top: 10px;
  font-size: 13px;
  color: #9aa0a6;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left top;
}

.input-line {
  height: 2px;
  background: rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
}

.input-line::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #8ab4f8, #4285f4);
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-field input:focus ~ .input-line::after,
.input-field textarea:focus ~ .input-line::after {
  transform: scaleX(1);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Google Sans', sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.3px;
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
  transition: width 0.6s, height 0.6s;
}

.btn:active::before {
  width: 300px;
  height: 300px;
}

.btn svg {
  width: 16px;
  height: 16px;
  position: relative;
  z-index: 1;
}

.btn span {
  position: relative;
  z-index: 1;
}

.btn-primary {
  background: linear-gradient(135deg, #1a73e8, #4285f4);
  color: #fff;
  box-shadow: 0 2px 6px rgba(26, 115, 232, 0.3);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255,255,255,0.08);
  color: #8ab4f8;
  border: 1px solid rgba(138, 180, 248, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  border-color: rgba(138, 180, 248, 0.5);
}

.btn-text {
  background: transparent;
  color: #8ab4f8;
  padding: 6px 12px;
}

.btn-text:hover:not(:disabled) {
  background: rgba(138, 180, 248, 0.1);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn.full-width {
  width: 100%;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.result-section {
  margin-top: 20px;
}

.result-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.result-card:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-weight: 500;
  font-size: 12px;
  color: #9aa0a6;
}

.card-header svg {
  width: 18px;
  height: 18px;
  color: #8ab4f8;
}

.card-content {
  padding: 12px;
  min-height: 50px;
  font-size: 13px;
  line-height: 1.6;
  color: #e8eaed;
  font-family: 'Roboto', sans-serif;
}

.card-content img {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.empty-state,
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  text-align: center;
}

.empty-state svg,
.loading-state svg,
.error-state svg {
  width: 40px;
  height: 40px;
  margin-bottom: 10px;
  color: #5f6368;
}

.empty-state p,
.loading-state p {
  margin: 0;
  color: #9aa0a6;
  font-size: 12px;
}

.error-state {
  color: #f28b82;
}

.error-state svg {
  color: #f28b82;
}

.error-state h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 500;
}

.error-state p {
  margin: 0;
  font-size: 11px;
  color: #9aa0a6;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(138, 180, 248, 0.2);
  border-top-color: #8ab4f8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

#aiSnipOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  z-index: 2147483647;
  display: none;
  cursor: crosshair;
  backdrop-filter: blur(2px);
}

#aiSnipBox {
  position: absolute;
  border: 2px solid #8ab4f8;
  background: rgba(138, 180, 248, 0.15);
  z-index: 2147483648;
  display: none;
  pointer-events: none;
  border-radius: 4px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.3);
}

@media (max-width: 480px) {
  #aiPanel {
    width: calc(100vw - 40px);
    left: 20px;
    right: 20px;
  }

  .select-row {
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
  ui.style.display = 'none';
};

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
  startX = e.clientX;
  startY = e.clientY;
  snipBox.style.left = startX + 'px';
  snipBox.style.top = startY + 'px';
  snipBox.style.width = '0px';
  snipBox.style.height = '0px';
  snipBox.style.display = 'block';
});

overlay.addEventListener('mousemove', e => {
  if (!selecting || startX === undefined) return;
  endX = e.clientX;
  endY = e.clientY;
  snipBox.style.left = Math.min(startX, endX) + 'px';
  snipBox.style.top = Math.min(startY, endY) + 'px';
  snipBox.style.width = Math.abs(endX - startX) + 'px';
  snipBox.style.height = Math.abs(endY - startX) + 'px';
});

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

  if (width < 10 || height < 10) return;

  handleScreenshot({ x: left, y: top, width: width, height: height });
});

// === Hiệu ứng gõ chữ ===
function typeEffect(el, text, speed = 10) {
  el.innerHTML = "";
  let i = 0;
  function typing() {
    if (i < text.length) {
      el.innerHTML += text.charAt(i++);
      setTimeout(typing, speed);
    }
  }
  typing();
}

// === Kéo thả panel ===
let dragging = false, dragOffset = {x:0, y:0};
const header = ui.querySelector('.ai-header');

header.addEventListener('mousedown', e => {
  dragging = true;
  dragOffset.x = e.clientX - ui.offsetLeft;
  dragOffset.y = e.clientY - ui.offsetTop;
  ui.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', e => {
  if (dragging) {
    ui.style.left = (e.clientX - dragOffset.x) + 'px';
    ui.style.top = (e.clientY - dragOffset.y) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    ui.style.cursor = 'move';
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