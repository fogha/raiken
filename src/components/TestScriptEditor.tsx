"use client"

import { useState, useRef, useEffect } from 'react';
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface TestScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TestScriptEditor({ value, onChange }: TestScriptEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const template = JSON.stringify({
    type: "ui-test",
    name: "Login Flow",
    steps: [
      {
        action: "navigate",
        url: "https://example.com/login"
      },
      {
        action: "type",
        element: "input[type=email]",
        value: "test@example.com"
      }
    ],
    assertions: [
      {
        type: "element",
        selector: ".dashboard",
        condition: "visible",
        timeout: 5000
      }
    ]
  }, null, 2);

  useEffect(() => {
    if (editorRef.current) {
      // Only set template if there's no value
      editorRef.current.textContent = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      try {
        const content = editorRef.current.textContent || '';
        // Try to parse as JSON to validate
        JSON.parse(content);
        onChange(content);
        editorRef.current.classList.remove('border-red-500');
      } catch (e) {
        editorRef.current.classList.add('border-red-500');
      }
    }
  };

  return (
    <Card className="p-4 space-y-2 h-[calc(100vh-24rem)]">
      <Label>Test Script</Label>
      <div className="relative h-[calc(100%-2rem)]">
        <div
          ref={editorRef}
          contentEditable
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onInput={handleInput}
          className={cn(
            "h-full p-4 font-mono text-sm rounded-md outline-none",
            "bg-muted/50 border-2",
            "whitespace-pre overflow-auto",
            isFocused ? "border-primary" : "border-transparent",
            "transition-colors duration-200"
          )}
          spellCheck="false"
        />
        {!value && !isFocused && (
          <pre className="absolute top-4 left-4 text-muted-foreground/50 pointer-events-none font-mono text-sm">
            {template}
          </pre>
        )}
      </div>
    </Card>
  );
} 