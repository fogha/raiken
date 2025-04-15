export interface ViewportState {
  width: number;
  height: number;
  scale: number;
  isMobile: boolean;
}

export interface StatusState {
  type: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'loading';
  timestamp: number;
}

export interface BrowserState {
  url: string | null;
  isLoading: boolean;
  isLaunched: boolean;
  viewport: ViewportState;
  error: string | null;
  status: StatusState | null;
} 