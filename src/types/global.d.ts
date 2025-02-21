interface Window {
  __arten: {
    startRecording: (callback: (event: RecordedEvent) => void) => void;
    stopRecording: () => void;
    sendMessage: (type: string, payload: any) => void;
    getElementPath: (element: Element) => string;
    analyzeDOMStream: () => Promise<void>;
    highlight: {
      show: (selector: string, scroll?: boolean) => void;
      clear: () => void;
    };
    assert: (selector: string, assertion: (element: Element) => Promise<boolean>) => Promise<boolean>;
  }
} 