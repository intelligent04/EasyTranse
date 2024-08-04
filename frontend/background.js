chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'Text') {
    const texts = message.data;

    // 번역 API를 호출하여 텍스트를 번역
    translateTexts(texts)
      .then((translatedTexts) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'TranslatedText',
          data: translatedTexts,
        });
      })
      .catch((error) => {
        console.error('Translation error:', error);
      });

    // 번역 API 호출 함수 (예시)
    async function translateTexts(texts) {
      const translatedTexts = [];
      for (const text of texts) {
        try {
          const translatedText = await callTranslationAPI(text);
          translatedTexts.push(translatedText);
        } catch (error) {
          console.error('Translation API call failed:', error);
          translatedTexts.push(text); // 실패 시 원문 텍스트 반환
        }
      }
      return translatedTexts;
    }

    // 번역 API 호출 함수 (예시)
    async function callTranslationAPI(text) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      const response = await fetch('https://api.example.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Translation API failed');
      }
      const data = await response.json();
      return data.translatedText;
    }
  }
});
