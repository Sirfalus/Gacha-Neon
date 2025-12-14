(function () {
  class BBitsNav extends HTMLElement {
    static get observedAttributes() { return ['href', 'title', 'logo', 'size', 'bg']; }
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._rendered = false;
      this._isLoading = false;
    }

    connectedCallback() {
      if (!this._rendered) this.render();
    }

    attributeChangedCallback() {
      this.render();
    }

    render() {
      this._rendered = true;
      this._shadow.innerHTML = '';

      const href = this.getAttribute('href') || '/';
      const title = this.getAttribute('title') || 'BBits';
      const logo = this.getAttribute('logo');
      const size = parseInt(this.getAttribute('size') || '42', 10);

      const style = document.createElement('style');
      style.textContent = `
        :host { position: fixed; top: 12px; left: 12px; z-index: 10000; }
        a { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; position: relative; }
        .circle { width: ${size}px; height: ${size}px; border-radius: 50%; background: #ffffff; backdrop-filter: saturate(180%) blur(6px); border: 1px solid rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 8px rgba(0,0,0,0.32); position: relative; overflow: visible; }
        .circle.glow::after { content: ''; position: absolute; left: -6px; top: -6px; right: -6px; bottom: -6px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 50% 40%, rgba(0,180,255,0.22) 0%, rgba(0,180,255,0.08) 20%, rgba(0,180,255,0.02) 40%, rgba(0,180,255,0) 65%); filter: blur(12px); mix-blend-mode: screen; opacity: 0; transform: scale(0.98); transition: opacity 220ms ease, transform 220ms ease, filter 220ms ease; }
        .inner { width: calc(100% - 8px); height: calc(100% - 8px); border-radius: 50%; overflow: hidden; display:flex; align-items:center; justify-content:center; box-sizing: border-box; }
        a:hover .circle.glow::after, a:focus-within .circle.glow::after { opacity: 1; transform: scale(1.03); filter: blur(14px); }
        a { cursor: pointer; }
        img { width: 100%; height: 100%; object-fit: cover; display:block; background: transparent; transition: opacity 0.2s; }
        .title { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; font-weight: 600; font-size: 14px; color: #111; text-shadow: 0 1px 1px rgba(255,255,255,0.6); }
        
        /* Loading Spinner */
        .spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin: -10px 0 0 -10px;
          border: 2px solid rgba(0, 180, 255, 0.2);
          border-top: 2px solid #00b4ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          display: none;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Loading State */
        a.loading img { opacity: 0.3; filter: grayscale(100%); }
        a.loading .spinner { opacity: 1; display: block; }
        
        @media (max-width: 640px){ .title { display:none; } }
      `;

      const link = document.createElement('a');
      link.href = href;
      link.setAttribute('aria-label', title);

      // --- Loading Logic ---
      link.addEventListener('click', (e) => {
        // Allow ctrl/cmd/shift clicks to open in new tab normally
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        // If clicking same page hash/anchor, ignore
        const targetUrl = new URL(link.href, window.location.href);
        if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
          return;
        }

        // On normal navigation, show loading state
        this._isLoading = true;
        link.classList.add('loading');

        // If navigation is immediate, the browser will unload, so this visual persists until then.
        // If it's an SPA transition governed elsewhere, this might stick if not cleared.
        // For simplicity in this vanilla component, we just set it on click. 
        // We can add a fallback timeout to clear it if navigation is cancelled/fails (e.g., 5s).
        setTimeout(() => {
          this._isLoading = false;
          link.classList.remove('loading');
        }, 8000);
      });

      const circle = document.createElement('div');
      circle.className = 'circle';

      if (logo) {
        const inner = document.createElement('div');
        inner.className = 'inner';
        const img = document.createElement('img');
        img.src = logo;
        img.alt = title || '';
        img.decoding = 'async';
        inner.appendChild(img);
        circle.appendChild(inner);
        circle.classList.add('glow');
      } else {
        const span = document.createElement('span');
        span.className = 'title';
        span.textContent = title[0].toUpperCase();
        circle.appendChild(span);
      }

      // Add Spinner to Circle
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      circle.appendChild(spinner);

      link.appendChild(circle);

      if (!logo) {
        const text = document.createElement('span');
        text.className = 'title';
        text.textContent = title;
        link.appendChild(text);
      }

      this._shadow.appendChild(style);
      this._shadow.appendChild(link);
    }
  }
  customElements.define('bbits-nav', BBitsNav);
})();
