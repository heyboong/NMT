/*
 * Interactive spreadsheet logic for the AE page.
 *
 * This script dynamically builds a grid based off of the provided
 * column definitions, allows the user to edit cells directly, and
 * automatically calculates totals per row and across the entire table.
 * Data is persisted in localStorage so that it survives page reloads.
 */

(function() {
    const tableBody = document.querySelector('#ae-table tbody');
    const totalDisplay = document.getElementById('ae-total-sum');
    // Define the editable columns for the AE sheet.  The order here
    // corresponds to the columns B‑G in the rendered table (A is the
    // row number). Column H (total) removed per requirements.
    const columns = ['date', 'money', 'name', 'chia', 'khoa', 'note', 'tt'];
    const NUM_ROWS = 50;
    
    /**
     * Format date to Vietnamese format (DD/MM/YYYY)
     * @param {Date} date
     * @returns {string}
     */
    function formatDateInput(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Get current date in Vietnamese timezone
     * @returns {Date}
     */
    function getCurrentDate() {
        try {
            // Lấy ngày hiện tại theo múi giờ Việt Nam
            const now = new Date();
            const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            return vnTime;
        } catch (e) {
            return new Date();
        }
    }
    // Load any existing data; ensure we have at least NUM_ROWS rows.
    let data = loadData('AE_sheet');
    if (!Array.isArray(data)) data = [];
    
    // Migrate old data: add tt field if missing, and calculate value
    data = data.map(row => {
        // Ensure all required fields exist
        const migratedRow = {
            date: row.date || '',
            money: row.money || '',
            name: row.name || '',
            chia: row.chia || '',
            khoa: row.khoa || '',
            note: row.note || '',
            tt: row.tt || ''
        };
        
        // If row has data but missing calculated fields, compute them
        if (migratedRow.chia && !migratedRow.tt) {
            const chiaVal = parseFloat(migratedRow.chia);
            if (!isNaN(chiaVal) && chiaVal > 0) {
                migratedRow.tt = (chiaVal * 0.5).toFixed(2);
            }
        }
        
        return migratedRow;
    });
    
    // Pad with empty rows if needed
    for (let i = data.length; i < NUM_ROWS; i++) {
        data.push({ date: '', money: '', name: '', chia: '', khoa: '', note: '', tt: '' });
    }
    
    // Save migrated data
    saveData('AE_sheet', data);

    // Use global formatCurrency (formatVND) from app.js

    /**
     * Compute Chia for a given row - uses FormulaEngine.
     * Chia = Tiền làm ÷ Số lượng tên (nếu có nhiều hơn 1 tên, phân cách bằng dấu phẩy)
     * @param {Object} row
     * @returns {number|null} - Returns null if only 1 name or no name
     */
    function computeChia(row) {
        if (!row) return null;
        
        // Use FormulaEngine if available
        if (window.FormulaEngine) {
            return window.FormulaEngine.calculate('ae', 'chia', row);
        }
        
        // Fallback: manual calculation
        const money = parseFloat(row.money) || 0;
        const name = String(row.name || '').trim();
        
        if (!name || money <= 0) return null;
        
        // Count names separated by comma
        const names = name.split(',').map(n => n.trim()).filter(n => n.length > 0);
        const nameCount = names.length;
        
        // Only calculate if more than 1 name
        if (nameCount > 1) {
            return Math.round(money / nameCount);
        }
        
        return null;
    }
    
    /**
     * Compute Chia for a given row - uses FormulaEngine.
     * Chia = Tiền làm ÷ Số lượng tên (nếu có nhiều hơn 1 tên, phân cách bằng dấu phẩy)
     * @param {Object} row
     * @returns {number|null} - Returns null if only 1 name or no name
     */
    function computeChia(row) {
        if (!row) return null;
        
        // Use FormulaEngine if available
        if (window.FormulaEngine) {
            return window.FormulaEngine.calculate('ae', 'chia', row);
        }
        
        // Fallback: manual calculation
        const money = parseFloat(row.money) || 0;
        const name = String(row.name || '').trim();
        
        if (!name || money <= 0) return null;
        
        // Count names separated by comma
        const names = name.split(',').map(n => n.trim()).filter(n => n.length > 0);
        const nameCount = names.length;
        
        // Only calculate if more than 1 name
        if (nameCount > 1) {
            return Math.round(money / nameCount);
        }
        
        return null;
    }
    
    /**
     * Compute TT (VND) for a given row - uses FormulaEngine.
     * TT = Chia × 0.5 (có thể thay đổi qua cài đặt)
     * @param {Object} row
     * @returns {number}
     */
    function computeTT(row) {
        if (!row) return 0;
        
        // Use FormulaEngine if available
        if (window.FormulaEngine) {
            return window.FormulaEngine.calculate('ae', 'tt', row) || 0;
        }
        
        // Fallback: original formula
        const chia = parseFloat(row.chia) || 0;
        if (chia <= 0) return 0;
        return chia * 0.5;
    }

    /**
     * Render the entire table body based on current data.
     */
    function renderTable() {
        if (!tableBody) {
            console.error('Table body element not found');
            return;
        }
        if (!Array.isArray(data)) {
            console.error('Data is not an array');
            return;
        }
        tableBody.innerHTML = '';
        let previousDate = null; // Theo dõi ngày trước đó
        
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            
            // Kiểm tra nếu ngày thay đổi so với dòng trước
            const currentDate = row.date ? row.date.trim() : '';
            if (currentDate && previousDate && currentDate !== previousDate) {
                // Thêm border-top màu xanh lá để ngăn cách ngày
                tr.style.borderTop = '3px solid #4ade80';
            }
            previousDate = currentDate;
            
            // Row header cell showing the row number (starting at 2)
            const th = document.createElement('th');
            th.className = 'row-header';
            th.textContent = rowIndex + 2;
            tr.appendChild(th);
            // Create editable cells for each defined column
            columns.forEach(col => {
                const td = document.createElement('td');
                
                // TT (Nhận) is not editable - calculated field
                if (col === 'tt') {
                    td.className = 'total-cell';
                    td.dataset.col = col;
                    const ttValue = computeTT(row);
                    td.textContent = ttValue > 0 ? formatCurrency(ttValue) : '0₫';
                } else {
                    td.setAttribute('contenteditable', 'true');
                    td.dataset.row = rowIndex;
                    td.dataset.col = col;
                    // For money column, show formatted value but allow raw input
                    if (col === 'money' && row[col]) {
                        const num = parseFloat(row[col]);
                        if (!isNaN(num) && isFinite(num)) {
                            td.textContent = num.toLocaleString('vi-VN');
                        } else {
                            td.textContent = row[col] || '';
                        }
                    } else if (col === 'chia' && row[col]) {
                        // Format Chia column as VND (no decimals, with comma separator)
                        const num = parseFloat(row[col]);
                        if (!isNaN(num) && isFinite(num)) {
                            td.textContent = Math.round(num).toLocaleString('vi-VN');
                        } else {
                            td.textContent = row[col] || '';
                        }
                    } else {
                        td.textContent = row[col] || '';
                    }
                    // When the cell content changes, update data and recalc totals
                    td.addEventListener('input', onCellInput);
                    td.addEventListener('focus', function() {
                        // Show raw number on focus for easier editing
                        if (col === 'money' || col === 'chia') {
                            const rawValue = data[rowIndex][col];
                            if (rawValue) {
                                this.textContent = rawValue;
                            }
                            // Select all text for easier replacement
                            const range = document.createRange();
                            range.selectNodeContents(this);
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    });
                    td.addEventListener('blur', function(e) {
                        // Skip formatting if autocomplete is active (for name column)
                        const autocompleteActive = document.querySelector('.autocomplete-list') && 
                                                  document.querySelector('.autocomplete-list').style.display === 'block';
                        
                        // Format on blur if it's a number (and autocomplete not active)
                        if ((col === 'money' || col === 'chia') && !autocompleteActive) {
                            const num = parseFloat(this.textContent.replace(/[^\d.-]/g, ''));
                            if (!isNaN(num) && isFinite(num)) {
                                // Format as VND currency: no decimals, comma separator
                                this.textContent = Math.round(num).toLocaleString('vi-VN');
                            }
                        }
                    });
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
        updateTotalDisplay();
        if (window.TableResizer) {
            window.TableResizer.initTable('ae-table', { enableRowResize: true });
        }
    }

    /**
     * Handler for cell input events with comprehensive validation.
     * 
     * Responsibilities:
     * 1. Sanitize and validate user input
     * 2. Update data structure with cleaned values
     * 3. Auto-fill date when money is entered
     * 4. Auto-calculate Chia based on name count
     * 5. Clear dependent fields when money is cleared
     * 6. Recalculate row total
     * 7. Persist changes to localStorage
     * 
     * @param {Event} e - Input event from contenteditable cell
     */
    function onCellInput(e) {
        const td = e.target;
        const rowIndex = parseInt(td.dataset.row, 10);
        const col = td.dataset.col;
        
        // Validate event target
        if (!Number.isInteger(rowIndex) || !col || rowIndex < 0 || rowIndex >= data.length) {
            console.warn('onCellInput: Invalid row/column', rowIndex, col);
            return;
        }
        
        // Get and sanitize input value
        let value = td.textContent.trim();
        
        // Special handling for money column: remove formatting
        if (col === 'money') {
            // Remove all non-numeric characters except minus and decimal point
            value = value.replace(/[^\d.-]/g, '');
            
            // Validate numeric input
            const numValue = parseFloat(value);
            if (value && (!isFinite(numValue) || isNaN(numValue) || numValue < 0)) {
                console.warn('Invalid money value:', value);
                // Restore previous valid value
                td.textContent = data[rowIndex][col] || '';
                return;
            }
        }
        
        // Update data structure
        data[rowIndex][col] = value;
        
        const tr = td.parentElement;
        
        // Auto-fill date when money is entered (if date is empty)
        if (col === 'money' && value && !data[rowIndex].date) {
            const currentDate = formatDateInput(getCurrentDate());
            data[rowIndex].date = currentDate;
            
            const dateTd = tr.querySelector('td[data-col="date"]');
            if (dateTd) {
                dateTd.textContent = currentDate;
            }
        }
        
        // Clear dependent fields when money is cleared
        if (col === 'money' && !value) {
            data[rowIndex].chia = '';
            data[rowIndex].khoa = '';
            data[rowIndex].total = '';
            data[rowIndex].tt = '';
            
            const chiaTd = tr.querySelector('td[data-col="chia"]');
            const khoaTd = tr.querySelector('td[data-col="khoa"]');
            const ttTd = tr.querySelector('td[data-col="tt"]');
            const totalTd = tr.querySelector('td[data-col="total"]');
            if (chiaTd) chiaTd.textContent = '';
            if (khoaTd) khoaTd.textContent = '';
            if (ttTd) ttTd.textContent = formatCurrency(0);
            if (totalTd) totalTd.textContent = formatCurrency(0);
            
            updateTotalDisplay();
            saveData('AE_sheet', data);
            return;
        }
        
        // Auto-calculate Chia when money or name changes
        if (col === 'money' || col === 'name') {
            const chiaValue = computeChia(data[rowIndex]);
            
            if (chiaValue === null || typeof chiaValue === 'undefined') {
                // No valid name or single name → Chia not applicable
                data[rowIndex].chia = '';
            } else {
                // Multiple names → calculate division, store as number
                data[rowIndex].chia = Math.round(chiaValue).toString();
            }
            
            // Update Chia cell display with VND format
            const chiaTd = tr.querySelector('td[data-col="chia"]');
            if (chiaTd) {
                if (data[rowIndex].chia) {
                    const chiaNum = parseFloat(data[rowIndex].chia);
                    chiaTd.textContent = chiaNum.toLocaleString('vi-VN');
                } else {
                    chiaTd.textContent = '';
                }
            }
        }
        
        // Update TT cell
        const ttTd = tr.querySelector('td[data-col="tt"]');
        if (ttTd) {
            const tt = computeTT(data[rowIndex]);
            ttTd.textContent = tt > 0 ? formatCurrency(tt) : '0₫';
        }
        
        // Update aggregate total and persist
        updateTotalDisplay();
        saveData('AE_sheet', data);
        
        // Highlight row as recently updated
        if (tr) {
            highlightRecentRow(tr, 5000);
        }
    }

    /**
     * Update the display of the sheet‐wide total by summing money column
     * across all rows.
     */
    function updateTotalDisplay() {
        if (!totalDisplay) return;
        let sum = 0;
        if (Array.isArray(data)) {
            data.forEach(row => {
                if (row) {
                    const val = parseFloat(row.money) || 0;
                    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
                        sum += val;
                    }
                }
            });
        }
        totalDisplay.textContent = 'Tổng cộng: ' + formatCurrency(sum);
    }

    // Kick off the initial render
    renderTable();
})();