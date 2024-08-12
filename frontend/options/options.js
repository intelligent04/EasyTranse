document.addEventListener('DOMContentLoaded', () => {
  // 저장된 언어 설정 불러오기
  // 슬라이더 설정 불러오기
  chrome.storage.sync.get(['tooltipEnabled'], (data) => {
    if (data.tooltipEnabled !== undefined) {
      document.getElementById('tooltipToggle').checked = data.tooltipEnabled;
    }
  });
  
  const logoImage = document.getElementById('logoImage');
  logoImage.src = chrome.runtime.getURL('icons/icon128.png');
  chrome.storage.sync.get(['language', 'tooltipEnabled'], (data) => {
      if (data.language) {
          document.getElementById('languageSelect').value = data.language;
      }
      if (data.tooltipEnabled !== undefined) {
          document.getElementById('tooltipToggle').checked = data.tooltipEnabled;
      }
  });
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const language = document.getElementById('languageSelect').value;
  const tooltipEnabled = document.getElementById('tooltipToggle').checked;

  chrome.storage.sync.set({ 
      language: language,
      tooltipEnabled: tooltipEnabled
  }, () => {
      console.log('Settings saved:', { language, tooltipEnabled });
      // 설정이 저장된 후 백그라운드 스크립트에 알림
      chrome.runtime.sendMessage({ 
          type: 'SettingsChanged', 
          settings: { language, tooltipEnabled } 
      });
  });
});