const bannedTagNames = ["SCRIPT", "SVG", "STYLE"];

const canSkip = (el) => {
  return (
    el.getAttribute?.("translate") === "no" ||
    el.classList?.contains("notranslate") ||
    bannedTagNames.includes(el.tagName)
  );
};

const checkAllInline = (el) => {
  for (let i of el.childNodes) {
    if (canSkip(el)) {
      continue;
    }
    if (
      i.nodeType == Node.ELEMENT_NODE &&
      window.getComputedStyle(i).display !== "inline"
    ) {
      return false;
    }
  }
  return true;
};

const dfs = (el) => {
  if (canSkip(el)) {
    return [];
  }

  let result = [];
  for (let i of el.childNodes) {
    if (canSkip(i)) {
      continue;
    }

    if (checkAllInline(i) && i.textContent.trim()) {
      let content = "";
      for (let j of i.childNodes) {
        if (j.textContent.trim() === "") {
          continue;
        }
        if (j.nodeType === Node.TEXT_NODE) {
          content += j.textContent;
        } else {
          let tagName = j.tagName.toLowerCase();
          content += `<${tagName}>${j.textContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</${tagName}>`;
        }
      }
      console.log(i, content);
      result.push(content);
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
function sendForeignTextToBackground(textNodes, lang) {
  let language = lang;
  //console.log(textNodes.textContent);
  //console.log(language);
  console.log("2123123123123")
  chrome.runtime.sendMessage({ 
    type: 'originalText', 
    data: { 
      originalText: textNodes, 
      language: language 
    } 
  });
}

// 번역된 텍스트를 받아서 페이지에 반영하는 함수
function applyTranslatedText(textNodes, translatedTexts) {
  let textIndex = 0;
  textNodes.forEach((node, textIndex) => {
    if (node.trim() !== '') { // 빈 문자열 건너뛰기
      let el = document.querySelector(node);
      if (el) {
        el.innerHTML = translatedTexts[textIndex] || '번역 실패';
        textIndex++;
      }
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
