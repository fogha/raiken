"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Code } from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () =>
    import("react-monaco-editor").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[360px] border rounded-md bg-muted">
        Loading editor...
      </div>
    ),
  }
);

export interface TestScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "typescript" | "javascript" | "json";
  error?: boolean;
  hideHeader?: boolean;
}

export function TestScriptEditor({
  value,
  onChange,
  language = "typescript",
  error,
  hideHeader = false,
}: TestScriptEditorProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const editorRef = useRef<any>(null);
  const editorTheme = theme === "dark" ? "vs-dark" : "light";

  // Stable editor options (prevents re-renders)
  const editorOptions = useMemo(
    () => ({
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: "line" as const,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: "on" as const,
      formatOnPaste: false, // we use Prettier instead for reliability
      formatOnType: false,
      tabSize: 2,
      wordWrap: "on" as const,
      scrollbar: {
        useShadows: false,
        verticalHasArrows: true,
        horizontalHasArrows: true,
        vertical: "visible" as const,
        horizontal: "visible" as const,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      codeLens: false,
    }),
    []
  );

  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditorMounted(true);
    editorRef.current = editor;
    editor.focus();

    // Keep layout sensible
    editor.updateOptions({ automaticLayout: true, wordWrap: "on" });

    // Focus/blur ring
    editor.onDidFocusEditorText?.(() => setIsFocused(true));
    editor.onDidBlurEditorText?.(() => setIsFocused(false));
  };

  // Optional: Keep your worker hack to avoid runtime errors when you don't ship Monaco workers.
  // If you later configure proper workers, remove this.
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).MonacoEnvironment = {
        getWorker: () =>
          new Worker(
            URL.createObjectURL(
              new Blob(['self.postMessage("")'], {
                type: "application/javascript",
              })
            )
          ),
      };
    }
  }, []);

  // Optional: tune Monaco language defaults (safe even without workers)
  useEffect(() => {
    import("monaco-editor")
      .then((monaco) => {
        // Keep diagnostics quiet when workers are disabled
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
          noSuggestionDiagnostics: true,
        });
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
          noSuggestionDiagnostics: true,
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          noEmit: true,
          allowJs: true,
        });
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          noEmit: true,
          allowJs: true,
        });
      })
      .catch((err) =>
        console.error("[TestScriptEditor] Failed to load monaco:", err)
      );
  }, []);

  return (
    <Card
      className={cn(
        "p-4 space-y-4 w-full flex flex-col bg-white/80 dark:bg-slate-900 rounded-2xl backdrop-blur-sm border-slate-200/50 h-full dark:border-slate-700/50 shadow-lg",
        error &&
          "border-red-500/50 ring-2 ring-red-500/20 dark:border-red-400/50 dark:ring-red-400/20",
        isFocused && "ring-2 ring-blue-500/20 dark:ring-blue-400/20"
      )}
      aria-label="Test script editor"
    >
      <div className="relative h-full rounded-lg overflow-hidden bg-white/40 dark:bg-slate-900/40 shadow-inner border border-slate-200/50  h-[360px] md:h-[480px]">
        <MonacoEditor
          width="100%"
          height="100%"
          language={language}
          theme={editorTheme}
          value={value || ""}
          options={editorOptions}
          onChange={(v: string) => onChange(v)}
          editorDidMount={handleEditorDidMount}
        />

        {!editorMounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto animate-pulse shadow-lg">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Loading editor...
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
