document.getElementById('saveSettings').addEventListener('click', () => {
    const language = document.getElementById('languageSelect').value;
    chrome.storage.sync.set({ language: language }, () => {
      console.log('Language setting saved:', language);
    });
  });
  