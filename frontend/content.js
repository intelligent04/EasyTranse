//드래그 한 부분 번역
document.addEventListener('mouseup', function (e) {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    console.log("##############")
    console.log([selectedText])
    // 선택된 텍스트를 background.js로 전송
    chrome.runtime.sendMessage({
      type: 'TranslateSelectedText',
      data: { originalText: [selectedText] }
    });
  }
});

// 페이지 로드 시 CSS 파일을 로드
loadPopupCSS();
/////////////////////////////////////////
//전체번역

const bannedTagNames = ["SCRIPT", "SVG", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT"];
// 특정 요소를 건너뛸 수 있는지 확인하는 함수
const canSkip = (el) => {
  return (
    el.getAttribute?.("translate") === "no" ||                // 번역 제외 속성
    el.classList?.contains("notranslate") ||                  // 번역 제외 클래스
    bannedTagNames.includes(el.tagName) ||                    // 금지된 태그
    isInShadowDOM(el)                                         // Shadow DOM에 포함된 요소
  );
};

// 요소가 Shadow DOM에 포함되어 있는지 확인하는 함수
const isInShadowDOM = (el) => {
  while (el) {
    if (el instanceof ShadowRoot) {
      return true;
    }
    el = el.parentNode;
  }
  return false;
};

// 모든 텍스트 노드를 수집하는 함수
const dfs = (el) => {
  if (canSkip(el)) {                                          // 건너뛸 요소인지 확인
    return [];
  }

  let result = [];
  for (let i of el.childNodes) {
    if (canSkip(i)) {                                         // 건너뛸 자식 요소인지 확인
      continue;
    }

    if (i.nodeType === Node.TEXT_NODE && i.textContent.trim()) { // 텍스트 노드인 경우
      result.push({ element: i.parentElement, content: i.textContent.trim() });
    } else if (i.nodeType === Node.ELEMENT_NODE) {            // 요소 노드인 경우
      result.push(...dfs(i));
    }
  }

  return result;
};

// 웹페이지의 모든 텍스트 요소를 가져오는 함수
function getAllTextNodes() {
  return dfs(document.body);
}

// 추출한 외국어 텍스트를 백그라운드 스크립트로 전송하는 함수
function sendForeignTextToBackground(textNodes) {
  const textContents = textNodes.map((node, index) => ({ index: index, content: node.content }));
  console.log("추출된 텍스트");
  console.log(JSON.stringify({ textContents: textContents }));
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
  console.log(textContents.map(item => item.content))
  chrome.runtime.sendMessage({
    type: 'originalText',
    data: {
      originalText: textContents.map(item => item.content),  // 여기서는 원래의 텍스트 내용만 전송
    }
  });
}

// 번역된 텍스트를 웹페이지에 적용하는 함수
function applyTranslatedText(textNodes, translatedTexts) {
  console.log("번역된 텍스트");
  console.log(translatedTexts);
  let textIndex = 0;

  textNodes.forEach((node) => {
    if (node.content.trim() !== '') {
      if (node.element && node.element.textContent !== undefined) {
        node.element.textContent = translatedTexts[textIndex] || '번역 실패';
        textIndex++;
      }
    }
  });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TranslatePage') {
    let textNodes = getAllTextNodes();
    sendForeignTextToBackground(textNodes);
  } else if (message.type === 'TranslatedText') {
    const translatedTexts = message.data.strs;
    let textNodes = getAllTextNodes();
    applyTranslatedText(textNodes, translatedTexts);
  }
  else if (message.type === 'TranslatedSelectedText') {
    const translatedTexts = message.data.strs;
    showTranslationPopup(translatedTexts);
  }
});

 