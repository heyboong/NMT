// ====================================
// USDT Purchase Management System
// ====================================

let usdtPurchaseData = [];
let currentP2PRate = 0;

// ====================================
// Initialize
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadP2PRate();
    setupEventListeners();
    
    // Auto-refresh P2P rate every 5 minutes
    setInterval(loadP2PRate, 5 * 60 * 1000);
});

// ====================================
// Load Data from localStorage
// ====================================
function loadData() {
    const saved = localStorage.getItem('usdt_purchase_data');
    if (saved) {
        try {
            usdtPurchaseData = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading data:', e);
            usdtPurchaseData = [];
        }
    }
    
    // Tạo sẵn 20 dòng nếu chưa có
    if (usdtPurchaseData.length === 0) {
        for (let i = 0; i < 20; i++) {
            usdtPurchaseData.push({
                date: '',
                purchaseAmount: 0,
                purchasePrice: 0,
                workCost: 0
            });
        }
        saveData();
    }
    
    renderTable();
    updateStatistics();
}

// ====================================
// Load Latest P2P Rate
// ====================================
async function loadP2PRate() {
    try {
        const rateData = localStorage.getItem('rate_settings');
        if (rateData) {
            const rates = JSON.parse(rateData);
            if (rates.length > 0) {
                // Get most recent rate
                const sortedRates = rates.sort((a, b) => new Date(b.date) - new Date(a.date));
                currentP2PRate = parseFloat(sortedRates[0].price) || 0;
                
                // Update VND column for all rows
                renderTable();
                updateStatistics();
            }
        }
    } catch (e) {
        console.error('Error loading P2P rate:', e);
    }
}

// ====================================
// Save Data to localStorage
// ====================================
function saveData() {
    try {
        localStorage.setItem('usdt_purchase_data', JSON.stringify(usdtPurchaseData));
        console.log('✅ USDT purchase data saved');
    } catch (e) {
        console.error('Error saving data:', e);
        alert('Lỗi khi lưu dữ liệu!');
    }
}

