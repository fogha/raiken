/**
 * DOM Helper Utilities
 */

import { DOMNode } from '@/types';

/**
 * Generate CSS selector for DOM node
 */
export function generateSelector(node: DOMNode): string {
  const selectors: string[] = [];
  
  // Add ID if available
  if (node.attributes?.id) {
    return `#${node.attributes.id}`;
  }
  
  // Add classes if available
  if (node.attributes?.class) {
    const classes = node.attributes.class.split(' ').filter(Boolean);
    if (classes.length > 0) {
      selectors.push(`.${classes.join('.')}`);
    }
  }
  
  // Add data-testid if available
  if (node.attributes?.['data-testid']) {
    return `[data-testid="${node.attributes['data-testid']}"]`;
  }
  
  // Add tag name
  selectors.unshift(node.tagName.toLowerCase());
  
  return selectors.join('');
}

/**
 * Get readable text content from DOM node
 */
export function getNodeText(node: DOMNode): string {
  if (node.textContent) {
    return node.textContent.trim();
  }
  
  // Try to get text from common attributes
  const textAttributes = ['alt', 'title', 'placeholder', 'aria-label'];
  for (const attr of textAttributes) {
    if (node.attributes?.[attr]) {
      return node.attributes[attr];
    }
  }
  
  return '';
}

/**
 * Check if DOM node is interactive
 */
export function isInteractiveElement(node: DOMNode): boolean {
  const interactiveTags = [
    'button', 'input', 'select', 'textarea', 'a', 'label'
  ];
  
  return interactiveTags.includes(node.tagName.toLowerCase()) ||
         node.attributes?.role === 'button' ||
         node.attributes?.contenteditable === 'true' ||
         !!node.attributes?.onclick;
}

/**
 * Get element path for debugging
 */
export function getElementPath(node: DOMNode): string {
  const path: string[] = [];
  let current = node;
  
  while (current && path.length < 10) {
    let selector = current.tagName.toLowerCase();
    
    if (current.attributes?.id) {
      selector += `#${current.attributes.id}`;
    } else if (current.attributes?.class) {
      const classes = current.attributes.class.split(' ').slice(0, 2);
      selector += `.${classes.join('.')}`;
    }
    
    path.unshift(selector);
    break; // For now, just show immediate element
  }
  
  return path.join(' > ');
}

/**
 * Find DOM nodes by predicate
 */
export function findNodes(
  root: DOMNode,
  predicate: (node: DOMNode) => boolean
): DOMNode[] {
  const results: DOMNode[] = [];
  
  function traverse(node: DOMNode) {
    if (predicate(node)) {
      results.push(node);
    }
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(root);
  return results;
}

/**
 * Filter nodes by tag name
 */
export function findByTagName(root: DOMNode, tagName: string): DOMNode[] {
  return findNodes(root, node => 
    node.tagName.toLowerCase() === tagName.toLowerCase()
  );
}

/**
 * Filter nodes by attribute
 */
export function findByAttribute(
  root: DOMNode,
  attributeName: string,
  attributeValue?: string
): DOMNode[] {
  return findNodes(root, node => {
    const value = node.attributes?.[attributeName];
    return value !== undefined && (
      attributeValue === undefined || value === attributeValue
    );
  });
}

/**
 * Get all form elements from DOM tree
 */
export function getFormElements(root: DOMNode): DOMNode[] {
  const formTags = ['input', 'select', 'textarea', 'button'];
  return findNodes(root, node => 
    formTags.includes(node.tagName.toLowerCase())
  );
}

/**
 * Get all clickable elements from DOM tree
 */
export function getClickableElements(root: DOMNode): DOMNode[] {
  return findNodes(root, isInteractiveElement);
}
