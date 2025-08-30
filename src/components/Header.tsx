"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-blue-600 dark:text-blue-400">
          QuickFix QR
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">
            Admin
          </Link>
          <Link href="/r/BIN-001" className="text-sm text-blue-700 dark:text-blue-300 hover:underline">
            Report issue
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
