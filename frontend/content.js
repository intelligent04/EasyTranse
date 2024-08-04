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
    textNodes.push(node);
    node = walker.nextNode();
  }
  return textNodes;
}

// 추출한 외국어 텍스트를 백그라운드 스크립트로 전송하는 함수
function sendForeignTextToBackground(textNodes) {
  let gotTexts = textNodes.map(node => node.textContent);
  chrome.runtime.sendMessage({ type: 'Text', data: gotTexts });
}

// 메인 작업: 영어 텍스트 추출 후 백그라운드 스크립트로 전송
let textNodes = getAllTextNodes();
sendForeignTextToBackground(textNodes);

// 백그라운드 스크립트로부터 번역된 텍스트를 받아서 페이지에 반영
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TranslatedText') {
    const translatedTexts = message.data;
    textNodes.forEach((node, index) => {
      node.textContent = translatedTexts[index];
    });
  }
});
