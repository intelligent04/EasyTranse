// selectPopup.js

function showTranslationPopup(selectedText) {
  let existingPopup = document.getElementById('translation-popup');
  if (existingPopup) {
      existingPopup.remove();
  }

  let popup = document.createElement('div');
  popup.id = 'translation-popup';
  popup.innerHTML = `
      <div class="popup-header">
          <div class="logo">
              <img src="${chrome.runtime.getURL('../icons/icon48.png')}" alt="TransMate Logo">
              <div class="title">TransMate</div>
          </div>
          <div class="controls">
              <select id="language-select">
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
              </select>
              <img id="close-popup" src="${chrome.runtime.getURL('../icons/close.png')}" alt="Close" style="width: 16px; height: 16px;">
          </div>
      </div>
      <div class="translated-text">${selectedText}</div>
  `;

  document.body.appendChild(popup);

  document.getElementById('close-popup').addEventListener('click', () => {
      popup.remove();
  });
}

// CSS 파일 로드
function loadPopupCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('selectPopup.css');
  document.head.appendChild(link);
}
