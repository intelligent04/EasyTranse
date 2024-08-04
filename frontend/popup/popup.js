document.getElementById('translatePage').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.storage.sync.get('language', (data) => {
      const lang = data.language || 'ko'; // 기본 언어를 한국어로 설정
      chrome.tabs.sendMessage(tabs[0].id, { type: 'TranslatePage', language: lang });
    });
  });
});

document.getElementById('settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
