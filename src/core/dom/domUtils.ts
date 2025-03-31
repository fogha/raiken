import { DOMNode } from '@/types/dom';

/**
 * Checks if an object is a DOMNode based on its properties
 */
export function isDOMNode(obj: any): obj is DOMNode {
  return (
    obj &&
    typeof obj === 'object' &&
    'tagName' in obj &&
    'children' in obj &&
    Array.isArray(obj.children)
  );
}

/**
 * Checks if an object is a DOM Element
 */
export function isDOMElement(obj: any): obj is Element {
  return (
    obj &&
    typeof obj === 'object' &&
    'tagName' in obj &&
    typeof obj.tagName === 'string' &&
    'getBoundingClientRect' in obj &&
    typeof obj.getBoundingClientRect === 'function'
  );
}
