import React, { useState } from 'react';
import './ModernInput.css';

/**
 * Modern Input Component
 * Floating label input with focus animations
 * 
 * @param {string} label - Input label
 * @param {string} type - Input type
 * @param {string} placeholder - Placeholder text
 * @param {React.ReactNode} icon - Icon element
 * @param {string} error - Error message
 * @param {boolean} required - Required field
 */
const ModernInput = ({
    label,
    type = 'text',
    placeholder,
    icon,
    error,
    required = false,
    className = '',
    value,
    onChange,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e) => {
        setIsFocused(false);
        setHasValue(!!e.target.value);
    };

    const handleChange = (e) => {
        setHasValue(!!e.target.value);
        if (onChange) onChange(e);
    };

    const isActive = isFocused || hasValue;

    return (
        <div className={`modern-input-wrapper ${error ? 'modern-input-wrapper--error' : ''} ${className}`}>
            {label && (
                <label className={`modern-input__label ${isActive ? 'modern-input__label--active' : ''}`}>
                    {label}
                    {required && <span className="modern-input__required">*</span>}
                </label>
            )}
            <div className="modern-input__container">
                {icon && (
                    <span className="modern-input__icon">{icon}</span>
                )}
                <input
                    type={type}
                    className={`modern-input ${icon ? 'modern-input--with-icon' : ''}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
            </div>
            {error && (
                <span className="modern-input__error">{error}</span>
            )}
        </div>
    );
};

export default ModernInput;
