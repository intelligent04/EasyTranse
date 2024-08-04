// 웹페이지의 모든 텍스트 요소를 가져오는 함수
function getAllTextNodes() {
  let walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.parentElement && node.parentElement.getAttribute('translate') === 'no') {
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
    if (node.textContent.trim() !== ''){ // 빈 문자열, 개행문자만 있는 문자열 패스
      textNodes.push(node);
    }
    node = walker.nextNode();
    
  }
  return textNodes;
}

// 웹페이지의 언어를 파악하는 함수
function getPageLanguage() {
  return document.documentElement.lang || 'unknown';
}

// 추출한 외국어 텍스트를 백그라운드 스크립트로 전송하는 함수
function sendForeignTextToBackground(textNodes) {
  let gotTexts = textNodes.map(node => node.textContent).filter(text => text.trim() !== ''); // 빈 문자열 제거
  let language = getPageLanguage();
  console.log(gotTexts);
  console.log(language);
  chrome.runtime.sendMessage({ 
    type: 'originalTextText', 
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
    if (node.textContent.trim() !== '') { // 빈 문자열 건너뛰기 , 텍스트 받을 때도 빈 문자열 건너뛰고 텍스트 갈아끼울 때도 빈 문자열을 건너뛰니까 인덱스가 맞음.
      node.textContent = translatedTexts[textIndex] || '번역 실패';
      textIndex++;
    }
  });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TranslatePage') {
    let textNodes = getAllTextNodes();
    sendForeignTextToBackground(textNodes);
  } else if (message.type === 'TranslatedText') {
    const translatedTexts = message.data;
    let textNodes = getAllTextNodes();
    applyTranslatedText(textNodes, translatedTexts);
  }
});
