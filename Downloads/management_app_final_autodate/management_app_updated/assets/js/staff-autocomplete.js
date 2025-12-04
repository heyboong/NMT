// ====================================
// Staff Autocomplete for Dashboard Tables
// Tự động gợi ý tên nhân viên khi nhập
// Hỗ trợ 2 danh sách riêng: AE và AE-QT
// ====================================

(function() {
    'use strict';

    const STAFF_AE_KEY = 'staff_list_ae';
    const STAFF_AEQT_KEY = 'staff_list_aeqt';
    let autocompleteList = null;
    let currentCell = null;
    let staffNamesAE = [];
    let staffNamesAEQT = [];

    // Load staff lists
    function loadStaffNames() {
        try {
            const storedAE = localStorage.getItem(STAFF_AE_KEY);
            const storedAEQT = localStorage.getItem(STAFF_AEQT_KEY);
            staffNamesAE = storedAE ? JSON.parse(storedAE) : [];
            staffNamesAEQT = storedAEQT ? JSON.parse(storedAEQT) : [];
            console.log('📋 Staff AE autocomplete loaded:', staffNamesAE.length, 'names');
            console.log('📋 Staff AE-QT autocomplete loaded:', staffNamesAEQT.length, 'names');
        } catch (e) {
            console.error('Error loading staff names:', e);
            staffNamesAE = [];
            staffNamesAEQT = [];
        }
    }

    // Create autocomplete dropdown
    function createAutocomplete() {
        autocompleteList = document.createElement('div');
        autocompleteList.className = 'staff-autocomplete';
        autocompleteList.style.cssText = `
            position: absolute;
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 200px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            min-width: 200px;
        `;
        document.body.appendChild(autocompleteList);
    }

    // Show autocomplete
    function showAutocomplete(cell, searchTerm) {
        if (!autocompleteList) createAutocomplete();
        
        loadStaffNames();
        
        // Determine which table this cell belongs to
        // Check if cell is in AE table or AE-QT table by looking at parent table
        const table = cell.closest('table');
        let staffList = [];
        let iconColor = '#3b82f6';
        
        if (table) {
            const tableId = table.id || '';
            // You can customize this logic based on your table structure
            // For now, combining both lists for dashboard compatibility
            staffList = [...staffNamesAE, ...staffNamesAEQT];
        } else {
            staffList = [...staffNamesAE, ...staffNamesAEQT];
        }
        
        // Filter staff names
        const filtered = staffList.filter(name => 
            name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length === 0) {
            hideAutocomplete();
            return;
        }

        // Get cell position
        const rect = cell.getBoundingClientRect();
        autocompleteList.style.left = rect.left + 'px';
        autocompleteList.style.top = (rect.bottom + 2) + 'px';
        autocompleteList.style.width = Math.max(rect.width, 200) + 'px';

        // Render items with different icons for AE/AEQT
        autocompleteList.innerHTML = filtered.map(name => {
            const isAE = staffNamesAE.includes(name);
            const icon = isAE ? '💼' : '🌐';
            const label = isAE ? 'AE' : 'AE-QT';
            return `
                <div class="staff-autocomplete-item" data-name="${name}" style="
                    padding: 10px 12px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #1f2937;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">${icon}</span>
                        <span style="font-weight: 600;">${name}</span>
                    </div>
                    <span style="font-size: 10px; padding: 2px 6px; background: ${isAE ? '#dbeafe' : '#fef3c7'}; color: ${isAE ? '#1e40af' : '#92400e'}; border-radius: 4px; font-weight: 600;">${label}</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        autocompleteList.querySelectorAll('.staff-autocomplete-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.background = '#eff6ff';
            });
            item.addEventListener('mouseleave', function() {
                this.style.background = 'white';
            });
            item.addEventListener('click', function() {
                const name = this.dataset.name;
                if (currentCell) {
                    currentCell.textContent = name;
                    // Trigger input event to save data
                    const event = new Event('input', { bubbles: true });
                    currentCell.dispatchEvent(event);
                }
                hideAutocomplete();
            });
        });

        autocompleteList.style.display = 'block';
        currentCell = cell;
    }

    // Hide autocomplete
    function hideAutocomplete() {
        if (autocompleteList) {
            autocompleteList.style.display = 'none';
        }
        currentCell = null;
    }

    // Initialize autocomplete on staff cells
    function initStaffAutocomplete() {
        // Wait for tables to be rendered
        setTimeout(() => {
            const convTable = document.querySelector('#conversion-table');
            const withdrawTable = document.querySelector('#withdraw-table');

            [convTable, withdrawTable].forEach(table => {
                if (!table) return;

                // Add event listener to tbody
                const tbody = table.querySelector('tbody');
                if (!tbody) return;

                tbody.addEventListener('focus', (e) => {
                    const cell = e.target;
                    if (cell.tagName === 'TD' && cell.dataset.col === 'staff') {
                        // Show autocomplete on focus
                        const value = cell.textContent.trim();
                        showAutocomplete(cell, value);
                    }
                }, true);

                tbody.addEventListener('input', (e) => {
                    const cell = e.target;
                    if (cell.tagName === 'TD' && cell.dataset.col === 'staff') {
                        const value = cell.textContent.trim();
                        showAutocomplete(cell, value);
                    }
                });

                tbody.addEventListener('blur', (e) => {
                    const cell = e.target;
                    if (cell.tagName === 'TD' && cell.dataset.col === 'staff') {
                        // Delay to allow click on autocomplete item
                        setTimeout(hideAutocomplete, 200);
                    }
                }, true);
            });
        }, 1000);
    }

    // Close autocomplete on outside click
    document.addEventListener('click', (e) => {
        if (autocompleteList && 
            !autocompleteList.contains(e.target) && 
            e.target !== currentCell) {
            hideAutocomplete();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffAutocomplete);
    } else {
        initStaffAutocomplete();
    }

    // Re-initialize after table renders
    window.addEventListener('tableRendered', initStaffAutocomplete);

    // Export for external use
    window.StaffAutocomplete = {
        show: showAutocomplete,
        hide: hideAutocomplete,
        refresh: loadStaffNames
    };

})();
