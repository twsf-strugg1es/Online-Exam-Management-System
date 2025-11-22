import React from 'react';
import './ModernCard.css';

/**
 * Modern Card Component
 * Premium glassmorphism card with hover effects
 * 
 * @param {string} variant - 'default' | 'gradient' | 'glass'
 * @param {boolean} hoverable - Enable hover lift effect
 * @param {React.ReactNode} children - Card content
 * @param {object} style - Additional inline styles
 */
const ModernCard = ({
    variant = 'default',
    hoverable = true,
    children,
    className = '',
    style = {},
    onClick
}) => {
    const variantClass = {
        default: 'modern-card',
        gradient: 'modern-card modern-card--gradient',
        glass: 'modern-card modern-card--glass'
    }[variant];

    const hoverClass = hoverable ? 'modern-card--hoverable' : '';

    return (
        <div
            className={`${variantClass} ${hoverClass} ${className}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default ModernCard;
