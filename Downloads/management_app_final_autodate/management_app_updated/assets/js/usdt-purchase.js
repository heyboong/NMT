// ====================================
// USDT Purchase Management System
// ====================================

let usdtPurchaseData = [];
let currentP2PRate = 0;

// Fetch live P2P sell price (via Netlify Function to bypass CORS)
async function fetchBinanceP2PRate() {
    // Method 1: Netlify Function (Primary - bypasses CORS)
    const origin = window.location.origin;
    const netlifyUrls = [
        `${origin}/.netlify/functions/p2p-rate`,
        window.NETLIFY_FUNCTION_URL
    ].filter(Boolean);
    
    for (let url of netlifyUrls) {
        try {
            const res = await fetch(url, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                const sellPrice = parseFloat(data.sellPrice) || 0;
                if (sellPrice > 0) {
                    console.log('✅ P2P rate loaded:', sellPrice, 'VND');
                    return { sellPrice, buyPrice: sellPrice, source: data.source || 'netlify-function' };
                }
            }
        } catch (e) {
            // Silently skip if endpoint unavailable
        }
    }
    
    // Method 2: Try proxy endpoints if configured
    const proxyUrls = [
        window.RATE_PROXY_URL,
        `${origin}/api/p2p-rate`
    ].filter(Boolean);

    for (const url of proxyUrls) {
        try {
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) continue;
            const data = await res.json();
            const sellPrice = parseFloat(data.sellPrice) || 0;
            if (sellPrice > 0) {
                console.log('✅ P2P rate loaded:', sellPrice, 'VND');
                return { sellPrice, buyPrice: sellPrice, source: data.source || 'proxy' };
            }
        } catch (e) {
            // Silently skip
        }
    }

    // Method 3: Binance Spot Ticker (Fallback)
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTVND');
        if (res.ok) {
            const data = await res.json();
            const price = parseFloat(data.price) || 0;
            if (price > 0) {
                console.log('✅ P2P rate loaded:', price, 'VND');
                return { sellPrice: price, buyPrice: price, source: 'binance-ticker' };
            }
        }
    } catch (e) {
        // Ticker not available
    }

    return null;
}

// Build Tiền Làm totals by date from AE & AE-QT
function normalizeDateKey(dateStr) {
    if (!dateStr) return '';
    // Support dd/mm/yyyy
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/').map(p => p.trim());
        if (parts.length === 3) {
            const [day, month, year] = parts;
            if (day && month && year) {
                return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    // Fallback ISO date
    const d = new Date(dateStr);
    if (!isNaN(d)) {
        return d.toISOString().slice(0, 10);
    }
    return '';
}

function buildWorkTotalsByDate() {
    const totals = {};
    const addRows = (rows) => {
        if (!Array.isArray(rows)) return;
        rows.forEach(row => {
            const key = normalizeDateKey(row?.date);
            const money = parseFloat(row?.money) || 0;
            if (!key || !isFinite(money)) return;
            totals[key] = (totals[key] || 0) + money;
        });
    };

    try {
        addRows(JSON.parse(localStorage.getItem('AE_sheet') || '[]'));
        addRows(JSON.parse(localStorage.getItem('AEQT_sheet') || '[]'));
    } catch (e) {
        console.warn('⚠️ Không đọc được dữ liệu AE/AE-QT:', e);
    }

    return totals;
}

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
                time: '',
                purchaseAmount: 0,      // Tiền Nhập (VND) - Số tiền VND nhập vào
                usdtBuy: 0,             // USDT ($) - Số USDT nhận được
                sellPrice: 0            // Giá P2P Bán (VND) - Giá P2P hiện tại
            });
        }
        saveData();
    }

    // Migration: ensure time field exists
    usdtPurchaseData = usdtPurchaseData.map(row => ({
        ...row,
        time: row.time || ''
    }));
    
    renderTable();
    updateStatistics();
}

