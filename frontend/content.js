// 웹페이지의 모든 텍스트 요소를 가져오는 함수
function getAllTextNodes() {
  let walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 번역이 불필요한 요소나 빈 텍스트 노드 제외
        if (node.parentElement && (
          node.parentElement.tagName === 'SCRIPT' || 
          node.parentElement.tagName === 'STYLE' || 
          node.parentElement.tagName === 'NOSCRIPT' || 
          node.parentElement.tagName === 'IFRAME' || 
          node.parentElement.tagName === 'OBJECT' || 
          node.parentElement.getAttribute('translate') === 'no' ||
          !node.textContent.trim()
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let textNodes = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node);
    node = walker.nextNode();
  }
  return textNodes;
}

// 웹페이지의 언어를 파악하는 함수
function getPageLanguage() {
  return document.documentElement.lang || 'unknown';
}

// 추출한 외국어 텍스트를 백그라운드 스크립트로 전송하는 함수
function sendForeignTextToBackground(textNodes, lang) {
  let gotTexts = textNodes.map(node => node.textContent).filter(text => text.trim() !== ''); // 빈 문자열 제거
  let language = lang;
  console.log(gotTexts);
  console.log(language);
  chrome.runtime.sendMessage({ 
    type: 'originalText', 
    data: { 
      originalText: gotTexts, 
      language: language 
    } 
  });
}

// 번역된 텍스트를 받아서 페이지에 반영하는 함수
function applyTranslatedText(textNodes, translatedTexts) {
  let textIndex = 0;
  textNodes.forEach((node) => {
    if (node.textContent.trim() !== '') { // 빈 문자열 건너뛰기
      node.textContent = translatedTexts[textIndex] || '번역 실패';
      textIndex++;
    }
  });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TranslatePage') {
    let textNodes = getAllTextNodes();
    sendForeignTextToBackground(textNodes, message.language);
  } else if (message.type === 'TranslatedText') {
    const translatedTexts = message.data;
    let textNodes = getAllTextNodes();
    applyTranslatedText(textNodes, translatedTexts);
  }
});
