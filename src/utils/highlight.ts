let previousHighlight: HTMLElement | null = null;

export const highlightElement = (element: Element) => {
  // Remove previous highlight
  if (previousHighlight) {
    previousHighlight.style.removeProperty('outline');
    previousHighlight.style.removeProperty('outline-offset');
  }

  // Add new highlight
  if (element instanceof HTMLElement) {
    element.style.outline = '2px solid #3b82f6'; // blue-500
    element.style.outlineOffset = '2px';
    previousHighlight = element;

    // Scroll element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
};
