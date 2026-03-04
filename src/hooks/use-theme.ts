import { useState, useEffect } from "react";

type Theme = "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light");
  }, [theme]);

  const toggleTheme = () => {
    // Theme toggle disabled - dark mode only
  };

  return { theme, setTheme, toggleTheme };
}

