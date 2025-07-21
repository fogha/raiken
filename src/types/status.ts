export type StatusType = 'idle' | 'loading' | 'success' | 'error' | 'info';

export type StatusLevel = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface StatusState {
  type: string;
  message: string;
  level: StatusLevel;
  timestamp: number;
} 