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
                purchaseAmount: 0,      // Tiền Làm (VND) - Vốn đầu tư
                usdtBuy: 0,             // USDT ($)
                sellPrice: 0            // Giá Bán (VND)
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
                
                // Update display
                const display = document.getElementById('current-p2p-rate');
                if (display) {
                    display.textContent = formatNumber(currentP2PRate) + '₫';
                }
                
                // Auto-apply to empty sellPrice cells (always check when rate is available)
                if (currentP2PRate > 0) {
                    let updated = 0;
                    usdtPurchaseData.forEach((row, index) => {
                        if (!row.sellPrice || row.sellPrice === 0) {
                            row.sellPrice = currentP2PRate;
                            updated++;
                        }
                    });
                    
                    if (updated > 0) {
                        saveData();
                        renderTable();
                        updateStatistics();
                        console.log(`✅ Tự động áp dụng giá P2P cho ${updated} dòng`);
                    }
                }
                
                console.log('✅ P2P rate loaded:', currentP2PRate);
            }
        }
    } catch (e) {
        console.error('Error loading P2P rate:', e);
    }
}

// Make loadP2PRate globally accessible
window.loadP2PRate = loadP2PRate;

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
        // Calculate Giá Nhập = Tiền Làm / USDT (giá vốn mua vào)
        const buyPrice = row.usdtBuy > 0 ? (row.purchaseAmount / row.usdtBuy) : 0;
        
        // Calculate Tiền Bán = USDT × Giá Bán (tiền thu về khi bán)
        const sellAmount = (row.usdtBuy || 0) * (row.sellPrice || 0);
        
        // Calculate Tổng Cộng = Tiền Bán - Tiền Làm (lãi/lỗ)
        const total = sellAmount - (row.purchaseAmount || 0);
        
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
                        value="${row.usdtBuy || ''}" 
                        onchange="updateCell(${index}, 'usdtBuy', parseFloat(this.value) || 0)"
                        placeholder="0"
                        step="0.01"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: #eff6ff; font-weight: 600; color: #3b82f6;">
                </td>
                <td>
                    <input type="number" 
                        value="${buyPrice > 0 ? buyPrice.toFixed(0) : ''}" 
                        readonly
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; background: #f3f4f6; font-weight: 600; color: #6b7280; cursor: not-allowed;">
                </td>
                <td>
                    <input type="number" 
                        value="${row.sellPrice || ''}" 
                        onchange="updateCell(${index}, 'sellPrice', parseFloat(this.value) || 0)"
                        placeholder="${currentP2PRate > 0 ? currentP2PRate : '0'}"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: ${row.sellPrice ? 'white' : '#fef3c7'};">
                </td>
                <td>
                    <input type="number" 
                        value="${sellAmount > 0 ? sellAmount.toFixed(0) : ''}" 
                        readonly
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; background: #f5f3ff; font-weight: 600; color: #8b5cf6; cursor: not-allowed;">
                </td>
                <td>
                    <input type="number" 
                        value="${total !== 0 ? total.toFixed(0) : ''}" 
                        readonly
                        placeholder="0"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; font-weight: 700; font-size: 15px; cursor: not-allowed; ${total > 0 ? 'color: #10b981; background: #d1fae5;' : total < 0 ? 'color: #ef4444; background: #fee2e2;' : 'color: #6b7280; background: #f3f4f6;'}">
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
        usdtBuy: 0,
        sellPrice: currentP2PRate > 0 ? currentP2PRate : 0  // Tự động điền giá P2P nếu có
    });
    
    saveData();
    renderTable();
    updateStatistics();
    
    // Scroll to bottom
    setTimeout(() => {
        const tbody = document.getElementById('usdt-purchase-tbody');
        if (tbody) {
            tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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
    let totalCapital = 0;      // Tổng Tiền Làm (Vốn)
    let totalUSDT = 0;         // Tổng USDT
    let totalSellAmount = 0;   // Tổng Tiền Bán (Thu về)
    let totalProfit = 0;       // Lãi/Lỗ

    usdtPurchaseData.forEach(row => {
        const purchaseAmount = parseFloat(row.purchaseAmount) || 0;  // Tiền Làm (Vốn)
        const usdtBuy = parseFloat(row.usdtBuy) || 0;                // USDT
        const sellPrice = parseFloat(row.sellPrice) || 0;            // Giá Bán
        
        totalCapital += purchaseAmount;
        totalUSDT += usdtBuy;
        
        // Calculate Tiền Bán = USDT × Giá Bán
        const sellAmount = usdtBuy * sellPrice;
        totalSellAmount += sellAmount;
        
        // Calculate Lãi/Lỗ = Tiền Bán - Tiền Làm
        const profit = sellAmount - purchaseAmount;
        totalProfit += profit;
    });

    // Update stat cards
    document.getElementById('stat-total-input').textContent = formatCurrency(totalCapital);
    document.getElementById('stat-total-usdt').textContent = formatNumber(totalUSDT, 2) + ' $';
    document.getElementById('stat-total-sell').textContent = formatCurrency(totalSellAmount);
    
    const finalElement = document.getElementById('stat-total-final');
    finalElement.textContent = formatCurrency(totalProfit);
    finalElement.style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
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
    csv += 'Ngày,Tiền Làm (VND),USDT ($),Giá Nhập (VND),Giá Bán (VND),Tiền Bán (VND),Tổng Cộng (VND)\n';

    usdtPurchaseData.forEach(row => {
        const buyPrice = row.usdtBuy > 0 ? (row.purchaseAmount / row.usdtBuy) : 0;
        const sellAmount = (row.usdtBuy || 0) * (row.sellPrice || 0);
        const total = sellAmount - (row.purchaseAmount || 0);

        csv += `${row.date || ''},`;
        csv += `${row.purchaseAmount || 0},`;
        csv += `${row.usdtBuy || 0},`;
        csv += `${buyPrice.toFixed(0)},`;
        csv += `${row.sellPrice || 0},`;
        csv += `${sellAmount.toFixed(0)},`;
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
