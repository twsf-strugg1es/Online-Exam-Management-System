import React, { useEffect } from 'react';
import ModernButton from './ModernButton';
import './ModernModal.css';

/**
 * Modern Modal Component
 * Glassmorphism modal with smooth animations
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {React.ReactNode} footer - Modal footer (buttons)
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 */
const ModernModal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className = ''
}) => {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClass = `modern-modal__content--${size}`;

    return (
        <div className="modern-modal" onClick={onClose}>
            <div
                className={`modern-modal__content ${sizeClass} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="modern-modal__header">
                        <h3 className="modern-modal__title">{title}</h3>
                        <button
                            className="modern-modal__close"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="modern-modal__body">
                    {children}
                </div>

                {footer && (
                    <div className="modern-modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Confirm Modal - Preset for confirmation dialogs
 */
export const ModernConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    loading = false
}) => {
    return (
        <ModernModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <div className="modern-modal__actions">
                    <ModernButton
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </ModernButton>
                    <ModernButton
                        variant={variant}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </ModernButton>
                </div>
            }
        >
            <p className="modern-modal__message">{message}</p>
        </ModernModal>
    );
};

export default ModernModal;
