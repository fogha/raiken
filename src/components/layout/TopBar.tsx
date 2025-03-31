import { Button } from "../ui/button";
import { BookOpen, Github, Settings, Loader2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { ThemeToggle } from "../ui/theme-toggle";

interface TopBarProps {
  isLoading: boolean;
}

export function TopBar({ isLoading }: TopBarProps) {
  return (
    <div className="border-b py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-6 pl-4 flex-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold text-lg">Arten Project Viewer</span>
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
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
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/settings'}
              size="sm" className="gap-2">
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