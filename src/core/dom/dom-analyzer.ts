import { DOMNode } from '@/types/dom';

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
    id: element.id || '',
    className: element.className || '',
    textContent: element.textContent || '',
    children: [],
    attributes: {},
    path: getElementPath(element, root),
  };

  // Log the node creation
  console.log('[domAnalyzer] Created node:', {
    tagName: node.tagName,
    path: node.path
  });

  // Capture all attributes
  Array.from(element.attributes).forEach(attr => {
    if (node.attributes) {
      node.attributes[attr.name] = attr.value;
    }
  });

  // Handle form elements
  if (element instanceof HTMLInputElement || 
      element instanceof HTMLTextAreaElement || 
      element instanceof HTMLSelectElement) {
    node.type = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    
    if (element instanceof HTMLInputElement && 
        (element.type === 'checkbox' || element.type === 'radio')) {
      // Add checked state to attributes
      if (node.attributes) {
        node.attributes['checked'] = element.checked.toString();
      }
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
