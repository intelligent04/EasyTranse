// selectPopup.js

function showTranslationPopup(selectedText) {
  let existingPopup = document.getElementById('translation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  let popup = document.createElement('div');
  popup.id = 'translation-popup';
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
  popup.style.backgroundColor = '#fff';
  popup.style.border = '1px solid #ccc';
  popup.style.padding = '15px';
  popup.style.zIndex = '10000';
  popup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.2)';
  popup.style.width = '300px';

  popup.innerHTML = `
    <div style="font-size: 14px; font-weight: bold;">번역:</div>
    <div id="translated-text" style="margin-top: 10px; font-size: 14px;">${selectedText}</div>
    <button id="close-popup" style="margin-top: 15px; padding: 5px 10px;">닫기</button>
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
  link.href = chrome.runtime.getURL('selectPopup.css'); // selectPopup.css 파일의 경로
  document.head.appendChild(link);
}
