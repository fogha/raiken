import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { DOMNode } from '@/types/dom';

/**
 * PlaywrightService - Browser automation for DOM extraction and interactive browsing
 * 
 * This service handles:
 * - DOM tree extraction for AI test generation
 * - Interactive browsing and element selection
 * - Screenshot capture for visual feedback
 * - Page navigation and manipulation
 * 
 * Note: Actual test execution is handled by the CLI bridge system, not this service.
 * This service is focused on real-time browser interaction within the web UI.
 */
export class PlaywrightService {
  // Maps to store browser instances and pages for DOM extraction and interactive browsing
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private activeScriptId: string | null = null;
  
  // Default browser instance for DOM extraction and interactive browsing
  private browser: Browser | null = null;
  private page: Page | null = null;
  
  /**
   * Initialize a browser instance for DOM extraction and interactive browsing
   * @param scriptId - Unique identifier for the browser session
   * @param browserType - Type of browser to launch
   * @param headless - Whether to run browser in headless mode (invisible) or normal mode (visible)
   */
  async initialize(
    scriptId: string = 'default',
    browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium',
    headless: boolean = true
  ): Promise<void> {
    // If this is a new script, set it as active
    if (scriptId) {
      this.activeScriptId = scriptId;
    }
    
    // Check if browser already exists for this script
    if (this.browsers.has(scriptId)) return;
    
    try {      
      console.log(`[Raiken] Launching ${browserType} browser with headless=${headless} for session ${scriptId}`);
      const browser = await (browserType === 'firefox' 
        ? firefox.launch({ headless }) 
        : browserType === 'webkit' 
          ? webkit.launch({ headless }) 
          : chromium.launch({ headless }));
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Store browser, context, and page in their respective maps
      this.browsers.set(scriptId, browser);
      this.contexts.set(scriptId, context);
      this.pages.set(scriptId, page);
      
      // Set as default for DOM extraction and interactive browsing
      this.browser = browser;
      this.page = page;
    } catch (error) {
      console.error('Failed to initialize Playwright:', error);
      throw error;
    }
  }
  
