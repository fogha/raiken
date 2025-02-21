import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, BookOpen, Github, Settings } from "lucide-react";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ui/theme-toggle";

interface TopBarProps {
  url: string;
  isLoading: boolean;
  onUrlChange: (url: string) => void;
  onLoadProject: (e: React.FormEvent) => Promise<void>;
}

export function TopBar({ url, isLoading, onUrlChange, onLoadProject }: TopBarProps) {
  return (
    <div className="border-b py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-6 pl-4 flex-1">
          <div className="flex-1 max-w-[50%]">
            <form onSubmit={onLoadProject} className="flex gap-4">
              <Input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="Enter URL (e.g., https://www.google.com)"
                className="flex-1"
                required
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Load Project'
                )}
              </Button>
            </form>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Documentation
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Github className="h-4 w-4" />
              GitHub
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </div>
  );
} 