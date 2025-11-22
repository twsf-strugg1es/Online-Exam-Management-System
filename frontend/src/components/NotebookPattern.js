import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './NotebookPattern.css';

/**
 * Notebook Pattern Background Component
 * Beautiful lined paper pattern that adapts to light/dark mode
 * 
 * @param {React.ReactNode} children - Content to display over the pattern
 * @param {string} className - Additional CSS classes
 */
const NotebookPattern = ({ children, className = '' }) => {
    const { themeName } = useTheme();

    return (
        <div className={`notebook-pattern ${themeName === 'dark' ? 'notebook-pattern--dark' : 'notebook-pattern--light'} ${className}`}>
            {children}
        </div>
    );
};

export default NotebookPattern;
