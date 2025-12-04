/**
 * Monthly Statistics and Charts Module
 * Calculate and display monthly statistics with charts
 */

let vndChart = null;
let usdChart = null;

/**
 * Parse date string (DD/MM/YYYY) to Date object
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

/**
 * Format month key (YYYY-MM)
 */
function getMonthKey(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Format month display (MM/YYYY)
 */
function formatMonth(monthKey) {
    const [year, month] = monthKey.split('-');
    return `${month}/${year}`;
}

/**
 * Calculate monthly statistics from summary totals
 * Lấy dữ liệu từ các giá trị tổng đã tính trong bảng tổng
 */
function calculateMonthlyStats() {
    const monthlyData = {};

    // Get conversion data - tính từ giá trị VND đã tính sẵn (cột VND trong bảng)
    const conversionData = JSON.parse(localStorage.getItem('dashboard_conversion') || '[]');
    conversionData.forEach(row => {
        const date = parseDate(row.date);
        if (!date) return;
        
        const monthKey = getMonthKey(date);
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                usdt: 0,
                usd: 0,
                vndConversion: 0,
                vndWithdraw: 0,
                aeTotal: 0,
                aeqtTotal: 0,
                count: 0,
                totalPrice: 0,
                totalSum: 0
            };
        }

        // Lấy các giá trị từ bảng (đã tính sẵn)
        const usdt = parseFloat(row.usdt) || 0;
        const usd = parseFloat(row.usd) || 0;
        const price = parseFloat(row.price) || 0;
        const vnd = parseFloat(row.vnd) || 0; // VND đã được tính trong bảng

        monthlyData[monthKey].usdt += usdt;
        monthlyData[monthKey].usd += usd;
        monthlyData[monthKey].vndConversion += vnd; // Dùng VND đã tính sẵn
        
        if (price > 0) {
            monthlyData[monthKey].totalPrice += price;
            monthlyData[monthKey].count++;
        }
    });

    // Get withdraw data - tính từ tổng các cột Bank đẹp + Bank xấu + Visa
    const withdrawData = JSON.parse(localStorage.getItem('dashboard_withdraw') || '[]');
    withdrawData.forEach(row => {
        const date = parseDate(row.date);
        if (!date) return;
        
        const monthKey = getMonthKey(date);
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                usdt: 0,
                usd: 0,
                vndConversion: 0,
                vndWithdraw: 0,
                aeTotal: 0,
                aeqtTotal: 0,
                count: 0,
                totalPrice: 0,
                totalSum: 0
            };
        }

        // Lấy các giá trị từ bảng (tổng 3 cột)
        const bankdep = parseFloat(row.bankdep) || 0;
        const bankbad = parseFloat(row.bankbad) || 0;
        const visa = parseFloat(row.visa) || 0;

        monthlyData[monthKey].vndWithdraw += bankdep + bankbad + visa;
    });

    // Get AE data - tính từ cột Tiền làm (money)
    const aeData = JSON.parse(localStorage.getItem('AE_sheet') || '[]');
    aeData.forEach(row => {
        const date = parseDate(row.date);
        if (!date) return;
        
        const monthKey = getMonthKey(date);
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                usdt: 0,
                usd: 0,
                vndConversion: 0,
                vndWithdraw: 0,
                aeTotal: 0,
                aeqtTotal: 0,
                count: 0,
                totalPrice: 0,
                totalSum: 0
            };
        }

        const money = parseFloat(row.money) || 0;
        monthlyData[monthKey].aeTotal += money;
    });

    // Get AE-QT data - tính từ cột Tiền làm (money)
    const aeqtData = JSON.parse(localStorage.getItem('AEQT_sheet') || '[]');
    aeqtData.forEach(row => {
        const date = parseDate(row.date);
        if (!date) return;
        
        const monthKey = getMonthKey(date);
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                usdt: 0,
                usd: 0,
                vndConversion: 0,
                vndWithdraw: 0,
                aeTotal: 0,
                aeqtTotal: 0,
                count: 0,
                totalPrice: 0,
                totalSum: 0
            };
        }

        const money = parseFloat(row.money) || 0;
        monthlyData[monthKey].aeqtTotal += money;
    });

    // Calculate totalSum for each month: Tiền Làm - (VND Đổi + VND Lấy)
    Object.keys(monthlyData).forEach(monthKey => {
        const data = monthlyData[monthKey];
        const totalWork = data.aeTotal + data.aeqtTotal;
        data.totalSum = totalWork - (data.vndConversion + data.vndWithdraw);
    });

    return monthlyData;
}

/**
 * Render monthly statistics table
 */
