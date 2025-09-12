import { Button } from "../ui/button";
import { BookOpen, Github, Settings, Loader2, Code, ExternalLink } from "lucide-react";
import { ThemeToggle } from "../ui/theme-toggle";
import { Input } from "../ui/input";
import { useState } from "react";

interface TopBarProps {
  isLoading: boolean;
  url?: string;
  onUrlChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadProject?: (e: React.FormEvent) => void;
}

export function TopBar({ isLoading }: TopBarProps) {
  return (
    <div className="py-1.5 px-3 flex items-center justify-between bg-muted/50 border-b border-border/30">
      {/* Left side: App logo */}
      <div className="flex items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium tracking-tight">Raiken</span>
        </div>
      </div>
      
      {/* Center: Processing indicator if needed */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        {isLoading && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Processing</span>
          </div>
        )}
      </div>
      
   
    </div>
  );
}