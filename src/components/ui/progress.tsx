"use client"

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Current progress value (0-100). */
  value?: number;
  /** Maximum value used to calculate percentage. Defaults to 100. */
  max?: number;
}

/**
 * Simple determinate progress bar – matches the shadcn/ui pattern used by other
 * primitives in `src/components/ui/*`. Works out-of-the-box with Tailwind CSS
 * and Radix colour variables defined in the project.
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        {/* Visually hidden label for screen readers */}
        <span className="sr-only">{`Progress: ${percentage.toFixed(0)}%`}</span>
        {/* Bar */}
        <div
          style={{ width: `${percentage}%` }}
          className="h-full rounded-full bg-primary transition-all"
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress }; 