(function() {
    'use strict';
    
    const CATEGORY_KEY = 'system_categories';
    const DEFAULT_INITIAL_ROWS = 20;
    const DEFAULT_MAX_ROWS = 300;
    const ADD_ROWS_STEP = 10;
    
    // Auto-save configuration
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1000; // 1 second after last edit

    const form = document.getElementById('system-category-form');
    if (!form) return;

    const nameInput = document.getElementById('category-name');
    const descriptionInput = document.getElementById('category-description');
    const initialRowsInput = document.getElementById('category-initial-rows');
    const maxRowsInput = document.getElementById('category-max-rows');
    const columnsContainer = document.getElementById('system-columns-container');
    const addColumnBtn = document.getElementById('system-add-column');
    const displayOrderInput = document.getElementById('category-display-order');
    const displayPageInputs = document.querySelectorAll('input[name="category-pages"]');
    const statusEl = document.getElementById('system-form-status');
    const categoryListEl = document.getElementById('system-category-list');
    const tableTitleEl = document.getElementById('system-table-title');
    const tableSubtitleEl = document.getElementById('system-table-subtitle');
    const tableWrapperEl = document.getElementById('system-table-wrapper');
    const emptyStateEl = document.getElementById('system-empty-state');
    const addRowsBtn = document.getElementById('system-add-rows');
    const tableEl = document.getElementById('system-table');
    const totalsEl = document.getElementById('system-total-display');
    const importCategoryBtn = document.getElementById('import-category-btn');
    const exportAllBtn = document.getElementById('export-all-btn');

    let categories = loadCategories();
    let selectedCategoryId = null;
    let currentTableData = [];
    let editingCategoryId = null;
    let hasUnsavedChanges = false;

    init();

    function init() {
        resetColumnBuilder();
        renderCategoryList();
        bindEvents();
        if (categories.length) {
            selectCategory(categories[0].id);
        }
    }

    function bindEvents() {
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => {
                console.log('Add column button clicked');
                addColumnRow();
            });
        } else {
            console.error('Add column button not found!');
        }
        form.addEventListener('submit', handleCreateCategory);
        if (categoryListEl) {
            categoryListEl.addEventListener('click', handleCategoryListClick);
        }
        if (addRowsBtn) {
            addRowsBtn.addEventListener('click', handleAddRows);
        }
        
        // Import/Export handlers are bound in system-import-export.js
    }

    function handleCreateCategory(event) {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (!name) {
            setStatus('Vui lòng nhập tên danh mục.', true);
            return;
        }

        const columns = collectColumns();
        if (!columns.length) {
            setStatus('Cần ít nhất một cột hợp lệ.', true);
            return;
        }

        const pages = collectSelectedPages();
        const order = parseInt(displayOrderInput.value, 10) || 999;

        const initialRows = clamp(parseInt(initialRowsInput.value, 10) || DEFAULT_INITIAL_ROWS, 5, 200);
        const maxRows = clamp(parseInt(maxRowsInput.value, 10) || DEFAULT_MAX_ROWS, 10, 500);
        if (initialRows > maxRows) {
            setStatus('Số dòng ban đầu phải nhỏ hơn số dòng tối đa.', true);
            return;
        }

        if (editingCategoryId) {
            // Update existing category
            const category = categories.find(cat => cat.id === editingCategoryId);
            if (category) {
                category.name = name;
                category.description = descriptionInput.value.trim();
                category.columns = columns;
                category.initialRows = initialRows;
                category.maxRows = maxRows;
                category.pages = pages;
                category.order = order;
                
                saveCategories();
                renderCategoryList();
                
                // Update table if currently viewing this category
                if (selectedCategoryId === editingCategoryId) {
                    renderTable(category);
                }
                
                cancelEdit();
                setStatus('✅ Đã cập nhật danh mục: ' + name, false);
                showNotification('Đã cập nhật danh mục thành công', 'success');
            }
        } else {
            // Create new category
            const category = {
                id: generateId('category'),
                name,
                description: descriptionInput.value.trim(),
                columns,
                initialRows,
                maxRows,
                rowCount: initialRows,
                pages,
                order: order
            };
            categories.push(category);
            saveCategories();
            renderCategoryList();
            resetForm();
            setStatus('✅ Đã tạo danh mục mới: ' + name, false);
            selectCategory(category.id);
            showNotification('Đã tạo danh mục mới thành công', 'success');
        }
    }

    function handleCategoryListClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const card = button.closest('.system-category-card');
        if (!card) return;
        const categoryId = card.dataset.categoryId;
        if (!categoryId) return;
        const action = button.dataset.action;
        
        switch (action) {
            case 'select':
                selectCategory(categoryId);
                break;
            case 'edit':
                editCategory(categoryId);
                break;
            case 'duplicate':
                duplicateCategory(categoryId);
                break;
            case 'export':
                exportCategory(categoryId);
                break;
            case 'delete':
                deleteCategory(categoryId);
                break;
        }
    }

    function handleAddRows() {
        const category = getSelectedCategory();
        if (!category) return;
        const current = category.rowCount || category.initialRows || DEFAULT_INITIAL_ROWS;
        const limit = category.maxRows || DEFAULT_MAX_ROWS;
        if (current >= limit) {
            setStatus('Đã đạt giới hạn dòng tối đa của danh mục.', true);
            return;
        }
        category.rowCount = Math.min(limit, current + ADD_ROWS_STEP);
        saveCategories();
        renderTable(category);
        setStatus(`Đã thêm dòng (tổng ${category.rowCount}).`, false);
    }

    function deleteCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;
        if (!confirm(`Xóa danh mục "${category.name}"?`)) {
            return;
        }
        categories = categories.filter(cat => cat.id !== categoryId);
        saveCategories();
        localStorage.removeItem(getCategoryStorageKey(categoryId));
        renderCategoryList();
        if (selectedCategoryId === categoryId) {
            selectedCategoryId = null;
            currentTableData = [];
            tableWrapperEl.hidden = true;
            emptyStateEl.hidden = false;
            addRowsBtn.disabled = true;
            tableTitleEl.textContent = 'Chưa chọn danh mục';
            tableSubtitleEl.textContent = 'Chọn hoặc tạo một danh mục để bắt đầu nhập dữ liệu.';
        }
    }

    function selectCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;
        selectedCategoryId = categoryId;
        tableTitleEl.textContent = category.name;
        tableSubtitleEl.textContent = category.description || `${category.columns.length} cột tùy chỉnh · tối đa ${category.maxRows || DEFAULT_MAX_ROWS} dòng`;
        tableWrapperEl.hidden = false;
        emptyStateEl.hidden = true;
        addRowsBtn.disabled = false;
        renderTable(category);
    }

    function renderTable(category) {
        const rowCount = Math.max(category.rowCount || category.initialRows || DEFAULT_INITIAL_ROWS, category.initialRows || DEFAULT_INITIAL_ROWS);
        category.rowCount = rowCount;
        saveCategories();
        const saved = loadCategoryData(category.id);
        currentTableData = [];
        for (let i = 0; i < rowCount; i += 1) {
            const row = saved[i] ? Object.assign({}, saved[i]) : {};
            currentTableData.push(row);
        }
        buildTableHeader(category);
        buildTableBody(category);
        updateTotals(category);
    }

    function buildTableHeader(category) {
        const thead = tableEl.querySelector('thead');
        thead.innerHTML = '';
        const lettersRow = document.createElement('tr');
        const numbersRow = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.className = 'row-header';
        lettersRow.appendChild(rowHeader);
        const rowHeader2 = document.createElement('th');
        rowHeader2.className = 'row-header';
        rowHeader2.textContent = '1';
        numbersRow.appendChild(rowHeader2);
        category.columns.forEach((col, index) => {
            const letterTh = document.createElement('th');
            letterTh.textContent = toColumnLabel(index);
            lettersRow.appendChild(letterTh);
            const nameTh = document.createElement('th');
            nameTh.textContent = col.label;
            numbersRow.appendChild(nameTh);
        });
        thead.appendChild(lettersRow);
        thead.appendChild(numbersRow);
    }

    function buildTableBody(category) {
        const tbody = tableEl.querySelector('tbody');
        tbody.innerHTML = '';
        currentTableData.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            const header = document.createElement('th');
            header.className = 'row-header';
            header.textContent = rowIndex + 2;
            tr.appendChild(header);
            category.columns.forEach(col => {
                const td = document.createElement('td');
                td.contentEditable = 'true';
                td.dataset.rowIndex = rowIndex;
                td.dataset.colKey = col.key;
                td.dataset.col = col.key; // For autocomplete compatibility
                td.textContent = row[col.key] || '';
                td.addEventListener('input', handleCellInput);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        if (window.TableResizer) {
            window.TableResizer.initTable('system-table', { enableRowResize: true });
        }
    }

    function handleCellInput(event) {
        const td = event.target;
        const rowIndex = Number(td.dataset.rowIndex);
        const colKey = td.dataset.colKey;
        if (!Number.isInteger(rowIndex) || !colKey) return;
        if (!currentTableData[rowIndex]) {
            currentTableData[rowIndex] = {};
        }
        const value = td.textContent.trim();
        if (value) {
            currentTableData[rowIndex][colKey] = value;
        } else {
            delete currentTableData[rowIndex][colKey];
        }
        
        hasUnsavedChanges = true;
        
        // Auto-save with debounce
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(() => {
            persistTableData();
            hasUnsavedChanges = false;
            showAutoSaveIndicator();
        }, AUTO_SAVE_DELAY);
        
        const category = getSelectedCategory();
        if (category) {
            updateTotals(category);
        }
    }

    function persistTableData() {
        const category = getSelectedCategory();
        if (!category) return;
        const sanitized = currentTableData.map(row => sanitizeRow(row, category.columns));
        saveData(getCategoryStorageKey(category.id), sanitized);
    }

    function sanitizeRow(row, columns) {
        if (!row) return {};
        const clean = {};
        columns.forEach(col => {
            const value = row[col.key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                clean[col.key] = String(value).trim();
            }
        });
        return clean;
    }

    function updateTotals(category) {
        const sumColumns = category.columns.filter(col => col.sum);
        if (!sumColumns.length) {
            totalsEl.textContent = 'Danh mục này chưa bật cột tính tổng.';
            return;
        }
        const totals = sumColumns.map(col => {
            let total = 0;
            currentTableData.forEach(row => {
                const value = parseFloat(row[col.key]);
                if (!Number.isNaN(value)) {
                    total += value;
                }
            });
            return `${col.label}: ${formatNumber(total)}`;
        });
        totalsEl.textContent = `Tổng: ${totals.join(' · ')}`;
    }

    function renderCategoryList() {
        categoryListEl.innerHTML = '';
        if (!categories.length) {
            const note = document.createElement('p');
            note.className = 'system-empty-note';
            note.textContent = 'Chưa có danh mục. Hãy tạo mới ở khung bên cạnh.';
            categoryListEl.appendChild(note);
            return;
        }
        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'system-category-card';
            card.dataset.categoryId = category.id;
            const info = document.createElement('div');
            const title = document.createElement('h4');
            title.textContent = category.name;
            info.appendChild(title);
            if (category.description) {
                const desc = document.createElement('p');
                desc.textContent = category.description;
                info.appendChild(desc);
            }
            const meta = document.createElement('p');
            meta.className = 'system-category-meta';
            const rowData = loadCategoryData(category.id);
            const filled = countFilledRows(rowData, category.columns);
            const pagesLabel = formatPagesLabel(category.pages);
            meta.textContent = `${category.columns.length} cột · ${filled} dòng có dữ liệu · Trang: ${pagesLabel} · Thứ tự: ${category.order ?? 999}`;
            info.appendChild(meta);
            card.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'system-category-actions';
            
            const manageBtn = document.createElement('button');
            manageBtn.type = 'button';
            manageBtn.dataset.action = 'select';
            manageBtn.textContent = '📊 Quản lý';
            manageBtn.title = 'Mở bảng dữ liệu';
            actions.appendChild(manageBtn);
            
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.dataset.action = 'edit';
            editBtn.textContent = '✏️ Sửa';
            editBtn.title = 'Chỉnh sửa cấu hình danh mục';
            actions.appendChild(editBtn);
            
            const duplicateBtn = document.createElement('button');
            duplicateBtn.type = 'button';
            duplicateBtn.dataset.action = 'duplicate';
            duplicateBtn.textContent = '📋 Nhân bản';
            duplicateBtn.title = 'Tạo bản sao danh mục';
            actions.appendChild(duplicateBtn);
            
            const exportBtn = document.createElement('button');
            exportBtn.type = 'button';
            exportBtn.dataset.action = 'export';
            exportBtn.textContent = '💾 Xuất';
            exportBtn.title = 'Xuất dữ liệu ra file';
            actions.appendChild(exportBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.dataset.action = 'delete';
            deleteBtn.className = 'danger';
            deleteBtn.textContent = '🗑️ Xóa';
            deleteBtn.title = 'Xóa danh mục';
            actions.appendChild(deleteBtn);
            
            card.appendChild(actions);
            categoryListEl.appendChild(card);
        });
    }

    function formatPagesLabel(pages) {
        if (!Array.isArray(pages) || !pages.length) return 'Quản Lý Hệ Thống';
        const mapping = {
            system: 'Quản Lý Hệ Thống',
            dashboard: 'Bảng Điều Khiển',
            ae: 'Bảng AE',
            aeqt: 'Bảng AE-QT',
            history: 'Lịch Sử',
            rate: 'Tỷ Giá USD'
        };
        const labels = pages.map(p => mapping[p] || p);
        return labels.join(', ');
    }

    function countFilledRows(rows, columns) {
        if (!Array.isArray(rows)) return 0;
        return rows.reduce((sum, row) => {
            if (!row) return sum;
            const hasValue = columns.some(col => {
                const val = row[col.key];
                return val !== undefined && val !== null && String(val).trim() !== '';
            });
            return hasValue ? sum + 1 : sum;
        }, 0);
    }

    function collectColumns() {
        const rows = columnsContainer.querySelectorAll('.system-column-row');
        const columns = [];
        rows.forEach(row => {
            const labelInput = row.querySelector('input[name="column-label"]');
            const select = row.querySelector('select[name="column-type"]');
            const sumCheckbox = row.querySelector('input[name="column-sum"]');
            const label = labelInput ? labelInput.value.trim() : '';
            if (!label) return;
            const type = select ? select.value : 'text';
            const column = {
                id: row.dataset.columnId || generateId('col'),
                key: row.dataset.columnKey || generateId('col'),
                label,
                type,
                sum: Boolean(sumCheckbox && sumCheckbox.checked && isSummableType(type))
            };
            row.dataset.columnId = column.id;
            row.dataset.columnKey = column.key;
            columns.push(column);
        });
        return columns;
    }

    function resetColumnBuilder() {
        columnsContainer.innerHTML = '';
        addColumnRow({ label: 'Tên mục', type: 'text' });
        addColumnRow({ label: 'Giá trị', type: 'number', sum: true });
    }

    function addColumnRow(config = {}) {
        const row = document.createElement('div');
        row.className = 'system-column-row';
        row.dataset.columnId = config.id || generateId('col');
        row.dataset.columnKey = config.key || row.dataset.columnId;
        const fields = document.createElement('div');
        fields.className = 'system-column-fields';

        const nameField = document.createElement('div');
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Tên cột';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.name = 'column-label';
        nameInput.placeholder = 'VD: Số tiền';
        nameInput.value = config.label || '';
        nameLabel.appendChild(nameInput);
        nameField.appendChild(nameLabel);
        fields.appendChild(nameField);

        const typeField = document.createElement('div');
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Loại dữ liệu';
        const typeSelect = document.createElement('select');
        typeSelect.name = 'column-type';
        ['text', 'number', 'date'].forEach(optionValue => {
            const opt = document.createElement('option');
            opt.value = optionValue;
            opt.textContent = optionValue === 'text' ? 'Văn bản' : optionValue === 'number' ? 'Số' : 'Ngày';
            typeSelect.appendChild(opt);
        });
        typeSelect.value = config.type || 'text';
        typeLabel.appendChild(typeSelect);
        typeField.appendChild(typeLabel);
        fields.appendChild(typeField);

        const sumField = document.createElement('div');
        const sumLabel = document.createElement('label');
        sumLabel.className = 'column-sum';
        const sumCheckbox = document.createElement('input');
        sumCheckbox.type = 'checkbox';
        sumCheckbox.name = 'column-sum';
        sumCheckbox.checked = Boolean(config.sum);
        sumLabel.appendChild(sumCheckbox);
        const sumText = document.createElement('span');
        sumText.textContent = 'Tính tổng';
        sumLabel.appendChild(sumText);
        sumField.appendChild(sumLabel);
        fields.appendChild(sumField);

        row.appendChild(fields);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'link';
        removeBtn.dataset.action = 'remove-column';
        removeBtn.textContent = 'Xóa cột';
        removeBtn.addEventListener('click', () => removeColumnRow(row));
        row.appendChild(removeBtn);

        typeSelect.addEventListener('change', () => toggleSumField(sumLabel, typeSelect.value, sumCheckbox));
        toggleSumField(sumLabel, typeSelect.value, sumCheckbox);

        columnsContainer.appendChild(row);
    }

    function removeColumnRow(row) {
        const rows = columnsContainer.querySelectorAll('.system-column-row');
        if (rows.length <= 1) {
            setStatus('Cần ít nhất một cột.', true);
            return;
        }
        row.remove();
    }

    function toggleSumField(wrapper, type, checkbox) {
        const isSummable = isSummableType(type);
        wrapper.hidden = !isSummable;
        if (!isSummable) {
            checkbox.checked = false;
        }
    }

    function resetForm() {
        form.reset();
        initialRowsInput.value = DEFAULT_INITIAL_ROWS;
        maxRowsInput.value = DEFAULT_MAX_ROWS;
        resetColumnBuilder();
        // Mặc định hiển thị trên trang Quản Lý Hệ Thống và thứ tự = 1
        displayOrderInput.value = 1;
        displayPageInputs.forEach(input => {
            input.checked = input.value === 'system';
        });
    }

    function setStatus(message, isError) {
        statusEl.textContent = message || '';
        statusEl.style.color = isError ? '#c0392b' : '#2d7a2d';
        if (message) {
            setTimeout(() => {
                statusEl.textContent = '';
            }, 4000);
        }
    }

    function collectCategoriesFromStorage() {
        const data = loadData(CATEGORY_KEY);
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            id: item.id || generateId('category'),
            name: item.name || 'Danh mục mới',
            description: item.description || '',
            columns: Array.isArray(item.columns) && item.columns.length ? item.columns : [{ id: generateId('col'), key: generateId('col'), label: 'Cột 1', type: 'text', sum: false }],
            initialRows: item.initialRows || DEFAULT_INITIAL_ROWS,
            maxRows: item.maxRows || DEFAULT_MAX_ROWS,
            rowCount: item.rowCount || item.initialRows || DEFAULT_INITIAL_ROWS,
            // Thuộc tính mới: trang hiển thị và thứ tự, đảm bảo tương thích dữ liệu cũ
            pages: Array.isArray(item.pages) && item.pages.length ? item.pages : ['system'],
            order: typeof item.order === 'number' ? item.order : 999
        }));
    }

    function collectSelectedPages() {
        const selected = [];
        displayPageInputs.forEach(input => {
            if (input.checked) {
                selected.push(input.value);
            }
        });
        // Nếu chưa chọn trang nào, đảm bảo tối thiểu hiển thị ở trang system
        if (!selected.length) {
            selected.push('system');
        }
        return selected;
    }

    function loadCategories() {
        return collectCategoriesFromStorage();
    }

    function saveCategories() {
        saveData(CATEGORY_KEY, categories);
    }

    function loadCategoryData(categoryId) {
        const data = loadData(getCategoryStorageKey(categoryId));
        return Array.isArray(data) ? data : [];
    }

    function getCategoryStorageKey(categoryId) {
        return `system_table_${categoryId}`;
    }

    function generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function isSummableType(type) {
        return type === 'number';
    }

    function toColumnLabel(index) {
        let label = '';
        let num = index;
        while (num >= 0) {
            label = String.fromCharCode((num % 26) + 65) + label;
            num = Math.floor(num / 26) - 1;
        }
        return label;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function formatNumber(value) {
        return Number(value).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function getSelectedCategory() {
        return categories.find(cat => cat.id === selectedCategoryId) || null;
    }
    
    /**
     * Edit existing category
     */
    function editCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        editingCategoryId = categoryId;
        
        // Populate form with existing data
        nameInput.value = category.name;
        descriptionInput.value = category.description || '';
        initialRowsInput.value = category.initialRows || DEFAULT_INITIAL_ROWS;
        maxRowsInput.value = category.maxRows || DEFAULT_MAX_ROWS;
        displayOrderInput.value = category.order || 999;
        
        // Set page checkboxes
        displayPageInputs.forEach(input => {
            input.checked = category.pages && category.pages.includes(input.value);
        });
        
        // Rebuild columns
        columnsContainer.innerHTML = '';
        category.columns.forEach(col => {
            addColumnRow(col);
        });
        
        // Update form button
        const submitBtn = form.querySelector('button[type=\"submit\"]');
        submitBtn.textContent = 'Cập nhật danh mục';
        
        // Add cancel edit button
        let cancelEditBtn = form.querySelector('.cancel-edit-btn');
        if (!cancelEditBtn) {
            cancelEditBtn = document.createElement('button');
            cancelEditBtn.type = 'button';
            cancelEditBtn.className = 'cancel-edit-btn';
            cancelEditBtn.textContent = 'Hủy chỉnh sửa';
            cancelEditBtn.addEventListener('click', cancelEdit);
            form.querySelector('.system-form-actions').insertBefore(cancelEditBtn, submitBtn);
        }
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nameInput.focus();
        
        setStatus('Đang chỉnh sửa danh mục: ' + category.name, false);
    }
    
    /**
     * Cancel edit mode
     */
    function cancelEdit() {
        editingCategoryId = null;
        resetForm();
        const submitBtn = form.querySelector('button[type=\"submit\"]');
        submitBtn.textContent = 'Tạo danh mục';
        const cancelEditBtn = form.querySelector('.cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.remove();
        }
        setStatus('Đã hủy chỉnh sửa', false);
    }
    
    /**
     * Duplicate category with data
     */
    function duplicateCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        const newCategory = {
            id: generateId('category'),
            name: category.name + ' (Bản sao)',
            description: category.description,
            columns: JSON.parse(JSON.stringify(category.columns)), // Deep copy
            initialRows: category.initialRows,
            maxRows: category.maxRows,
            rowCount: category.rowCount,
            pages: [...category.pages],
            order: category.order
        };
        
        // Copy data
        const originalData = loadCategoryData(categoryId);
        saveData(getCategoryStorageKey(newCategory.id), originalData);
        
        categories.push(newCategory);
        saveCategories();
        renderCategoryList();
        selectCategory(newCategory.id);
        
        showNotification('✅ Đã nhân bản danh mục: ' + newCategory.name, 'success');
    }
    
    /**
     * Export category data to JSON file
     */
    function exportCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        const data = loadCategoryData(categoryId);
        const exportData = {\n            category: category,\n            data: data,\n            exportDate: new Date().toISOString(),\n            version: '1.0'\n        };\n        \n        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });\n        const url = URL.createObjectURL(blob);\n        const link = document.createElement('a');\n        link.href = url;\n        link.download = `${category.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;\n        link.click();\n        URL.revokeObjectURL(url);\n        \n        showNotification('📥 Đã xuất dữ liệu: ' + category.name, 'success');\n    }
    
    /**
     * Show auto-save indicator
     */
    function showAutoSaveIndicator() {
        const indicator = document.createElement('div');\n        indicator.className = 'auto-save-indicator';\n        indicator.textContent = '✓ Đã lưu tự động';\n        indicator.style.cssText = `\n            position: fixed;\n            bottom: 20px;\n            right: 20px;\n            background: #4caf50;\n            color: white;\n            padding: 8px 16px;\n            border-radius: 6px;\n            font-size: 13px;\n            font-weight: 600;\n            z-index: 3000;\n            box-shadow: 0 2px 8px rgba(0,0,0,0.2);\n            animation: slideInRight 0.3s ease-out;\n        `;\n        document.body.appendChild(indicator);\n        \n        setTimeout(() => {\n            indicator.style.animation = 'slideOutRight 0.3s ease-in forwards';\n            setTimeout(() => indicator.remove(), 300);\n        }, 2000);\n    }
    
    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {\n        const notification = document.createElement('div');\n        notification.className = `notification notification-${type}`;\n        notification.textContent = message;\n        notification.style.cssText = `\n            position: fixed;\n            bottom: 20px;\n            right: 20px;\n            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};\n            color: white;\n            padding: 12px 20px;\n            border-radius: 8px;\n            box-shadow: 0 4px 12px rgba(0,0,0,0.2);\n            z-index: 3000;\n            animation: slideInRight 0.3s ease-out;\n            font-size: 14px;\n            font-weight: 600;\n            max-width: 400px;\n        `;\n        document.body.appendChild(notification);\n\n        setTimeout(() => {\n            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';\n            setTimeout(() => notification.remove(), 300);\n        }, 3000);\n    }
    
    /**
     * Warn before leaving with unsaved changes
     */
    window.addEventListener('beforeunload', (e) => {\n        if (hasUnsavedChanges) {\n            e.preventDefault();\n            e.returnValue = 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang?';\n            return e.returnValue;\n        }\n    });

})(); 

