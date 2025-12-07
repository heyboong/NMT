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
        
        // Remove existing toolbar if any
        const existingToolbar = document.getElementById('text-color-toolbar');
        if (existingToolbar) {
            console.log('🗑️ Removing existing toolbar');
            existingToolbar.remove();
        }
        
        createToolbarHTML();
        console.log('✓ Toolbar HTML created');
        
        // Verify toolbar was created
        const toolbar = document.getElementById('text-color-toolbar');
        if (toolbar) {
            console.log('✅ Toolbar successfully created and found in DOM');
            console.log('📍 Toolbar initial classes:', toolbar.className);
            console.log('📍 Toolbar initial style.display:', toolbar.style.display);
        } else {
            console.error('❌ CRITICAL: Toolbar not found after creation!');
        }
        
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
        
        // Set strong inline styles that override everything
        toolbar.setAttribute('style', `
            position: fixed !important;
            top: 100px !important;
            right: 20px !important;
            background: white !important;
            padding: 20px !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
            border: 3px solid #3b82f6 !important;
            z-index: 999999 !important;
            min-width: 300px !important;
            max-width: 320px !important;
            display: none !important;
        `);
        
        toolbar.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
                <div style="font-weight: 700; font-size: 16px; color: #1f2937;">🎨 Tô Màu Chữ</div>
                <button id="text-color-close" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-weight: 600;">✕ Đóng</button>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase;">Chọn Màu</div>
                <div id="text-color-options" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                    ${colors.map(color => `
                        <button class="text-color-btn" 
                                data-color="${color.class}"
                                title="${color.label}"
                                style="height: 45px; border: 2px solid transparent; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                            ${color.label}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase;">Định Dạng</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <button id="text-bold-btn" style="padding: 12px; border: 1px solid #fbbf24; border-radius: 8px; background: #fef3c7; cursor: pointer; font-size: 13px; font-weight: 600; color: #92400e;">
                        <strong>B</strong> In Đậm
                    </button>
                    <button id="text-reset-btn" style="padding: 12px; border: 1px solid #f87171; border-radius: 8px; background: #fee2e2; cursor: pointer; font-size: 13px; font-weight: 600; color: #991b1b;">
                        ✕ Xóa Màu
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toolbar);
        console.log('✅ Toolbar added to body with strong inline styles');
        
        // Apply color button styles
        setTimeout(() => {
            const colorBtns = toolbar.querySelectorAll('.text-color-btn');
            colorBtns.forEach((btn, index) => {
                const color = colors[index];
                if (color.name === 'red') btn.style.background = '#fee2e2';
                if (color.name === 'orange') btn.style.background = '#ffedd5';
                if (color.name === 'yellow') btn.style.background = '#fef3c7';
                if (color.name === 'green') btn.style.background = '#dcfce7';
                if (color.name === 'blue') btn.style.background = '#dbeafe';
                if (color.name === 'purple') btn.style.background = '#f3e8ff';
                if (color.name === 'pink') btn.style.background = '#fce7f3';
                if (color.name === 'gray') btn.style.background = '#f3f4f6';
            });
        }, 50);
        
        // Verify
        setTimeout(() => {
            const check = document.getElementById('text-color-toolbar');
            console.log('✅ Toolbar verification:', !!check);
            if (check) {
                const rect = check.getBoundingClientRect();
                console.log('📍 Toolbar position:', { top: rect.top, right: window.innerWidth - rect.right, width: rect.width, height: rect.height });
            }
        }, 100);
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
        const toggleBtnConversion = document.getElementById('text-color-toggle-conversion');
        const toggleBtnWithdraw = document.getElementById('text-color-toggle-withdraw');
        const toggleBtnAE = document.getElementById('text-color-toggle-ae');
        const toggleBtnAEQT = document.getElementById('text-color-toggle-aeqt');
        const toggleBtnExpense = document.getElementById('text-color-toggle-expense');
        const closeBtn = document.getElementById('text-color-close');
        const colorOptions = document.getElementById('text-color-options');
        const boldBtn = document.getElementById('text-bold-btn');
        const resetBtn = document.getElementById('text-reset-btn');

        if (!toolbar || !closeBtn || !colorOptions || !boldBtn || !resetBtn) {
            console.error('❌ Text color highlight: Missing toolbar elements', {
                toolbar: !!toolbar,
                closeBtn: !!closeBtn,
                colorOptions: !!colorOptions,
                boldBtn: !!boldBtn,
                resetBtn: !!resetBtn
            });
            return;
        }

        // Toggle toolbar from conversion table button (Dashboard)
        if (toggleBtnConversion) {
            toggleBtnConversion.addEventListener('click', (e) => {
                console.log('🖱️ Conversion table toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleToolbar();
            });
            console.log('✓ Conversion toggle button listener attached');
        }

        // Toggle toolbar from withdraw table button (Dashboard)
        if (toggleBtnWithdraw) {
            toggleBtnWithdraw.addEventListener('click', (e) => {
                console.log('🖱️ Withdraw table toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleToolbar();
            });
            console.log('✓ Withdraw toggle button listener attached');
        }

        // Toggle toolbar from AE page button
        if (toggleBtnAE) {
            toggleBtnAE.addEventListener('click', (e) => {
                console.log('🖱️ AE table toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleToolbar();
            });
            console.log('✓ AE toggle button listener attached');
        }

        // Toggle toolbar from AE-QT page button
        if (toggleBtnAEQT) {
            toggleBtnAEQT.addEventListener('click', (e) => {
                console.log('🖱️ AE-QT table toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleToolbar();
            });
            console.log('✓ AE-QT toggle button listener attached');
        }

        // Toggle toolbar from Expense page button
        if (toggleBtnExpense) {
            toggleBtnExpense.addEventListener('click', (e) => {
                console.log('🖱️ Expense table toggle button clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleToolbar();
            });
            console.log('✓ Expense toggle button listener attached');
        }

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

        // Track focused cell (for applying colors when toolbar is open)
        document.addEventListener('focusin', (e) => {
            if (e.target.contentEditable === 'true' && e.target.tagName === 'TD') {
                currentCell = e.target;
                // Only update toolbar state if toolbar is already visible
                if (toolbarVisible) {
                    updateToolbarState();
                }
            }
        });

        // Close toolbar when clicking outside
        document.addEventListener('click', (e) => {
            const isToggleBtn = e.target.closest('#text-color-toggle-conversion') || 
                                e.target.closest('#text-color-toggle-withdraw') ||
                                e.target.closest('#text-color-toggle-ae') ||
                                e.target.closest('#text-color-toggle-aeqt') ||
                                e.target.closest('#text-color-toggle-expense');
            
            if (toolbarVisible && 
                !toolbar.contains(e.target) && 
                !isToggleBtn &&
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
        console.log('🔄 Toggling toolbar...');
        const toolbar = document.getElementById('text-color-toolbar');
        const toggleBtns = [
            document.getElementById('text-color-toggle-conversion'),
            document.getElementById('text-color-toggle-withdraw'),
            document.getElementById('text-color-toggle-ae'),
            document.getElementById('text-color-toggle-aeqt'),
            document.getElementById('text-color-toggle-expense')
        ].filter(btn => btn !== null);
        
        if (!toolbar) {
            console.error('❌ Toolbar not found!');
            alert('⚠️ Lỗi: Không tìm thấy toolbar. Vui lòng reload trang!');
            return;
        }
        
        toolbarVisible = !toolbarVisible;
        console.log('📊 Toolbar visible:', toolbarVisible);
        
        if (toolbarVisible) {
            // FORCE SHOW with setAttribute to override everything
            toolbar.setAttribute('style', `
                position: fixed !important;
                top: 100px !important;
                right: 20px !important;
                background: white !important;
                padding: 20px !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                border: 3px solid #10b981 !important;
                z-index: 999999 !important;
                min-width: 300px !important;
                max-width: 320px !important;
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
            `);
            
            toolbar.classList.add('active');
            toggleBtns.forEach(btn => btn.classList.add('active'));
            
            const rect = toolbar.getBoundingClientRect();
            console.log('✅ TOOLBAR NOW VISIBLE!');
            console.log('📍 Position:', { 
                top: rect.top, 
                right: window.innerWidth - rect.right, 
                width: rect.width, 
                height: rect.height,
                display: window.getComputedStyle(toolbar).display,
                zIndex: window.getComputedStyle(toolbar).zIndex
            });
            
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
        const toggleBtns = [
            document.getElementById('text-color-toggle-conversion'),
            document.getElementById('text-color-toggle-withdraw'),
            document.getElementById('text-color-toggle-ae'),
            document.getElementById('text-color-toggle-aeqt'),
            document.getElementById('text-color-toggle-expense')
        ].filter(btn => btn !== null);
        
        if (toolbar) {
            toolbar.setAttribute('style', `
                position: fixed !important;
                top: 100px !important;
                right: 20px !important;
                background: white !important;
                padding: 20px !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                border: 3px solid #3b82f6 !important;
                z-index: 999999 !important;
                min-width: 300px !important;
                max-width: 320px !important;
                display: none !important;
            `);
            toolbar.classList.remove('active');
        }
        
        toggleBtns.forEach(btn => btn.classList.remove('active'));
        toolbarVisible = false;
        console.log('✓ Toolbar hidden');
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
