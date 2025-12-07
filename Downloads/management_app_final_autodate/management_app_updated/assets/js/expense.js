/*
 * Expense Management - Thu Chi Manager
 * Manage income and expenses with categories and monthly tracking
 */

(function() {
    'use strict';

    // Storage keys
    const INCOME_KEY = 'expense_income_data';
    const EXPENSE_KEY = 'expense_expense_data';
    const RATE_KEY = 'rate_settings';

    // Current state
    let currentMonth = null;
    let incomeData = [];
    let expenseData = [];
    let filteredIncomeData = [];
    let filteredExpenseData = [];
    let searchQuery = '';
    let dateFrom = '';
    let dateTo = '';
    let currentUsdRate = 25400; // Default rate

    // DOM elements
    const monthSelector = document.getElementById('month-selector');
    const addIncomeBtn = document.getElementById('add-income-btn');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    
    const incomeTbody = document.getElementById('income-tbody');
    const expenseTbody = document.getElementById('expense-tbody');
    
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');
    const expenseRatioEl = document.getElementById('expense-ratio');
    const categorySummaryEl = document.getElementById('category-summary');

    /**
     * Format VND currency
     */
    function formatVND(amount) {
        if (!amount && amount !== 0) return '0';
        return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Parse VND string to number
     */
    function parseVND(str) {
        if (!str) return 0;
        return parseFloat(str.toString().replace(/,/g, '')) || 0;
    }

    /**
     * Get current USD rate from localStorage
     */
    function getCurrentUsdRate() {
        try {
            const rateData = localStorage.getItem(RATE_KEY);
            if (rateData) {
                const settings = JSON.parse(rateData);
                return parseFloat(settings.usdRate) || currentUsdRate;
            }
        } catch (err) {
            console.error('Error loading USD rate:', err);
        }
        return currentUsdRate;
    }

    /**
     * Calculate VND amount based on currency type
     */
    function calculateVND(amount, currency) {
        if (!amount || amount === 0) return 0;
        if (currency === 'USD') {
            return amount * currentUsdRate;
        }
        return amount;
    }

    /**
     * Get current month key (YYYY-MM)
     */
    function getMonthKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Initialize month selector
     */
    function initMonthSelector() {
        const now = new Date();
        const currentMonthKey = getMonthKey(now);
        
        // Generate last 12 months
        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = getMonthKey(date);
            const label = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
            months.push({ key, label });
        }

        monthSelector.innerHTML = months.map(m => 
            `<option value="${m.key}" ${m.key === currentMonthKey ? 'selected' : ''}>${m.label}</option>`
        ).join('');

        currentMonth = currentMonthKey;
    }

    /**
     * Load data from localStorage
     */
    function loadData(key) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : {};
        } catch (err) {
            console.error('Error loading data:', err);
            return {};
        }
    }

    /**
     * Save data to localStorage
     */
    function saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            
            // Trigger Supabase sync if available
            if (window.SupabaseSync && typeof window.SupabaseSync.syncToSupabase === 'function') {
                window.SupabaseSync.syncToSupabase(key, data);
            }
        } catch (err) {
            console.error('Error saving data:', err);
        }
    }

    /**
     * Get data for current month
     */
    function getCurrentMonthData(key) {
        const allData = loadData(key);
        return allData[currentMonth] || [];
    }

    /**
     * Save current month data
     */
    function saveCurrentMonthData(key, data) {
        const allData = loadData(key);
        allData[currentMonth] = data;
        saveData(key, allData);
    }

    /**
     * Generate unique ID
     */
    function generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Calculate totals and update summary
     */
    function updateSummary() {
        // Calculate totals using VND amounts
        const totalIncome = incomeData.reduce((sum, item) => {
            const vndAmount = calculateVND(parseVND(item.amount), item.currency || 'VND');
            return sum + vndAmount;
        }, 0);
        
        const totalExpense = expenseData.reduce((sum, item) => {
            const vndAmount = calculateVND(parseVND(item.amount), item.currency || 'VND');
            return sum + vndAmount;
        }, 0);
        
        const balance = totalIncome - totalExpense;
        const ratio = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0;

        // Update totals
        totalIncomeEl.textContent = formatVND(totalIncome) + ' ₫';
        totalExpenseEl.textContent = formatVND(totalExpense) + ' ₫';
        balanceEl.textContent = formatVND(balance) + ' ₫';
        
        // Update counts
        document.getElementById('income-count').textContent = `${incomeData.length} khoản`;
        document.getElementById('expense-count').textContent = `${expenseData.length} khoản`;
        
        // Update table totals
        if (document.getElementById('income-total-display')) {
            document.getElementById('income-total-display').textContent = formatVND(totalIncome) + ' ₫';
        }
        if (document.getElementById('expense-total-display')) {
            document.getElementById('expense-total-display').textContent = formatVND(totalExpense) + ' ₫';
        }
        
        // Update balance card styling and status
        const balanceCard = balanceEl.parentElement.parentElement;
        const balanceStatus = document.getElementById('balance-status');
        
        if (balance > 0) {
            balanceCard.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            balanceStatus.textContent = '✓ Thặng dư';
        } else if (balance < 0) {
            balanceCard.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            balanceStatus.textContent = '⚠ Thâm hụt';
        } else {
            balanceCard.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            balanceStatus.textContent = '= Cân bằng';
        }
        
        // Update expense ratio card
        expenseRatioEl.textContent = ratio + '%';
        const ratioCard = expenseRatioEl.parentElement.parentElement;
        const ratioStatus = document.getElementById('ratio-status');
        
        if (ratio > 90) {
            ratioCard.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            ratioStatus.textContent = '⚠ Chi tiêu cao';
        } else if (ratio > 70) {
            ratioCard.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            ratioStatus.textContent = '⚡ Cần chú ý';
        } else if (ratio > 0) {
            ratioCard.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            ratioStatus.textContent = '✓ Tiết kiệm tốt';
        } else {
            ratioCard.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
            ratioStatus.textContent = '💫 Hoàn hảo';
        }

        updateCategorySummary();
    }

    /**
     * Update category summary
     */
    function updateCategorySummary() {
        const categoryTotals = {};
        const categoryIcons = {
            'Thuê Nhà': '🏠',
            'Điện Nước': '💡',
            'Đi Chợ': '🛒',
            'Ăn Uống': '🍜',
            'Thuốc Men': '💊',
            'Thiết Bị': '📱',
            'Di Chuyển': '🚗',
            'Giải Trí': '🎮',
            'Học Tập': '📚',
            'Quần Áo': '👕',
            'Internet': '📡',
            'Điện Thoại': '📞',
            'Y Tế': '🏥',
            'Bảo Hiểm': '🛡️',
            'Xe Cộ': '🏍️',
            'Làm Đẹp': '💄',
            'Từ Thiện': '❤️',
            'Khác': '📦'
        };
        
        expenseData.forEach(item => {
            const category = item.category || 'Khác';
            if (!categoryTotals[category]) {
                categoryTotals[category] = { amount: 0, count: 0 };
            }
            categoryTotals[category].amount += parseVND(item.amount);
            categoryTotals[category].count += 1;
        });

        const totalExpense = expenseData.reduce((sum, item) => sum + parseVND(item.amount), 0);
        
        const categories = Object.entries(categoryTotals)
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([category, data]) => {
                const percentage = totalExpense > 0 ? ((data.amount / totalExpense) * 100).toFixed(1) : 0;
                const icon = categoryIcons[category] || '📦';
                
                // Get color based on percentage
                let barColor = '#3b82f6';
                if (percentage > 30) barColor = '#ef4444';
                else if (percentage > 20) barColor = '#f59e0b';
                else if (percentage > 10) barColor = '#10b981';
                
                return `
                    <div style="background: white; padding: 16px; border-radius: 12px; border: 2px solid #e5e7eb; transition: all 0.2s; cursor: default; position: relative; overflow: hidden;">
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: #f3f4f6;">
                            <div style="height: 100%; background: ${barColor}; width: ${percentage}%; transition: width 0.3s;"></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 24px;">${icon}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">${category}</div>
                                <div style="font-size: 11px; color: #9ca3af;">${data.count} khoản</div>
                            </div>
                        </div>
                        <div style="font-size: 20px; font-weight: 700; color: ${barColor}; margin-bottom: 4px;">${formatVND(data.amount)} ₫</div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="background: ${barColor}20; color: ${barColor}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${percentage}%
                            </div>
                            <div style="font-size: 11px; color: #6b7280;">của tổng chi</div>
                        </div>
                    </div>
                `;
            }).join('');

        categorySummaryEl.innerHTML = categories || `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #9ca3af;">
                <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Chưa có dữ liệu chi tiêu</div>
                <div style="font-size: 13px;">Thêm khoản chi đầu tiên để bắt đầu theo dõi</div>
            </div>
        `;
    }

    /**
     * Render income table with editable rows
     */
    function renderIncomeTable() {
        const dataToRender = filteredIncomeData.length > 0 || searchQuery || dateFrom || dateTo ? filteredIncomeData : incomeData;
        
        if (dataToRender.length === 0) {
            const emptyMessage = (searchQuery || dateFrom || dateTo) ? 
                'Không tìm thấy kết quả' : 'Chưa có khoản thu';
            incomeTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px 20px; color: #9ca3af; background: #f9fafb;">
                        <div style="font-size: 40px; margin-bottom: 8px;">💰</div>
                        <div style="font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 4px;">${emptyMessage}</div>
                        <div style="font-size: 12px; color: #9ca3af;">Nhấn "Thêm Dòng" để bắt đầu</div>
                    </td>
                </tr>
            `;
            return;
        }

        incomeTbody.innerHTML = dataToRender.map((item, index) => {
            const isEditing = item.id === 'new' || !item.date;
            const bgColor = index % 2 === 0 ? '#f9fafb' : 'white';
            const currency = item.currency || 'VND';
            const vndAmount = calculateVND(parseVND(item.amount), currency);
            
            return `
                <tr style="background: ${bgColor}; position: relative;" data-id="${item.id}">
                    <td style="text-align: center; font-weight: 600; color: #6b7280; padding: 6px 2px;">
                        ${index + 1}
                    </td>
                    <td style="padding: 2px;">
                        <input type="date" 
                            value="${item.date || ''}" 
                            onchange="updateIncomeField('${item.id}', 'date', this.value)"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; background: white; box-sizing: border-box;">
                    </td>
                    <td style="padding: 2px;">
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <span style="font-size: 16px; flex-shrink: 0;">${item.source ? getIncomeIcon(item.source) : '💸'}</span>
                            <input type="text" 
                                value="${item.source || ''}" 
                                onchange="updateIncomeField('${item.id}', 'source', this.value)"
                                placeholder="Nguồn..."
                                list="income-suggestions"
                                style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; background: white; box-sizing: border-box;">
                        </div>
                    </td>
                    <td style="padding: 2px; text-align: center;">
                        <select onchange="updateIncomeField('${item.id}', 'currency', this.value)"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; font-weight: 600; background: white; cursor: pointer; box-sizing: border-box;">
                            <option value="VND" ${currency === 'VND' ? 'selected' : ''}>VND</option>
                            <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD</option>
                        </select>
                    </td>
                    <td style="padding: 2px;">
                        <input type="text" 
                            value="${item.amount ? formatVND(item.amount) : ''}" 
                            onchange="updateIncomeField('${item.id}', 'amount', this.value)"
                            oninput="formatAmountInput(this)"
                            placeholder="0"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; text-align: right; font-weight: 600; color: #059669; background: white; box-sizing: border-box;">
                    </td>
                    <td style="padding: 2px;">
                        <div style="padding: 5px 3px; font-size: 13px; text-align: right; font-weight: 600; color: #10b981; background: #f0fdf4; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${vndAmount > 0 ? formatVND(vndAmount) : '0'}
                        </div>
                    </td>
                    <td style="text-align: center; padding: 2px;">
                        <button onclick="deleteIncome('${item.id}')" 
                            style="padding: 4px 7px; background: #ef4444; color: white; border: none; border-radius: 4px; 
                            cursor: pointer; font-size: 11px; font-weight: 600;"
                            title="Xóa">✕</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render expense table with editable rows
     */
    function renderExpenseTable() {
        const dataToRender = filteredExpenseData.length > 0 || searchQuery || dateFrom || dateTo ? filteredExpenseData : expenseData;
        
        if (dataToRender.length === 0) {
            const emptyMessage = (searchQuery || dateFrom || dateTo) ? 
                'Không tìm thấy kết quả' : 'Chưa có khoản chi';
            expenseTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px 20px; color: #9ca3af; background: #f9fafb;">
                        <div style="font-size: 40px; margin-bottom: 8px;">💸</div>
                        <div style="font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 4px;">${emptyMessage}</div>
                        <div style="font-size: 12px; color: #9ca3af;">Nhấn "Thêm Dòng" để bắt đầu</div>
                    </td>
                </tr>
            `;
            return;
        }

        expenseTbody.innerHTML = dataToRender.map((item, index) => {
            const isEditing = item.id === 'new' || !item.date;
            const bgColor = index % 2 === 0 ? '#fef2f2' : 'white';
            const currency = item.currency || 'VND';
            const vndAmount = calculateVND(parseVND(item.amount), currency);
            
            return `
                <tr style="background: ${bgColor}; position: relative;" data-id="${item.id}">
                    <td style="text-align: center; font-weight: 600; color: #6b7280; padding: 6px 2px;">
                        ${index + 1}
                    </td>
                    <td style="padding: 2px;">
                        <input type="date" 
                            value="${item.date || ''}" 
                            onchange="updateExpenseField('${item.id}', 'date', this.value)"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; background: white; box-sizing: border-box;">
                    </td>
                    <td style="padding: 2px;">
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <span style="font-size: 16px; flex-shrink: 0;">${item.category ? getCategoryIcon(item.category) : '📦'}</span>
                            <input type="text" 
                                value="${item.category || ''}" 
                                onchange="updateExpenseField('${item.id}', 'category', this.value)"
                                placeholder="Danh mục..."
                                list="category-suggestions"
                                style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; background: white; box-sizing: border-box;">
                        </div>
                    </td>
                    <td style="padding: 2px; text-align: center;">
                        <select onchange="updateExpenseField('${item.id}', 'currency', this.value)"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; font-weight: 600; background: white; cursor: pointer; box-sizing: border-box;">
                            <option value="VND" ${currency === 'VND' ? 'selected' : ''}>VND</option>
                            <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD</option>
                        </select>
                    </td>
                    <td style="padding: 2px;">
                        <input type="text" 
                            value="${item.amount ? formatVND(item.amount) : ''}" 
                            onchange="updateExpenseField('${item.id}', 'amount', this.value)"
                            oninput="formatAmountInput(this)"
                            placeholder="0"
                            style="width: 100%; padding: 5px 3px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; text-align: right; font-weight: 600; color: #dc2626; background: white; box-sizing: border-box;">
                    </td>
                    <td style="padding: 2px;">
                        <div style="padding: 5px 3px; font-size: 13px; text-align: right; font-weight: 600; color: #dc2626; background: #fef2f2; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${vndAmount > 0 ? formatVND(vndAmount) : '0'}
                        </div>
                    </td>
                    <td style="text-align: center; padding: 2px;">
                        <button onclick="deleteExpense('${item.id}')" 
                            style="padding: 4px 7px; background: #ef4444; color: white; border: none; border-radius: 4px; 
                            cursor: pointer; font-size: 11px; font-weight: 600;"
                            title="Xóa">✕</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get category icon
     */
    function getCategoryIcon(category) {
        const categoryIcons = {
            'Thuê Nhà': '🏠',
            'Điện Nước': '💡',
            'Internet': '📡',
            'Đi Chợ': '🛒',
            'Ăn Uống': '🍜',
            'Di Chuyển': '🚗',
            'Xe Cộ': '🏍️',
            'Y Tế': '🏥',
            'Thuốc Men': '💊',
            'Bảo Hiểm': '🛡️',
            'Thiết Bị': '📱',
            'Điện Thoại': '📞',
            'Quần Áo': '👕',
            'Làm Đẹp': '💄',
            'Giải Trí': '🎮',
            'Học Tập': '📚',
            'Từ Thiện': '❤️',
            'Khác': '📦'
        };
        return categoryIcons[category] || '📦';
    }

    /**
     * Get income source icon
     */
    function getIncomeIcon(source) {
        const incomeIcons = {
            'Lương': '💼',
            'Thưởng': '🎁',
            'Kinh Doanh': '💰',
            'Đầu Tư': '📈',
            'Freelance': '💻',
            'Bán Hàng': '🛍️',
            'Cho Thuê': '🏠',
            'Lãi Suất': '🏦',
            'Tiền Lãi': '💵',
            'Thêm Giờ': '⏰',
            'Dự Án': '📊',
            'Hoa Hồng': '🤝',
            'Khác': '💸'
        };
        // Check if source contains any keyword
        for (const [key, icon] of Object.entries(incomeIcons)) {
            if (source && source.includes(key)) {
                return icon;
            }
        }
        return '💸';
    }

    /**
     * Get category options HTML
     */
    function getCategoryOptions(selectedCategory) {
        const categories = [
            { group: '🏠 Nhà Ở & Sinh Hoạt', items: ['Thuê Nhà', 'Điện Nước', 'Internet'] },
            { group: '🍜 Ăn Uống', items: ['Đi Chợ', 'Ăn Uống'] },
            { group: '🚗 Di Chuyển', items: ['Di Chuyển', 'Xe Cộ'] },
            { group: '💊 Sức Khỏe', items: ['Y Tế', 'Thuốc Men', 'Bảo Hiểm'] },
            { group: '📱 Công Nghệ', items: ['Thiết Bị', 'Điện Thoại'] },
            { group: '👕 Cá Nhân', items: ['Quần Áo', 'Làm Đẹp'] },
            { group: '🎯 Khác', items: ['Giải Trí', 'Học Tập', 'Từ Thiện', 'Khác'] }
        ];

        let html = '';
        categories.forEach(group => {
            html += `<optgroup label="${group.group}">`;
            group.items.forEach(item => {
                const selected = item === selectedCategory ? 'selected' : '';
                html += `<option value="${item}" ${selected}>${item}</option>`;
            });
            html += '</optgroup>';
        });
        return html;
    }

    /**
     * Format amount input as user types
     */
    function formatAmountInput(input) {
        let value = input.value.replace(/,/g, '').replace(/[^0-9]/g, '');
        
        // Prevent negative numbers
        if (value.startsWith('-')) {
            value = value.substring(1);
        }
        
        // Limit to reasonable amount (999 billion)
        const numValue = parseFloat(value);
        if (numValue > 999999999999) {
            value = '999999999999';
        }
        
        if (value && !isNaN(value)) {
            input.value = formatVND(value);
            input.style.borderColor = '#10b981';
        } else if (value === '') {
            input.style.borderColor = '#d1d5db';
        } else {
            input.style.borderColor = '#ef4444';
        }
    }

    /**
     * Validate date input
     */
    function validateDate(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const maxFuture = new Date();
        maxFuture.setFullYear(now.getFullYear() + 1);
        
        return date >= new Date('2000-01-01') && date <= maxFuture;
    }

    /**
     * Show inline error message
     */
    function showFieldError(input, message) {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        
        // Remove existing error
        const existingError = input.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = 'color: #ef4444; font-size: 11px; margin-top: 2px; position: absolute; background: white; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10;';
        errorDiv.textContent = message;
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
                input.style.borderColor = '#d1d5db';
                input.style.boxShadow = 'none';
            }
        }, 3000);
    }

    /**
     * Clear field error
     */
    function clearFieldError(input) {
        const error = input.parentElement.querySelector('.field-error');
        if (error) error.remove();
        input.style.borderColor = '#d1d5db';
        input.style.boxShadow = 'none';
    }

    /**
     * Update income field
     */
    function updateIncomeField(id, field, value) {
        const item = incomeData.find(i => i.id === id);
        if (!item) return;

        // Validation based on field type
        if (field === 'date') {
            if (!validateDate(value)) {
                if (window.showNotification) {
                    window.showNotification('❌ Ngày không hợp lệ', 'error');
                }
                renderIncomeTable();
                return;
            }
            item[field] = value;
        } else if (field === 'currency') {
            item[field] = value;
            // Recalculate on currency change
            renderIncomeTable();
            updateSummary();
            updateTotalDisplays();
            return;
        } else if (field === 'amount') {
            const numValue = parseVND(value);
            if (numValue <= 0) {
                if (window.showNotification) {
                    window.showNotification('❌ Số tiền phải lớn hơn 0', 'error');
                }
                renderIncomeTable();
                return;
            }
            if (numValue > 999999999999) {
                if (window.showNotification) {
                    window.showNotification('❌ Số tiền quá lớn', 'error');
                }
                renderIncomeTable();
                return;
            }
            item[field] = numValue;
        } else if (field === 'source') {
            const cleanValue = value.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '').trim();
            if (cleanValue.length === 0) {
                renderIncomeTable();
                return;
            }
            if (cleanValue.length > 100) {
                if (window.showNotification) {
                    window.showNotification('❌ Nguồn thu quá dài (tối đa 100 ký tự)', 'error');
                }
                renderIncomeTable();
                return;
            }
            item[field] = cleanValue;
        } else {
            item[field] = value;
        }

        // Auto-save after update
        if (item.date && item.source && item.amount) {
            try {
                saveCurrentMonthData(INCOME_KEY, incomeData);
                updateSummary();
                
                // Re-render to update icon
                renderIncomeTable();
                
                if (window.showNotification) {
                    window.showNotification('💾 Đã lưu', 'success');
                }
            } catch (error) {
                console.error('Save error:', error);
                if (window.showNotification) {
                    window.showNotification('❌ Lỗi lưu dữ liệu', 'error');
                }
            }
        } else {
            // Re-render to update icon even if not complete
            renderIncomeTable();
        }
    }

    /**
     * Update expense field
     */
    function updateExpenseField(id, field, value) {
        const item = expenseData.find(i => i.id === id);
        if (!item) return;

        // Validation based on field type
        if (field === 'date') {
            if (!validateDate(value)) {
                if (window.showNotification) {
                    window.showNotification('❌ Ngày không hợp lệ', 'error');
                }
                renderExpenseTable();
                return;
            }
            item[field] = value;
        } else if (field === 'currency') {
            item[field] = value;
            // Recalculate on currency change
            renderExpenseTable();
            updateSummary();
            updateTotalDisplays();
            updateCategorySummary();
            return;
        } else if (field === 'amount') {
            const numValue = parseVND(value);
            if (numValue <= 0) {
                if (window.showNotification) {
                    window.showNotification('❌ Số tiền phải lớn hơn 0', 'error');
                }
                renderExpenseTable();
                return;
            }
            if (numValue > 999999999999) {
                if (window.showNotification) {
                    window.showNotification('❌ Số tiền quá lớn', 'error');
                }
                renderExpenseTable();
                return;
            }
            item[field] = numValue;
        } else if (field === 'category') {
            const cleanValue = value.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '').trim();
            if (cleanValue.length === 0) {
                renderExpenseTable();
                return;
            }
            if (cleanValue.length > 100) {
                if (window.showNotification) {
                    window.showNotification('❌ Danh mục quá dài (tối đa 100 ký tự)', 'error');
                }
                renderExpenseTable();
                return;
            }
            item[field] = cleanValue;
        } else {
            item[field] = value;
        }

        // Auto-save after update
        if (item.date && item.category && item.amount) {
            try {
                saveCurrentMonthData(EXPENSE_KEY, expenseData);
                updateSummary();
                updateCategorySummary();
                
                // Re-render to update icon
                renderExpenseTable();
                
                if (window.showNotification) {
                    window.showNotification('💾 Đã lưu', 'success');
                }
            } catch (error) {
                console.error('Save error:', error);
                if (window.showNotification) {
                    window.showNotification('❌ Lỗi lưu dữ liệu', 'error');
                }
            }
        } else {
            // Re-render to update icon even if not complete
            renderExpenseTable();
        }
    }

    /**
     * Format date to Vietnamese format
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }

    /**
     * Open income modal
     */
    function openIncomeModal() {
        editingIncomeId = null;
        document.getElementById('income-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('income-source').value = '';
        document.getElementById('income-description').value = '';
        document.getElementById('income-amount').value = '';
        incomeModal.style.display = 'flex';
    }

    /**
     * Close income modal
     */
    function closeIncomeModal() {
        incomeModal.style.display = 'none';
        editingIncomeId = null;
    }

    /**
     * Open expense modal
     */
    function openExpenseModal() {
        editingExpenseId = null;
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('expense-category').value = '';
        document.getElementById('expense-description').value = '';
        document.getElementById('expense-amount').value = '';
        expenseModal.style.display = 'flex';
    }

    /**
     * Close expense modal
     */
    function closeExpenseModal() {
        expenseModal.style.display = 'none';
        editingExpenseId = null;
    }

    /**
     * Save income
     */
    function saveIncome() {
        const date = document.getElementById('income-date').value;
        const source = document.getElementById('income-source').value.trim();
        const description = document.getElementById('income-description').value.trim();
        const amount = document.getElementById('income-amount').value.trim();

        if (!date || !source || !amount) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        const amountNum = parseVND(amount);
        if (amountNum <= 0) {
            alert('Số tiền phải lớn hơn 0!');
            return;
        }

        if (editingIncomeId) {
            // Edit existing
            const index = incomeData.findIndex(item => item.id === editingIncomeId);
            if (index !== -1) {
                incomeData[index] = {
                    id: editingIncomeId,
                    date,
                    source,
                    description,
                    amount: amountNum
                };
            }
        } else {
            // Add new
            incomeData.push({
                id: generateId(),
                date,
                source,
                description,
                amount: amountNum
            });
        }

        // Sort by date descending
        incomeData.sort((a, b) => new Date(b.date) - new Date(a.date));

        saveCurrentMonthData(INCOME_KEY, incomeData);
        renderIncomeTable();
        updateSummary();
        closeIncomeModal();
        
        if (window.showNotification) {
            window.showNotification('💾 Đã lưu khoản thu', 'success');
        }
    }

    /**
     * Save expense
     */
    function saveExpense() {
        const date = document.getElementById('expense-date').value;
        const category = document.getElementById('expense-category').value;
        const description = document.getElementById('expense-description').value.trim();
        const amount = document.getElementById('expense-amount').value.trim();

        if (!date || !category || !amount) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        const amountNum = parseVND(amount);
        if (amountNum <= 0) {
            alert('Số tiền phải lớn hơn 0!');
            return;
        }

        if (editingExpenseId) {
            // Edit existing
            const index = expenseData.findIndex(item => item.id === editingExpenseId);
            if (index !== -1) {
                expenseData[index] = {
                    id: editingExpenseId,
                    date,
                    category,
                    description,
                    amount: amountNum
                };
            }
        } else {
            // Add new
            expenseData.push({
                id: generateId(),
                date,
                category,
                description,
                amount: amountNum
            });
        }

        // Sort by date descending
        expenseData.sort((a, b) => new Date(b.date) - new Date(a.date));

        saveCurrentMonthData(EXPENSE_KEY, expenseData);
        renderExpenseTable();
        updateSummary();
        closeExpenseModal();
        
        if (window.showNotification) {
            window.showNotification('💾 Đã lưu khoản chi', 'success');
        }
    }

    /**
     * Edit income
     */
    function editIncome(id) {
        const item = incomeData.find(i => i.id === id);
        if (!item) return;

        editingIncomeId = id;
        document.getElementById('income-date').value = item.date;
        document.getElementById('income-source').value = item.source;
        document.getElementById('income-description').value = item.description || '';
        document.getElementById('income-amount').value = formatVND(item.amount);
        incomeModal.style.display = 'flex';
    }

    /**
     * Edit expense
     */
    function editExpense(id) {
        const item = expenseData.find(i => i.id === id);
        if (!item) return;

        editingExpenseId = id;
        document.getElementById('expense-date').value = item.date;
        document.getElementById('expense-category').value = item.category;
        document.getElementById('expense-description').value = item.description || '';
        document.getElementById('expense-amount').value = formatVND(item.amount);
        expenseModal.style.display = 'flex';
    }

    /**
     * Add empty income row
     */
    function addEmptyIncomeRow() {
        const newItem = {
            id: 'income_' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            source: '',
            amount: 0,
            currency: 'VND'
        };
        
        incomeData.unshift(newItem);
        renderIncomeTable();
        
        // Focus first input in the new row
        setTimeout(() => {
            const firstInput = document.querySelector(`tr[data-id="${newItem.id}"] input`);
            if (firstInput) firstInput.focus();
        }, 50);
    }

    /**
     * Add empty expense row
     */
    function addEmptyExpenseRow() {
        const newItem = {
            id: 'expense_' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            category: '',
            amount: 0,
            currency: 'VND'
        };
        
        expenseData.unshift(newItem);
        renderExpenseTable();
        
        // Focus first input in the new row
        setTimeout(() => {
            const firstInput = document.querySelector(`tr[data-id="${newItem.id}"] input`);
            if (firstInput) firstInput.focus();
        }, 50);
    }

    /**
     * Delete income
     */
    function deleteIncome(id) {
        if (!confirm('Bạn có chắc muốn xóa khoản thu này?')) return;

        incomeData = incomeData.filter(item => item.id !== id);
        saveCurrentMonthData(INCOME_KEY, incomeData);
        renderIncomeTable();
        updateSummary();
        
        if (window.showNotification) {
            window.showNotification('🗑️ Đã xóa khoản thu', 'info');
        }
    }

    /**
     * Delete expense
     */
    function deleteExpense(id) {
        if (!confirm('Bạn có chắc muốn xóa khoản chi này?')) return;

        expenseData = expenseData.filter(item => item.id !== id);
        saveCurrentMonthData(EXPENSE_KEY, expenseData);
        renderExpenseTable();
        updateSummary();
        updateCategorySummary();
        
        if (window.showNotification) {
            window.showNotification('🗑️ Đã xóa khoản chi', 'info');
        }
    }

    /**
     * Clear all income
     */
    function clearAllIncome() {
        if (!confirm('Bạn có chắc muốn xóa TẤT CẢ khoản thu trong tháng này?')) return;

        incomeData = [];
        saveCurrentMonthData(INCOME_KEY, incomeData);
        renderIncomeTable();
        updateSummary();
        
        if (window.showNotification) {
            window.showNotification('🗑️ Đã xóa tất cả khoản thu', 'info');
        }
    }

    /**
     * Clear all expenses
     */
    function clearAllExpenses() {
        if (!confirm('Bạn có chắc muốn xóa TẤT CẢ khoản chi trong tháng này?')) return;

        expenseData = [];
        saveCurrentMonthData(EXPENSE_KEY, expenseData);
        renderExpenseTable();
        updateSummary();
        
        if (window.showNotification) {
            window.showNotification('🗑️ Đã xóa tất cả khoản chi', 'info');
        }
    }

    /**
     * Load month data
     */
    function loadMonthData() {
        incomeData = getCurrentMonthData(INCOME_KEY);
        expenseData = getCurrentMonthData(EXPENSE_KEY);
        filteredIncomeData = incomeData;
        filteredExpenseData = expenseData;
        renderIncomeTable();
        renderExpenseTable();
        updateSummary();
        updateCategorySummary();
    }

    /**
     * Auto-format amount input
     */
    function setupAmountFormatting() {
        const amountInputs = ['income-amount', 'expense-amount'];
        
        amountInputs.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/,/g, '');
                if (value && !isNaN(value)) {
                    e.target.value = formatVND(value);
                }
            });
        });
    }

    /**
     * Initialize
     */
    function init() {
        // Load USD rate
        currentUsdRate = getCurrentUsdRate();
        
        initMonthSelector();
        loadMonthData();

        // Event listeners
        monthSelector.addEventListener('change', (e) => {
            currentMonth = e.target.value;
            loadMonthData();
        });

        addIncomeBtn.addEventListener('click', addEmptyIncomeRow);
        addExpenseBtn.addEventListener('click', addEmptyExpenseRow);
        
        // Search and filter
        const searchInput = document.getElementById('search-input');
        const dateFromInput = document.getElementById('filter-date-from');
        const dateToInput = document.getElementById('filter-date-to');
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase();
                applyFilters();
            });
        }
        
        if (dateFromInput) {
            dateFromInput.addEventListener('change', (e) => {
                dateFrom = e.target.value;
                applyFilters();
            });
        }
        
        if (dateToInput) {
            dateToInput.addEventListener('change', (e) => {
                dateTo = e.target.value;
                applyFilters();
            });
        }
        
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                searchQuery = '';
                dateFrom = '';
                dateTo = '';
                if (searchInput) searchInput.value = '';
                if (dateFromInput) dateFromInput.value = '';
                if (dateToInput) dateToInput.value = '';
                applyFilters();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToExcel);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    /**
     * Handle keyboard shortcuts
     */
    function handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + E: Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportToExcel();
        }
        
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.focus();
        }
        
        // Escape: Clear search/filter
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput === document.activeElement) {
                searchInput.value = '';
                searchQuery = '';
                applyFilters();
            }
        }
    }
    
    /**
     * Apply filters to data
     */
    function applyFilters() {
        // Filter income
        filteredIncomeData = incomeData.filter(item => {
            // Search filter
            if (searchQuery) {
                const matchSource = (item.source || '').toLowerCase().includes(searchQuery);
                const matchDesc = (item.description || '').toLowerCase().includes(searchQuery);
                if (!matchSource && !matchDesc) return false;
            }
            
            // Date filter
            if (dateFrom && item.date < dateFrom) return false;
            if (dateTo && item.date > dateTo) return false;
            
            return true;
        });
        
        // Filter expense
        filteredExpenseData = expenseData.filter(item => {
            // Search filter
            if (searchQuery) {
                const matchCategory = (item.category || '').toLowerCase().includes(searchQuery);
                const matchDesc = (item.description || '').toLowerCase().includes(searchQuery);
                if (!matchCategory && !matchDesc) return false;
            }
            
            // Date filter
            if (dateFrom && item.date < dateFrom) return false;
            if (dateTo && item.date > dateTo) return false;
            
            return true;
        });
        
        renderIncomeTable();
        renderExpenseTable();
        updateSummary();
    }
    
    /**
     * Export to Excel (CSV)
     */
    function exportToExcel() {
        const csvRows = [];
        
        // Header
        csvRows.push('Loại,Ngày,Danh mục/Nguồn,Loại tiền,Số tiền,VND');
        
        // Income data
        incomeData.forEach(item => {
            if (item.date && item.source && item.amount) {
                const row = [
                    'Thu',
                    item.date,
                    `"${(item.source || '').replace(/"/g, '""')}"`,
                    item.currency || 'VND',
                    item.amount,
                    calculateVND(item.amount, item.currency || 'VND')
                ];
                csvRows.push(row.join(','));
            }
        });
        
        // Expense data
        expenseData.forEach(item => {
            if (item.date && item.category && item.amount) {
                const row = [
                    'Chi',
                    item.date,
                    `"${(item.category || '').replace(/"/g, '""')}"`,
                    item.currency || 'VND',
                    item.amount,
                    calculateVND(item.amount, item.currency || 'VND')
                ];
                csvRows.push(row.join(','));
            }
        });
        
        // Create CSV and download
        const csvContent = '\uFEFF' + csvRows.join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `thu-chi-${currentMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (window.showNotification) {
            window.showNotification('📥 Đã xuất file Excel', 'success');
        }
    }

    // Export functions to global scope
    window.addEmptyIncomeRow = addEmptyIncomeRow;
    window.addEmptyExpenseRow = addEmptyExpenseRow;
    window.updateIncomeField = updateIncomeField;
    window.updateExpenseField = updateExpenseField;
    window.formatAmountInput = formatAmountInput;
    window.deleteIncome = deleteIncome;
    window.deleteExpense = deleteExpense;

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
