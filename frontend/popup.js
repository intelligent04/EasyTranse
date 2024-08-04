document.getElementById('translatePage').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'TranslatePage' });
    });
  });
  
  document.getElementById('settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  