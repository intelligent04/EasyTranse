(() => {
  // 상태 변수
  let isTooltipEnabled = true;
  let miniPopup = null;
  const cache = {};
  let randomKey = generateRandomKey();

  // ==== 유틸 함수 ====

  function generateRandomKey() {
    return Math.random().toString(36).substring(2, 12);
  }

  // CSS 로드
  function loadPopupCSS() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("popup/selectPopup.css");
    document.head.appendChild(link);
  }

  // 특정 요소 번역 제외 판단
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

function collectTextNodes(el) {
  if (canSkip(el)) return [];

  let result = [];
  for (const node of el.childNodes) {
    if (canSkip(node)) continue;

    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      result.push({
        element: node,
        content: node.textContent.trim()
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "BR") {
        result.push({ element: node, content: "" });
      } else {
        // 재귀 호출 결과를 concat 으로 병합 → flatten 처리
        result = result.concat(collectTextNodes(node));
      }
    }
  }
  return result;
}

  // 전체 텍스트 노드 수집
  function getAllTextNodes() {
    return collectTextNodes(document.body);
  }

  // ==== 미니 팝업 생성 및 제어 ====

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

  // ==== 이벤트 핸들러 ====

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

  // ==== 번역 결과 페이지 적용 ====

  function applyDfs(originalNode, translatedNode) {
    console.log("applyDfs 작동")
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
    console.log("applyTranslatedText 작동")
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

  // ==== 백그라운드와 메시지 통신 ====

  function sendForeignTextToBackground(textNodes, key) {
    const originalTextArr = textNodes.map((node) => node.content);
    console.log("original txt");
    console.log(originalTextArr)
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
        console.log(message);
        const textNodes = cache[message.data.randomKey];
        const translatedTexts = message.data.strs;

        if (!textNodes || textNodes.length !== translatedTexts.length) {
          console.error("번역된 텍스트의 수가 일치하지 않습니다.");
          return;
        }
        console.log("translatedTexts")
        console.log(translatedTexts)
        applyTranslatedText(textNodes, translatedTexts);
        break;
      }
      case "TranslatedSelectedText": {
        // 메시지 구조 방어적으로 처리
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

  // ==== 초기화 ====

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
