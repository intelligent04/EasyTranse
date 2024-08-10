// 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateWithTM",
    title: "Translate with Trans Mate",
    contexts: ["page", "selection"]
  });
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateWithTM") {
    chrome.tabs.sendMessage(tab.id, { type: 'TranslatePage' });
  }
});

// 기존 코드는 그대로 유지하고, 다음 부분만 수정

// 메시지 리스너 수정
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TranslatePage') {
    let textNodes = getAllTextNodes();
    sendForeignTextToBackground(textNodes);
  } else if (message.type === 'TranslatedText') {
    const translatedTexts = message.data;
    let textNodes = getAllTextNodes();
    applyTranslatedText(textNodes, translatedTexts);
  }
  // 나머지 부분은 그대로 유지
});

// 번역 처리 함수
function handleTranslation(message, tabId) {
  console.log("번역 처리 시작");
  const texts = message.data.originalText;
  console.log("번역할 텍스트:", texts);

  chrome.storage.sync.get('language', (data) => {
    const lang = data.language || 'ko'; // 기본 언어를 한국어로 설정
    translateTexts(texts, lang)
      .then((translatedTexts) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'TranslatedText',
          data: translatedTexts,
        });
      })
      .catch((error) => {
        console.error('Translation error:', error);
        const failedTranslations = texts.map(() => 'translation failed');
        chrome.tabs.sendMessage(tabId, {
          type: 'TranslatedText',
          data: failedTranslations,
        });
      });
  });
}

// 기존의 translateTexts 및 callTranslationAPI 함수는 그대로 유지

// 번역 API 호출 함수
async function translateTexts(texts, lang) {
  try {
    console.log(1);
    console.log(JSON.stringify({ texts: texts, language: lang }));
    const translatedTexts = await callTranslationAPI(texts, lang);
    return translatedTexts;
  } catch (error) {
    console.error('Translation API call failed:', error);
    return texts.map(() => 'api에서 번역 실패');
  }
}

// 번역 API 호출 함수
async function callTranslationAPI(texts, lang) {
  console.log(2);
  console.log(JSON.stringify({ strs: texts, language: lang }));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 30초 타임아웃

  const response = await fetch('http://158.247.199.223:3001/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ strs: texts, language: lang }), // body에 원문 text 넣어서 json 형태로 전달
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error('Translation API failed');
  }
  const data = await response.json();
  console.log('request에 담은 내용');
  console.log(JSON.stringify({ strs: texts, language: lang }))
  console.log("response.body");
  console.log(data)
  //console.log(data);
  return data;
}
