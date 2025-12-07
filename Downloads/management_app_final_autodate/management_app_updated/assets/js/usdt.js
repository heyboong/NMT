// ====================================
// USDT Management System
// ====================================

let usdtData = [];
let currentP2PRate = 0;

// ====================================
// Initialize
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadP2PRate();
    setupEventListeners();
    
    // Auto-refresh P2P rate every 10 minutes
    setInterval(loadP2PRate, 10 * 60 * 1000);
});

// ====================================
// Load Data from localStorage
// ====================================
function loadData() {
    const saved = localStorage.getItem('usdt_data');
    if (saved) {
        try {
            usdtData = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading data:', e);
            usdtData = [];
        }
    }
    
    // Tạo sẵn 15 dòng nếu chưa có
    if (usdtData.length === 0) {
        for (let i = 0; i < 15; i++) {
            usdtData.push({
                date: '',
                inputAmount: 0,    // Tiền Nhập (VND)
                usdtReceived: 0,   // Nhận USDT ($)
                inputPrice: 0      // Giá Nhập (VND) - nhập thủ công
            });
        }
        saveData();
    }
    
    // Migrate old data: add inputPrice field if missing
    let needsSave = false;
    usdtData.forEach(row => {
        if (row.inputPrice === undefined) {
            // Auto-calculate from existing data if available
            row.inputPrice = row.usdtReceived > 0 ? (row.inputAmount / row.usdtReceived) : 0;
            needsSave = true;
        }
        // Migrate time field for new time column
        if (row.time === undefined) {
            row.time = '00:00';
            needsSave = true;
        }
    });
    if (needsSave) saveData();
    
    renderTable();
    updateStatistics();
}

// ====================================
// Load P2P Rate from rate_settings
// ====================================
async function loadP2PRate() {
    try {
        // First, try to fetch fresh data from API
        await fetchBinanceP2PRate();
        
        // Then read from localStorage (which was just updated)
        const rateData = localStorage.getItem('rate_settings');
        if (rateData) {
            const settings = JSON.parse(rateData);
            
            // rate_settings: {sellPrice, buyPrice, updatedAt}
            if (settings && typeof settings === 'object') {
                const sellPrice = parseFloat(settings.sellPrice) || 0;
                
                if (sellPrice > 0) {
                    currentP2PRate = sellPrice;
                    
                    // Update display
                    const badge = document.getElementById('current-p2p-rate');
                    if (badge) {
                        badge.textContent = formatNumber(currentP2PRate) + '₫';
                        badge.style.animation = 'pulse 0.5s ease';
                    }
                    
                    // Re-render to update profit/loss
                    renderTable();
                    updateStatistics();
                }
            }
        } else {
            const badge = document.getElementById('current-p2p-rate');
            if (badge) {
                badge.textContent = 'Chưa có giá';
            }
        }
    } catch (e) {
        console.error('Error loading P2P rate:', e);
    }
}

// ====================================
// Fetch P2P Rate from API
// ====================================
async function fetchBinanceP2PRate() {
    const endpoints = [
        'http://localhost:3000/api/p2p-rate',
        'http://localhost:3001/api/p2p-rate',
        'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
    ];

    for (const endpoint of endpoints) {
        try {
            let response;
            if (endpoint.includes('binance.com')) {
                // Direct Binance API call
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fiat: 'VND',
                        page: 1,
                        rows: 1,
                        tradeType: 'SELL',
                        asset: 'USDT',
                        countries: [],
                        proMerchantAds: false,
                        shieldMerchantAds: false,
                        publisherType: null,
                        payTypes: []
                    })
                });
            } else {
                // Proxy endpoint
                response = await fetch(endpoint);
            }

            if (!response.ok) continue;

            const data = await response.json();
            
            let sellPrice, buyPrice;
            
            if (data.data && Array.isArray(data.data)) {
                // Direct Binance format
                sellPrice = parseFloat(data.data[0]?.adv?.price || 0);
                buyPrice = sellPrice;
            } else if (data.sellPrice) {
                // Proxy format
                sellPrice = parseFloat(data.sellPrice);
                buyPrice = parseFloat(data.buyPrice);
            }

            if (sellPrice && sellPrice > 0) {
                const rateSettings = {
                    sellPrice: sellPrice,
                    buyPrice: buyPrice || sellPrice,
                    updatedAt: new Date().toISOString(),
                    source: endpoint.includes('binance.com') ? 'Binance Direct' : 'Proxy'
                };
                
                localStorage.setItem('rate_settings', JSON.stringify(rateSettings));
                return;
            }
        } catch (error) {
            // Silently skip failed endpoints
        }
    }
    // All endpoints failed, use cached data
}

