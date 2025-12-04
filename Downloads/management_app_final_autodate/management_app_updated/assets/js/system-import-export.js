/**
 * System Import/Export Module
 * Handles importing and exporting categories with data
 */
(function() {
    'use strict';
    
    const CATEGORY_KEY = 'system_categories';
    const DEFAULT_INITIAL_ROWS = 20;
    const DEFAULT_MAX_ROWS = 300;
    
    /**
     * Import category from JSON file
     */
    window.handleImportCategory = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importData = JSON.parse(event.target.result);
                    
                    // Validate import data
                    if (!importData.category || !importData.version) {
                        throw new Error('File không đúng định dạng');
                    }
                    
                    // Load existing categories
                    const categories = loadData(CATEGORY_KEY) || [];
                    
                    // Create new category with new ID
                    const newCategory = {
                        id: generateId('category'),
                        name: importData.category.name + ' (Nhập)',
                        description: importData.category.description,
                        columns: importData.category.columns,
                        initialRows: importData.category.initialRows || DEFAULT_INITIAL_ROWS,
                        maxRows: importData.category.maxRows || DEFAULT_MAX_ROWS,
                        rowCount: importData.category.rowCount || importData.category.initialRows || DEFAULT_INITIAL_ROWS,
                        pages: importData.category.pages || ['system'],
                        order: importData.category.order || 999
                    };
                    
                    // Save category
                    categories.push(newCategory);
                    saveData(CATEGORY_KEY, categories);
                    
                    // Save data
                    if (Array.isArray(importData.data)) {
                        saveData(`system_table_${newCategory.id}`, importData.data);
                    }
                    
                    showNotification('✅ Đã nhập danh mục: ' + newCategory.name, 'success');
                    
                    // Reload page to reflect changes
                    setTimeout(() => location.reload(), 1500);
                } catch (err) {
                    console.error('Import error:', err);
                    showNotification('❌ Lỗi: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    
    /**
     * Export all categories and data
     */
    window.handleExportAll = function() {
        const categories = loadData(CATEGORY_KEY) || [];
        
        if (!categories.length) {
            showNotification('⚠️ Không có danh mục để xuất', 'error');
            return;
        }
        
        const exportData = {
            categories: categories,
            data: {},
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Collect all data
        categories.forEach(cat => {
            exportData.data[cat.id] = loadData(`system_table_${cat.id}`) || [];
        });
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SystemCategories_All_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('📥 Đã xuất tất cả danh mục (' + categories.length + ')', 'success');
    };
    
    /**
     * Generate unique ID
     */
    function generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    
    /**
     * Show notification
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
            max-width: 400px;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Bind events when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        const importBtn = document.getElementById('import-category-btn');
        const exportAllBtn = document.getElementById('export-all-btn');
        
        if (importBtn) {
            importBtn.addEventListener('click', window.handleImportCategory);
        }
        
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', window.handleExportAll);
        }
    });
    
})();
