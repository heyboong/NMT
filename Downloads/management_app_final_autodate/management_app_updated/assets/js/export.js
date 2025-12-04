/*
 * Export functionality for downloading data in multiple formats.
 * Supports CSV, JSON, and Excel (.xlsx) exports.
 */

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Column headers
 * @returns {string} CSV string
 */
function convertToCSV(data, headers) {
    if (!data || data.length === 0) return '';
    
    // Create header row
    const csvHeaders = headers.join(',');
    
    // Create data rows
    const csvRows = data.map(row => {
        return headers.map(header => {
            let value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        }).join(',');
    });
    
    return csvHeaders + '\n' + csvRows.join('\n');
}

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {string} filename - Name of file (without extension)
 * @param {Array} headers - Column headers (optional, defaults to object keys)
 */
function downloadCSV(data, filename, headers) {
    if (!data || data.length === 0) {
        alert('Không có dữ liệu để tải xuống');
        return;
    }
    
    // Use provided headers or extract from first object
    const csvHeaders = headers || Object.keys(data[0]);
    const csvContent = convertToCSV(data, csvHeaders);
    
    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename + '.csv');
}

/**
 * Download data as JSON file
 * @param {Array} data - Array of objects
 * @param {string} filename - Name of file (without extension)
 */
function downloadJSON(data, filename) {
    if (!data || data.length === 0) {
        alert('Không có dữ liệu để tải xuống');
        return;
    }
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, filename + '.json');
}

/**
 * Download data as Excel file (.xlsx)
 * Uses SheetJS library if available, otherwise falls back to CSV
 * @param {Array} data - Array of objects
 * @param {string} filename - Name of file (without extension)
 * @param {string} sheetName - Name of worksheet
 */
function downloadExcel(data, filename, sheetName = 'Sheet1') {
    if (!data || data.length === 0) {
        alert('Không có dữ liệu để tải xuống');
        return;
    }
    
    // Check if SheetJS library is available
    if (typeof XLSX === 'undefined') {
        console.warn('SheetJS library not loaded, falling back to CSV export');
        downloadCSV(data, filename);
        return;
    }
    
    try {
        // Create worksheet from data
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        // Generate Excel file and trigger download
        XLSX.writeFile(workbook, filename + '.xlsx');
    } catch (err) {
        console.error('Error creating Excel file:', err);
        alert('Lỗi khi tạo file Excel. Vui lòng thử CSV thay thế.');
    }
}

/**
 * Helper function to download a blob
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Name of file
 */
function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * Create export buttons and add them to a container
 * @param {string} containerId - ID of container element
 * @param {string} dataKey - localStorage key for data
 * @param {string} baseFilename - Base name for exported files
 * @param {string} sheetName - Name for Excel sheet (optional)
 */
function createExportButtons(containerId, dataKey, baseFilename, sheetName) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Export container not found:', containerId);
        return;
    }
    
    // Create wrapper for export buttons
    const wrapper = document.createElement('div');
    wrapper.className = 'export-buttons';
    wrapper.style.cssText = 'display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;';
    
    // CSV button
    const csvBtn = document.createElement('button');
    csvBtn.className = 'btn';
    csvBtn.textContent = '📥 Tải CSV';
    csvBtn.title = 'Tải xuống dạng CSV (Excel)';
    csvBtn.addEventListener('click', () => {
        const data = loadData(dataKey);
        downloadCSV(data, baseFilename);
    });
    
    // JSON button
    const jsonBtn = document.createElement('button');
    jsonBtn.className = 'btn';
    jsonBtn.textContent = '📥 Tải JSON';
    jsonBtn.title = 'Tải xuống dạng JSON';
    jsonBtn.addEventListener('click', () => {
        const data = loadData(dataKey);
        downloadJSON(data, baseFilename);
    });
    
    // Excel button
    const excelBtn = document.createElement('button');
    excelBtn.className = 'btn';
    excelBtn.textContent = '📥 Tải Excel';
    excelBtn.title = 'Tải xuống dạng Excel (.xlsx)';
    excelBtn.addEventListener('click', () => {
        const data = loadData(dataKey);
        downloadExcel(data, baseFilename, sheetName || baseFilename);
    });
    
    wrapper.appendChild(csvBtn);
    wrapper.appendChild(jsonBtn);
    wrapper.appendChild(excelBtn);
    container.appendChild(wrapper);
}

/**
 * Export all data from localStorage
 * @param {string} filename - Base filename for export
 */
function exportAllData(filename = 'management_data_backup') {
    const allData = {
        exportDate: new Date().toISOString(),
        AE_sheet: loadData('AE_sheet'),
        AEQT_sheet: loadData('AEQT_sheet'),
        history: loadData('history'),
        'rate-history': loadData('rate-history'),
        'rate-settings': loadData('rate-settings'),
        dashboard_conversion: loadData('dashboard_conversion'),
        dashboard_withdraw: loadData('dashboard_withdraw')
    };
    
    downloadJSON(allData, filename);
}
