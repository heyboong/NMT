/*
 * Note Manager - Context Menu and Note Popup System
 * 
 * Features:
 * - Right-click context menu on table rows
 * - Note popup modal with auto-save
 * - Note indicators on rows with notes
 * - Click outside to close and save
 * - Character counter
 * - Delete note functionality
 */

(function() {
    'use strict';

    // Storage keys
    const NOTES_STORAGE_KEY = 'table_row_notes';

    // State
    let currentRow = null;
    let currentTable = null;
    let contextMenuVisible = false;

    // Create context menu element
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" data-action="add-note">
            <span class="icon">📝</span>
            <span>Thêm/Sửa ghi chú</span>
        </div>
        <div class="context-menu-item" data-action="view-note">
            <span class="icon">👁️</span>
            <span>Xem ghi chú</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="delete-note">
            <span class="icon">🗑️</span>
            <span>Xóa ghi chú</span>
        </div>
    `;
    document.body.appendChild(contextMenu);

    // Create note popup overlay
    const notePopup = document.createElement('div');
    notePopup.className = 'note-popup-overlay';
    notePopup.innerHTML = `
        <div class="note-popup">
            <div class="note-popup-header">
                <h3><span>📝</span> Ghi chú dòng dữ liệu</h3>
                <button class="note-popup-close" aria-label="Đóng">&times;</button>
            </div>
            <div class="note-popup-body">
                <div class="note-popup-info">
                    <strong>Bảng:</strong> <span id="note-table-name"></span><br>
                    <strong>Dòng:</strong> <span id="note-row-number"></span>
                </div>
                <textarea 
                    class="note-textarea" 
                    id="note-textarea" 
                    placeholder="Nhập ghi chú của bạn tại đây...&#10;&#10;💡 Mẹo: Click ra ngoài hoặc nhấn Escape để tự động lưu"
                    maxlength="1000"
                ></textarea>
            </div>
            <div class="note-popup-footer">
                <div class="note-char-count">
                    <span id="note-char-count">0</span>/1000 ký tự
                </div>
                <div class="note-popup-actions">
                    <button class="note-btn note-btn-danger" id="note-delete-btn">
                        <span>🗑️</span> Xóa
                    </button>
                    <button class="note-btn note-btn-secondary" id="note-cancel-btn">
                        <span>✕</span> Hủy
                    </button>
                    <button class="note-btn note-btn-primary" id="note-save-btn">
                        <span>💾</span> Lưu
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(notePopup);

    // Create note tooltip for quick view
    const noteTooltip = document.createElement('div');
    noteTooltip.className = 'note-tooltip';
    noteTooltip.innerHTML = `
        <div class="note-tooltip-header">
            <div class="note-tooltip-title">
                <span>📝</span>
                <span id="tooltip-title">Ghi chú</span>
            </div>
            <button class="note-tooltip-close" aria-label="Đóng">&times;</button>
        </div>
        <div class="note-tooltip-content" id="tooltip-content"></div>
        <div class="note-tooltip-footer">
            <button class="note-tooltip-btn note-tooltip-btn-edit" id="tooltip-edit-btn">
                <span>✏️</span> Sửa
            </button>
            <button class="note-tooltip-btn note-tooltip-btn-delete" id="tooltip-delete-btn">
                <span>🗑️</span> Xóa
            </button>
        </div>
    `;
    document.body.appendChild(noteTooltip);

    // Get elements
    const textarea = document.getElementById('note-textarea');
    const charCount = document.getElementById('note-char-count');
    const saveBtn = document.getElementById('note-save-btn');
    const cancelBtn = document.getElementById('note-cancel-btn');
    const deleteBtn = document.getElementById('note-delete-btn');
    const closeBtn = notePopup.querySelector('.note-popup-close');
    const tableNameEl = document.getElementById('note-table-name');
    const rowNumberEl = document.getElementById('note-row-number');
    
    // Tooltip elements
    const tooltipContent = document.getElementById('tooltip-content');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipEditBtn = document.getElementById('tooltip-edit-btn');
    const tooltipDeleteBtn = document.getElementById('tooltip-delete-btn');
    const tooltipCloseBtn = noteTooltip.querySelector('.note-tooltip-close');
    
    let tooltipCurrentRow = null;
    let tooltipCurrentTable = null;
    let tooltipCurrentIndex = null;

    /**
     * Load all notes from localStorage
     * @returns {Object} Notes object indexed by table-row key
     */
    function loadNotes() {
        try {
            const stored = localStorage.getItem(NOTES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (err) {
            console.error('Error loading notes:', err);
            return {};
        }
    }

    /**
     * Save notes to localStorage
     * @param {Object} notes - Notes object to save
     */
    function saveNotes(notes) {
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        } catch (err) {
            console.error('Error saving notes:', err);
        }
    }

    /**
     * Generate unique key for table row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     * @returns {string} Unique key
     */
    function getNoteKey(tableName, rowIndex) {
        return `${tableName}_row_${rowIndex}`;
    }

    /**
     * Get note for specific row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     * @returns {string|null} Note text or null
     */
    function getNote(tableName, rowIndex) {
        const notes = loadNotes();
        const key = getNoteKey(tableName, rowIndex);
        return notes[key] || null;
    }

    /**
     * Save note for specific row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     * @param {string} noteText - Note content
     */
    function saveNote(tableName, rowIndex, noteText) {
        const notes = loadNotes();
        const key = getNoteKey(tableName, rowIndex);
        
        if (noteText && noteText.trim()) {
            notes[key] = noteText.trim();
        } else {
            delete notes[key];
        }
        
        saveNotes(notes);
        updateNoteIndicator(tableName, rowIndex);
    }

    /**
     * Delete note for specific row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     */
    function deleteNote(tableName, rowIndex) {
        const notes = loadNotes();
        const key = getNoteKey(tableName, rowIndex);
        delete notes[key];
        saveNotes(notes);
        updateNoteIndicator(tableName, rowIndex);
    }

    /**
     * Update note indicator on row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     */
    function updateNoteIndicator(tableName, rowIndex) {
        const row = findRowByTableAndIndex(tableName, rowIndex);
        if (!row) return;

        // Remove existing indicator
        const existingIndicator = row.querySelector('.note-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Remove has-note class
        row.classList.remove('has-note');

        // Add indicator if note exists
        const note = getNote(tableName, rowIndex);
        if (note) {
            // Add has-note class for styling
            row.classList.add('has-note');
            
            const indicator = document.createElement('span');
            indicator.className = 'note-indicator';
            indicator.textContent = '📝';
            indicator.title = 'Click để xem ghi chú';
            indicator.onclick = (e) => {
                e.stopPropagation();
                showNotePopup(row, tableName, rowIndex);
            };

            const firstCell = row.querySelector('th, td');
            if (firstCell) {
                firstCell.appendChild(indicator);
            }
        }
    }

    /**
     * Find row element by table name and index
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     * @returns {HTMLTableRowElement|null} Row element or null
     */
    function findRowByTableAndIndex(tableName, rowIndex) {
        let tableSelector;
        switch (tableName) {
            case 'AE':
                tableSelector = '#ae-table';
                break;
            case 'AE-QT':
                tableSelector = '#aeqt-table';
                break;
            case 'Dashboard-Conversion':
                tableSelector = '#conversion-table';
                break;
            case 'Dashboard-Withdraw':
                tableSelector = '#withdraw-table';
                break;
            default:
                return null;
        }

        const table = document.querySelector(tableSelector);
        if (!table) return null;

        const rows = table.querySelectorAll('tbody tr');
        return rows[rowIndex] || null;
    }

    /**
     * Get table name from table element
     * @param {HTMLElement} table - Table element
     * @returns {string} Table name
     */
    function getTableName(table) {
        const tableId = table.id;
        switch (tableId) {
            case 'ae-table':
                return 'AE';
            case 'aeqt-table':
                return 'AE-QT';
            case 'conversion-table':
                return 'Dashboard-Conversion';
            case 'withdraw-table':
                return 'Dashboard-Withdraw';
            default:
                return 'Unknown';
        }
    }

    /**
     * Show context menu at cursor position
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLTableRowElement} row - Table row
     */
    function showContextMenu(e, row) {
        e.preventDefault();
        
        currentRow = row;
        const table = row.closest('table');
        currentTable = getTableName(table);

        // Position menu at cursor
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.classList.add('active');
        contextMenuVisible = true;

        // Get row index from data attribute or calculate from tbody children
        const rowIndex = row.hasAttribute('data-row-index') 
            ? parseInt(row.getAttribute('data-row-index'))
            : Array.from(row.parentElement.children).indexOf(row);
        
        const hasNote = getNote(currentTable, rowIndex) !== null;
        
        const viewItem = contextMenu.querySelector('[data-action="view-note"]');
        const deleteItem = contextMenu.querySelector('[data-action="delete-note"]');
        
        if (hasNote) {
            viewItem.style.display = 'flex';
            deleteItem.style.display = 'flex';
        } else {
            viewItem.style.display = 'none';
            deleteItem.style.display = 'none';
        }
    }

    /**
     * Hide context menu
     */
    function hideContextMenu() {
        contextMenu.classList.remove('active');
        contextMenuVisible = false;
    }

    /**
     * Show note popup
     * @param {HTMLTableRowElement} row - Table row
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     */
    function showNotePopup(row, tableName, rowIndex) {
        currentRow = row;
        currentTable = tableName;

        // Set info
        tableNameEl.textContent = tableName;
        rowNumberEl.textContent = `Dòng ${rowIndex + 2}`; // +2 vì có header

        // Load existing note
        const existingNote = getNote(tableName, rowIndex);
        textarea.value = existingNote || '';
        updateCharCount();

        // Show popup
        notePopup.classList.add('active');
        textarea.focus();

        // Update delete button visibility
        deleteBtn.style.display = existingNote ? 'flex' : 'none';
    }

    /**
     * Hide note popup
     */
    function hideNotePopup() {
        notePopup.classList.remove('active');
        currentRow = null;
        currentTable = null;
    }
    
    /**
     * Show note tooltip at position
     * @param {HTMLElement} element - Element to show tooltip near
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     */
    function showNoteTooltip(element, tableName, rowIndex) {
        const note = getNote(tableName, rowIndex);
        if (!note) return;
        
        tooltipCurrentRow = element.closest('tr');
        tooltipCurrentTable = tableName;
        tooltipCurrentIndex = rowIndex;
        
        // Set content
        tooltipTitle.textContent = `Ghi chú`;
        tooltipContent.textContent = note;
        
        // Hide action buttons when opened from cell click (edit/xóa sẽ qua nút ghi chú ở STT)
        tooltipEditBtn.style.display = 'none';
        tooltipDeleteBtn.style.display = 'none';
        
        // Position tooltip to the right of the clicked cell
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 350;
        const tooltipHeight = 200; // max height
        
        let left = rect.right + window.scrollX + 10;
        let top = rect.top + window.scrollY;
        
        // Adjust if tooltip would go off-screen
        if (left + tooltipWidth > window.innerWidth) {
            left = Math.max(10, window.innerWidth - tooltipWidth - 10);
        }
        if (top + tooltipHeight > window.innerHeight + window.scrollY) {
            top = Math.max(10, rect.bottom + window.scrollY - tooltipHeight - 10);
        }
        
        noteTooltip.style.left = left + 'px';
        noteTooltip.style.top = top + 'px';
        noteTooltip.classList.add('active');
    }
    
    /**
     * Hide note tooltip
     */
    function hideNoteTooltip() {
        noteTooltip.classList.remove('active');
        tooltipCurrentRow = null;
        tooltipCurrentTable = null;
        tooltipCurrentIndex = null;
    }

    /**
     * Update character count
     */
    function updateCharCount() {
        const count = textarea.value.length;
        charCount.textContent = count;
        
        if (count > 900) {
            charCount.style.color = '#d14c4c';
        } else if (count > 700) {
            charCount.style.color = '#ff9800';
        } else {
            charCount.style.color = '#888';
        }
    }

    /**
     * Save current note
     */
    function saveCurrentNote() {
        if (!currentRow || !currentTable) return;

        const rowIndex = currentRow.hasAttribute('data-row-index')
            ? parseInt(currentRow.getAttribute('data-row-index'))
            : Array.from(currentRow.parentElement.children).indexOf(currentRow);
        const noteText = textarea.value.trim();

        saveNote(currentTable, rowIndex, noteText);
        
        // Show feedback
        showNotification('💾 Ghi chú đã được lưu!', 'success');
        
        hideNotePopup();
    }

    /**
     * Delete current note
     */
    function deleteCurrentNote() {
        if (!currentRow || !currentTable) return;

        if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) {
            return;
        }

        const rowIndex = currentRow.hasAttribute('data-row-index')
            ? parseInt(currentRow.getAttribute('data-row-index'))
            : Array.from(currentRow.parentElement.children).indexOf(currentRow);
        deleteNote(currentTable, rowIndex);
        
        showNotification('🗑️ Ghi chú đã được xóa!', 'info');
        
        hideNotePopup();
    }

    /**
     * Show notification toast
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (success, error, info)
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 3000;
            animation: slideInRight 0.3s ease-out;
            font-size: 14px;
            font-weight: 600;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Initialize note indicators for all tables
     */
    function initializeNoteIndicators() {
        const tables = ['AE', 'AE-QT', 'Dashboard-Conversion', 'Dashboard-Withdraw'];
        const notes = loadNotes();

        Object.keys(notes).forEach(key => {
            const match = key.match(/^(.+)_row_(\d+)$/);
            if (match) {
                const [, tableName, rowIndex] = match;
                if (tables.includes(tableName)) {
                    updateNoteIndicator(tableName, parseInt(rowIndex, 10));
                }
            }
        });
    }

    // Event Listeners
    
    // Click on table cells to show tooltip if row has note
    document.addEventListener('click', (e) => {
        const cell = e.target.closest('tbody td, tbody th');
        if (cell && !e.target.closest('.note-indicator')) {
            const row = cell.closest('tr');
            if (row && row.classList.contains('has-note')) {
                const table = row.closest('table');
                const validTables = ['ae-table', 'aeqt-table', 'conversion-table', 'withdraw-table'];
                if (table && validTables.includes(table.id)) {
                    const tableName = getTableName(table);
                    const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                    
                    // Hide tooltip if clicking same cell
                    if (noteTooltip.classList.contains('active') && 
                        tooltipCurrentTable === tableName && 
                        tooltipCurrentIndex === rowIndex) {
                        hideNoteTooltip();
                    } else {
                        showNoteTooltip(cell, tableName, rowIndex);
                    }
                    e.stopPropagation();
                }
            }
        }
    });
    
    // Right-click on table rows
    document.addEventListener('contextmenu', (e) => {
        const row = e.target.closest('tbody tr');
        if (row) {
            const table = row.closest('table');
            const validTables = ['ae-table', 'aeqt-table', 'conversion-table', 'withdraw-table'];
            if (table && validTables.includes(table.id)) {
                showContextMenu(e, row);
            }
        }
    });

    // Click outside context menu to close
    document.addEventListener('click', (e) => {
        if (contextMenuVisible && !contextMenu.contains(e.target)) {
            hideContextMenu();
        }
        
        // Close tooltip if clicking outside
        if (noteTooltip.classList.contains('active') && 
            !noteTooltip.contains(e.target) && 
            !e.target.closest('tbody tr.has-note')) {
            hideNoteTooltip();
        }
    });

    // Context menu actions
    contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;

        const action = item.dataset.action;
        const rowIndex = Array.from(currentRow.parentElement.children).indexOf(currentRow);

        hideContextMenu();

        switch (action) {
            case 'add-note':
            case 'view-note':
                showNotePopup(currentRow, currentTable, rowIndex);
                break;
            case 'delete-note':
                deleteCurrentNote();
                break;
        }
    });

    // Note popup - character counter
    textarea.addEventListener('input', updateCharCount);

    // Note popup - save button
    saveBtn.addEventListener('click', saveCurrentNote);

    // Note popup - cancel button
    cancelBtn.addEventListener('click', hideNotePopup);

    // Note popup - delete button
    deleteBtn.addEventListener('click', deleteCurrentNote);

    // Note popup - close button
    closeBtn.addEventListener('click', hideNotePopup);

    // Click outside popup to save and close
    notePopup.addEventListener('click', (e) => {
        if (e.target === notePopup) {
            saveCurrentNote();
        }
    });
    
    // Tooltip close button
    tooltipCloseBtn.addEventListener('click', hideNoteTooltip);
    
    // Tooltip edit button
    tooltipEditBtn.addEventListener('click', () => {
        if (tooltipCurrentRow && tooltipCurrentTable !== null && tooltipCurrentIndex !== null) {
            hideNoteTooltip();
            // Restore buttons visibility for popup use
            tooltipEditBtn.style.display = 'inline-flex';
            tooltipDeleteBtn.style.display = 'inline-flex';
            showNotePopup(tooltipCurrentRow, tooltipCurrentTable, tooltipCurrentIndex);
        }
    });
    
    // Tooltip delete button
    tooltipDeleteBtn.addEventListener('click', () => {
        if (tooltipCurrentTable !== null && tooltipCurrentIndex !== null) {
            if (confirm('Bạn có chắc muốn xóa ghi chú này?')) {
                deleteNote(tooltipCurrentTable, tooltipCurrentIndex);
                hideNoteTooltip();
                // Restore buttons visibility after delete action
                tooltipEditBtn.style.display = 'inline-flex';
                tooltipDeleteBtn.style.display = 'inline-flex';
                showNotification('🗑️ Ghi chú đã được xóa!', 'info');
            }
        }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notePopup.classList.contains('active')) {
                saveCurrentNote();
            }
            if (contextMenuVisible) {
                hideContextMenu();
            }
            if (noteTooltip.classList.contains('active')) {
                hideNoteTooltip();
            }
        }
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNoteIndicators);
    } else {
        initializeNoteIndicators();
    }

    // Re-initialize after table renders (for dynamic content)
    window.addEventListener('tableRendered', initializeNoteIndicators);

    // Export functions for external use
    window.NoteManager = {
        initializeNoteIndicators,
        getNote,
        saveNote,
        deleteNote
    };

})();
