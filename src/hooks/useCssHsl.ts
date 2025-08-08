import { useMemo } from "react";

export function useCssHsl(varName: string) {
  return useMemo(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return `hsl(${v})`;
  }, []);
}
