// ==UserScript==
// @name         Google Sheets 校对助手
// @match        https://docs.google.com/spreadsheets/d/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_COL_LETTER = 'E';
  let lastText = "";

  const infoBar = document.createElement('div');
  infoBar.id = 'custom-info-bar';
  Object.assign(infoBar.style, {
    padding: '0px 8px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e8eaed',
    fontSize: '14px',
    color: '#202124',
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    gap: '4px',
    height: '48px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  });

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
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
        }
        #custom-info-bar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
        }
    `;
  document.head.appendChild(style);

  injectBar();

  function injectBar() {
    const container = document.getElementById('formula-bar-container');
    if (container && !document.getElementById('custom-info-bar')) {
      container.appendChild(infoBar);
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
    }
  }

  function renderTokens(tokens) {
    infoBar.scrollTo({ left: 0, behavior: 'smooth' });
    infoBar.textContent = '';

    tokens.forEach(token => {
      const tokenGroup = document.createElement('div');
      tokenGroup.style.display = 'inline-flex';
      tokenGroup.style.alignItems = 'flex-end';
      tokenGroup.style.marginBottom = '4px';

      if (token.p === '記号' || token.s.includes('[') || token.s.includes(']') || token.s.includes('|')) {
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
      rt.style.fontSize = '11px';
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

      const posLabel = document.createElement('span');
      posLabel.style.fontSize = '10px';
      posLabel.style.color = '#70757a';
      posLabel.style.backgroundColor = '#f1f3f4';
      posLabel.style.padding = '1px';
      posLabel.style.borderRadius = '3px';
      posLabel.style.marginLeft = '2px';
      posLabel.textContent = token.p;

      tokenGroup.appendChild(posLabel);
      infoBar.appendChild(tokenGroup);
    });
  }

  async function sync() {

    const nameBox = document.getElementById('t-name-box');
    if (!nameBox) return;
    const coord = nameBox.value;
    if (coord && coord.startsWith(TARGET_COL_LETTER) && !coord.includes(':')) {
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

          let optimizedP = p.replace(/・+/g, '・');

          return `[${optimizedP}|${b}]`;
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