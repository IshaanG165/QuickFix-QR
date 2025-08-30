"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TurnstileMock({ onVerify }: { onVerify: (token: string) => void }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = `mock-turnstile-${Math.random().toString(36).slice(2, 10)}`;
    setToken(t);
    onVerify(t);
  }, [onVerify]);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
      <span>CAPTCHA verified (mock)</span>
      <Button size="sm" variant="secondary" onClick={() => token && onVerify(token)}>
        Refresh
      </Button>
    </div>
  );
}
