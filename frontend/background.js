chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'Text') {
    const texts = message.data;

    // 번역 API를 호출하여 텍스트를 번역
    translateTexts(texts).then((translatedTexts) => {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'TranslatedText',
        data: translatedTexts,
      });
    });

    // 번역 API 호출 함수 (예시)
    async function translateTexts(texts) {
      const translatedTexts = [];
      for (const text of texts) {
        // 여기에 실제 번역 API 호출 로직을 추가하세요.
        const translatedText = await callTranslationAPI(text);
        translatedTexts.push(translatedText);
      }
      return translatedTexts;
    }

    // 번역 API 호출 함수 (예시)
    async function callTranslationAPI(text) {
      const response = await fetch('https://api.example.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });
      if (!response.ok) {
        throw new Error('Translation API failed');
      }
      const data = await response.json();
      return data.translatedText;
    }
  }
});
