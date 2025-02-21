export interface DOMNode {
  tagName: string;
  id: string;
  className: string;
  path: string;
  type: 'element' | 'text';
  children: DOMNode[];
  isComponent?: boolean;
  componentName?: string;
  textContent?: string;
  placeholder?: string;
  value?: string;
  checked?: boolean;
}

const getElementPath = (element: Element, root: Element): string => {
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== root && current.parentElement) {
    let selector = current.tagName.toLowerCase();
    const index = Array.from(current.parentElement.children)
      .filter(child => child.tagName === current!.tagName)
      .indexOf(current) + 1;
    
    if (current.id) {
      // If element has an ID, use it
      selector = `${selector}#${current.id}`;
    } else if (index > 1) {
      // If it's not the first element of its type, add nth-of-type
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
};

let nodeCounter = 0;

export const analyzeDOMTree = (element: Element, root: Element = element): DOMNode => {
  const node: DOMNode = {
    tagName: element.tagName.toLowerCase(),
    children: [],
    attributes: {},
    path: getElementPath(element, root),
    index: element.parentElement 
      ? Array.from(element.parentElement.children).indexOf(element)
      : 0,
  };

  // Log the node creation
  console.log('[domAnalyzer] Created node:', {
    tagName: node.tagName,
    path: node.path
  });

  // Capture all attributes
  Array.from(element.attributes).forEach(attr => {
    node.attributes[attr.name] = attr.value;
  });

  // Handle class names
  if (element.className) {
    node.className = element.className.toString();
  }

  // Handle ID
  if (element.id) {
    node.id = element.id;
  }

  // Handle form elements
  if (element instanceof HTMLInputElement || 
      element instanceof HTMLTextAreaElement || 
      element instanceof HTMLSelectElement) {
    node.type = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    node.value = element.value;
    node.placeholder = element.getAttribute('placeholder') || undefined;
    
    if (element instanceof HTMLInputElement && 
        (element.type === 'checkbox' || element.type === 'radio')) {
      node.checked = element.checked;
    }
  }

  // Handle text content for leaf nodes
  if (element.children.length === 0 && element.textContent?.trim()) {
    node.textContent = element.textContent.trim();
  }

  // Detect React components
  const reactFiber = Object.keys(element).find(key => 
    key.startsWith('__reactFiber$') || 
    key.startsWith('__reactProps$')
  );
  
  if (reactFiber || element.hasAttribute('data-reactroot')) {
    node.isComponent = true;
    
    // Try to determine component name from various sources
    const possibleComponentName = 
      element.getAttribute('data-testid') || 
      element.getAttribute('data-component') ||
      (element.className && element.className.toString()
        .split(' ')
        .find(cls => /^[A-Z]/.test(cls))) ||
      (reactFiber && 'ReactComponent');

    if (possibleComponentName) {
      node.componentName = possibleComponentName;
    }
  }

  // Recursively analyze child nodes
  Array.from(element.children).forEach(child => {
    node.children.push(analyzeDOMTree(child));
  });

  return node;
};

export const connectToLocalProject = async (url: string): Promise<DOMNode | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to connect to ${url}`);
    }
    
    // We'll need to inject this script into the target page
    // This will be handled by the iframe approach in the component
    return null;
  } catch (error) {
    console.error('Failed to connect to local project:', error);
    return null;
  }
};
