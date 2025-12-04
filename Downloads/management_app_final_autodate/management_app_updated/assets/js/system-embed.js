(function() {
    const root = document.getElementById('system-embed-root');
    if (!root) return;

    const pageKey = root.dataset.page || 'dashboard';

    function formatNumber(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return '';
        return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    }

    function loadCategories() {
        const data = loadData('system_categories');
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            id: item.id,
            name: item.name || 'Danh mục mới',
            description: item.description || '',
            columns: Array.isArray(item.columns) ? item.columns : [],
            pages: Array.isArray(item.pages) && item.pages.length ? item.pages : ['system'],
            order: typeof item.order === 'number' ? item.order : 999
        }));
    }

    function loadCategoryRows(categoryId) {
        const key = `system_table_${categoryId}`;
        const rows = loadData(key);
        return Array.isArray(rows) ? rows : [];
    }

    function createTable(category, rows) {
        const wrapper = document.createElement('div');
        wrapper.className = 'system-embed-table-wrapper';

        if (!category.columns.length) {
            const empty = document.createElement('p');
            empty.className = 'system-embed-empty';
            empty.textContent = 'Danh mục này chưa có cấu hình cột.';
            wrapper.appendChild(empty);
            return wrapper;
        }

        const table = document.createElement('table');
        table.className = 'sheet adjustable-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.className = 'row-header';
        headerRow.appendChild(rowHeader);
        category.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label || col.key;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const maxRows = 20;
        rows.slice(0, maxRows).forEach((row, index) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.className = 'row-header';
            th.textContent = index + 1;
            tr.appendChild(th);
            category.columns.forEach(col => {
                const td = document.createElement('td');
                const raw = row && row[col.key];
                if (col.type === 'number') {
                    td.textContent = formatNumber(raw);
                    td.style.textAlign = 'right';
                } else {
                    td.textContent = raw != null ? String(raw) : '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        if (!tbody.children.length) {
            const emptyRow = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = category.columns.length + 1;
            td.textContent = 'Chưa có dữ liệu.';
            emptyRow.appendChild(td);
            tbody.appendChild(emptyRow);
        }

        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    function render() {
        const categories = loadCategories()
            .filter(cat => cat.pages.includes(pageKey))
            .sort((a, b) => (a.order || 999) - (b.order || 999));

        if (!categories.length) {
            root.style.display = 'none';
            return;
        }

        root.style.display = '';
        root.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'system-embed-header';
        const title = document.createElement('h3');
        title.textContent = 'Danh mục hệ thống';
        header.appendChild(title);
        root.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'system-embed-grid';

        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'rate-box system-embed-card';

            const h4 = document.createElement('h4');
            h4.textContent = cat.name;
            card.appendChild(h4);

            if (cat.description) {
                const p = document.createElement('p');
                p.textContent = cat.description;
                card.appendChild(p);
            }

            const rows = loadCategoryRows(cat.id);
            card.appendChild(createTable(cat, rows));

            const footer = document.createElement('div');
            footer.style.marginTop = '8px';
            const link = document.createElement('a');
            link.href = 'system.html';
            link.textContent = 'Mở trong Quản Lý Hệ Thống';
            link.style.fontSize = '13px';
            footer.appendChild(link);
            card.appendChild(footer);

            grid.appendChild(card);
        });

        root.appendChild(grid);
    }

    render();
})(); 


