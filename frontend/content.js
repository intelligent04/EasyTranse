// Load the necessary CSS for the translation popup
function loadPopupCSS() {
  let link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("popup/selectPopup.css");
  document.head.appendChild(link);
}
loadPopupCSS();

// Event listener for text selection (triggered on mouseup)
document.addEventListener("mouseup", function () {
  const selection = window.getSelection();
  const rangeCount = selection.rangeCount;

  let selectedText = "";
  for (let i = 0; i < rangeCount; i++) {
    const range = selection.getRangeAt(i);
    selectedText += range.toString().trim() + " ";
  }

  selectedText = selectedText.trim();
  if (selectedText) {
    chrome.runtime.sendMessage({
      type: "TranslateSelectedText",
      data: { originalText: [selectedText] }
    });
  }
});

// Context menu listener (triggered by right-click)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TranslatePage") {
    let textNodes = getAllTextNodes();
    cache[randomKey] = textNodes;
    sendForeignTextToBackground(textNodes, randomKey);
  } else if (message.type === "TranslatedText") {
    let textNodes = cache[message.data.randomKey];
    const translatedTexts = message.data.strs;
    if (textNodes.length !== translatedTexts.strs.length) {
      console.error("번역된 텍스트의 수가 일치하지 않습니다.");
      return;
    }
    applyTranslatedText(textNodes, translatedTexts);
  } else if (message.type === "TranslatedSelectedText") {
    const translatedTexts = message.data.strs[0];
    showTranslationPopup(translatedTexts);
  }
});

// Function to display the translation popup
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
        <img id="settings-button" src="${chrome.runtime.getURL('icons/settings.svg')}" alt="Settings">
        <img id="close-popup" src="${chrome.runtime.getURL('icons/close.svg')}" alt="Close">
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

  document.getElementById('settings-button').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'openOptionsPage' });
  });
}

// Function to get all text nodes from the document body
function getAllTextNodes() {
  return dfs(document.body);
}

// Recursive function to perform a depth-first search on the DOM to find text nodes
function dfs(el) {
  if (canSkip(el)) {
    return [];
  }

  let result = [];
  for (let i of el.childNodes) {
    if (canSkip(i)) {
      continue;
    }

    if (i.nodeType === Node.TEXT_NODE && i.textContent.trim()) {
      result.push({ element: i, content: i.textContent.trim() });
    } else if (i.nodeType === Node.ELEMENT_NODE) {
      if (i.tagName === "BR") {
        result.push({ element: i, content: "" });
        continue;
      }

      if (checkAllInline(i)) {
        let tmp = dfs(i);
        if (!tmp.length) continue;
        let div = document.createElement("div");
        for (let i of tmp) {
          if (i.element.nodeType === Node.TEXT_NODE) {
            div.appendChild(document.createTextNode(i.content));
          } else {
            let child = document.createElement(i.element.tagName);
            child.innerText = i.content;
            div.appendChild(child);
          }
        }
        result.push({ element: i, content: div.innerHTML });
      } else {
        result.push(...dfs(i));
      }
    }
  }

  return result;
}

// Function to check if an element should be skipped during translation
const canSkip = (el) => {
  return (
    el.getAttribute?.("translate") === "no" ||
    el.classList?.contains("notranslate") ||
    bannedTagNames.includes(el.tagName) ||
    isInShadowDOM(el)
  );
};

// List of HTML tags to skip during translation
const bannedTagNames = [
  "SCRIPT",
  "SVG",
  "STYLE",
  "NOSCRIPT",
  "IFRAME",
  "OBJECT",
];

// Function to check if an element is within a shadow DOM
const isInShadowDOM = (el) => {
  while (el) {
    if (el instanceof ShadowRoot) {
      return true;
    }
    el = el.parentNode;
  }
  return false;
};

// Function to send the selected text nodes to the background script for translation
function sendForeignTextToBackground(textNodes, randomKey) {
  const textContents = textNodes.map((node, index) => ({
    index: index,
    content: node.content,
  }));
  chrome.runtime.sendMessage({
    type: "originalText",
    data: {
      originalText: textContents.map((item) => item.content),
      randomKey: randomKey,
    },
  });
}

// Function to apply the translated text back to the original text nodes
function applyTranslatedText(textNodes, translatedTexts) {
  for (let i = 0; i < textNodes.length; i++) {
    if (textNodes[i].element.nodeType === Node.TEXT_NODE) {
      textNodes[i].element.textContent = translatedTexts.strs[i];
    } else {
      let div = document.createElement("div");
      div.innerHTML = translatedTexts.strs[i];
      applyDfs(textNodes[i].element, div);
    }
  }
}

// Function to recursively apply the translated text to the corresponding DOM nodes
function applyDfs(node, translatedNode) {
  let oriChilds = node.childNodes;
  let transChilds = translatedNode.childNodes;

  for (
    let oriIdx = 0, transIdx = 0;
    oriIdx < oriChilds.length;
    oriIdx++, transIdx++
  ) {
    if (
      oriChilds[oriIdx].textContent.trim() === "" &&
      oriChilds[oriIdx].tagName !== "BR"
    ) {
      transIdx--;
      continue;
    }

    if (transIdx >= transChilds.length) {
      if (oriChilds[oriIdx].nodeType === Node.TEXT_NODE) {
        oriChilds[oriIdx].textContent = "";
      }
      continue;
    }

    if (oriChilds[oriIdx].nodeType === Node.TEXT_NODE) {
      oriChilds[oriIdx].textContent = transChilds[transIdx].textContent;
    } else {
      applyDfs(oriChilds[oriIdx], transChilds[transIdx]);
    }
  }
}

let cache = {};
let randomKey = Math.random().toString(36).substring(2, 12);

