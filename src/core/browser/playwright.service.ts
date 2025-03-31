import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { DOMNode } from '@/types/dom';

export class PlaywrightService {
  // Maps to store browser instances and pages for each script
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private activeScriptId: string | null = null;
  
  // Backwards compatibility for code that doesn't yet use scriptId
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  
  /**
   * Initialize a browser instance for a specific script
   * @param scriptId - Unique identifier for the script/browser instance
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
      console.log(`[Arten] Initializing ${browserType} browser for script ${scriptId}`);
      
      // Launch browser with the specified headless setting
      console.log(`[Arten] Launching ${browserType} browser with headless=${headless} for script ${scriptId}`);
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
      
      // Set as default for backward compatibility
      this.browser = browser;
      this.context = context;
      this.page = page;
    } catch (error) {
      console.error('Failed to initialize Playwright:', error);
      throw error;
    }
  }
  
  /**
   * Navigate to a URL using a specific script's browser instance
   * @param url - URL to navigate to
   * @param scriptId - ID of the script whose browser should navigate (uses active script if not specified)
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
      
      console.log(`[Arten] Navigating to ${url} with browser for script ${targetScriptId}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Update legacy reference if this is the active script
      if (targetScriptId === this.activeScriptId) {
        this.page = page;
      }
    } catch (error) {
      console.error(`[Arten] Failed to navigate to ${url} for script ${targetScriptId}:`, error);
      throw error;
    }
  }
  
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
            id: node.nodeType === 1 && (node as Element).id ? (node as Element).id : '',
            className: node.nodeType === 1 && typeof (node as Element).className === 'string' ? (node as Element).className : '',
            textContent: node.textContent ? node.textContent.trim().substring(0, 200) : '',
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
                  nodeObj.attributes[attr.name] = attr.value || '';
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
        case 'highlight':
          // Highlight the element by running a script to add a temporary outline
          await this.page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
              // Cast to HTMLElement to access style properties
              const htmlElement = element as HTMLElement;
              const originalOutline = htmlElement.style.outline;
              const originalZIndex = htmlElement.style.zIndex;
              
              htmlElement.style.outline = '3px solid red';
              htmlElement.style.zIndex = '9999';
              
              setTimeout(() => {
                htmlElement.style.outline = originalOutline;
                htmlElement.style.zIndex = originalZIndex;
              }, 1500);
            }
          }, action.selector);
          break;
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
   * Run a test script with its own browser instance
   * @param script - The test script content to execute
   * @param scriptId - Optional ID for this script (generated if not provided)
   * @param config - Optional configuration for this test run
   */
  async runTestScript(
    script: string, 
    scriptId?: string,
    config: {
      browserType?: 'chromium' | 'firefox' | 'webkit',
      headless?: boolean
    } = {}
  ): Promise<any> {
    // Generate a unique ID for this test if none provided
    const testId = scriptId || `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Extract configuration with defaults
    const browserType = config.browserType || 'chromium';
    const headless = config.headless !== undefined ? config.headless : true;
    
    console.log(`[Arten] Running test script with ID: ${testId}, headless: ${headless}`);
    
    // Close existing browser for this script ID if it exists to ensure clean state
    if (this.browsers.has(testId)) {
      await this.close(testId);
    }
    
    // Initialize a new browser for this test with the specified configuration
    await this.initialize(testId, browserType, headless);
    this.activeScriptId = testId;
    
    // Get the page for this script
    const page = this.pages.get(testId);
    if (!page) {
      throw new Error(`Failed to initialize page for test script ${testId}`);
    }
    
    // Update the legacy reference for backward compatibility
    this.page = page;
    
    // Check if we have a Playwright TypeScript test or JSON test
    const isPlaywrightTest = script.includes('import { test, expect }') || 
                            script.includes('@playwright/test');
    
    try {
      if (isPlaywrightTest) {
        return await this.executePlaywrightTest(script);
      }
      
      // Legacy JSON format handling
      console.log('Parsing JSON test script...');
      let testData;
      try {
        testData = JSON.parse(script);
      } catch (e) {
        if (isPlaywrightTest) {
          // This shouldn't happen since we already checked for Playwright test
          return await this.executePlaywrightTest(script);
        }
        return { 
          success: false, 
          error: 'Invalid test format - neither valid JSON nor recognized Playwright test' 
        };
      }
      
      const results = {
        success: true,
        name: testData.name,
        type: testData.type,
        steps: [] as any[],
        assertions: [] as any[],
        startTime: new Date().toISOString(),
        endTime: '',
        duration: 0
      };
      
      const startTime = Date.now();
      
      // Execute test steps
      console.log(`Executing test: ${testData.name}`);
      if (testData.steps && Array.isArray(testData.steps)) {
        for (let i = 0; i < testData.steps.length; i++) {
          const step = testData.steps[i];
          console.log(`Executing step ${i + 1}: ${step.action}`);
          
          const stepResult = { ...step, success: true, error: null };
          
          try {
            switch (step.action) {
              case 'navigate': {
                await this.navigate(step.url);
                break;
              }
              case 'click': {
                await this.page.click(step.element);
                break;
              }
              case 'type': {
                await this.page.fill(step.element, step.value);
                break;
              }
              case 'wait': {
                if (step.ms) {
                  await this.page.waitForTimeout(step.ms);
                } else if (step.element) {
                  await this.page.waitForSelector(step.element, { timeout: step.timeout || 5000 });
                }
                break;
              }
              default: {
                stepResult.success = false;
                stepResult.error = `Unknown action type: ${step.action}`;
              }
            }
          } catch (error) {
            stepResult.success = false;
            stepResult.error = error instanceof Error ? error.message : String(error);
          }
          
          results.steps.push(stepResult);
          
          // Stop execution if a step fails
          if (!stepResult.success) {
            results.success = false;
            break;
          }
        }
      }
      
      // Only run assertions if all steps passed
      if (results.success && testData.assertions && Array.isArray(testData.assertions)) {
        for (let i = 0; i < testData.assertions.length; i++) {
          const assertion = testData.assertions[i];
          console.log(`Checking assertion ${i + 1}: ${assertion.type}`);
          
          const assertionResult = { ...assertion, success: true, error: null };
          
          try {
            switch (assertion.type) {
              case 'element': {
                switch (assertion.condition) {
                  case 'visible': {
                    await this.page.waitForSelector(assertion.selector, { 
                      state: 'visible',
                      timeout: assertion.timeout || 5000 
                    });
                    break;
                  }
                  case 'hidden': {
                    await this.page.waitForSelector(assertion.selector, { 
                      state: 'hidden',
                      timeout: assertion.timeout || 5000 
                    });
                    break;
                  }
                  case 'contains': {
                    const text = await this.page.textContent(assertion.selector);
                    if (!text || !text.includes(assertion.value)) {
                      throw new Error(`Element ${assertion.selector} does not contain text: ${assertion.value}`);
                    }
                    break;
                  }
                  default: {
                    assertionResult.success = false;
                    assertionResult.error = `Unknown condition: ${assertion.condition}`;
                  }
                }
                break;
              }
              case 'url': {
                const currentUrl = this.page.url();
                if (assertion.condition === 'equals' && currentUrl !== assertion.value) {
                  throw new Error(`URL ${currentUrl} does not equal ${assertion.value}`);
                } else if (assertion.condition === 'contains' && !currentUrl.includes(assertion.value)) {
                  throw new Error(`URL ${currentUrl} does not contain ${assertion.value}`);
                }
                break;
              }
              default: {
                assertionResult.success = false;
                assertionResult.error = `Unknown assertion type: ${assertion.type}`;
              }
            }
          } catch (error) {
            assertionResult.success = false;
            assertionResult.error = error instanceof Error ? error.message : String(error);
          }
          
          results.assertions.push(assertionResult);
          
          // Stop execution if an assertion fails
          if (!assertionResult.success) {
            results.success = false;
            break;
          }
        }
      }
      
      // Calculate test duration
      const endTime = Date.now();
      results.endTime = new Date().toISOString();
      results.duration = endTime - startTime;
      
      console.log(`Test completed: ${results.success ? 'PASS' : 'FAIL'}`);
      return results;
    } catch (error) {
      console.error('Test execution failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 0
      };
    }
  }
  
  /**
   * Execute a Playwright test written in TypeScript
   * This performs a simplified execution of key actions from the script
   */
  private async executePlaywrightTest(script: string, scriptId?: string): Promise<any> {
    console.log(`[Arten] Executing Playwright TypeScript test for script ${scriptId || 'unknown'}...`);
    
    try {
      // Get the page for this script ID (or use legacy page as fallback)
      const targetScriptId = scriptId || this.activeScriptId || 'default';
      const page = this.pages.get(targetScriptId) || this.page;
      
      if (!page) {
        throw new Error(`No browser page available for script ${targetScriptId}`);
      }
      
      // Set up results structure first
      const results = {
        success: true,
        scriptId: targetScriptId,
        actions: [] as any[],
        startTime: new Date().toISOString(),
        endTime: '',
        duration: 0
      };
      
      const startTime = Date.now();
      
      // Extract URL from the script
      const urlMatch = script.match(/goto\(['"](https?:\/\/[^'"]+)['"]/); 
      const url = urlMatch ? urlMatch[1] : null;
      
      if (url) {
        console.log(`[Arten] Found URL in test: ${url}`);
        await this.navigate(url, targetScriptId);
        results.actions.push({ type: 'navigate', url, success: true });
      }
      
      // Extract click operations
      const clickPattern = /click\(['"]([^'"]+)['"]\)/g;
      let clickMatch;
      const clicks = [];
      
      while ((clickMatch = clickPattern.exec(script)) !== null) {
        if (clickMatch[1]) {
          clicks.push(clickMatch[1]);
        }
      }
      
      // Execute click operations
      for (const selector of clicks) {
        try {
          console.log(`[Arten] Clicking element: ${selector}`);
          await page.click(selector);
          results.actions.push({ type: 'click', selector, success: true });
        } catch (error) {
          console.error(`[Arten] Failed to click ${selector}:`, error);
          results.actions.push({ 
            type: 'click', 
            selector, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
          results.success = false;
        }
      }
      
      // Extract fill operations 
      const fillPattern = /\.fill\(['"](.[^'"]+)['"]\s*,\s*['"](.[^'"]+)['"]\)/g;
      let fillMatch;
      const fills = [];
      
      while ((fillMatch = fillPattern.exec(script)) !== null) {
        if (fillMatch[1] && fillMatch[2]) {
          fills.push({
            selector: fillMatch[1],
            value: fillMatch[2]
          });
        }
      }
      
      console.log(`[Arten] Found ${fills.length} fill operations in the test script`);
      
      // Execute fill operations
      for (const { selector, value } of fills) {
        try {
          console.log(`[Arten] Filling element: ${selector} with value: ${value}`);
          await this.page?.fill(selector, value);
          results.actions.push({ type: 'fill', selector, value, success: true });
        } catch (error) {
          console.error(`[Arten] Failed to fill ${selector}:`, error);
          results.actions.push({ 
            type: 'fill', 
            selector, 
            value, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
          results.success = false;
        }
      }
      
      // Calculate final duration and complete the test
      const endTime = Date.now();
      results.endTime = new Date().toISOString();
      results.duration = endTime - startTime;
      
      console.log('[Arten] Playwright test execution completed');
      return results;
    } catch (error) {
      console.error('[Arten] Error executing Playwright test:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 0
      };
    }
  }
  
  /**
   * Close a specific browser instance by script ID or all browser instances if no scriptId is provided
   * @param scriptId - ID of the script whose browser should be closed (closes all if not specified)
   */
  async close(scriptId?: string): Promise<void> {
    if (scriptId) {
      // Close a specific browser instance
      console.log(`[Arten] Closing browser for script ${scriptId}`);
      const browser = this.browsers.get(scriptId);
      if (browser) {
        await browser.close();
        this.browsers.delete(scriptId);
        this.contexts.delete(scriptId);
        this.pages.delete(scriptId);
        
        // If we closed the active script, clear active script id
        if (this.activeScriptId === scriptId) {
          this.activeScriptId = null;
          this.browser = null;
          this.context = null;
          this.page = null;
        }
      }
    } else {
      // Close all browser instances
      console.log('[Arten] Closing all browser instances');
      // Use Array.from to avoid downlevelIteration issues
      const browserEntries = Array.from(this.browsers.entries());
      for (const [scriptId, browser] of browserEntries) {
        await browser.close();
      }
      
      // Clear all maps
      this.browsers.clear();
      this.contexts.clear();
      this.pages.clear();
      
      // Reset legacy properties
      this.activeScriptId = null;
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

export default new PlaywrightService();
