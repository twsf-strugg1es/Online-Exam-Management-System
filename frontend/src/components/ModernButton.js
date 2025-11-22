import React from 'react';
import './ModernButton.css';

/**
 * Modern Button Component
 * Premium button with gradient, glow effects, and smooth animations
 * 
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} loading - Show loading state
 * @param {boolean} disabled - Disable button
 * @param {React.ReactNode} icon - Icon element
 * @param {React.ReactNode} children - Button text
 */
const ModernButton = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    children,
    className = '',
    onClick,
    type = 'button',
    ...props
}) => {
    const variantClass = `modern-btn--${variant}`;
    const sizeClass = `modern-btn--${size}`;
    const loadingClass = loading ? 'modern-btn--loading' : '';

    return (
        <button
            type={type}
            className={`modern-btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`}
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="modern-btn__spinner"></span>
            )}
            {!loading && icon && (
                <span className="modern-btn__icon">{icon}</span>
            )}
            <span className="modern-btn__text">{children}</span>
        </button>
    );
};

export default ModernButton;
