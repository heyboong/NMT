/*
 * Inline Note Popup - Right-click context menu for table row notes
 * Shows note tooltip on hover and popup editor on right-click
 */

(function() {
    'use strict';

    const NOTES_STORAGE_KEY = 'table_row_notes';
    let currentPopup = null;
    let currentTooltip = null;
    let currentTableName = null;
    let currentRowIndex = null;
    let tooltipTimeout = null;

    /**
     * Load all notes from localStorage
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
     */
    function saveNotes(notes) {
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
            
            // Auto-sync to Supabase if available
            if (window.SupabaseSync && typeof window.SupabaseSync.push === 'function') {
                window.SupabaseSync.push(NOTES_STORAGE_KEY).catch(err => {
                    console.log('⏭️ Supabase sync skipped:', err.message);
                });
            }
        } catch (err) {
            console.error('Error saving notes:', err);
        }
    }

    /**
     * Get note key
     */
    function getNoteKey(tableName, rowIndex) {
        return `${tableName}_row_${rowIndex}`;
    }

    /**
     * Get note for specific row
     */
    function getNote(tableName, rowIndex) {
        const notes = loadNotes();
        const key = getNoteKey(tableName, rowIndex);
        return notes[key] || null;
    }

    /**
     * Save note for specific row
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
    }

    /**
     * Update cell note indicator
     */
    function updateCellNoteIndicator(cell, hasNote) {
        if (!cell) return;
        
        // Only show note indicator on cells that have content
        const hasContent = cell.textContent && cell.textContent.trim();
        
        if (hasNote && hasContent) {
            cell.setAttribute('data-has-note', 'true');
            // Only set title if we have the context
            if (currentTableName !== null && currentRowIndex !== null) {
                const note = getNote(currentTableName, currentRowIndex);
                if (note) {
                    const preview = note.length > 50 ? note.substring(0, 50) + '...' : note;
                    cell.title = 'Ghi chú: ' + preview;
                }
            }
        } else {
            cell.removeAttribute('data-has-note');
            cell.title = '';
        }
    }

    /**
     * Show note tooltip
     */
    function showNoteTooltip(cell, tableName, rowIndex, event) {
        const note = getNote(tableName, rowIndex);
        if (!note) return;

        closeTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'cell-note-tooltip';
        tooltip.textContent = note;
        document.body.appendChild(tooltip);
        currentTooltip = tooltip;

        const cellRect = cell.getBoundingClientRect();
        let left = cellRect.right + window.scrollX + 10;
        let top = cellRect.top + window.scrollY;

        if (left + 300 > window.innerWidth + window.scrollX) {
            left = cellRect.left + window.scrollX - 310;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    /**
     * Close tooltip
     */
    function closeTooltip() {
        if (currentTooltip && currentTooltip.parentElement) {
            currentTooltip.remove();
        }
        currentTooltip = null;
        clearTimeout(tooltipTimeout);
    }

    /**
     * Close current popup
     */
    function closePopup() {
        if (currentPopup && currentPopup.parentElement) {
            currentPopup.remove();
        }
        currentPopup = null;
        currentTableName = null;
        currentRowIndex = null;
    }

    /**
     * Save current note and update all cells in row
     */
    function saveCurrentNote() {
        if (!currentPopup || currentTableName === null || currentRowIndex === null) return;

        const textarea = currentPopup.querySelector('.inline-note-textarea');
        const noteText = textarea.value.trim();

        saveNote(currentTableName, currentRowIndex, noteText);
        
        // Update all cells in this row
        const tableSelector = currentTableName === 'Dashboard-Conversion' ? '#conversion-table' : '#withdraw-table';
        const table = document.querySelector(tableSelector);
        if (table) {
            const row = table.querySelector(`tbody tr[data-row-index="${currentRowIndex}"]`);
            if (row) {
                row.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
                    updateCellNoteIndicator(cell, noteText.length > 0);
                });
                
                // Update note icon button in action-cell
                const noteBtn = row.querySelector('.action-cell button[title*="ghi chú"]');
                if (noteBtn) {
                    const hasNote = noteText.length > 0;
                    noteBtn.textContent = hasNote ? '📝' : '📋';
                    noteBtn.title = hasNote ? 'Xem/Sửa ghi chú' : 'Thêm ghi chú';
                    noteBtn.style.border = hasNote ? '1px solid #3b82f6' : '1px solid #d1d5db';
                    noteBtn.style.background = hasNote ? '#dbeafe' : '#f9fafb';
                }
            }
        }

        // Show notification
        if (window.showNotification) {
            if (noteText) {
                window.showNotification('💾 Đã lưu ghi chú', 'success');
            } else {
                window.showNotification('🗑️ Đã xóa ghi chú', 'info');
            }
        }

        closePopup();
    }

    /**
     * Delete current note
     */
    function deleteCurrentNote() {
        if (currentTableName === null || currentRowIndex === null) return;

        if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) {
            return;
        }

        saveNote(currentTableName, currentRowIndex, '');
        
        // Update all cells in this row
        const tableSelector = currentTableName === 'Dashboard-Conversion' ? '#conversion-table' : '#withdraw-table';
        const table = document.querySelector(tableSelector);
        if (table) {
            const row = table.querySelector(`tbody tr[data-row-index="${currentRowIndex}"]`);
            if (row) {
                row.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
                    updateCellNoteIndicator(cell, false);
                });
                
                // Update note icon button in action-cell
                const noteBtn = row.querySelector('.action-cell button[title*="ghi chú"]');
                if (noteBtn) {
                    noteBtn.textContent = '📋';
                    noteBtn.title = 'Thêm ghi chú';
                    noteBtn.style.border = '1px solid #d1d5db';
                    noteBtn.style.background = '#f9fafb';
                }
            }
        }

        if (window.showNotification) {
            window.showNotification('🗑️ Đã xóa ghi chú', 'info');
        }

        closePopup();
    }

    /**
     * Update character count
     */
    function updateCharCount(textarea, countElement) {
        const count = textarea.value.length;
        const maxLength = 1000;
        countElement.textContent = `${count}/${maxLength}`;
        
        if (count > 900) {
            countElement.style.color = '#dc2626';
        } else if (count > 700) {
            countElement.style.color = '#f59e0b';
        } else {
            countElement.style.color = '#6b7280';
        }
    }

    /**
     * Show inline note popup from right-click
     * @param {Event} event - The contextmenu event
     * @param {string} tableName - Name of the table
     * @param {number} rowIndex - Row index
     */
    function showInlineNotePopup(event, tableName, rowIndex) {
        event.preventDefault();
        closePopup();
        closeTooltip();

        currentTableName = tableName;
        currentRowIndex = rowIndex;

        // Get existing note
        const existingNote = getNote(tableName, rowIndex) || '';

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'inline-note-popup';
        popup.innerHTML = `
            <div class="inline-note-header">
                <span>📝 Ghi chú - Dòng ${rowIndex + 2}</span>
                <button class="inline-note-close" type="button">&times;</button>
            </div>
            <div class="inline-note-body">
                <textarea 
                    class="inline-note-textarea" 
                    placeholder="Nhập ghi chú của bạn...&#10;&#10;💡 Mở ghi chú:&#10;  • Ctrl + Click vào ô bất kỳ&#10;  • Hoặc Click chuột phải"
                    maxlength="1000"
                >${existingNote}</textarea>
            </div>
            <div class="inline-note-footer">
                <div class="inline-note-char-count">${existingNote.length}/1000</div>
                <div class="inline-note-actions">
                    ${existingNote ? '<button class="inline-note-btn inline-note-btn-delete" type="button">🗑️ Xóa</button>' : ''}
                    <button class="inline-note-btn inline-note-btn-cancel" type="button">Hủy</button>
                    <button class="inline-note-btn inline-note-btn-save" type="button">💾 Lưu</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        currentPopup = popup;

        // Position popup near the cursor with improved boundary checking
        const popupWidth = 350;
        const popupHeight = 280;
        
        // Use clientX/clientY for viewport coordinates instead of pageX/pageY
        let left = event.clientX + 10;
        let top = event.clientY;

        // Adjust if popup would go off-screen (right edge)
        if (left + popupWidth > window.innerWidth) {
            left = event.clientX - popupWidth - 10;
        }
        
        // Adjust if popup would go off-screen (bottom edge)
        if (top + popupHeight > window.innerHeight) {
            top = Math.max(10, window.innerHeight - popupHeight - 10);
        }
        
        // Ensure popup stays within left boundary
        if (left < 10) {
            left = 10;
        }
        
        // Ensure popup stays within top boundary
        if (top < 10) {
            top = 10;
        }

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';

        // Get elements
        const textarea = popup.querySelector('.inline-note-textarea');
        const charCountEl = popup.querySelector('.inline-note-char-count');
        const saveBtn = popup.querySelector('.inline-note-btn-save');
        const cancelBtn = popup.querySelector('.inline-note-btn-cancel');
        const deleteBtn = popup.querySelector('.inline-note-btn-delete');
        const closeBtn = popup.querySelector('.inline-note-close');

        // Focus textarea
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Event listeners
        textarea.addEventListener('input', () => updateCharCount(textarea, charCountEl));
        saveBtn.addEventListener('click', saveCurrentNote);
        cancelBtn.addEventListener('click', closePopup);
        closeBtn.addEventListener('click', closePopup);
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteCurrentNote);
        }

        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', function outsideClickHandler(e) {
                if (currentPopup && !currentPopup.contains(e.target)) {
                    closePopup();
                    document.removeEventListener('click', outsideClickHandler);
                }
            });
        }, 100);

        // Escape key to close
        function escapeHandler(e) {
            if (e.key === 'Escape' && currentPopup) {
                closePopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        }
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Initialize note system for tables
     */
    function initializeNotesForTables() {
        const tables = [
            { selector: '#conversion-table', name: 'Dashboard-Conversion' },
            { selector: '#withdraw-table', name: 'Dashboard-Withdraw' }
        ];

        tables.forEach(({ selector, name }) => {
            const table = document.querySelector(selector);
            if (!table) return;

            // Add event listeners to all data cells
            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            // Right-click to open note popup
            tbody.addEventListener('contextmenu', (e) => {
                const cell = e.target.closest('td[contenteditable="true"]');
                if (!cell) return;

                const row = cell.closest('tr');
                const rowIndex = parseInt(row.getAttribute('data-row-index'));
                
                if (!isNaN(rowIndex)) {
                    showInlineNotePopup(e, name, rowIndex);
                }
            });

            // Left-click to open note popup (single click)
            tbody.addEventListener('click', (e) => {
                // Check if Ctrl/Cmd key is pressed (for opening notes)
                if (e.ctrlKey || e.metaKey) {
                    const cell = e.target.closest('td[contenteditable="true"]');
                    if (!cell) return;

                    const row = cell.closest('tr');
                    const rowIndex = parseInt(row.getAttribute('data-row-index'));
                    
                    if (!isNaN(rowIndex)) {
                        e.preventDefault();
                        showInlineNotePopup(e, name, rowIndex);
                    }
                }
            });

            tbody.addEventListener('mouseenter', (e) => {
                const cell = e.target.closest('td[contenteditable="true"]');
                if (!cell) return;

                const row = cell.closest('tr');
                const rowIndex = parseInt(row.getAttribute('data-row-index'));
                
                if (!isNaN(rowIndex) && getNote(name, rowIndex)) {
                    clearTimeout(tooltipTimeout);
                    tooltipTimeout = setTimeout(() => {
                        showNoteTooltip(cell, name, rowIndex, e);
                    }, 500);
                }
            }, true);

            tbody.addEventListener('mouseleave', (e) => {
                const cell = e.target.closest('td[contenteditable="true"]');
                if (cell) {
                    clearTimeout(tooltipTimeout);
                    closeTooltip();
                }
            }, true);
        });

        // Update all cell indicators on load
        tables.forEach(({ selector, name }) => {
            const table = document.querySelector(selector);
            if (!table) return;

            const rows = table.querySelectorAll('tbody tr[data-row-index]');
            rows.forEach(row => {
                const rowIndex = parseInt(row.getAttribute('data-row-index'));
                if (isNaN(rowIndex)) return;
                
                const note = getNote(name, rowIndex);
                
                if (note) {
                    row.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
                        // Only show note indicator on cells that have content
                        if (cell && cell.textContent && cell.textContent.trim()) {
                            cell.setAttribute('data-has-note', 'true');
                            const preview = note.length > 50 ? note.substring(0, 50) + '...' : note;
                            cell.title = 'Ghi chú: ' + preview;
                        }
                    });
                }
            });
        });
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNotesForTables);
    } else {
        initializeNotesForTables();
    }

    // Re-initialize after table renders
    window.addEventListener('tableRendered', () => {
        setTimeout(initializeNotesForTables, 100);
    });

    // Export to global scope
    window.showInlineNotePopup = showInlineNotePopup;

})();
