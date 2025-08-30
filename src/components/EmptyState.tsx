import { Sparkles } from "lucide-react";

export function EmptyState({ message = "Campus is sparkling ✨" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 py-12">
      <Sparkles className="h-8 w-8 mb-3 text-emerald-500" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
