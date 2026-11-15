"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="size-9 rounded-full text-muted-foreground hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </Button>
  );
}
