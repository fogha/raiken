/**
 * React Component Prop Types
 */

import { ReactNode } from 'react';
import { DOMNode } from './dom';
import { TestTab, TestExecutionResult } from './test';

// Layout Component Props

export interface SideBarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export interface TopBarProps {
  title?: string;
  actions?: ReactNode;
}

// Core Component Props

export interface TestBuilderProps {
  onTestGenerated?: (test: string) => void;
  initialPrompt?: string;
  className?: string;
}

export interface TestScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'typescript' | 'javascript' | 'json';
  readOnly?: boolean;
  className?: string;
}

export interface TabbedTestEditorProps {
  tabs: TestTab[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabSave: (tabId: string) => void;
  onTabRun: (tabId: string) => void;
  className?: string;
}

export interface TestReportsProps {
  results?: Map<string, TestExecutionResult>;
  className?: string;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  [key: string]: any;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
}

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}