// ====================================
// Load Latest P2P Rate
// ====================================
async function loadP2PRate() {
    try {
        // 1) Try live fetch
        const live = await fetchBinanceP2PRate();
        if (live && live.sellPrice > 0) {
            currentP2PRate = live.sellPrice;

            // Persist for reuse (align key with other pages: rate-settings)
            const settings = {
                sellPrice: live.sellPrice,
                buyPrice: live.buyPrice,
                source: live.source,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('rate-settings', JSON.stringify(settings));
            localStorage.setItem('rate_settings', JSON.stringify(settings)); // legacy key
        } else {
            // 2) Fallback to cached localStorage (both keys)
            const rateData = localStorage.getItem('rate-settings') || localStorage.getItem('rate_settings');
            if (rateData) {
                const settings = JSON.parse(rateData);
                const sellPrice = parseFloat(settings.sellPrice) || 0;
                if (sellPrice > 0) {
                    currentP2PRate = sellPrice;
                }
            }
        }

        if (currentP2PRate > 0) {
            // Update display
            const display = document.getElementById('current-p2p-rate');
            if (display) {
                display.textContent = formatNumber(currentP2PRate) + '₫';
            }

            // Auto-apply to empty sellPrice cells (always check when rate is available)
            let updated = 0;
            usdtPurchaseData.forEach((row) => {
                if (!row.sellPrice || row.sellPrice === 0) {
                    row.sellPrice = currentP2PRate;
                    updated++;
                }
            });

            if (updated > 0) {
                saveData();
                renderTable();
                updateStatistics();
                if (typeof showSuccess === 'function') {
                    showSuccess(`Đã cập nhật giá P2P: ${formatCurrency(currentP2PRate)}`);
                }
            } else {
                if (typeof showInfo === 'function') {
                    showInfo(`Giá P2P hiện tại: ${formatCurrency(currentP2PRate)}`);
                }
            }

        } else {
            console.warn('⚠️ Giá P2P không hợp lệ');
            if (typeof showWarning === 'function') {
                showWarning('Không thể tải giá P2P. Sử dụng giá đã lưu.');
            }
        }
    } catch (e) {
        console.error('Error loading P2P rate:', e);
        if (typeof showError === 'function') {
            showError('Lỗi khi tải giá P2P!');
        }
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
    } catch (e) {
        console.error('Error saving data:', e);
        if (typeof showError === 'function') {
            showError('Lỗi khi lưu dữ liệu!');
        } else {
            alert('Lỗi khi lưu dữ liệu!');
        }
    }
}

// ====================================
// Render Table
// ====================================
function renderTable() {
    const tbody = document.getElementById('usdt-purchase-tbody');
    if (!tbody) return;

    const workTotals = buildWorkTotalsByDate();

    tbody.innerHTML = usdtPurchaseData.map((row, index) => {
        // Giá Nhập (VND) - Auto-calculated: Tiền Nhập ÷ USDT
        const buyPrice = row.usdtBuy > 0 ? (row.purchaseAmount / row.usdtBuy) : 0;
        
        // Tiền Làm từ bảng AE + AE-QT (cùng ngày)
        const dateKey = normalizeDateKey(row.date);
        const workAmount = dateKey ? (workTotals[dateKey] || 0) : 0;

        // Lãi/Lỗ % theo giá P2P bán so với giá nhập
        const profitPercent = (buyPrice > 0 && row.sellPrice > 0)
            ? ((row.sellPrice - buyPrice) / buyPrice) * 100
            : null;
        const profitColor = profitPercent === null
            ? '#6b7280'
            : profitPercent > 0 ? '#10b981' : '#ef4444';
        
        return `
            <tr data-index="${index}">
                <th class="row-header">${index + 1}</th>
                <td>
                    <div class="datetime-stack" style="display:flex; flex-direction:column; gap:6px; align-items:stretch; width:100%;">
                        <input type="time"
                            value="${row.time || ''}"
                            onchange="updateCell(${index}, 'time', this.value)"
                            placeholder="HH:MM"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #e5e7eb; border-radius:4px;">
                        <input type="date" 
                            value="${row.date || ''}" 
                            onchange="updateCell(${index}, 'date', this.value)"
                            placeholder="YYYY-MM-DD"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #e5e7eb; border-radius:4px;">
                    </div>
                </td>
                <td>
                    <input type="text" 
                        value="${row.purchaseAmount ? formatCurrency(row.purchaseAmount) : ''}" 
                        onfocus="this.value = this.value.replace(/[^0-9]/g, '')" 
                        onblur="updateCellCurrency(${index}, 'purchaseAmount', this.value); this.value = formatCurrency(parseFloat(this.value.replace(/[^0-9]/g, '')) || 0)"
                        placeholder="0₫"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; font-weight: 600;">
                </td>
                <td>
                    <input type="text" 
                        value="${row.usdtBuy ? formatUSDT(row.usdtBuy) : ''}" 
                        onfocus="this.value = this.value.replace(/[^0-9.]/g, '')" 
                        onblur="updateCellUSDT(${index}, 'usdtBuy', this.value); this.value = formatUSDT(parseFloat(this.value.replace(/[^0-9.]/g, '')) || 0)"
                        placeholder="0.00"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: #eff6ff; font-weight: 600; color: #3b82f6;">
                </td>
                <td>
                    <input type="text" 
                        value="${buyPrice > 0 ? formatCurrency(buyPrice) : ''}" 
                        readonly
                        placeholder="0₫"
                        title="Tự động tính: Tiền Nhập ÷ USDT"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; background: #f3f4f6; font-weight: 600; color: #6b7280; cursor: not-allowed;">
                </td>
                <td>
                    <input type="text" 
                        value="${workAmount > 0 ? formatCurrency(workAmount) : ''}"
                        readonly
                        placeholder="0₫"
                        title="Tự động tính từ Bảng AE + AE-QT cùng ngày ${row.date || ''}"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; background: #e7f3ff; font-weight: 700; color: #0066cc; cursor: not-allowed;">
                </td>
                <td>
                    <input type="text" 
                        value="${row.sellPrice ? formatCurrency(row.sellPrice) : ''}" 
                        onfocus="this.value = this.value.replace(/[^0-9]/g, '')" 
                        onblur="updateCellCurrency(${index}, 'sellPrice', this.value); this.value = formatCurrency(parseFloat(this.value.replace(/[^0-9]/g, '')) || 0)"
                        placeholder="${currentP2PRate > 0 ? formatCurrency(currentP2PRate) : '0₫'}"
                        style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; text-align: right; background: ${row.sellPrice ? 'white' : '#fef3c7'}; font-weight: 600;">
                </td>
                <td>
                    <input type="text" 
                        value="${profitPercent !== null ? profitPercent.toFixed(2) + '%' : ''}" 
                        readonly
                        placeholder="0%"
                        style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: right; font-weight: 800; font-size: 13px; cursor: not-allowed; color: ${profitColor}; background: #f8fafc;">
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button onclick="insertRowAfter(${index})"
                            style="padding: 6px 10px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            ➕ Chèn dưới
                        </button>
                        <button onclick="deleteRow(${index})" 
                            style="padding: 6px 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Tính và cập nhật tổng
    updateTotals();
}

// ====================================
// TÍNH TỔNG
// ====================================

function updateTotals() {
    let totalTienNhap = 0;
    let totalUsdt = 0;
    let totalTienLam = 0;
    let sumGiaNhap = 0;
    let countGiaNhap = 0;
    let sumLaiLo = 0;
    let countLaiLo = 0;

    const workTotals = buildWorkTotalsByDate();

    usdtPurchaseData.forEach(row => {
        // Tổng Tiền Nhập
        totalTienNhap += parseFloat(row.purchaseAmount) || 0;
        
        // Tổng USDT
        totalUsdt += parseFloat(row.usdtBuy) || 0;
        
        // Giá Nhập (để tính trung bình)
        const buyPrice = row.usdtBuy > 0 ? (row.purchaseAmount / row.usdtBuy) : 0;
        if (buyPrice > 0) {
            sumGiaNhap += buyPrice;
            countGiaNhap++;
        }
        
        // Tiền Làm từ bảng AE + AE-QT
        const dateKey = normalizeDateKey(row.date);
        const workAmount = dateKey ? (workTotals[dateKey] || 0) : 0;
        totalTienLam += workAmount;
        
        // Lãi/Lỗ %
        const profitPercent = (buyPrice > 0 && row.sellPrice > 0)
            ? ((row.sellPrice - buyPrice) / buyPrice) * 100
            : null;
        if (profitPercent !== null) {
            sumLaiLo += profitPercent;
            countLaiLo++;
        }
    });

    // Giá nhập trung bình
    const avgGiaNhap = countGiaNhap > 0 ? sumGiaNhap / countGiaNhap : 0;
    
    // Lãi/Lỗ trung bình
    const avgLaiLo = countLaiLo > 0 ? sumLaiLo / countLaiLo : 0;

    // Cập nhật các ô tổng
    const totalTienNhapEl = document.getElementById('total-tien-nhap');
    const totalUsdtEl = document.getElementById('total-usdt');
    const avgGiaNhapEl = document.getElementById('avg-gia-nhap');
    const totalTienLamEl = document.getElementById('total-tien-lam');
    const avgLaiLoEl = document.getElementById('avg-lai-lo');

    if (totalTienNhapEl) totalTienNhapEl.textContent = formatCurrency(totalTienNhap);
    if (totalUsdtEl) totalUsdtEl.textContent = formatUSDT(totalUsdt) + ' $';
    if (avgGiaNhapEl) avgGiaNhapEl.textContent = formatCurrency(avgGiaNhap);
    if (totalTienLamEl) totalTienLamEl.textContent = formatCurrency(totalTienLam);
    
    if (avgLaiLoEl) {
        const color = avgLaiLo > 0 ? '#10b981' : avgLaiLo < 0 ? '#ef4444' : '#6b7280';
        avgLaiLoEl.textContent = avgLaiLo.toFixed(2) + '%';
        avgLaiLoEl.style.color = color;
    }
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
// Update Cell Currency (for formatted inputs)
// ====================================
function updateCellCurrency(index, field, value) {
    if (!usdtPurchaseData[index]) return;
    
    // Remove all non-numeric characters and parse
    const numericValue = parseFloat(value.replace(/[^0-9]/g, '')) || 0;
    usdtPurchaseData[index][field] = numericValue;
    
    saveData();
    renderTable();
    updateStatistics();
    
    // Show success notification for manual inputs
    if (numericValue > 0 && typeof showSuccess === 'function') {
        const fieldNames = {
            'purchaseAmount': 'Tiền Nhập',
            'sellPrice': 'Giá P2P Bán'
        };
        showSuccess(`Đã cập nhật ${fieldNames[field] || field}: ${formatCurrency(numericValue)}`, 2000);
    }
}

// ====================================
// Update Cell USDT (for USDT input with decimal support)
// ====================================
function updateCellUSDT(index, field, value) {
    if (!usdtPurchaseData[index]) return;
    
    // Remove comma but keep decimal point
    const numericValue = parseFloat(value.replace(/,/g, '')) || 0;
    usdtPurchaseData[index][field] = numericValue;
    
    saveData();
    renderTable();
    updateStatistics();
    
    // Show success notification
    if (numericValue > 0 && typeof showSuccess === 'function') {
        showSuccess(`Đã cập nhật Nhận USDT: ${formatUSDT(numericValue)} $`, 2000);
    }
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
    const nowTime = new Date().toTimeString().slice(0, 5);
    
    usdtPurchaseData.push({
        date: today,
        time: nowTime,
        purchaseAmount: 0,
        usdtBuy: 0,
        sellPrice: currentP2PRate > 0 ? currentP2PRate : 0  // Tự động điền giá P2P nếu có
    });
    
    saveData();
    renderTable();
    updateStatistics();
    
    if (typeof showSuccess === 'function') {
        showSuccess('Đã thêm dòng mới', 2000);
    }
    
    // Scroll to bottom
    setTimeout(() => {
        const tbody = document.getElementById('usdt-purchase-tbody');
        if (tbody) {
            tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

// ====================================
// Insert Row After
// ====================================
function insertRowAfter(index) {
    const today = new Date().toISOString().split('T')[0];
    const baseDate = usdtPurchaseData[index]?.date || today;
    const baseTime = usdtPurchaseData[index]?.time || '';

    const newRow = {
        date: baseDate,
        time: baseTime,
        purchaseAmount: 0,
        usdtBuy: 0,
        sellPrice: currentP2PRate > 0 ? currentP2PRate : (usdtPurchaseData[index]?.sellPrice || 0)
    };

    usdtPurchaseData.splice(index + 1, 0, newRow);
    saveData();
    renderTable();
    updateStatistics();
    
    if (typeof showSuccess === 'function') {
        showSuccess('Đã chèn dòng mới', 2000);
    }

    setTimeout(() => {
        const tbody = document.getElementById('usdt-purchase-tbody');
        const insertedRow = tbody?.children[index + 1];
        insertedRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Expose for inline handlers
window.insertRowAfter = insertRowAfter;



// ====================================
// Delete Row
// ====================================
async function deleteRow(index) {
    const confirmed = typeof showConfirm === 'function'
        ? await showConfirm('Bạn có chắc muốn xóa dòng này?', 'Xác nhận xóa', {
            icon: '🗑️',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        })
        : confirm('Bạn có chắc muốn xóa dòng này?');
    
    if (!confirmed) return;
    
    usdtPurchaseData.splice(index, 1);
    saveData();
    renderTable();
    updateStatistics();
    
    if (typeof showSuccess === 'function') {
        showSuccess('Đã xóa dòng', 2000);
    }
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
    const statInput = document.getElementById('stat-total-input');
    const statUsdt = document.getElementById('stat-total-usdt');
    const statSell = document.getElementById('stat-total-sell');
    const finalElement = document.getElementById('stat-total-final');

    if (statInput) statInput.textContent = formatCurrency(totalCapital);
    if (statUsdt) statUsdt.textContent = formatNumber(totalUSDT, 2) + ' $';
    if (statSell) statSell.textContent = formatCurrency(totalSellAmount);
    if (finalElement) {
        finalElement.textContent = formatCurrency(totalProfit);
        finalElement.style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
    }
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
        if (typeof showWarning === 'function') {
            showWarning('Không có dữ liệu để xuất!');
        } else {
            alert('Không có dữ liệu để xuất!');
        }
        return;
    }

    const workTotals = buildWorkTotalsByDate();

    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Giờ,Ngày,Tiền Nhập (VND),Nhận USDT ($),Giá Nhập (VND),Tiền Làm (VND),Giá P2P Bán (VND),Lãi/Lỗ (%)\n';

    usdtPurchaseData.forEach(row => {
        const buyPrice = row.usdtBuy > 0 ? (row.purchaseAmount / row.usdtBuy) : 0;
        const key = normalizeDateKey(row.date);
        const workAmount = key ? (workTotals[key] || 0) : 0;
        const profitPercent = (buyPrice > 0 && row.sellPrice > 0)
            ? ((row.sellPrice - buyPrice) / buyPrice) * 100
            : 0;

        csv += `${row.time || ''},`;
        csv += `${row.date || ''},`;
        csv += `${row.purchaseAmount || 0},`;
        csv += `${row.usdtBuy || 0},`;
        csv += `${buyPrice.toFixed(0)},`;
        csv += `${workAmount || 0},`;
        csv += `${row.sellPrice || 0},`;
        csv += `${profitPercent.toFixed(2)}\n`;
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
    
    if (typeof showSuccess === 'function') {
        showSuccess('Đã xuất file Excel thành công!', 2500);
    }
}

// ====================================
// Clear All Data
// ====================================
async function clearAllData() {
    const confirmed1 = typeof showConfirm === 'function'
        ? await showConfirm(
            'Hành động này sẽ:<br>• Xóa tất cả dữ liệu trong bảng USDT<br>• Tạo lại bảng mới với 20 dòng trống<br>• <strong>KHÔNG THỂ HOÀN TÁC!</strong>',
            '⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?',
            { icon: '⚠️', confirmText: 'Tiếp tục', cancelText: 'Hủy', confirmColor: '#f59e0b' }
        )
        : confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?\n\nHành động này sẽ:\n- Xóa tất cả dữ liệu trong bảng USDT\n- Tạo lại bảng mới với 20 dòng trống\n- KHÔNG THỂ HOÀN TÁC!\n\nNhấn OK để xác nhận xóa.');
    
    if (!confirmed1) return;
    
    // Double confirmation
    const confirmed2 = typeof showConfirm === 'function'
        ? await showConfirm(
            'Bạn đang chuẩn bị xóa <strong>TOÀN BỘ</strong> dữ liệu.<br>Đây là cơ hội cuối cùng để hủy bỏ.',
            '🚨 XÁC NHẬN LẦN CUỐI!',
            { icon: '🚨', confirmText: 'XÓA VĨNH VIỄN', cancelText: 'Hủy', confirmColor: '#ef4444' }
        )
        : confirm('🚨 XÁC NHẬN LẦN CUỐI!\n\nBạn đang chuẩn bị xóa TOÀN BỘ dữ liệu.\nĐây là cơ hội cuối cùng để hủy bỏ.\n\nNhấn OK để XÓA VĨNH VIỄN.');
    
    if (!confirmed2) return;
    
    try {
        // Clear localStorage
        localStorage.removeItem('usdt_purchase_data');
        
        // Reinitialize with empty data
        usdtPurchaseData = [];
        for (let i = 0; i < 20; i++) {
            usdtPurchaseData.push({
                date: '',
                time: '',
                purchaseAmount: 0,
                usdtBuy: 0,
                sellPrice: currentP2PRate > 0 ? currentP2PRate : 0
            });
        }
        
        saveData();
        renderTable();
        updateStatistics();
        
        // Show success notification
        if (typeof showSuccess === 'function') {
            showSuccess('Đã xóa toàn bộ dữ liệu và tạo lại bảng mới! 20 dòng trống đã được tạo sẵn.', 3500);
        } else {
            alert('✅ Đã xóa toàn bộ dữ liệu và tạo lại bảng mới!\n\n20 dòng trống đã được tạo sẵn.');
        }
    } catch (e) {
        console.error('Error clearing data:', e);
        if (typeof showError === 'function') {
            showError('Lỗi khi xóa dữ liệu!');
        } else {
            alert('❌ Lỗi khi xóa dữ liệu!');
        }
    }
}

// Make clearAllData globally accessible
window.clearAllData = clearAllData;

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

// Format USDT with comma separator and 2 decimal places
function formatUSDT(value) {
    if (typeof value !== 'number' || isNaN(value) || value === 0) return '';
    // Use toLocaleString for comma separator
    return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Make functions globally accessible
window.updateCell = updateCell;
window.updateCellCurrency = updateCellCurrency;
window.updateCellUSDT = updateCellUSDT;
window.deleteRow = deleteRow;
window.addNewRow = addNewRow;