  /**
   * Navigate to a URL for DOM extraction and interactive browsing
   * @param url - URL to navigate to
   * @param scriptId - ID of the browser session (uses active session if not specified)
   */
  async navigate(url: string, scriptId?: string): Promise<void> {
    const targetScriptId = scriptId || this.activeScriptId || 'default';
    
    // Make sure browser is initialized for this script before navigating
    if (!this.browsers.has(targetScriptId)) {
      await this.initialize(targetScriptId);
    }
    
    const page = this.pages.get(targetScriptId);
    
    try {
      // Ensure page is defined after initialization
      if (!page) {
        throw new Error(`Failed to initialize page for script ${targetScriptId}`);
      }
      
      console.log(`[Raiken] Navigating to ${url} with browser session ${targetScriptId}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Update default reference if this is the active session
      if (targetScriptId === this.activeScriptId) {
        this.page = page;
      }
    } catch (error) {
      console.error(`[Raiken] Failed to navigate to ${url} for script ${targetScriptId}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract DOM tree from the current page for test generation and element selection
   * @returns Complete DOM tree with selectors and metadata
   */
  async extractDOM(): Promise<DOMNode> {
    // Make sure browser is initialized before extracting DOM
    if (!this.browser || !this.page) {
      await this.initialize();
    }
    
    try {
      // Ensure page is defined after initialization
      if (!this.page) {
        throw new Error('Failed to initialize page');
      }
      const domTree = await this.page.evaluate(() => {
        // Extract a single node and its children recursively
        function extractNode(node: Node | null, maxDepth = 15, currentDepth = 0): any {
          if (!node || currentDepth > maxDepth) return null;
          
          // Helper function to sanitize strings for JSON serialization
          function sanitizeString(str: string): string {
            if (!str) return '';
            return str
              .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
              .replace(/\\/g, '\\\\') // Escape backslashes
              .replace(/"/g, '\\"') // Escape quotes
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          }
          
          // Create basic node object with safe property access
          const nodeObj: {
            nodeType: number,
            tagName: string,
            id: string,
            className: string,
            textContent: string,
            attributes: Record<string, string>,
            path: string,
            children: any[],
            hasShadowRoot?: boolean,
            isFromShadowDOM?: boolean
          } = {
            nodeType: node.nodeType || 0,
            tagName: node.nodeType === 1 && (node as Element).tagName ? (node as Element).tagName.toLowerCase() : '#text',
            id: node.nodeType === 1 && (node as Element).id ? sanitizeString((node as Element).id) : '',
            className: node.nodeType === 1 && typeof (node as Element).className === 'string' ? sanitizeString((node as Element).className) : '',
            textContent: node.textContent ? sanitizeString(node.textContent).substring(0, 200) : '',
            attributes: {},
            path: '',
            children: []
          };
          
          // Extract attributes for element nodes
          if (node.nodeType === 1 && (node as Element).hasAttributes && (node as Element).hasAttributes()) {
            try {
              for (let i = 0; i < (node as Element).attributes.length; i++) {
                const attr = (node as Element).attributes[i];
                                  if (attr && attr.name) {
                    nodeObj.attributes[sanitizeString(attr.name)] = sanitizeString(attr.value || '');
                  }
              }
            } catch (e) {
              console.warn('Error extracting attributes:', e);
            }
          }
          
          // Build CSS path for element nodes
          if (node.nodeType === 1) {
            let path = [];
            try {
              let current: Node | null = node;
              while (current && current !== document.documentElement && current.nodeType === 1) {
                if (!(current as Element).tagName) break;
                
                let selector = (current as Element).tagName.toLowerCase();
                
                // Add id if available (most specific)
                if ((current as Element).id) {
                  selector += `#${(current as Element).id}`;
                  path.unshift(selector);
                  break;
                } 
                // Otherwise add classes if available
                else if ((current as Element).className && typeof (current as Element).className === 'string') {
                  const classes = (current as Element).className.trim().split(/\s+/).filter(Boolean);
                  if (classes.length > 0) {
                    selector += `.${classes.join('.')}`;
                  }
                }
                
                // Add nth-of-type for siblings disambiguation
                try {
                  const parentElement = current.parentElement;
                  if (parentElement) {
                    const siblings = Array.from(parentElement.children).filter((el: Element) => {
                      return el.tagName && (current as Element).tagName && el.tagName.toLowerCase() === (current as Element).tagName.toLowerCase();
                    });
                    
                    if (siblings.length > 1) {
                      const index = siblings.indexOf(current as Element) + 1;
                      if (index > 0) {
                        selector += `:nth-of-type(${index})`;
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Error calculating nth-of-type:', e);
                }
                
                path.unshift(selector);
                current = current.parentElement || null;
              }
            } catch (e) {
              console.warn('Error building selector path:', e);
            }
            
            nodeObj.path = path.join(' > ');
          }
          
          // Extract child nodes
          if (node.childNodes && node.childNodes.length > 0) {
            try {
              Array.from(node.childNodes)
                .filter((child: Node) => {
                  // Only include element nodes or non-empty text nodes
                  return child.nodeType === 1 || (child.nodeType === 3 && child.textContent && child.textContent.trim());
                })
                .forEach((child: Node) => {
                  try {
                    const childNode = extractNode(child, maxDepth, currentDepth + 1);
                    if (childNode) {
                      nodeObj.children.push(childNode);
                    }
                  } catch (childError) {
                    console.warn('Error processing child node:', childError);
                  }
                });
            } catch (e) {
              console.warn('Error processing child nodes:', e);
            }
          }
          
          // Extract shadow DOM if present
          if (node.nodeType === 1 && (node as Element).shadowRoot) {
            try {
              nodeObj.hasShadowRoot = true;
              const shadowRoot = (node as Element).shadowRoot;
              
              if (shadowRoot && shadowRoot.childNodes) {
                Array.from(shadowRoot.childNodes)
                  .filter((child: Node) => {
                    return child.nodeType === 1 || (child.nodeType === 3 && child.textContent && child.textContent.trim());
                  })
                  .forEach((child: Node) => {
                    try {
                      const shadowNode = extractNode(child, maxDepth, currentDepth + 1);
                      if (shadowNode) {
                        shadowNode.isFromShadowDOM = true;
                        nodeObj.children.push(shadowNode);
                      }
                    } catch (shadowError) {
                      console.warn('Error processing shadow DOM node:', shadowError);
                    }
                  });
              }
            } catch (e) {
              console.warn('Error processing shadow DOM:', e);
            }
          }
          
          return nodeObj;
        }
        
        // Start extraction from document root
        try {
          return extractNode(document.documentElement);
        } catch (e) {
          console.error('DOM extraction failed:', e);
          return null;
        }
      });
      
      if (!domTree) {
        throw new Error('Failed to extract DOM tree');
      }
      
      return domTree as DOMNode;
    } catch (error) {
      console.error('Failed to extract DOM:', error);
      throw error;
    }
  }
  
  /**
   * Take a screenshot of the current page for visual feedback and debugging
   * @param options Screenshot options
   * @returns Base64 encoded screenshot data URL
   */
  async takeScreenshot(options: {
    fullPage?: boolean;
    quality?: number;
    type?: 'png' | 'jpeg';
    clip?: { x: number; y: number; width: number; height: number };
  } = {}): Promise<string> {
    // Make sure browser is initialized before taking screenshot
    if (!this.browser || !this.page) {
      await this.initialize();
    }
    
    try {
      // Ensure page is defined after initialization
      if (!this.page) {
        throw new Error('Failed to initialize page');
      }
      
      const screenshotOptions: any = {
        fullPage: options.fullPage !== false, // Default to full page
        type: options.type || 'png',
        clip: options.clip
      };
      
      // Only add quality for JPEG screenshots
      if (options.type === 'jpeg' && options.quality !== undefined) {
        screenshotOptions.quality = options.quality;
      }
      
      const screenshot = await this.page.screenshot(screenshotOptions);
      
      const base64 = screenshot.toString('base64');
      return `data:image/${options.type || 'png'};base64,${base64}`;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  /**
   * Get current page information for context and debugging
   * @returns Page URL, title, and viewport dimensions
   */
  async getPageInfo(): Promise<{
    url: string;
    title: string;
    viewport: { width: number; height: number } | null;
  }> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    
    try {
      const url = this.page.url();
      const title = await this.page.title();
      const viewport = this.page.viewportSize();
      
      return { url, title, viewport };
    } catch (error) {
      console.error('Failed to get page info:', error);
      throw error;
    }
  }
  
  /**
   * Execute interactive actions for testing and element manipulation
   * Note: This is for interactive browsing only. Actual test execution is handled by CLI bridge.
   * @param action Action to execute (click, type, select, etc.)
   * @returns Action result
   */
  async executeAction(action: { type: string; selector: string; value?: string; property?: string }): Promise<any> {
    // Make sure browser is initialized before executing actions
    if (!this.browser || !this.page) {
      await this.initialize();
    }
    
    // Ensure page is defined after initialization
    if (!this.page) {
      throw new Error('Failed to initialize page');
    }
    
    try {
      switch (action.type) {
        case 'click':
          await this.page.click(action.selector);
          break;
        case 'type':
          await this.page.fill(action.selector, action.value || '');
          break;
        case 'select':
          await this.page.selectOption(action.selector, action.value || '');
          break;
        case 'check':
          await this.page.check(action.selector);
          break;
        case 'uncheck':
          await this.page.uncheck(action.selector);
          break;
        case 'screenshot':
          return await this.page.screenshot();
        case 'edit':
          // Edit element properties like text content, id, or class
          if (!action.property) {
            throw new Error('Property must be specified for edit actions');
          }
          
          await this.page.evaluate(
            ({ selector, property, value }) => {
              const element = document.querySelector(selector);
              if (!element) return false;
              
              switch (property) {
                case 'text':
                  element.textContent = value;
                  break;
                case 'id':
                  element.id = value;
                  break;
                case 'className':
                case 'class':
                  element.className = value;
                  break;
                default:
                  // For any other properties
                  (element as any)[property] = value;
              }
              
              return true;
            },
            { selector: action.selector, property: action.property, value: action.value || '' }
          );
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
      throw error;
    }
  }
  
  /**
   * Close browser instances for cleanup
   * @param scriptId - ID of the browser session to close (closes all if not specified)
   */
  async close(scriptId?: string): Promise<void> {
    if (scriptId) {
      // Close a specific browser instance
      console.log(`[Raiken] Closing browser session ${scriptId}`);
      const browser = this.browsers.get(scriptId);
      if (browser) {
        await browser.close();
        this.browsers.delete(scriptId);
        this.contexts.delete(scriptId);
        this.pages.delete(scriptId);
        
        // If we closed the active session, clear references
        if (this.activeScriptId === scriptId) {
          this.activeScriptId = null;
          this.browser = null;
          this.page = null;
        }
      }
    } else {
      // Close all browser instances
      console.log('[Raiken] Closing all browser instances');
      // Use Array.from to avoid downlevelIteration issues
      const browserEntries = Array.from(this.browsers.entries());
      for (const [scriptId, browser] of browserEntries) {
        await browser.close();
      }
      
      // Clear all maps
      this.browsers.clear();
      this.contexts.clear();
      this.pages.clear();
      
      // Reset default references
      this.activeScriptId = null;
      this.browser = null;
      this.page = null;
    }
  }
}

const playwrightService = new PlaywrightService();
export default playwrightService;
