import React from 'react';
import Button from './Button';

function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease',
        fontFamily: 'Roboto, sans-serif',
      }}>
        <div style={{
          backgroundColor: '#87ceeb',
          borderRadius: '12px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
          padding: '40px',
          maxWidth: '450px',
          width: '90%',
          animation: 'slideInUp 0.4s ease',
          fontFamily: 'Roboto, sans-serif',
        }}>
          <h2 style={{
            color: '#000000',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '16px',
            marginTop: 0,
            fontFamily: 'Roboto, sans-serif',
          }}>
            {title}
          </h2>
          <p style={{
            color: '#000000',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '30px',
            fontFamily: 'Roboto, sans-serif',
          }}>
            {message}
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <Button
              onClick={onCancel}
              disabled={isLoading}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid #000000',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmModal;
