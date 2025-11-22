import React from 'react';
import './Button.css';

const Button = ({ children, onClick, type = 'button', style, disabled, ...props }) => {
    return (
        <button
            className="custom-button"
            onClick={onClick}
            type={type}
            style={style}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;
