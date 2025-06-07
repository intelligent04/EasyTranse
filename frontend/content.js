(() => {
  let isTooltipEnabled = true;
  let miniPopup = null;
  const cache = {};
  let randomKey = generateRandomKey();

  function generateRandomKey() {
    return Math.random().toString(36).substring(2, 12);
  }

  function loadPopupCSS() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("popup/selectPopup.css");
    document.head.appendChild(link);
  }

  const bannedTagNames = ["SCRIPT", "SVG", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT"];

  function isInShadowDOM(el) {
    while (el) {
      if (el instanceof ShadowRoot) return true;
      el = el.parentNode;
    }
    return false;
  }

  function canSkip(el) {
    return (
      el.getAttribute?.("translate") === "no" ||
      el.classList?.contains("notranslate") ||
      bannedTagNames.includes(el.tagName) ||
      isInShadowDOM(el)
    );
  }

  function checkAllInline(el) {
    for (const child of el.childNodes) {
      if (canSkip(el)) continue;
      if (child.nodeType === Node.ELEMENT_NODE && window.getComputedStyle(child).display !== "inline") {
        return false;
      }
    }
    return true;
  }

  function isUselessText(text) {
    const commonUseless = [
      '확인', '취소', '공유', '메뉴', '로그인', '검색', '이전', '다음', '댓글', 
      'TOP', '바로가기', '홈', '더보기', '닫기'
    ];
    return (
      text.length < 2 ||
      /^[0-9]+$/.test(text) ||
      commonUseless.includes(text.trim())
    );
  }

  function collectTextNodes(el) {
    if (canSkip(el)) return [];

    const result = [];
    for (const node of el.childNodes) {
      if (canSkip(node)) continue;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text && !isUselessText(text)) {
          result.push({ element: node, content: text });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "BR") {
          result.push({ element: node, content: "" });
        } else if (checkAllInline(node)) {
          const inlineTexts = collectTextNodes(node);
          if (!inlineTexts.length) continue;

          const div = document.createElement("div");
          for (const item of inlineTexts) {
            if (item.element.nodeType === Node.TEXT_NODE) {
              div.appendChild(document.createTextNode(item.content));
            } else {
              const child = document.createElement(item.element.tagName);
              child.innerText = item.content;
              div.appendChild(child);
            }
          }
          result.push({ element: node, content: div.innerHTML });
        } else {
          result.push(...collectTextNodes(node));
        }
      }
    }
    return result;
  }

  function findMainContentNode() {
    const candidates = [
      'main', 'article', 'section', '#main', '#content',
      '.main', '.content', '.post', '.entry', '.blog-post', '.post-content'
    ];

    let bestNode = null;
    let maxTextLength = 0;

    for (const selector of candidates) {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((node) => {
        if (!node || node.offsetParent === null) return;
        const text = node.innerText?.trim();
        if (text && text.length > maxTextLength) {
          maxTextLength = text.length;
          bestNode = node;
        }
      });
    }

    return bestNode || document.body;
  }

  function getAllTextNodes() {
    const main = findMainContentNode();
    return collectTextNodes(main);
  }

  function createMiniPopup() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="transmate-mini-popup">
        <button id="translate-button">
          <img src="${chrome.runtime.getURL("icons/icon48.png")}" alt="Translate" />
          <h6>translate this text</h6>
        </button>
        <div id="vertical-line"></div>
        <button id="toggle-button">
          <img src="${chrome.runtime.getURL("icons/power.svg")}" alt="Toggle" />
        </button>
      </div>
    `;
    document.body.appendChild(wrapper);

    const translateBtn = wrapper.querySelector("#translate-button");
    const toggleBtn = wrapper.querySelector("#toggle-button");

    translateBtn.addEventListener("click", handleTranslate);
    toggleBtn.addEventListener("click", handleToggle);

    return wrapper.firstElementChild;
  }

  function showMiniPopup(x, y) {
    if (!miniPopup) miniPopup = createMiniPopup();
    miniPopup.style.left = `${x}px`;
    miniPopup.style.top = `${y}px`;
    miniPopup.style.display = "flex";
  }

  function hideMiniPopup() {
    if (miniPopup) miniPopup.style.display = "none";
  }

  function handleTranslate() {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      chrome.runtime.sendMessage({
        type: "TranslateSelectedText",
        data: { originalText: [selection] },
      });
    }
    hideMiniPopup();
  }

  function handleToggle() {
    isTooltipEnabled = false;
    chrome.storage.sync.set({ tooltipEnabled: false }, () => {
      chrome.runtime.sendMessage({
        type: "SettingsChanged",
        settings: { tooltipEnabled: false },
      });
    });
    hideMiniPopup();
  }

  function onMouseUp(e) {
    if (!isTooltipEnabled) return;
    const selection = window.getSelection().toString().trim();
    if (selection) {
      const range = window.getSelection().getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showMiniPopup(e.clientX, rect.bottom + window.scrollY);
    } else {
      hideMiniPopup();
    }
  }

  function applyDfs(originalNode, translatedNode) {
    const oriChilds = originalNode.childNodes;
    const transChilds = translatedNode.childNodes;
    let transIdx = 0;

    for (let oriIdx = 0; oriIdx < oriChilds.length; oriIdx++) {
      if (oriChilds[oriIdx].textContent.trim() === "" && oriChilds[oriIdx].tagName !== "BR") {
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
      transIdx++;
    }
  }

  function applyTranslatedText(textNodes, translatedTexts) {
    for (let i = 0; i < textNodes.length; i++) {
      if (textNodes[i].element.nodeType === Node.TEXT_NODE) {
        textNodes[i].element.textContent = translatedTexts.strs[i];
      } else {
        const div = document.createElement("div");
        div.innerHTML = translatedTexts.strs[i];
        applyDfs(textNodes[i].element, div);
      }
    }
  }

  function sendForeignTextToBackground(textNodes, key) {
    const originalTextArr = textNodes.map((node) => node.content);
    chrome.runtime.sendMessage({
      type: "originalText",
      data: {
        originalText: originalTextArr,
        randomKey: key,
      },
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "TranslatePage": {
        const textNodes = getAllTextNodes();
        cache[randomKey] = textNodes;
        sendForeignTextToBackground(textNodes, randomKey);
        break;
      }
      case "TranslatedText": {
        const textNodes = cache[message.data.randomKey];
        const translatedTexts = message.data;
        if (!textNodes || textNodes.length !== translatedTexts.strs.length) {
          console.error("번역된 텍스트의 수가 일치하지 않습니다.");
          return;
        }
        applyTranslatedText(textNodes, translatedTexts);
        break;
      }
      case "TranslatedSelectedText": {
        const strsContainer = message.data?.strs || {};
        const strsArray = Array.isArray(strsContainer.strs)
          ? Object.values(strsContainer.strs)
          : Array.isArray(strsContainer)
          ? strsContainer
          : [];
        if (strsArray.length > 0) {
          showTranslationPopup(strsArray[0]);
        }
        break;
      }
    }
  });

  chrome.storage.sync.get(["tooltipEnabled"], (data) => {
    isTooltipEnabled = data.tooltipEnabled !== undefined ? data.tooltipEnabled : true;
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SettingsChanged") {
      isTooltipEnabled = message.settings.tooltipEnabled;
    }
  });

  document.addEventListener("mouseup", onMouseUp);
  loadPopupCSS();
})();