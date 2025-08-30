"use client";

import { Button } from "@/components/ui/button";
import { triggerUrgentIssue, triggerRandomStatusUpdate } from "@/lib/mockIssues";

export function DemoBar() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className="sticky top-14 z-20 bg-amber-50 dark:bg-amber-900/20 border-y border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-sm">
      <span className="text-amber-700 dark:text-amber-300">Demo Controls:</span>
      <Button size="sm" onClick={() => triggerUrgentIssue()}>Trigger Urgent Issue</Button>
      <Button size="sm" variant="secondary" onClick={() => triggerRandomStatusUpdate()}>Random Status Update</Button>
    </div>
  );
}
