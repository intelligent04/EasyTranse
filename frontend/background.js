// background.js
const LLM_API_KEY = ''// 실제 키로 교체하세요
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama3-8b-8192'; // Groq 지원 모델[3][6]

// 확장 설치 시 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateWithTransMate',
    title: 'Translate with TransMate',
    contexts: ['page', 'selection']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating context menu:', chrome.runtime.lastError);
    } else {
      console.log('Context menu created successfully');
    }
  });
});

// 컨텍스트 메뉴 클릭 시 현재 탭에 메시지 전송
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateWithTransMate' && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TranslatePage' });
  }
});

// 메시지 리스너 한 곳에서 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'openOptionsPage':
      chrome.runtime.openOptionsPage();
      break;

    case 'originalText':
    console.log("message!")
    console.log(message)
    handleTranslation(message, sender.tab.id, message.data.randomKey);
    case 'TranslateSelectedText':
      console.log(message)
      if (sender.tab && sender.tab.id) {
        handleTranslation(message, sender.tab.id);
      }
      break;

    case 'LanguageChanged':
      chrome.storage.sync.set({ language: message.language }, () => {
        console.log('Language updated to:', message.language);
      });
      break;

    case 'SettingsChanged':
      // 모든 탭에 설정 변경 알림
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SettingsChanged',
              settings: message.settings
            });
          }
        }
      });
      // 옵션 페이지에도 메시지 보내기
      chrome.runtime.sendMessage({
        type: 'SettingsChanged',
        settings: message.settings
      });
      break;
  }
});

// 번역 처리 함수
async function handleTranslation(message, tabId) {
  try {
    console.log(message);
    const texts = message.data.originalText || [];
    if (!texts.length) return;

    // 저장된 언어 가져오기, 기본 'ko'
    const { language: lang = 'ko' } = await chrome.storage.sync.get('language');

    const translatedTexts = await translateTexts(texts, lang);

    const sendType = message.type === 'originalText' ? 'TranslatedText' : 'TranslatedSelectedText';
    const dataToSend = sendType === 'TranslatedText' 
      ? { strs: translatedTexts, randomKey: message.data.randomKey } 
      : { strs: { strs: translatedTexts } };

    chrome.tabs.sendMessage(tabId, { type: sendType, data: dataToSend });

  } catch (error) {
    console.error('Translation error:', error);
    const failedTranslations = (message.data.originalText || []).map(() => 'translation failed');
    chrome.tabs.sendMessage(message.sender?.tab?.id || tabId, {
      type: 'TranslatedText',
      data: failedTranslations,
    });
  }
}

// 번역 요청 함수
async function translateTexts(texts, lang) {
  console.log("번역시작작")
  const inputText = texts.join('\n');
  const prompt = `Translate the following text into ${lang}:\n${inputText}`;

  const body = {
    model: MODEL_NAME, // Groq 호환 모델명으로 변경
    stream: false,
    temperature: 0.3,
    messages: [{ 
      role: 'system',  // 시스템 역할 추가 권장
      content: `
    You are a professional translator.
    Do not change the meaning of the phrases, infer additional information, or attempt to create a context.
    Translate only what is explicitly written.
    Each phrase must be translated exactly as it is provided, without any additional interpretation, context, or meaning.
    Your translation should be literal, preserving the exact words and structure of the original text.
    Only use parentheses to include the original text when translating proper nouns, names, technical terms, or specific words that should not be translated.
    Use parentheses sparingly and only when absolutely necessary.

    Here are examples of correct translations:
    
    Example 1:
    - Original: 네이버 클라우드
    - Correct translation: Naver Cloud
    
    Example 2:
    - Original: 이전
    - Correct translation: Previous
    
    Example 3:
    - Original: 연합뉴스
    - Correct translation: Yonhap News

    Here are examples of wrong translations:

    Wrong example 1:
    - Original: 네이버 클라우드
    - Correct translation: Here is the translation of the text into English: Naver Cloud Note: I translated the text into English, maintaining the original formatting as much as possible.
    
    Wrong example 2:
    - Original: 이전
    - Correct translation: Here is the translation of the text into English: Previous Note: I translated the text into English, maintaining the original formatting as much as possible.
    `
    }, {
      role: 'user', 
      content: prompt 
    }]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(API_URL, { // 엔드포인트 변경
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '번역 실패';
    console.log(reply)
    return texts.map(() => reply);

  } catch (error) {
    console.error('Groq API 요청 실패:', error);
    return texts.map(() => 'api에서 번역 실패');
  }
}

// 서비스 워커 fetch 이벤트 리스너 (optional)
self.addEventListener('fetch', (event) => {
  const preloadPromise = event.preloadResponse;
  event.waitUntil(
    preloadPromise.then(response => response || fetch(event.request)).catch(() => fetch(event.request))
  );
});
