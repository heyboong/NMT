(function(window) {
    const COLUMN_KEY_PREFIX = 'column-widths-';
    const ROW_KEY_PREFIX = 'row-heights-';
    const tableOptions = new Map();
    const defaultOptions = {
        enableColumnResize: true,
        enableRowResize: false
    };

    let activeColumnResize = null;
    let activeRowResize = null;

    function initTable(tableId, options = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const mergedOptions = Object.assign(
            {},
            defaultOptions,
            options,
            table.dataset.rowResize === 'true' ? { enableRowResize: true } : null
        );

        tableOptions.set(tableId, mergedOptions);

        if (mergedOptions.enableColumnResize) {
            setupColumnResize(tableId, table);
        }
        if (mergedOptions.enableRowResize) {
            setupRowResize(tableId, table);
        }
    }

    function initTables(tableIds, options = {}) {
        if (!Array.isArray(tableIds)) return;
        tableIds.forEach(id => initTable(id, options));
    }

    function setupColumnResize(tableId, table) {
        removeHandles(table, '.resize-handle');
        removeHandles(table, '.resize-handle-left');
        const entries = getHeaderEntries(table);
        if (!entries.length) return;

        // Tự động điều chỉnh width của các cột theo nội dung nếu chưa có width đã lưu
        autoAdjustColumnWidths(table, entries);
        applyColumnWidths(tableId, entries, table);

        entries.forEach((entry, index) => {
            // Đảm bảo th cell có position relative
            if (getComputedStyle(entry.cell).position === 'static') {
                entry.cell.style.position = 'relative';
            }

            // Resize handle bên phải (mặc định) - có ở tất cả các cột
            const handleRight = document.createElement('div');
            handleRight.className = 'resize-handle resize-handle-right';
            handleRight.title = 'Kéo để thay đổi kích thước cột';
            entry.cell.appendChild(handleRight);
            handleRight.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                startColumnResize(event, tableId, table, entry, 'right');
            });

            // Resize handle bên trái (chỉ thêm nếu không phải cột đầu tiên)
            if (index > 0) {
                const handleLeft = document.createElement('div');
                handleLeft.className = 'resize-handle resize-handle-left';
                handleLeft.title = 'Kéo để thay đổi kích thước cột (điều chỉnh cả cột bên trái)';
                entry.cell.appendChild(handleLeft);
                handleLeft.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                    startColumnResize(event, tableId, table, entry, 'left');
            });
            }
        });
    }

    function setupRowResize(tableId, table) {
        removeHandles(table, '.row-resize-handle');
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (!rows.length) return;

        rows.forEach((row, index) => {
            row.dataset.rowIndex = index;
            row.style.position = row.style.position || 'relative';
            const handle = document.createElement('div');
            handle.className = 'row-resize-handle';
            row.appendChild(handle);
            handle.addEventListener('mousedown', event => {
                event.preventDefault();
                event.stopPropagation();
                startRowResize(event, tableId, table, row);
            });
        });

        applyRowHeights(tableId, table);
    }

    function startColumnResize(event, tableId, table, entry, direction) {
        const entries = getHeaderEntries(table);
        const currentIndex = entries.findIndex(e => e === entry);
        let leftEntry = null;
        if (direction === 'left' && currentIndex > 0) {
            leftEntry = entries[currentIndex - 1];
        }

        activeColumnResize = {
            tableId,
            table,
            entry,
            direction: direction || 'right',
            leftEntry: leftEntry,
            startX: event.pageX,
            startWidth: entry.cell.offsetWidth,
            leftStartWidth: leftEntry ? leftEntry.cell.offsetWidth : 0
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        entry.cell.classList.add('resizing');
        if (leftEntry) {
            leftEntry.cell.classList.add('resizing');
        }
    }

    function startRowResize(event, tableId, table, row) {
        activeRowResize = {
            tableId,
            table,
            row,
            startY: event.pageY,
            startHeight: row.offsetHeight
        };
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        row.classList.add('resizing');
    }

    function onMouseMove(event) {
        if (activeColumnResize) {
            const diff = event.pageX - activeColumnResize.startX;
            const { entry, leftEntry, direction, startWidth, leftStartWidth } = activeColumnResize;
            
            if (direction === 'right') {
                // Resize từ bên phải: chỉ thay đổi cột hiện tại
                const newWidth = Math.max(50, startWidth + diff);
                applyColumnWidth(entry, activeColumnResize.table, newWidth);
            } else if (direction === 'left' && leftEntry) {
                // Resize từ bên trái: thay đổi cả cột hiện tại và cột bên trái
                const newWidth = Math.max(50, startWidth - diff);
                const newLeftWidth = Math.max(50, leftStartWidth + diff);
                applyColumnWidth(entry, activeColumnResize.table, newWidth);
                applyColumnWidth(leftEntry, activeColumnResize.table, newLeftWidth);
            }
        } else if (activeRowResize) {
            const diff = event.pageY - activeRowResize.startY;
            const newHeight = Math.max(24, activeRowResize.startHeight + diff);
            applyRowHeight(activeRowResize.row, newHeight);
        }
    }

    function onMouseUp() {
        if (activeColumnResize) {
            const { tableId, table, leftEntry } = activeColumnResize;
            saveColumnWidths(tableId, table);
            activeColumnResize.entry.cell.classList.remove('resizing');
            if (leftEntry) {
                leftEntry.cell.classList.remove('resizing');
            }
            resetPointerState();
            activeColumnResize = null;
        }
        if (activeRowResize) {
            const { tableId, table, row } = activeRowResize;
            row.classList.remove('resizing');
            saveRowHeights(tableId, table);
            resetPointerState();
            activeRowResize = null;
        }
    }

    function resetPointerState() {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    function getHeaderEntries(table) {
        const thead = table.querySelector('thead');
        if (!thead) return [];
        let headerRow = thead.querySelector('tr[data-resize-row="true"]');
        if (!headerRow) {
            const rows = thead.querySelectorAll('tr');
            if (!rows.length) return [];
            headerRow = rows[rows.length - 1];
        }
        const entries = [];
        let columnIndex = 0;
        Array.from(headerRow.children).forEach(cell => {
            const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
            if (cell.classList.contains('row-header')) {
                columnIndex += colSpan;
                return;
            }
            if (colSpan > 1) {
                columnIndex += colSpan;
                return;
            }
            entries.push({ cell, columnIndex });
            columnIndex += 1;
        });
        return entries;
    }

    function applyColumnWidth(entry, table, width) {
        // Áp dụng cho header
        entry.cell.style.width = width + 'px';
        entry.cell.style.minWidth = Math.max(100, width) + 'px';
        entry.cell.style.maxWidth = 'none';
        
        // Áp dụng cho tất cả các cell trong cột tương ứng
        const rows = table.querySelectorAll('tbody tr, thead tr');
        rows.forEach(row => {
            const cell = row.children[entry.columnIndex];
            if (cell && !cell.classList.contains('row-header')) {
                cell.style.width = width + 'px';
                cell.style.minWidth = Math.max(100, width) + 'px';
                cell.style.maxWidth = 'none';
            }
        });
    }

    function applyColumnWidths(tableId, entries, table) {
        const saved = loadSizes(COLUMN_KEY_PREFIX + tableId);
        if (!saved.length) return;
        entries.forEach((entry, index) => {
            const width = saved[index];
            if (!width) return;
            applyColumnWidth(entry, table, width);
        });
    }

    function saveColumnWidths(tableId, table) {
        const entries = getHeaderEntries(table);
        if (!entries.length) return;
        const widths = entries.map(entry => entry.cell.offsetWidth);
        saveSizes(COLUMN_KEY_PREFIX + tableId, widths);
    }

    function applyRowHeight(row, height) {
        row.style.height = height + 'px';
    }

    function applyRowHeights(tableId, table) {
        const saved = loadSizes(ROW_KEY_PREFIX + tableId);
        if (!saved.length) return;
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const height = saved[index];
            if (!height) return;
            applyRowHeight(row, height);
        });
    }

    function saveRowHeights(tableId, table) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (!rows.length) return;
        const heights = rows.map(row => row.offsetHeight);
        saveSizes(ROW_KEY_PREFIX + tableId, heights);
    }

    function saveSizes(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save table sizes', err);
        }
    }

    function loadSizes(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('Failed to load table sizes', err);
            return [];
        }
    }

    function removeHandles(table, selector) {
        table.querySelectorAll(selector).forEach(node => node.remove());
    }

    /**
     * Tự động điều chỉnh width của các cột theo nội dung
     */
    function autoAdjustColumnWidths(table, entries) {
        entries.forEach(entry => {
            const headerCell = entry.cell;
            // Tính toán width cần thiết dựa trên nội dung
            const contentWidth = headerCell.scrollWidth;
            const minWidth = Math.max(100, contentWidth + 20); // Thêm padding
            
            // Chỉ áp dụng nếu chưa có width được set
            if (!headerCell.style.width || headerCell.style.width === '0px') {
                headerCell.style.minWidth = minWidth + 'px';
                headerCell.style.width = 'auto';
            }
        });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    window.TableResizer = {
        initTable,
        initTables
    };
})(window);

