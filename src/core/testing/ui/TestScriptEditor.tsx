"use client"

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Code } from 'lucide-react';
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('react-monaco-editor').then(mod => mod.default), { ssr: false, loading: () => <div className="flex items-center justify-center h-[300px] border rounded-md bg-muted">Loading editor...</div> });

export interface TestScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'typescript' | 'javascript' | 'json';
  error?: boolean;
  hideHeader?: boolean;
}

export function TestScriptEditor({ value, onChange, language = 'typescript', error, hideHeader = false }: TestScriptEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatSuccess, setFormatSuccess] = useState<boolean | null>(null);
  const [editorMounted, setEditorMounted] = useState(false);
  const { theme } = useTheme();
  
  /**
   * Default configuration for Monaco Editor with optimized settings for code editing
   * These settings prioritize readability and ease of use
   */
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line' as const,
    automaticLayout: true,
    minimap: { enabled: false }, // Disable minimap for cleaner UI
    scrollBeyondLastLine: false,
    lineNumbers: 'on' as const,
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 2,
    wordWrap: 'on' as const, // Enable word wrap by default
    scrollbar: {
      useShadows: false,
      verticalHasArrows: true,
      horizontalHasArrows: true,
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    codeLens: false, // Disable CodeLens feature
  };

  /**
   * Handle editor initialization after mounting
   * Sets up editor focus, options and keyboard shortcuts
   */
  const handleEditorDidMount = (editor: any, monaco: any) => {
    console.log('[Arten] Monaco editor mounted');
    setEditorMounted(true);
    editor.focus();
    
    // Configure editor for better user experience
    editor.updateOptions({
      automaticLayout: true,
      wordWrap: 'on'
    });
    
    // Set keyboard shortcuts for common operations
    // Ctrl+S / Cmd+S for formatting
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      formatCode();
    });
    
    // Ctrl+Space / Cmd+Space for suggestions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    });
  };

  // Handle editor value change
  const handleEditorChange = (newValue: string) => {
    onChange(newValue);
  };

  /**
   * Format code based on the selected language
   * Handles JSON differently from TypeScript/JavaScript
   */
  const formatCode = async () => {
    setIsFormatting(true);
    try {
      if (language === 'json') {
        // Format JSON with proper indentation
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        onChange(formatted);
      } else {
        // For JS/TS, use Monaco's built-in formatter
        // This happens automatically with the editor's commands
        console.log(`[Arten] Using built-in formatter for ${language}`);
        // Future enhancement: Could implement Prettier integration here
      }
      // Show success feedback that auto-dismisses after 2 seconds
      setFormatSuccess(true);
      setTimeout(() => setFormatSuccess(null), 2000);
    } catch (error) {
      console.error('[Arten] Formatting failed:', error);
      setFormatSuccess(false);
      setTimeout(() => setFormatSuccess(null), 2000);
    } finally {
      setIsFormatting(false);
    }
  };

  // Initialize Monaco Editor when component mounts
  useEffect(() => {
    // This ensures Monaco editor loads correctly
    import('monaco-editor').then(monaco => {
      console.log('[Arten] Monaco editor loaded');
      
      // Register empty providers for CodeLens and CodeActions
      monaco.languages.registerCodeLensProvider('typescript', {
        provideCodeLenses: () => ({ lenses: [], dispose: () => {} })
      });
      
      monaco.languages.registerCodeLensProvider('javascript', {
        provideCodeLenses: () => ({ lenses: [], dispose: () => {} })
      });
      
      // Register empty provider for CodeActions
      monaco.languages.registerCodeActionProvider('typescript', {
        provideCodeActions: () => ({ actions: [], dispose: () => {} })
      });
      
      monaco.languages.registerCodeActionProvider('javascript', {
        provideCodeActions: () => ({ actions: [], dispose: () => {} })
      });
    }).catch(err => {
      console.error('[Arten] Failed to load Monaco editor:', err);
    });
  }, []);

  return (
    <Card className={cn(
      "p-4 space-y-2 h-[calc(100vh-12rem)] flex flex-col",
      error && "border-destructive"
    )}>
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Code className="h-4 w-4 mr-2" />
            <Label>{language === 'json' ? 'Test Configuration' : 'Test Script'}</Label>
            <span className="ml-2 text-xs text-muted-foreground">({language.toUpperCase()})</span>
          </div>
          <div className="flex items-center gap-2">
            {formatSuccess !== null && (
              <span className="text-sm animate-in fade-in slide-in-from-top-1" 
                    style={{ color: formatSuccess ? 'green' : 'red' }}>
                {formatSuccess ? (
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Formatted
                  </span>
                ) : (
                  <span className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Format failed
                  </span>
                )}
              </span>
            )}
            <Button
              onClick={formatCode}
              size="sm"
              variant="outline"
              disabled={isFormatting}
              title="Format code (Ctrl+S/Cmd+S)"
              aria-label="Format code"
            >
              {isFormatting ? 'Formatting...' : 'Format'}
            </Button>
          </div>
        </div>
      )}
      <div className="flex-grow relative border rounded-md overflow-hidden" style={{ height: 'calc(100vh - 20rem)' }}>
        {/* Monaco Editor with error handling */}
        <div className="h-full w-full">
          <MonacoEditor
            width="100%"
            height="100%"
            language={language}
            theme="vs-dark"
            value={value || ''}
            options={editorOptions}
            onChange={handleEditorChange}
            editorDidMount={handleEditorDidMount}
          />
          {!editorMounted && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <span className="animate-pulse">Loading editor...</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 