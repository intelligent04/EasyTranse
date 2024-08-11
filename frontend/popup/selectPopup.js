function showTranslationPopup(translatedTexts) {
    let existingPopup = document.getElementById('translation-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    let popup = document.createElement('div');
    popup.id = 'translation-popup';
    popup.innerHTML = `
        <div class="popup-header">
            <div class="logo">
                <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="TransMate Logo">
                <div class="title">TransMate</div>
            </div>
            <div class="controls">
                <select id="language-select">
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                </select>
                <img id="close-popup" src="${chrome.runtime.getURL('icons/close.png')}" alt="Close">
            </div>
        </div>
        <div class="translated-text">${translatedTexts}</div>
    `;

    document.body.appendChild(popup);

    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';

    document.getElementById('close-popup').addEventListener('click', function() {
        popup.remove();
    });
}