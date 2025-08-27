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
  // Create DOMNode structure
  const domNode: DOMNode = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || '',
    className: element.className || '',
    textContent: element.textContent || '',
    children: [],
    attributes: {},
    path: getElementPath(element, root),
  };

  // Process children recursively
  Array.from(element.children).forEach(child => {
    domNode.children.push(analyzeDOMTree(child));
  });

  return domNode;
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
