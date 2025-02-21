// Script to be injected into target applications
export const generateInjectionScript = () => `
  (function() {
    window.__arten = {
      analyzeDom: () => {
        const processNode = (element) => {
          if (!element) return null;
          return {
            tagName: element.tagName?.toLowerCase() || '',
            id: element.id || '',
            className: element.className || '',
            textContent: element.textContent?.trim() || '',
            type: element instanceof HTMLInputElement ? element.type : 'element',
            children: Array.from(element.children || []).map(child => processNode(child)).filter(Boolean)
          };
        };

        const body = document.body;
        if (!body) return;

        const domTree = processNode(body);
        if (domTree) {
          window.parent.postMessage({ type: 'DOM_TREE_UPDATE', payload: domTree }, '*');
        }
      },

      highlight: {
        currentOverlay: null,
        
        show: (element) => {
          if (!element) return;
          
          // Remove existing overlay
          window.__arten.highlight.clear();
          
          // Create new overlay
          const overlay = document.createElement('div');
          const rect = element.getBoundingClientRect();
          
          Object.assign(overlay.style, {
            position: 'fixed',
            top: rect.top + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            backgroundColor: 'rgba(75, 85, 255, 0.2)',
            border: '2px solid rgb(75, 85, 255)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: '999999',
            transition: 'all 0.2s ease-in-out'
          });
          
          document.body.appendChild(overlay);
          window.__arten.highlight.currentOverlay = overlay;
          
          // Scroll element into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        
        clear: () => {
          if (window.__arten.highlight.currentOverlay) {
            window.__arten.highlight.currentOverlay.remove();
            window.__arten.highlight.currentOverlay = null;
          }
        }
      },

      findElement: (tagName, id, className) => {
        let selector = tagName || '*';
        
        if (id) {
          selector += '#' + CSS.escape(id);
        }
        
        if (className) {
          // Split class names and escape each one
          const classes = className.split(' ')
            .filter(c => c)
            .map(c => CSS.escape(c));
          
          // Add each class to the selector
          classes.forEach(c => {
            selector += '.' + c;
          });
        }

        try {
          return document.querySelector(selector);
        } catch (error) {
          console.error('Invalid selector:', selector);
          return null;
        }
      }
    };

    const init = () => {
      if (!document.body) {
        setTimeout(init, 100); // Retry if body not ready
        return;
      }
      window.__arten.analyzeDom();
      
      // Set up observer for dynamic changes
      const observer = new MutationObserver(() => window.__arten.analyzeDom());
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });

      // Add this inside the IIFE before the init() call
      window.addEventListener('message', (event) => {
        if (!event.data?.type) return;

        switch (event.data.type) {
          case 'HIGHLIGHT_ELEMENT':
            const { tagName, id, className } = event.data.payload;
            const element = window.__arten.findElement(tagName, id, className);
            if (element) window.__arten.highlight.show(element);
            break;

          case 'CLEAR_HIGHLIGHT':
            window.__arten.highlight.clear();
            break;
        }
      });
    };

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
`;

// Function to inject the script into an iframe
export const injectScript = (url: string) => {
  const script = generateInjectionScript();
  const encodedScript = btoa(script);
  const targetUrl = new URL(url);
  targetUrl.searchParams.set('arten-script', encodedScript);
  return targetUrl.toString();
};

// Generate the loader script that should be added to the target app's HTML
export const generateLoaderScript = () => {
  return `
    <!-- Arten Test Studio Integration -->
    <script>
      // Check if we have an Arten script to load
      const params = new URLSearchParams(window.location.search);
      const base64Script = params.get('arten-script');
      
      if (base64Script) {
        // Remove the parameter from URL to keep it clean
        params.delete('arten-script');
        const newUrl = window.location.pathname + 
          (params.toString() ? '?' + params.toString() : '') + 
          window.location.hash;
        window.history.replaceState({}, '', newUrl);

        // Decode and execute the script
        const scriptContent = atob(base64Script);
        const script = document.createElement('script');
        script.textContent = scriptContent; // Use textContent for inline script
        document.head.appendChild(script);
      }
    </script>
  `;
};