function renderMonthlyTable() {
    const monthlyData = calculateMonthlyStats();
    const tbody = document.getElementById('monthly-stats-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Sort by month (newest first)
    const sortedMonths = Object.keys(monthlyData).sort().reverse();

    sortedMonths.forEach((monthKey, index) => {
        const data = monthlyData[monthKey];
        const avgPrice = data.count > 0 ? data.totalPrice / data.count : 0;
        const totalWork = data.aeTotal + data.aeqtTotal;

        const row = document.createElement('tr');
        const isEven = index % 2 === 0;
        
        row.style.cssText = `
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            background: ${isEven ? '#ffffff' : '#f8fafc'};
        `;
        
        row.onmouseover = function() { 
            this.style.background = 'linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%)';
            this.style.transform = 'translateX(4px)';
            this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
            this.style.borderLeft = '4px solid #3b82f6';
        };
        
        row.onmouseout = function() { 
            this.style.background = isEven ? '#ffffff' : '#f8fafc';
            this.style.transform = 'translateX(0)';
            this.style.boxShadow = 'none';
            this.style.borderLeft = 'none';
        };
        
        row.innerHTML = `
            <td style="padding: 12px 10px; border: none; font-weight: 700; color: #0f172a; font-size: 13px; white-space: nowrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 5px; height: 5px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%;"></span>
                    <span>${formatMonth(monthKey)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; font-size: 12px; font-weight: 600; white-space: nowrap;">
                <span style="font-family: 'Courier New', monospace; color: #475569;">${data.usdt.toFixed(1)}</span>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; font-size: 12px; font-weight: 600; white-space: nowrap;">
                <span style="font-family: 'Courier New', monospace; color: #475569;">${data.usd.toFixed(1)}</span>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 4px 8px; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); border-radius: 6px; border: 1px solid #a5b4fc;">
                    <span style="color: #4338ca; font-weight: 700; font-size: 12px;">${formatVND(avgPrice)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 4px 8px; background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius: 6px; border: 1px solid #6ee7b7;">
                    <span style="color: #047857; font-weight: 700; font-size: 12px;">${formatVND(data.vndConversion)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 4px 8px; background: linear-gradient(135deg, #fee2e2, #fecaca); border-radius: 6px; border: 1px solid #fca5a5;">
                    <span style="color: #b91c1c; font-weight: 700; font-size: 12px;">${formatVND(data.vndWithdraw)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 5px 10px; background: linear-gradient(135deg, #d1fae5, #10b981); border-radius: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2); border: 1px solid #059669;">
                    <span style="color: white; font-weight: 700; font-size: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${formatVND(data.aeTotal)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 5px 10px; background: linear-gradient(135deg, #cffafe, #06b6d4); border-radius: 6px; box-shadow: 0 2px 6px rgba(8, 145, 178, 0.2); border: 1px solid #0891b2;">
                    <span style="color: white; font-weight: 700; font-size: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${formatVND(data.aeqtTotal)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 6px 10px; background: linear-gradient(135deg, #fca5a5, #dc2626); border-radius: 6px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25); border: 1px solid #b91c1c;">
                    <span style="color: white; font-weight: 700; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${formatVND(totalWork)}</span>
                </div>
            </td>
            <td style="padding: 12px 8px; text-align: right; border: none; white-space: nowrap;">
                <div style="display: inline-block; padding: 6px 10px; background: linear-gradient(135deg, ${data.totalSum >= 0 ? '#ef4444, #dc2626' : '#10b981, #059669'}); border-radius: 6px; box-shadow: 0 2px 8px ${data.totalSum >= 0 ? 'rgba(220, 38, 38, 0.25)' : 'rgba(5, 150, 105, 0.25)'}; border: 1px solid ${data.totalSum >= 0 ? '#b91c1c' : '#059669'};">
                    <span style="color: white; font-weight: 700; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${formatVND(data.totalSum)}</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Render VND chart
 */
function renderVNDChart() {
    const monthlyData = calculateMonthlyStats();
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Get last 6 months
    const last6Months = sortedMonths.slice(-6);
    
    const labels = last6Months.map(formatMonth);
    const conversionData = last6Months.map(m => monthlyData[m].vndConversion);
    const withdrawData = last6Months.map(m => monthlyData[m].vndWithdraw);

    const ctx = document.getElementById('vnd-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (vndChart) {
        vndChart.destroy();
    }

    vndChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'VND Đổi',
                    data: conversionData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                },
                {
                    label: 'VND Lấy',
                    data: withdrawData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatVND(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return (value / 1000000).toFixed(0) + 'M';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render USD/USDT chart
 */
function renderUSDChart() {
    const monthlyData = calculateMonthlyStats();
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Get last 6 months
    const last6Months = sortedMonths.slice(-6);
    
    const labels = last6Months.map(formatMonth);
    const usdtData = last6Months.map(m => monthlyData[m].usdt);
    const usdData = last6Months.map(m => monthlyData[m].usd);

    const ctx = document.getElementById('usd-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (usdChart) {
        usdChart.destroy();
    }

    usdChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'USDT',
                    data: usdtData,
                    borderColor: 'rgb(249, 115, 22)',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'USD',
                    data: usdData,
                    borderColor: 'rgb(168, 85, 247)',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Initialize monthly statistics
 */
function initMonthlyStats() {
    renderMonthlyTable();
    renderVNDChart();
    renderUSDChart();
}

// Auto refresh on data change
window.addEventListener('storage', (e) => {
    if (e.key === 'dashboard_conversion' || e.key === 'dashboard_withdraw') {
        initMonthlyStats();
    }
});

// Export function
window.initMonthlyStats = initMonthlyStats;
