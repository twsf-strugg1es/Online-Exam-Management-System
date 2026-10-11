import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const initialTheme = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage unavailable: fall through to the system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Light/dark theme: toggles the `dark` class that the color tokens in index.css switch on
export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeName === 'dark');
  }, [themeName]);

  const toggleTheme = () => {
    setThemeName((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('theme', next);
      } catch {
        // not remembered, still applied
      }
      return next;
    });
  };

  return <ThemeContext.Provider value={{ themeName, toggleTheme }}>{children}</ThemeContext.Provider>;
};
