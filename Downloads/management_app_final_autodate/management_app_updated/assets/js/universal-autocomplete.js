// ====================================
// Universal Autocomplete for All Tables
// Tự động gợi ý cho cột Tên và Tên NV
// ====================================

(function() {
    'use strict';

    const STAFF_AE_KEY = 'staff_list_ae';
    const STAFF_AEQT_KEY = 'staff_list_aeqt';
    let autocompleteList = null;
    let currentCell = null;
    let staffNamesAE = [];
    let staffNamesAEQT = [];
    let isInitialized = false; // Flag to prevent multiple initializations

    // Load staff lists
    function loadStaffNames() {
        try {
            const storedAE = localStorage.getItem(STAFF_AE_KEY);
            const storedAEQT = localStorage.getItem(STAFF_AEQT_KEY);
            staffNamesAE = storedAE ? JSON.parse(storedAE) : [];
            staffNamesAEQT = storedAEQT ? JSON.parse(storedAEQT) : [];
            console.log('📋 Universal autocomplete loaded - AE:', staffNamesAE.length, 'AE-QT:', staffNamesAEQT.length);
        } catch (e) {
            console.error('Error loading staff names:', e);
            staffNamesAE = [];
            staffNamesAEQT = [];
        }
    }

    // Create autocomplete dropdown
    function createAutocomplete() {
        autocompleteList = document.createElement('div');
        autocompleteList.className = 'universal-autocomplete';
        autocompleteList.style.cssText = `
            position: absolute;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 250px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            min-width: 220px;
            pointer-events: auto;
        `;
        document.body.appendChild(autocompleteList);
    }

    // Detect which table type based on URL or page context
    function detectTableType() {
        // Always show both lists for all tables
        return 'both';
    }

    // Show autocomplete
    function showAutocomplete(cell, searchTerm) {
        if (!cell) {
            console.warn('⚠️ showAutocomplete: No cell provided');
            return;
        }
        
        if (!autocompleteList) createAutocomplete();
        
        loadStaffNames();
        
        // Extract the current name being typed (after last comma)
        const parts = searchTerm.split(',');
        const currentName = parts[parts.length - 1].trim();
        const prefix = parts.slice(0, -1).join(', ') + (parts.length > 1 ? ', ' : '');
        
        const tableType = detectTableType();
        let staffList = [];
        
        // Determine which list to show based on table type
        if (tableType === 'ae') {
            staffList = [...staffNamesAE];
        } else if (tableType === 'aeqt') {
            staffList = [...staffNamesAEQT];
        } else {
            // Show both lists for dashboard and other pages
            staffList = [...staffNamesAE, ...staffNamesAEQT];
        }
        
        // Remove duplicates and filter out already selected names
        const alreadySelected = parts.slice(0, -1).map(n => n.trim().toUpperCase());
        staffList = [...new Set(staffList)].filter(name => 
            !alreadySelected.includes(name.toUpperCase())
        );
        
        // Filter staff names based on current input
        const filtered = staffList.filter(name => 
            name.toLowerCase().includes(currentName.toLowerCase())
        );

        if (filtered.length === 0 || (currentName === '' && prefix === '')) {
            hideAutocomplete();
            return;
        }

        // Get cell position
        const rect = cell.getBoundingClientRect();
        if (!rect || rect.width === 0) {
            console.warn('⚠️ Cell has no dimensions, cannot show autocomplete');
            hideAutocomplete();
            return;
        }
        
        autocompleteList.style.left = rect.left + window.scrollX + 'px';
        autocompleteList.style.top = (rect.bottom + window.scrollY + 2) + 'px';
        autocompleteList.style.width = Math.max(rect.width, 220) + 'px';

        // Render items with icons
        autocompleteList.innerHTML = filtered.map(name => {
            const isAE = staffNamesAE.includes(name);
            const isAEQT = staffNamesAEQT.includes(name);
            let icon = '👤';
            let label = '';
            let badgeColor = '#e5e7eb';
            let textColor = '#6b7280';
            
            if (isAE && isAEQT) {
                icon = '💼🌐';
                label = 'AE + AE-QT';
                badgeColor = '#c7d2fe';
                textColor = '#4338ca';
            } else if (isAE) {
                icon = '💼';
                label = 'AE';
                badgeColor = '#dbeafe';
                textColor = '#1e40af';
            } else if (isAEQT) {
                icon = '🌐';
                label = 'AE-QT';
                badgeColor = '#fef3c7';
                textColor = '#92400e';
            }
            
            return `
                <div class="autocomplete-item" data-name="${name}" data-prefix="${prefix}" style="
                    padding: 10px 12px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #1f2937;
                    border-bottom: 1px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: background 0.15s ease;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">${icon}</span>
                        <span style="font-weight: 600;">${name}</span>
                    </div>
                    ${label ? `<span style="font-size: 10px; padding: 2px 8px; background: ${badgeColor}; color: ${textColor}; border-radius: 12px; font-weight: 600;">${label}</span>` : ''}
                </div>
            `;
        }).join('');

        // Add hover and click handlers
        try {
            autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
                if (!item) return;
                
                item.addEventListener('mouseenter', function() {
                    this.style.background = '#eff6ff';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.background = 'white';
                });
                // Use mousedown instead of click to prevent blur event from hiding dropdown first
                item.addEventListener('mousedown', function(e) {
                    e.preventDefault(); // Prevent blur on cell
                    e.stopPropagation(); // Stop event bubbling
                    const name = this.dataset.name;
                    const prefix = this.dataset.prefix;
                    console.log('🖱️ Autocomplete item clicked:', name);
                    if (currentCell) {
                        // Combine prefix with selected name
                        currentCell.textContent = prefix + name;
                        console.log('✅ Set cell text to:', prefix + name);
                        // Trigger input event to save data
                        const event = new Event('input', { bubbles: true });
                        currentCell.dispatchEvent(event);
                    }
                    hideAutocomplete();
                    // Re-focus the cell after selection
                    if (currentCell) {
                        setTimeout(() => currentCell.focus(), 50);
                    }
                });
            });
        } catch (err) {
            console.error('Error attaching autocomplete item handlers:', err);
        }

        autocompleteList.style.display = 'block';
        currentCell = cell;
        console.log('📋 Autocomplete shown with', filtered.length, 'items for:', currentName);
    }

    // Hide autocomplete
    function hideAutocomplete() {
        if (autocompleteList) {
            autocompleteList.style.display = 'none';
        }
        currentCell = null;
    }

    // Initialize autocomplete on all tables
    function initUniversalAutocomplete() {
        if (isInitialized) {
            console.log('⚠️ Universal autocomplete already initialized, skipping...');
            return;
        }
        
        console.log('🚀 Initializing universal autocomplete...');
        isInitialized = true;
        
        // Load staff names on init
        loadStaffNames();
        
        // Create autocomplete element
        if (!autocompleteList) {
            createAutocomplete();
        }
        
        // Wait for tables to be rendered
        setTimeout(() => {
            // Listen to all table bodies in the document
            document.addEventListener('focus', (e) => {
                try {
                    const cell = e.target;
                    
                    // Check if it's an editable cell with data-col or data-col-key attribute
                    if (!cell || cell.tagName !== 'TD' || !cell.hasAttribute('contenteditable')) {
                        return;
                    }
                    
                    if (!cell.dataset.col && !cell.dataset.colKey) {
                        return;
                    }
                    
                    const colName = (cell.dataset.col || cell.dataset.colKey || '').toLowerCase();
                    
                    // Show autocomplete for 'name' or 'staff' columns
                    if (colName === 'name' || colName === 'staff') {
                        const value = cell.textContent.trim();
                        showAutocomplete(cell, value);
                    }
                } catch (err) {
                    console.error('Error in focus handler:', err);
                }
            }, true);

            document.addEventListener('input', (e) => {
                try {
                    const cell = e.target;
                    
                    if (cell.tagName === 'TD' && 
                        cell.hasAttribute('contenteditable') && 
                        (cell.dataset.col || cell.dataset.colKey)) {
                        
                        const colName = (cell.dataset.col || cell.dataset.colKey || '').toLowerCase();
                        
                        if (colName === 'name' || colName === 'staff') {
                            const value = cell.textContent.trim();
                            showAutocomplete(cell, value);
                        }
                    }
                } catch (err) {
                    console.error('Error in input handler:', err);
                }
            });

            document.addEventListener('blur', (e) => {
                try {
                    const cell = e.target;
                    
                    if (cell.tagName === 'TD' && (cell.dataset.col || cell.dataset.colKey)) {
                        const colName = (cell.dataset.col || cell.dataset.colKey || '').toLowerCase();
                        
                        if (colName === 'name' || colName === 'staff') {
                            // Longer delay to allow mousedown on autocomplete item
                            setTimeout(hideAutocomplete, 300);
                        }
                    }
                } catch (err) {
                    console.error('Error in blur handler:', err);
                }
            }, true);

            console.log('✅ Universal autocomplete initialized');
        }, 500);
    }

    // Close autocomplete on outside click (but not on the dropdown itself)
    document.addEventListener('mousedown', (e) => {
        try {
            if (!autocompleteList) return;
            
            if (autocompleteList.style.display === 'block' &&
                !autocompleteList.contains(e.target) && 
                e.target !== currentCell &&
                (!e.target.dataset || (e.target.dataset.col !== 'name' && e.target.dataset.col !== 'staff'))) {
                hideAutocomplete();
            }
        } catch (err) {
            console.error('Error in mousedown handler:', err);
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        try {
            if (e.key === 'Escape' && autocompleteList) {
                hideAutocomplete();
            }
            
            // Arrow key navigation (future enhancement)
            if (autocompleteList && autocompleteList.style.display === 'block') {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    // TODO: Navigate through items
                }
            }
        } catch (err) {
            console.error('Error in keydown handler:', err);
        }
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUniversalAutocomplete);
    } else {
        initUniversalAutocomplete();
    }

    // Re-initialize after table renders (for dynamic content) - but just refresh data
    window.addEventListener('tableRendered', function() {
        console.log('🔄 Table rendered, refreshing staff names...');
        loadStaffNames();
    });

    // Export for external use
    window.UniversalAutocomplete = {
        show: showAutocomplete,
        hide: hideAutocomplete,
        refresh: loadStaffNames,
        reinit: function() {
            isInitialized = false;
            initUniversalAutocomplete();
        }
    };

})();
