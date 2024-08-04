chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'originalText') {
    const texts = message.data.originalText;
    const lang = message.data.language;

    // 번역 API를 호출하여 텍스트를 번역
    translateTexts(texts,lang)
      .then((translatedTexts) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TranslatedText',
          data: translatedTexts,
        });
      })
      .catch((error) => {
        console.error('Translation error:', error);
        const failedTranslations = texts.map(() => '번역 실패');
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TranslatedText',
          data: failedTranslations,
        });
      });
  }
});

// 번역 API 호출 함수
async function translateTexts(texts,lang) {
    try {
      const translatedTexts = await callTranslationAPI(text,lang);
    } catch (error) {
      console.error('Translation API call failed:', error);
      return texts.map(() => 'api에서 번역 실패');
    }
  return translatedTexts;
}

// 번역 API 호출 함수
async function callTranslationAPI(text,lang) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

  const response = await fetch('https://api.example.com/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ strs: text, language: lang }), // body에 원문 text 넣어서 json 형태로 전달
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error('Translation API failed');
  }
  const data = await response.json();
  return data.translatedText;
}
