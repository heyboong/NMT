/**
 * Row Manager - Quản lý thêm/xóa dòng thông minh cho các bảng
 * Tự động thêm dòng mới cho ngày hiện tại, xóa dòng cũ
 */

(function() {
    'use strict';

    class RowManager {
        constructor(tableId, options = {}) {
            this.tableId = tableId;
            this.table = document.getElementById(tableId);
            
            if (!this.table) {
                console.warn(`Table ${tableId} not found`);
                return;
            }

            // Options
            this.options = {
                dateColumn: options.dateColumn || 0, // Cột chứa ngày (0-indexed)
                autoAddToday: options.autoAddToday !== false, // Tự động thêm dòng ngày hôm nay
                maxRows: options.maxRows || 50, // Số dòng tối đa
                storageKey: options.storageKey || `rows_${tableId}`,
                onRowAdd: options.onRowAdd || null,
                onRowDelete: options.onRowDelete || null,
                defaultRowData: options.defaultRowData || {}
            };

            this.init();
        }

        init() {
            this.createToolbar();
            this.loadData();
            
            if (this.options.autoAddToday) {
                this.ensureTodayRow();
            }
        }

        createToolbar() {
            // Tạo toolbar phía trên bảng
            const toolbar = document.createElement('div');
            toolbar.className = 'row-manager-toolbar';
            toolbar.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; align-items: center;';
            
            toolbar.innerHTML = `
                <button class="btn-add-row" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <span>➕</span> Thêm Dòng
                </button>
                <button class="btn-add-today" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <span>📅</span> Thêm Ngày Hôm Nay
                </button>
                <button class="btn-delete-old" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <span>🗑️</span> Xóa Dòng Cũ
                </button>
                <select class="select-delete-days" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;">
                    <option value="7">Cũ hơn 7 ngày</option>
                    <option value="14">Cũ hơn 14 ngày</option>
                    <option value="30" selected>Cũ hơn 30 ngày</option>
                    <option value="60">Cũ hơn 60 ngày</option>
                    <option value="90">Cũ hơn 90 ngày</option>
                </select>
                <span class="row-count-badge" style="margin-left: auto; padding: 4px 10px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #6b7280;">
                    <strong id="${this.tableId}-row-count">0</strong> dòng
                </span>
            `;

            this.table.parentElement.insertBefore(toolbar, this.table);

            // Event listeners
            toolbar.querySelector('.btn-add-row').addEventListener('click', () => this.addRow());
            toolbar.querySelector('.btn-add-today').addEventListener('click', () => this.addTodayRow());
            toolbar.querySelector('.btn-delete-old').addEventListener('click', () => {
                const days = parseInt(toolbar.querySelector('.select-delete-days').value);
                this.deleteOldRows(days);
            });
        }

        addRow(data = null, insertAtIndex = null) {
            const tbody = this.table.querySelector('tbody');
            if (!tbody) return;

            // Chèn dòng tại vị trí chỉ định hoặc cuối bảng
            const row = insertAtIndex !== null && insertAtIndex >= 0 
                ? tbody.insertRow(insertAtIndex)
                : tbody.insertRow();
            
            const rowData = data || { ...this.options.defaultRowData };
            
            // Tự động thêm ngày hôm nay nếu không có
            if (!rowData.date && this.options.dateColumn === 0) {
                rowData.date = new Date().toISOString().split('T')[0];
            }

            // Tạo cells dựa trên header
            const headers = Array.from(this.table.querySelectorAll('thead th')).slice(1); // Bỏ cột số thứ tự
            
            headers.forEach((header, index) => {
                const cell = row.insertCell();
                const fieldName = header.textContent.toLowerCase();
                
                if (index === this.options.dateColumn) {
                    // Cột ngày - input date
                    cell.innerHTML = `<input type="date" value="${rowData.date || ''}" onchange="updateRowData('${this.tableId}', this)" style="width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px;">`;
                } else {
                    // Cột khác - input text/number
                    const value = rowData[fieldName] || '';
                    cell.innerHTML = `<input type="text" value="${value}" onchange="updateRowData('${this.tableId}', this)" style="width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right;">`;
                }
            });

            // Thêm cột hành động với nút Chèn và Xóa
            const actionCell = row.insertCell();
            actionCell.style.cssText = 'white-space: nowrap; display: flex; gap: 4px;';
            actionCell.innerHTML = `
                <button onclick="insertRowAbove('${this.tableId}', this)" 
                    style="padding: 4px 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;" 
                    title="Chèn dòng phía trên">
                    ⬆️ Chèn
                </button>
                <button onclick="deleteRowByIndex('${this.tableId}', this)" 
                    style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;" 
                    title="Xóa dòng này">
                    🗑️ Xóa
                </button>
            `;
            
            this.saveData();
            this.updateRowCount();
            
            if (this.options.onRowAdd) {
                this.options.onRowAdd(row, rowData);
            }

            return row;
        }

        addTodayRow() {
            const today = new Date().toISOString().split('T')[0];
            
            // Kiểm tra đã có dòng ngày hôm nay chưa
            const tbody = this.table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            const hasTodayRow = rows.some(row => {
                const dateInput = row.cells[this.options.dateColumn]?.querySelector('input[type="date"]');
                return dateInput && dateInput.value === today;
            });

            if (hasTodayRow) {
                alert('Đã có dòng cho ngày hôm nay!');
                return;
            }

            this.addRow({ date: today });
        }

        ensureTodayRow() {
            const today = new Date().toISOString().split('T')[0];
            
            const tbody = this.table.querySelector('tbody');
            if (!tbody) return;
            
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const hasTodayRow = rows.some(row => {
                const dateInput = row.cells[this.options.dateColumn]?.querySelector('input[type="date"]');
                return dateInput && dateInput.value === today;
            });

            if (!hasTodayRow && rows.length < this.options.maxRows) {
                this.addRow({ date: today });
            }
        }

        deleteOldRows(days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const tbody = this.table.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr'));
            let deletedCount = 0;

            rows.forEach(row => {
                const dateInput = row.cells[this.options.dateColumn]?.querySelector('input[type="date"]');
                if (dateInput && dateInput.value && dateInput.value < cutoffStr) {
                    row.remove();
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                this.saveData();
                this.updateRowCount();
                alert(`Đã xóa ${deletedCount} dòng cũ hơn ${days} ngày.`);
            } else {
                alert('Không có dòng nào cũ hơn ' + days + ' ngày.');
            }
        }

        deleteRowByIndex(rowIndex) {
            const tbody = this.table.querySelector('tbody');
            if (!tbody) return;

            tbody.deleteRow(rowIndex);
            this.saveData();
            this.updateRowCount();

            if (this.options.onRowDelete) {
                this.options.onRowDelete(rowIndex);
            }
        }

        updateRowCount() {
            const tbody = this.table.querySelector('tbody');
            const count = tbody ? tbody.querySelectorAll('tr').length : 0;
            const badge = document.getElementById(`${this.tableId}-row-count`);
            if (badge) {
                badge.textContent = count;
            }
        }

        saveData() {
            const tbody = this.table.querySelector('tbody');
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr'));
            const data = rows.map(row => {
                const cells = Array.from(row.cells);
                const rowData = {};
                
                cells.forEach((cell, index) => {
                    const input = cell.querySelector('input');
                    if (input) {
                        rowData[`col${index}`] = input.value;
                    }
                });
                
                return rowData;
            });

            localStorage.setItem(this.options.storageKey, JSON.stringify(data));
        }

        loadData() {
            const saved = localStorage.getItem(this.options.storageKey);
            if (!saved) return;

            try {
                const data = JSON.parse(saved);
                const tbody = this.table.querySelector('tbody');
                if (!tbody) return;

                // Xóa dòng hiện tại
                tbody.innerHTML = '';

                // Tạo lại các dòng
                data.forEach(rowData => {
                    this.addRow(rowData);
                });

                this.updateRowCount();
            } catch (e) {
                console.error('Error loading row data:', e);
            }
        }
    }

    // Global functions
    window.updateRowData = function(tableId, input) {
        const manager = window.rowManagers[tableId];
        if (manager) {
            manager.saveData();
        }
    };

    window.insertRowAbove = function(tableId, button) {
        const row = button.closest('tr');
        const rowIndex = row.rowIndex - 1; // Subtract header row
        const manager = window.rowManagers[tableId];
        if (manager) {
            // Thêm dòng mới ngay phía trên dòng hiện tại
            manager.addRow(null, rowIndex);
        }
    };

    window.deleteRowByIndex = function(tableId, button) {
        const row = button.closest('tr');
        const rowIndex = row.rowIndex - 1; // Subtract header row
        const manager = window.rowManagers[tableId];
        if (manager) {
            if (confirm('Bạn có chắc muốn xóa dòng này?')) {
                manager.deleteRowByIndex(rowIndex);
            }
        }
    };

    // Initialize managers
    window.rowManagers = {};
    
    window.initRowManager = function(tableId, options = {}) {
        if (!window.rowManagers[tableId]) {
            window.rowManagers[tableId] = new RowManager(tableId, options);
        }
        return window.rowManagers[tableId];
    };

})();
