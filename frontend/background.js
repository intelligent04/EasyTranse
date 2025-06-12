// background.js

//const LLM_API_KEY = "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";
const LLM_API_KEY = "나중에 실제값으로 바꿀것것"
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.3-70b-versatile';

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
    case 'TranslateSelectedText':
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
    const { language: lang = 'ko' } =
  await chrome.storage.sync.get({ language: 'ko' });


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
  const inputText = texts.join('\n');

  const body = {
    model: MODEL_NAME,
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the following text into ${lang}, and add a line break for each sentence.`
      },
      {
        role: "user",
        content: inputText
      }
    ],
    temperature: 1,                    // randomness 제어
    max_completion_tokens: 1024,       // 생성할 최대 토큰 수 :contentReference[oaicite:0]{index=0}
    top_p: 1,                          // nucleus 샘플링
    stream: false,                     // 스트리밍 응답 여부
    stop: null                         // 중단 시퀀스
  };

  console.log("Request body:", JSON.stringify(body, null, 2));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`GROQ API ${res.status}:`, errText);
      throw new Error(`GROQ API error: ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content.split('\n');
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("GROQ API 요청 실패:", err);
    return texts.map(() => "api에서 번역 실패");
  }
}



// 서비스 워커 fetch 이벤트 리스너 (optional)
self.addEventListener('fetch', (event) => {
  const preloadPromise = event.preloadResponse;
  event.waitUntil(
    preloadPromise.then(response => response || fetch(event.request)).catch(() => fetch(event.request))
  );
});
