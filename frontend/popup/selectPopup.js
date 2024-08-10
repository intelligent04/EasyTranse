// selectPopup.js

function showTranslationPopup(selectedText, clientX, clientY) {
    let existingPopup = document.getElementById('translation-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
  
    let popup = document.createElement('div');
    popup.id = 'translation-popup';
    popup.style.left = `${clientX}px`;
    popup.style.top = `${clientY}px`;
    popup.style.position = 'absolute';
    popup.style.backgroundColor = '#fff';
    popup.style.border = '1px solid #ccc';
    popup.style.padding = '10px';
    popup.style.zIndex = '9999';
    popup.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
    popup.textContent = '번역 중...';
  
    document.body.appendChild(popup);
    
    // Temporary timeout for debugging
    setTimeout(() => {
      popup.textContent = selectedText;  // 선택된 텍스트를 팝업에 표시
    }, 500);
  }
  
  function loadPopupCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('selectPopup.css');  // selectPopup.css 파일의 경로
    document.head.appendChild(link);
  }
  