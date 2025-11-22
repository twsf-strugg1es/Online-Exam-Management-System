import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes } from '../theme';

const ThemeContext = createContext();

export const useTheme = () => {
    return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
    // Check localStorage for saved theme, default to 'light'
    const [themeName, setThemeName] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    const toggleTheme = () => {
        setThemeName((prevTheme) => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    };

    const theme = themes[themeName];

    // Apply background color to body to avoid white flashes
    useEffect(() => {
        document.body.style.backgroundColor = theme.background;
        document.body.style.color = theme.text;
    }, [theme]);

    const value = {
        themeName,
        toggleTheme,
        theme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
