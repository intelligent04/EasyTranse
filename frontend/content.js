const bannedTagNames = ["SCRIPT", "SVG", "STYLE"];

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

// 모든 자식 요소가 inline 요소인지 확인하는 함수
const checkAllInline = (el) => {
  for (let i of el.childNodes) {
    if (canSkip(el)) {                                        // 건너뛸 요소인지 확인
      continue;
    }
    if (
      i.nodeType == Node.ELEMENT_NODE &&
      window.getComputedStyle(i).display !== "inline"         // inline 요소인지 확인
    ) {
      return false;                                           // inline이 아닌 경우
    }
  }
  return true;                                                // 모든 자식이 inline인 경우
};

// 깊이 우선 탐색을 통해 텍스트와 태그를 수집하는 함수
const dfs = (el) => {
  if (canSkip(el)) {                                          // 건너뛸 요소인지 확인
    return [];
  }

  let result = [];
  for (let i of el.childNodes) {
    if (canSkip(i)) {                                         // 건너뛸 자식 요소인지 확인
      continue;
    }

    if (checkAllInline(i) && i.textContent.trim()) {          // 모든 자식이 inline이고 텍스트가 있는 경우
      let content = "";
      for (let j of i.childNodes) {                           // 자식의 자식을 순회
        if (j.textContent.trim() === "") {                    // 빈 텍스트 건너뛰기
          continue;
        }
        if (j.nodeType === Node.TEXT_NODE) {                  // 텍스트 노드인 경우
          content += j.textContent;                           // 텍스트 추가
        } else {                                              // 요소 노드인 경우
          let tagName = j.tagName.toLowerCase();              // 태그 이름 소문자 변환
          content += `<${tagName}>${j.textContent             // 태그와 텍스트 추가, HTML 엔티티 처리
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</${tagName}>`;
        }
      }
      if (content !== "") {
        result.push({ element: i, content: content });
      }
    } else {
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
  const textContents = textNodes.map(node => node.content);
  console.log("추출된 텍스트")
  console.log(JSON.stringify({ textContents: textContents }));
  chrome.runtime.sendMessage({
    type: 'originalText',
    data: {
      originalText: textContents,
    }
  });
}

// 번역된 텍스트를 받아서 페이지에 반영하는 함수
function applyTranslatedText(textNodes, translatedTexts) {
  console.log("번역된 텍스트")
  console.log(translatedTexts)
  let textIndex = 0;
  textNodes.forEach((node, index) => {
    if (node.content.trim() !== '') {
      node.element.innerHTML = translatedTexts[textIndex] || '번역 실패';
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