// ====================================
// Save Data to localStorage
// ====================================
function saveData() {
    try {
        localStorage.setItem('usdt_data', JSON.stringify(usdtData));
    } catch (e) {
        console.error('Error saving data:', e);
        alert('Lỗi khi lưu dữ liệu!');
    }
}

// ====================================
// Render Table
// ====================================
function renderTable() {
    const tbody = document.getElementById('usdt-tbody');
    if (!tbody) return;

    tbody.innerHTML = usdtData.map((row, index) => {
        // Giá Nhập: user input (manual)
        const inputPrice = parseFloat(row.inputPrice) || 0;
        
        // Calculate Lãi/Lỗ % = ((Giá P2P - Giá Nhập) / Giá Nhập) * 100
        let profitPercent = 0;
        if (inputPrice > 0 && currentP2PRate > 0) {
            profitPercent = ((currentP2PRate - inputPrice) / inputPrice) * 100;
        }
        
        // Color coding for profit/loss
        let profitColor = '#6b7280';
        let profitBg = '#f3f4f6';
        if (profitPercent > 0) {
            profitColor = '#10b981';
            profitBg = '#d1fae5';
        } else if (profitPercent < 0) {
            profitColor = '#ef4444';
            profitBg = '#fee2e2';
        }
        
        return `
            <tr data-index="${index}">
                <td>
                    <div style="display: grid; grid-template-columns: 1fr 110px; gap: 6px; align-items: center;">
                        <input type="date" 
                            value="${row.date || ''}" 
                            onchange="updateCell(${index}, 'date', this.value)"
                            style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;">
                        <input type="time"
                            value="${row.time || '00:00'}"
                            onchange="updateCell(${index}, 'time', this.value)"
                            style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px;">
                    </div>
                </td>
                <td>
                    <div style="position: relative;">
                        <input type="text" 
                            value="${row.inputAmount > 0 ? formatNumber(row.inputAmount) : ''}" 
                            onchange="updateCell(${index}, 'inputAmount', parseFloat(this.value.replace(/\./g, '')) || 0)"
                            placeholder="0"
                            style="width: 100%; padding: 8px 24px 8px 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right;">
                        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #6b7280; font-weight: 600; pointer-events: none;">₫</span>
                    </div>
                </td>
                <td>
                    <div style="position: relative;">
                        <input type="number" 
                            value="${row.usdtReceived || ''}" 
                            onchange="updateCell(${index}, 'usdtReceived', parseFloat(this.value) || 0)"
                            placeholder="0"
                            step="0.01"
                            style="width: 100%; padding: 8px 24px 8px 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: #eff6ff; font-weight: 600; color: #3b82f6;">
                        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #3b82f6; font-weight: 600; pointer-events: none;">$</span>
                    </div>
                </td>
                <td>
                    <div style="position: relative;">
                        <input type="text" 
                            value="${inputPrice > 0 ? formatNumber(inputPrice.toFixed(0)) : ''}" 
                            onchange="updateCell(${index}, 'inputPrice', parseFloat(this.value.replace(/\./g, '')) || 0)"
                            placeholder="0"
                            style="width: 100%; padding: 8px 24px 8px 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: white; font-weight: 600; color: #059669;">
                        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #059669; font-weight: 600; pointer-events: none;">₫</span>
                    </div>
                </td>
                <td>
                    <div style="position: relative;">
                        <input type="text" 
                            value="${currentP2PRate > 0 ? formatNumber(currentP2PRate.toFixed(0)) : ''}" 
                            readonly
                            placeholder="0"
                            style="width: 100%; padding: 8px 24px 8px 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; background: #fef3c7; font-weight: 600; color: #92400e; cursor: not-allowed;">
                        <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #92400e; font-weight: 600; pointer-events: none;">₫</span>
                    </div>
                </td>
                <td>
                    <input type="text" 
                        value="${profitPercent !== 0 ? profitPercent.toFixed(2) + '%' : ''}" 
                        readonly
                        placeholder="0%"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center; font-weight: 700; font-size: 15px; cursor: not-allowed; color: ${profitColor}; background: ${profitBg};">
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button onclick="insertRowAfter(${index})" 
                            style="padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            ➕ Chèn dưới
                        </button>
                        <button onclick="deleteRow(${index})" 
                            style="padding: 6px 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ====================================
// Update Cell
// ====================================
function updateCell(index, field, value) {
    if (!usdtData[index]) return;
    
    usdtData[index][field] = value;
    saveData();
    renderTable();
    updateStatistics();
}

// ====================================
// Add New Row
// ====================================
function addNewRow() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0,5);
    
    usdtData.push({
        date: today,
        time: time,
        inputAmount: 0,
        usdtReceived: 0,
        inputPrice: 0
    });
    
    saveData();
    renderTable();
    updateStatistics();
    
    // Scroll to bottom
    setTimeout(() => {
        const tbody = document.getElementById('usdt-tbody');
        if (tbody) {
            tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

// ====================================
// Insert Row After specific index
// ====================================
function insertRowAfter(index) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0,5);

    const newRow = {
        date: today,
        time: time,
        inputAmount: 0,
        usdtReceived: 0,
        inputPrice: 0
    };

    usdtData.splice(index + 1, 0, newRow);
    saveData();
    renderTable();
    updateStatistics();
}

// ====================================
// Delete Row
// ====================================
function deleteRow(index) {
    if (!confirm('Bạn có chắc muốn xóa dòng này?')) return;
    
    usdtData.splice(index, 1);
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
    let totalProfitPercent = 0;
    let validRows = 0;

    usdtData.forEach(row => {
        const inputAmount = parseFloat(row.inputAmount) || 0;
        const usdtReceived = parseFloat(row.usdtReceived) || 0;
        
        totalInput += inputAmount;
        totalUSDT += usdtReceived;
        
        // Calculate profit percent for this row
        if (usdtReceived > 0 && currentP2PRate > 0) {
            const inputPrice = inputAmount / usdtReceived;
            const profitPercent = ((currentP2PRate - inputPrice) / inputPrice) * 100;
            totalProfitPercent += profitPercent;
            validRows++;
        }
    });

    const avgPrice = totalUSDT > 0 ? totalInput / totalUSDT : 0;
    const avgProfitPercent = validRows > 0 ? totalProfitPercent / validRows : 0;

    // Update stat cards
    document.getElementById('stat-total-input').textContent = formatCurrency(totalInput);
    document.getElementById('stat-total-usdt').textContent = formatNumber(totalUSDT, 2) + ' $';
    document.getElementById('stat-avg-price').textContent = formatCurrency(avgPrice);
    
    const profitEl = document.getElementById('stat-profit-percent');
    profitEl.textContent = avgProfitPercent.toFixed(2) + '%';
    profitEl.style.color = avgProfitPercent >= 0 ? '#10b981' : '#ef4444';
}

// ====================================
// Setup Event Listeners
// ====================================
function setupEventListeners() {
    const addBtn = document.getElementById('add-row-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addNewRow);
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
}

// ====================================
// Export to Excel
// ====================================
function exportToExcel() {
    if (usdtData.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Ngày Nhập,Tiền Nhập (VND),Nhận USDT ($),Giá Nhập (VND),Giá P2P (VND),Lãi/Lỗ (%)\n';

    usdtData.forEach(row => {
        const inputPrice = row.usdtReceived > 0 ? (row.inputAmount / row.usdtReceived) : 0;
        let profitPercent = 0;
        if (inputPrice > 0 && currentP2PRate > 0) {
            profitPercent = ((currentP2PRate - inputPrice) / inputPrice) * 100;
        }

        csv += `${row.date || ''},`;
        csv += `${row.inputAmount || 0},`;
        csv += `${row.usdtReceived || 0},`;
        csv += `${inputPrice.toFixed(0)},`;
        csv += `${currentP2PRate.toFixed(0)},`;
        csv += `${profitPercent.toFixed(2)}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `USDT_${new Date().toISOString().split('T')[0]}.csv`);
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
    // Use Vietnamese locale for number formatting (. for thousands separator)
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Make functions globally accessible
window.updateCell = updateCell;
window.deleteRow = deleteRow;
window.addNewRow = addNewRow;
window.insertRowAfter = insertRowAfter;

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);
