/**
 * Button Effects and Toast Notifications
 * Adds ripple effect and toast notifications to buttons
 */

(function() {
    'use strict';

    // ===================== RIPPLE EFFECT =====================
    function addRippleEffect(button) {
        button.addEventListener('click', function(e) {
            // Add clicked class for animation
            this.classList.add('clicked');
            
            // Remove class after animation
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 600);
        });
    }

    // ===================== TOAST NOTIFICATIONS =====================
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    `;
    document.body.appendChild(toastContainer);

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icons for different types
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        // Colors for different types
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        toast.innerHTML = `
            <span style="font-size: 18px; margin-right: 8px;">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 20px;
            background: white;
            border-left: 4px solid ${colors[type] || colors.info};
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-size: 14px;
            color: #333;
            pointer-events: auto;
            animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in ${duration - 300}ms;
            min-width: 250px;
            max-width: 400px;
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after duration
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
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
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);

    // ===================== AUTO-ATTACH TO BUTTONS =====================
    function initButtonEffects() {
        // Add ripple effect to all buttons
        document.querySelectorAll('.btn').forEach(button => {
            addRippleEffect(button);
        });

        // Add toast notifications to specific actions
        const actionsWithToast = [
            { selector: 'button[type="submit"]', message: 'Đã lưu thành công!', type: 'success' },
            { selector: '.btn-danger', message: 'Đã xóa!', type: 'warning' },
            { selector: '#clear-ae-data, #clear-aeqt-data, #clear-history', message: 'Đã xóa toàn bộ dữ liệu!', type: 'warning' },
            { selector: '#save-settings-btn', message: 'Đã lưu cài đặt!', type: 'success' },
            { selector: '#cloud-sync-btn', message: 'Đang đồng bộ...', type: 'info' }
        ];

        actionsWithToast.forEach(({ selector, message, type }) => {
            document.querySelectorAll(selector).forEach(button => {
                if (!button.dataset.toastAttached) {
                    button.dataset.toastAttached = 'true';
                    button.addEventListener('click', function(e) {
                        // Don't show toast for cloud sync (it has its own custom handler)
                        if (this.id === 'cloud-sync-btn') return;
                        
                        // Show toast after a short delay to allow form submission
                        setTimeout(() => {
                            showToast(message, type);
                        }, 100);
                    });
                }
            });
        });
    }

    // Export functions globally
    window.ButtonEffects = {
        showToast: showToast,
        init: initButtonEffects
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initButtonEffects);
    } else {
        initButtonEffects();
    }

    // Re-initialize when new content is added dynamically
    const observer = new MutationObserver(() => {
        initButtonEffects();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
