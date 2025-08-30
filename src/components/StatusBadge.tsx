import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Status = "reported" | "in_progress" | "fixed";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const color =
    status === "reported" ? "bg-red-500/90 text-white" :
    status === "in_progress" ? "bg-amber-500/90 text-white" :
    "bg-green-600/90 text-white";

  const label = status === "in_progress" ? "In Progress" : status === "fixed" ? "Fixed" : "Reported";

  return (
    <Badge className={cn("transition-colors duration-200", color, className)}>{label}</Badge>
  );
}
