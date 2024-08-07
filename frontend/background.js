chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'originalStrs') {
    const strs = message.data.originalText;
    chrome.storage.sync.get('language', (data) => {
      const lang = data.language || 'ko'; // 기본 언어를 한국어로 설정
      // 번역 API를 호출하여 텍스트를 번역
      translateTexts(strs, lang)
        .then((translatedTexts) => {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'TranslatedText',
            data: translatedTexts,
          });
        })
        .catch((error) => {
          console.error('Translation error:', error);
          const failedTranslations = strs.map(() => 'translation failed'); // 번역 실패시 외국어를 모국어가 아닌 "translation failed"라는 글자로 대체함
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'TranslatedText',
            data: failedTranslations,
          });
        });
    });
  } else if (message.type === 'LanguageChanged') {
    // 새로운 언어 설정을 저장
    chrome.storage.sync.set({ language: message.language }, () => {
      console.log('Language updated to:', message.language);
    });
  }
});

// 번역 API 호출 함수
async function translateTexts(strs, lang) {
  try {
    const translatedTexts = await callTranslationAPI(strs, lang);
    return translatedTexts;
  } catch (error) {
    console.error('Translation API call failed:', error);
    return strs.map(() => 'api에서 번역 실패');
  }
}

// 번역 API 호출 함수
async function callTranslationAPI(strs, lang) {
  console.log("api호출 함수 작동!!!");
  JSON.stringify({ strs: strs, language: lang })
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

  const response = await fetch('https://translate.kookm.in/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ strs: strs, language: lang }), // body에 원문 text 넣어서 json 형태로 전달
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error('Translation API failed');
  }
  const data = await response.json();
  return data.translatedText;
}
