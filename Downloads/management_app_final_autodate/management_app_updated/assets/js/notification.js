// ====================================
// Modern Notification System
// ====================================

/**
 * Show notification toast
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    // Colors based on type
    const colors = {
        success: { bg: '#10b981', border: '#059669', text: '#ffffff' },
        error: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
        warning: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
        info: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }
    };

    const color = colors[type] || colors.info;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">${icons[type] || icons.info}</span>
            <span style="flex: 1; font-weight: 500;">${message}</span>
            <button class="notification-close" style="
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.8;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
        </div>
    `;

    notification.style.cssText = `
        background: ${color.bg};
        color: ${color.text};
        border-left: 4px solid ${color.border};
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 300px;
        max-width: 400px;
        pointer-events: auto;
        animation: slideInRight 0.3s ease-out;
        transition: all 0.3s ease;
        font-size: 14px;
        line-height: 1.5;
    `;

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => removeNotification(notification);

    // Add to container
    container.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }

    // Progress bar
    if (duration > 0) {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.5);
            width: 100%;
            animation: shrink ${duration}ms linear;
        `;
        notification.style.position = 'relative';
        notification.style.overflow = 'hidden';
        notification.appendChild(progressBar);
    }

    return notification;
}

/**
 * Remove notification with animation
 */
function removeNotification(notification) {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 300);
}

/**
 * Show success notification
 */
function showSuccess(message, duration = 3000) {
    return showNotification(message, 'success', duration);
}

/**
 * Show error notification
 */
function showError(message, duration = 4000) {
    return showNotification(message, 'error', duration);
}

/**
 * Show warning notification
 */
function showWarning(message, duration = 3500) {
    return showNotification(message, 'warning', duration);
}

/**
 * Show info notification
 */
function showInfo(message, duration = 3000) {
    return showNotification(message, 'info', duration);
}

/**
 * Confirm dialog with modern UI
 */
function showConfirm(message, title = 'Xác nhận', options = {}) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 450px;
            width: 90%;
            animation: scaleIn 0.3s ease-out;
            overflow: hidden;
        `;

        const confirmBtn = options.confirmText || 'Xác nhận';
        const cancelBtn = options.cancelText || 'Hủy';
        const confirmColor = options.confirmColor || '#ef4444';
        const icon = options.icon || '❓';

        dialog.innerHTML = `
            <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 32px;">${icon}</span>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">${title}</h3>
                </div>
                <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">${message}</p>
            </div>
            <div style="padding: 16px 24px; background: #f9fafb; display: flex; gap: 12px; justify-content: flex-end;">
                <button id="confirm-cancel" style="
                    padding: 10px 20px;
                    border: 1px solid #d1d5db;
                    background: white;
                    color: #374151;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='white'">${cancelBtn}</button>
                <button id="confirm-ok" style="
                    padding: 10px 20px;
                    border: none;
                    background: ${confirmColor};
                    color: white;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${confirmBtn}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle buttons
        const handleClose = (result) => {
            overlay.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(result);
            }, 200);
        };

        document.getElementById('confirm-ok').onclick = () => handleClose(true);
        document.getElementById('confirm-cancel').onclick = () => handleClose(false);
        overlay.onclick = (e) => {
            if (e.target === overlay) handleClose(false);
        };
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    @keyframes shrink {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.8);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    /* Hover effects for notifications */
    .notification:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.showNotification = showNotification;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showConfirm = showConfirm;
