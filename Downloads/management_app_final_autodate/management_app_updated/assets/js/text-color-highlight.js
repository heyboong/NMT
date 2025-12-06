/**
 * Text Color Highlight System
 * Cho phép người dùng tô màu chữ trong các ô contenteditable
 */

(function() {
    'use strict';

    // State
    let currentCell = null;
    let toolbarVisible = false;

    // Color options
    const colors = [
        { name: 'red', label: 'Đỏ', class: 'text-red' },
        { name: 'orange', label: 'Cam', class: 'text-orange' },
        { name: 'yellow', label: 'Vàng', class: 'text-yellow' },
        { name: 'green', label: 'Xanh', class: 'text-green' },
        { name: 'blue', label: 'Xanh D', class: 'text-blue' },
        { name: 'purple', label: 'Tím', class: 'text-purple' },
        { name: 'pink', label: 'Hồng', class: 'text-pink' },
        { name: 'gray', label: 'Xám', class: 'text-gray' }
    ];

    /**
     * Initialize the text color highlight system
     */
    function init() {
        console.log('🎨 Starting text color highlight initialization...');
        
        // Remove existing elements if any
        const existingToolbar = document.getElementById('text-color-toolbar');
        const existingToggle = document.getElementById('text-color-toggle');
        if (existingToolbar) existingToolbar.remove();
        if (existingToggle) existingToggle.remove();
        
        createToolbarHTML();
        console.log('✓ Toolbar HTML created');
        
        createToggleButton();
        console.log('✓ Toggle button created');
        
        attachEventListeners();
        console.log('✓ Event listeners attached');
        
        console.log('🎨 Text color highlight system initialized');
    }

    /**
     * Create toolbar HTML
     */
    function createToolbarHTML() {
        const toolbar = document.createElement('div');
        toolbar.id = 'text-color-toolbar';
        toolbar.className = 'text-color-toolbar';
        
        toolbar.innerHTML = `
            <div class="text-color-toolbar__header">
                <div class="text-color-toolbar__title">🎨 Tô Màu Chữ</div>
                <button class="text-color-toolbar__close" id="text-color-close">✕</button>
            </div>
            
            <div class="text-color-toolbar__section">
                <div class="text-color-toolbar__section-title">Chọn Màu</div>
                <div class="text-color-toolbar__colors" id="text-color-options">
                    ${colors.map(color => `
                        <button class="text-color-btn text-color-btn--${color.name}" 
                                data-color="${color.class}"
                                title="${color.label}">
                            ${color.label}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="text-color-toolbar__section">
                <div class="text-color-toolbar__section-title">Định Dạng</div>
                <div class="text-color-toolbar__actions">
                    <button class="text-color-action-btn text-color-action-btn--bold" id="text-bold-btn">
                        <strong>B</strong> In Đậm
                    </button>
                    <button class="text-color-action-btn text-color-action-btn--reset" id="text-reset-btn">
                        ✕ Xóa Màu
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toolbar);
    }

    /**
     * Create toggle button
     */
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'text-color-toggle';
        btn.className = 'text-color-toggle-btn';
        btn.innerHTML = '<span style="font-size: 18px;">🎨</span> <span>Tô Màu Chữ</span>';
        btn.title = 'Bật/Tắt công cụ tô màu chữ';
        
        // Try to add to dashboard toolbar first, fallback to body
        const toolbar = document.getElementById('dashboard-toolbar');
        if (toolbar) {
            console.log('✓ Found dashboard toolbar, adding button to toolbar');
            toolbar.appendChild(btn);
        } else {
            console.log('⚠️ Dashboard toolbar not found, adding button to body');
            document.body.appendChild(btn);
        }
        
        // Verify button was added
        const addedBtn = document.getElementById('text-color-toggle');
        if (addedBtn) {
            console.log('✓ Toggle button successfully added to DOM');
        } else {
            console.error('❌ Toggle button not found in DOM after creation');
        }
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        const toolbar = document.getElementById('text-color-toolbar');
        const toggleBtn = document.getElementById('text-color-toggle');
        const closeBtn = document.getElementById('text-color-close');
        const colorOptions = document.getElementById('text-color-options');
        const boldBtn = document.getElementById('text-bold-btn');
        const resetBtn = document.getElementById('text-reset-btn');

        if (!toolbar || !toggleBtn || !closeBtn || !colorOptions || !boldBtn || !resetBtn) {
            console.error('❌ Text color highlight: Missing elements', {
                toolbar: !!toolbar,
                toggleBtn: !!toggleBtn,
                closeBtn: !!closeBtn,
                colorOptions: !!colorOptions,
                boldBtn: !!boldBtn,
                resetBtn: !!resetBtn
            });
            return;
        }

        // Toggle toolbar
        toggleBtn.addEventListener('click', toggleToolbar);
        closeBtn.addEventListener('click', hideToolbar);

        // Color buttons
        colorOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('.text-color-btn');
            if (btn) {
                const colorClass = btn.dataset.color;
                applyColor(colorClass);
                updateActiveButton(btn);
            }
        });

        // Bold button
        boldBtn.addEventListener('click', toggleBold);

        // Reset button
        resetBtn.addEventListener('click', resetFormatting);

        // Track focused cell
        document.addEventListener('focusin', (e) => {
            if (e.target.contentEditable === 'true' && e.target.tagName === 'TD') {
                currentCell = e.target;
                updateToolbarState();
            }
        });

        // Close toolbar when clicking outside
        document.addEventListener('click', (e) => {
            if (toolbarVisible && 
                !toolbar.contains(e.target) && 
                !toggleBtn.contains(e.target) &&
                e.target !== currentCell) {
                // Don't close if clicking on a contenteditable cell
                if (!(e.target.contentEditable === 'true' && e.target.tagName === 'TD')) {
                    hideToolbar();
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + H: Toggle toolbar
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                toggleToolbar();
            }
            
            // Ctrl/Cmd + B: Toggle bold (when cell is focused)
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && currentCell) {
                e.preventDefault();
                toggleBold();
            }
        });
    }

    /**
     * Toggle toolbar visibility
     */
    function toggleToolbar() {
        const toolbar = document.getElementById('text-color-toolbar');
        const toggleBtn = document.getElementById('text-color-toggle');
        
        toolbarVisible = !toolbarVisible;
        
        if (toolbarVisible) {
            toolbar.classList.add('active');
            toggleBtn.classList.add('active');
            updateToolbarState();
        } else {
            hideToolbar();
        }
    }

    /**
     * Hide toolbar
     */
    function hideToolbar() {
        const toolbar = document.getElementById('text-color-toolbar');
        const toggleBtn = document.getElementById('text-color-toggle');
        
        toolbar.classList.remove('active');
        toggleBtn.classList.remove('active');
        toolbarVisible = false;
    }

    /**
     * Apply color to current cell
     */
    function applyColor(colorClass) {
        if (!currentCell) {
            alert('Vui lòng chọn một ô để tô màu!');
            return;
        }

        // Remove all existing color classes
        colors.forEach(color => {
            currentCell.classList.remove(color.class);
        });

        // Add new color class
        currentCell.classList.add(colorClass);

        // Trigger input event to save changes
        const event = new Event('input', { bubbles: true });
        currentCell.dispatchEvent(event);

        console.log('🎨 Applied color:', colorClass, 'to cell');
    }

    /**
     * Toggle bold on current cell
     */
    function toggleBold() {
        if (!currentCell) {
            alert('Vui lòng chọn một ô để in đậm!');
            return;
        }

        currentCell.classList.toggle('text-bold');

        // Trigger input event to save changes
        const event = new Event('input', { bubbles: true });
        currentCell.dispatchEvent(event);

        updateToolbarState();
        console.log('🎨 Toggled bold on cell');
    }

    /**
     * Reset all formatting on current cell
     */
    function resetFormatting() {
        if (!currentCell) {
            alert('Vui lòng chọn một ô để xóa màu!');
            return;
        }

        // Remove all color classes
        colors.forEach(color => {
            currentCell.classList.remove(color.class);
        });

        // Remove bold class
        currentCell.classList.remove('text-bold');

        // Trigger input event to save changes
        const event = new Event('input', { bubbles: true });
        currentCell.dispatchEvent(event);

        updateToolbarState();
        console.log('🎨 Reset formatting on cell');
    }

    /**
     * Update active button based on current cell
     */
    function updateActiveButton(activeBtn) {
        const allButtons = document.querySelectorAll('.text-color-btn');
        allButtons.forEach(btn => btn.classList.remove('active'));
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Update toolbar state based on current cell
     */
    function updateToolbarState() {
        if (!currentCell) return;

        // Check which color is active
        const activeColor = colors.find(color => 
            currentCell.classList.contains(color.class)
        );

        // Update active button
        const allButtons = document.querySelectorAll('.text-color-btn');
        allButtons.forEach(btn => {
            btn.classList.remove('active');
            if (activeColor && btn.dataset.color === activeColor.class) {
                btn.classList.add('active');
            }
        });

        // Update bold button
        const boldBtn = document.getElementById('text-bold-btn');
        if (currentCell.classList.contains('text-bold')) {
            boldBtn.style.background = '#fcd34d';
        } else {
            boldBtn.style.background = '#fef3c7';
        }
    }

    /**
     * Save cell formatting to data attribute for persistence
     */
    function saveCellFormatting(cell) {
        const classes = [];
        
        // Save color classes
        colors.forEach(color => {
            if (cell.classList.contains(color.class)) {
                classes.push(color.class);
            }
        });
        
        // Save bold class
        if (cell.classList.contains('text-bold')) {
            classes.push('text-bold');
        }
        
        // Store in data attribute
        if (classes.length > 0) {
            cell.dataset.textFormat = classes.join(' ');
        } else {
            delete cell.dataset.textFormat;
        }
    }

    /**
     * Restore cell formatting from data attribute
     */
    function restoreCellFormatting(cell) {
        const savedFormat = cell.dataset.textFormat;
        if (savedFormat) {
            const classes = savedFormat.split(' ');
            classes.forEach(cls => {
                if (cls) cell.classList.add(cls);
            });
        }
    }

    /**
     * Hook into table render functions to preserve formatting
     */
    function hookTableRenders() {
        // Hook into cell input events to save formatting
        document.addEventListener('input', (e) => {
            if (e.target.contentEditable === 'true' && e.target.tagName === 'TD') {
                saveCellFormatting(e.target);
            }
        });

        // Observe for new table cells and restore formatting
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const cells = node.querySelectorAll('td[contenteditable="true"]');
                        cells.forEach(cell => {
                            restoreCellFormatting(cell);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            hookTableRenders();
        });
    } else {
        init();
        hookTableRenders();
    }

    // Export for external use
    window.TextColorHighlight = {
        init,
        applyColor,
        toggleBold,
        resetFormatting,
        saveCellFormatting,
        restoreCellFormatting
    };

})();