// ====================================
// Render Table
// ====================================
function renderTable() {
    const tbody = document.getElementById('usdt-purchase-tbody');
    if (!tbody) return;

    tbody.innerHTML = usdtPurchaseData.map((row, index) => {
        // Calculate USDT = Tiền Nhập / Giá Nhập
        const usdt = row.purchasePrice > 0 ? (row.purchaseAmount / row.purchasePrice) : 0;
        
        // Calculate VND = USDT * Current P2P Rate
        const vnd = usdt * currentP2PRate;
        
        // Calculate Tổng Cộng = VND - Tiền Làm
        const total = vnd - (row.workCost || 0);
        
        return `
            <tr data-index="${index}">
                <td>
                    <input type="date" 
                        value="${row.date || ''}" 
                        onchange="updateCell(${index}, 'date', this.value)"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;">
                </td>
                <td>
                    <input type="number" 
                        value="${row.purchaseAmount || ''}" 
                        onchange="updateCell(${index}, 'purchaseAmount', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right;">
                </td>
                <td>
                    <input type="number" 
                        value="${row.purchasePrice || ''}" 
                        onchange="updateCell(${index}, 'purchasePrice', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right;">
                </td>
                <td>
                    <input type="number" 
                        value="${usdt.toFixed(2)}" 
                        onchange="updateCellManual(${index}, 'usdt', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: #eff6ff; font-weight: 600; color: #3b82f6;">
                </td>
                <td>
                    <input type="number" 
                        value="${vnd.toFixed(0)}" 
                        onchange="updateCellManual(${index}, 'vnd', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: #f5f3ff; font-weight: 600; color: #8b5cf6;">
                </td>
                <td>
                    <input type="number" 
                        value="${row.workCost || ''}" 
                        onchange="updateCell(${index}, 'workCost', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right;">
                </td>
                <td>
                    <input type="number" 
                        value="${total.toFixed(0)}" 
                        onchange="updateCellManual(${index}, 'total', parseFloat(this.value) || 0)"
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; font-weight: 700; font-size: 15px; ${total >= 0 ? 'color: #10b981; background: #d1fae5;' : 'color: #ef4444; background: #fee2e2;'}">
                </td>
                <td style="text-align: center;">
                    <button onclick="deleteRow(${index})" 
                        style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ====================================
// Update Cell
// ====================================
function updateCell(index, field, value) {
    if (!usdtPurchaseData[index]) return;
    
    usdtPurchaseData[index][field] = value;
    saveData();
    renderTable();
    updateStatistics();
}

// ====================================
// Update Cell Manual (for calculated fields)
// ====================================
window.updateCellManual = function(index, field, value) {
    if (!usdtPurchaseData[index]) return;
    
    // Allow manual override of calculated fields
    if (field === 'usdt' || field === 'vnd' || field === 'total') {
        if (!usdtPurchaseData[index].manual) {
            usdtPurchaseData[index].manual = {};
        }
        usdtPurchaseData[index].manual[field] = value;
    }
    
    saveData();
    renderTable();
    updateStatistics();
};

// ====================================
// Add New Row
// ====================================
function addNewRow() {
    const today = new Date().toISOString().split('T')[0];
    
    usdtPurchaseData.push({
        date: today,
        purchaseAmount: 0,
        purchasePrice: 0,
        workCost: 0
    });
    
    saveData();
    renderTable();
    updateStatistics();
    
    // Scroll to bottom
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
}

// ====================================
// Delete Row
// ====================================
function deleteRow(index) {
    if (!confirm('Bạn có chắc muốn xóa dòng này?')) return;
    
    usdtPurchaseData.splice(index, 1);
    saveData();
    renderTable();
    updateStatistics();
}

// ====================================
// Update Statistics
// ====================================
function updateStatistics() {
    let totalInput = 0;
    let totalUSDT = 0;
    let totalPriceSum = 0;
    let totalFinal = 0;
    let countWithPrice = 0;

    usdtPurchaseData.forEach(row => {
        const purchaseAmount = parseFloat(row.purchaseAmount) || 0;
        const purchasePrice = parseFloat(row.purchasePrice) || 0;
        const workCost = parseFloat(row.workCost) || 0;
        
        totalInput += purchaseAmount;
        
        if (purchasePrice > 0) {
            const usdt = purchaseAmount / purchasePrice;
            totalUSDT += usdt;
            totalPriceSum += purchasePrice;
            countWithPrice++;
            
            const vnd = usdt * currentP2PRate;
            const total = vnd - workCost;
            totalFinal += total;
        }
    });

    const avgPrice = countWithPrice > 0 ? totalPriceSum / countWithPrice : 0;

    // Update stat cards
    document.getElementById('stat-total-input').textContent = formatCurrency(totalInput);
    document.getElementById('stat-total-usdt').textContent = formatNumber(totalUSDT, 2) + ' $';
    document.getElementById('stat-avg-price').textContent = formatCurrency(avgPrice);
    
    const finalElement = document.getElementById('stat-total-final');
    finalElement.textContent = formatCurrency(totalFinal);
    finalElement.style.color = totalFinal >= 0 ? '#10b981' : '#ef4444';
}

// ====================================
// Setup Event Listeners
// ====================================
function setupEventListeners() {
    const addBtn = document.getElementById('add-row-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addNewRow);
    }

    const exportBtn = document.getElementById('export-usdt-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
}

// ====================================
// Export to Excel
// ====================================
function exportToExcel() {
    if (usdtPurchaseData.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Ngày Nhập,Tiền Nhập (VND),Giá Nhập (VND),USDT ($),VND (VND),Tiền Làm (VND),Tổng Cộng (VND)\n';

    usdtPurchaseData.forEach(row => {
        const usdt = row.purchasePrice > 0 ? (row.purchaseAmount / row.purchasePrice) : 0;
        const vnd = usdt * currentP2PRate;
        const total = vnd - (row.workCost || 0);

        csv += `${row.date || ''},`;
        csv += `${row.purchaseAmount || 0},`;
        csv += `${row.purchasePrice || 0},`;
        csv += `${usdt.toFixed(2)},`;
        csv += `${vnd.toFixed(0)},`;
        csv += `${row.workCost || 0},`;
        csv += `${total.toFixed(0)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `USDT_Purchase_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================
// Utility Functions
// ====================================
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0₫';
    return Math.round(value).toLocaleString('vi-VN') + '₫';
}

function formatNumber(value, decimals = 0) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Make functions globally accessible
window.updateCell = updateCell;
window.deleteRow = deleteRow;
window.addNewRow = addNewRow;
