interface Window {
  __raiken: {
    startRecording: (callback: (event: RecordedEvent) => void) => void;
    stopRecording: () => void;
    sendMessage: (type: string, payload: any) => void;
    getElementPath: (element: Element) => string;
    analyzeDOMStream: () => Promise<void>;
    assert: (selector: string, assertion: (element: Element) => Promise<boolean>) => Promise<boolean>;
  }
} 