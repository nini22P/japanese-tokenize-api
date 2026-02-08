// ==UserScript==
// @name         Google Sheets - Japanese Tokenizer
// @version      26.02.08.2
// @match        https://docs.google.com/spreadsheets/d/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @downloadURL  https://github.com/nini22P/japanese-tokenize-api/raw/refs/heads/main/google-sheets.user.js
// @updateURL    https://github.com/nini22P/japanese-tokenize-api/raw/refs/heads/main/google-sheets.user.js
// ==/UserScript==

(function () {
  'use strict';

  let targetCols = GM_getValue('target_cols', 'E').toUpperCase().split(',').map(s => s.trim());
  let lastText = "";

  const container = document.createElement('div');
  container.id = 'custom-info-bar-container';
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e8eaed',
    height: '50px',
    width: '100%',
    boxSizing: 'border-box'
  });

  const infoBar = document.createElement('div');
  infoBar.id = 'custom-info-bar';
  Object.assign(infoBar.style, {
    padding: '0px 8px',
    fontSize: '14px',
    color: '#202124',
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    gap: '6px',
    height: '100%',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    flexGrow: '1',
    borderRight: '1px solid #e8eaed',
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '⚙️';
  settingsBtn.title = `当前监听列: ${targetCols.join(', ')}`;
  Object.assign(settingsBtn.style, {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0 6px',
    height: '100%',
    color: '#5f6368',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: '1px solid #f1f3f4'
  });

  container.appendChild(infoBar);
  container.appendChild(settingsBtn);

  settingsBtn.onclick = () => {
    const current = targetCols.join(', ');
    const input = prompt("请输入要触发分词的列号（多个请用逗号隔开，例如: E, G, H）:", current);
    if (input !== null) {
      const newCols = input.toUpperCase().split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (newCols.length > 0) {
        targetCols = newCols;
        GM_setValue('target_cols', targetCols.join(','));
        settingsBtn.title = `当前监听列: ${targetCols.join(', ')}`;
        alert(`设置已保存！当前监听列: ${targetCols.join(', ')}`);
        sync();
      }
    }
  };

  infoBar.addEventListener('wheel', (e) => {
    if (infoBar.scrollWidth > infoBar.clientWidth) {
      e.preventDefault();
      infoBar.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  const style = document.createElement('style');
  style.textContent = `
        #custom-info-bar::-webkit-scrollbar {
            height: 2px;
        }
        #custom-info-bar::-webkit-scrollbar-track {
            background: transparent;
        }
        #custom-info-bar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.25);
            border-radius: 10px;
        }
        #custom-info-bar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.5);
        }
    `;
  document.head.appendChild(style);

  injectBar();

  function injectBar() {
    const formulaContainer = document.getElementById('formula-bar-container');
    if (formulaContainer && !document.getElementById('custom-info-bar-container')) {
      formulaContainer.appendChild(container);
      formulaContainer.style.display = 'flex';
      formulaContainer.style.flexDirection = 'column';
    }
  }

  function renderTokens(tokens) {
    infoBar.scrollTo({ left: 0, behavior: 'smooth' });
    infoBar.textContent = '';

    tokens.forEach(token => {
      const tokenGroup = document.createElement('div');
      tokenGroup.style.display = 'inline-flex';
      tokenGroup.style.alignItems = 'flex-end';
      tokenGroup.style.marginBottom = '3px';

      if (token.p.includes('記号') || token.s.includes('[') || token.s.includes(']') || token.s.includes('|')) {
        const symbolSpan = document.createElement('span');
        symbolSpan.textContent = token.s;
        symbolSpan.style.padding = '0 2px';
        tokenGroup.appendChild(symbolSpan);
        infoBar.appendChild(tokenGroup);
        return;
      }

      const ruby = document.createElement('ruby');
      ruby.style.display = 'inline-flex';
      ruby.style.flexDirection = 'column-reverse';
      ruby.style.alignItems = 'center';
      const surfaceText = document.createTextNode(token.s);
      ruby.appendChild(surfaceText);

      const rt = document.createElement('rt');
      rt.style.display = 'flex';
      rt.style.flexDirection = 'column';
      rt.style.alignItems = 'center';
      rt.style.fontSize = '12px';
      rt.style.lineHeight = '1.3';
      rt.style.color = '#1a73e8';

      const romaSpan = document.createElement('span');
      romaSpan.style.color = '#5f6368';
      romaSpan.style.fontWeight = 'normal';
      romaSpan.textContent = token.r;
      rt.appendChild(romaSpan);

      if (token.h) {
        const hiraSpan = document.createElement('span');
        hiraSpan.textContent = token.h;
        rt.appendChild(hiraSpan);
      }

      ruby.appendChild(rt);
      tokenGroup.appendChild(ruby);

      const posContainer = document.createElement('div');
      posContainer.style.display = 'inline-flex';
      posContainer.style.flexDirection = 'column';
      posContainer.style.flexWrap = 'wrap';
      posContainer.style.maxHeight = '48px';
      posContainer.style.gap = '2px';
      posContainer.style.marginLeft = '4px';
      posContainer.style.marginBottom = '1px';
      posContainer.style.alignContent = 'flex-start';

      const posTags = token.p.split(',');

      posTags.forEach(tag => {
        if (tag.trim()) {
          const posLabel = document.createElement('span');
          posLabel.style.display = 'inline-block';
          posLabel.style.fontSize = '11px';
          posLabel.style.color = '#70757a';
          posLabel.style.backgroundColor = '#f1f3f4';
          posLabel.style.borderRadius = '2px';
          posLabel.style.whiteSpace = 'nowrap';
          posLabel.style.padding = '1px 2px 0.5px 2px';
          posLabel.style.verticalAlign = 'middle';
          posLabel.textContent = tag;

          posContainer.appendChild(posLabel);
        }
      });

      tokenGroup.appendChild(posContainer);
      infoBar.appendChild(tokenGroup);
    });
  }

  async function sync() {
    const nameBox = document.getElementById('t-name-box');
    if (!nameBox) return;

    const coord = nameBox.value;
    if (!coord || coord.includes(':')) return;

    const match = coord.match(/^[A-Z]+/);
    if (!match) return;
    const currentCol = match[0];

    if (targetCols.includes(currentCol)) {
      const cellInput = document.querySelector('.cell-input');
      if (!cellInput) return;
      let text = cellInput.innerText.trim();

      if (text.includes('][')) {
        const regex = /\[([^|\]]+)\|([^|\]]+)\]/g;

        text = text.replace(/(\[[^|\]]+\|[^|\]]+\]){2,}/g, (fullMatch) => {
          let subMatches = Array.from(fullMatch.matchAll(regex));
          let p = "", b = "";

          subMatches.forEach(m => {
            p += m[1];
            b += m[2];
          });
          return `[${p.replace(/・+/g, '・')}|${b}]`;
        });
      }

      if (text && text !== lastText) {
        lastText = text;
        GM_xmlhttpRequest({
          method: "POST",
          url: "http://localhost:3000/tokenize",
          data: JSON.stringify({ text: text }),
          headers: { "Content-Type": "application/json" },
          onload: function (response) {
            try {
              const tokens = JSON.parse(response.responseText);
              renderTokens(tokens);
            } catch (e) { console.error("解析失败", e); }
          }
        });
      }
    }
  }

  document.addEventListener('mouseup', () => setTimeout(sync, 100));
  document.addEventListener('keyup', (e) => {
    if (e.key.includes('Arrow') || e.key === 'Enter') setTimeout(sync, 100);
  });
})();