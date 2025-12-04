// ====================================
// Balance by Name Management System
// Theo dõi công nợ theo từng người
// ====================================

let peopleBalances = {};
let filteredPeople = [];
let currentDetailPerson = null;

// ====================================
// Initialize
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    loadAndCalculateBalances();
    setupEventListeners();
});

// ====================================
// Load Data and Calculate Balances
// ====================================
function loadAndCalculateBalances() {
    // Load data from all tables
    const conversionData = JSON.parse(localStorage.getItem('dashboard_conversion') || '[]');
    const withdrawData = JSON.parse(localStorage.getItem('dashboard_withdraw') || '[]');
    const aeData = JSON.parse(localStorage.getItem('AE_sheet') || '[]');
    const aeqtData = JSON.parse(localStorage.getItem('AEQT_sheet') || '[]');
    
    // Reset balances
    peopleBalances = {};
    
    // Process Bảng AE - Lấy Chia và Tiền làm
    aeData.forEach(row => {
        if (row.name && row.name.trim()) {
            const nameField = row.name.trim();
            // Split by comma and process each name
            const names = nameField.split(',').map(n => n.trim()).filter(n => n.length > 0);
            
            const chia = parseFloat(row.chia) || 0;
            const khoa = parseFloat(row.khoa) || 0;
            const money = parseFloat(row.money) || 0; // Tiền làm
            
            names.forEach(name => {
                if (!peopleBalances[name]) {
                    peopleBalances[name] = {
                        name: name,
                        totalDoi: 0,
                        totalLay: 0,
                        totalChia: 0,
                        totalKhoa: 0,
                        totalTienLam: 0,
                        totalTT_AE: 0,
                        totalTT_AEQT: 0,
                        balance: 0,
                        doiTransactions: [],
                        layTransactions: [],
                        aeTransactions: [],
                        aeqtTransactions: []
                    };
                }
                
                // Bảng AE: Nhận (VND) = Chia × 0.5 (nếu Chia > 0), ngược lại = Tiền làm × 0.5
                const tt = chia > 0 ? (chia * 0.5) : (money * 0.5);
                peopleBalances[name].totalChia += chia;
                peopleBalances[name].totalKhoa += khoa;
                peopleBalances[name].totalTienLam += money;
                peopleBalances[name].totalTT_AE += tt;
                
                peopleBalances[name].aeTransactions.push({
                    date: row.date,
                    chia: chia,
                    khoa: khoa,
                    money: money,
                    tt: tt
                });
            });
        }
    });
    
    // Process Bảng AE-QT - Lấy Chia và Tiền làm
    aeqtData.forEach(row => {
        if (row.name && row.name.trim()) {
            const nameField = row.name.trim();
            // Split by comma and process each name
            const names = nameField.split(',').map(n => n.trim()).filter(n => n.length > 0);
            
            const chia = parseFloat(row.chia) || 0;
            const khoa = parseFloat(row.khoa) || 0;
            const money = parseFloat(row.money) || 0; // Tiền làm
            
            names.forEach(name => {
                if (!peopleBalances[name]) {
                    peopleBalances[name] = {
                        name: name,
                        totalDoi: 0,
                        totalLay: 0,
                        totalChia: 0,
                        totalKhoa: 0,
                        totalTienLam: 0,
                        totalTT_AE: 0,
                        totalTT_AEQT: 0,
                        balance: 0,
                        doiTransactions: [],
                        layTransactions: [],
                        aeTransactions: [],
                        aeqtTransactions: []
                    };
                }
                
                // Bảng AE-QT: Nhận (VND) = Chia × 0.8 (nếu Chia > 0), ngược lại = Tiền làm × 0.8
                const tt = chia > 0 ? (chia * 0.8) : (money * 0.8);
                peopleBalances[name].totalChia += chia;
                peopleBalances[name].totalKhoa += khoa;
                peopleBalances[name].totalTienLam += money;
                peopleBalances[name].totalTT_AEQT += tt;
                
                peopleBalances[name].aeqtTransactions.push({
                    date: row.date,
                    chia: chia,
                    khoa: khoa,
                    money: money,
                    tt: tt
                });
            });
        }
    });
    
    // Process Ngày Đổi (Conversion) - Money they should give back
    conversionData.forEach(row => {
        if (row.staff && row.staff.trim()) {
            const name = row.staff.trim();
            if (!peopleBalances[name]) {
                peopleBalances[name] = {
                    name: name,
                    totalDoi: 0,
                    totalLay: 0,
                    totalChia: 0,
                    totalKhoa: 0,
                    totalTienLam: 0,
                    totalTT_AE: 0,
                    totalTT_AEQT: 0,
                    balance: 0,
                    doiTransactions: [],
                    layTransactions: [],
                    aeTransactions: [],
                    aeqtTransactions: []
                };
            }
            
            // Tính VND từ USDT và USD
            let vnd = 0;
            const usdt = parseFloat(row.usdt) || 0;
            const usd = parseFloat(row.usd) || 0;
            const price = parseFloat(row.price) || 0;
            
            if (price > 0) {
                vnd = (usdt + usd) * price;
            }
            
            peopleBalances[name].totalDoi += vnd;
            peopleBalances[name].doiTransactions.push({
                date: row.date,
                usdt: usdt,
                usd: usd,
                price: price,
                vnd: vnd
            });
        }
    });
    
    // Process Ngày Lấy (Withdraw) - Money they took
    withdrawData.forEach(row => {
        if (row.staff && row.staff.trim()) {
            const name = row.staff.trim();
            if (!peopleBalances[name]) {
                peopleBalances[name] = {
                    name: name,
                    totalDoi: 0,
                    totalLay: 0,
                    totalChia: 0,
                    totalKhoa: 0,
                    totalTienLam: 0,
                    totalTT_AE: 0,
                    totalTT_AEQT: 0,
                    balance: 0,
                    doiTransactions: [],
                    layTransactions: [],
                    aeTransactions: [],
                    aeqtTransactions: []
                };
            }
            
            // Tính tổng từ bankdep + bankbad + visa
            const bankdep = parseFloat(row.bankdep) || 0;
            const bankbad = parseFloat(row.bankbad) || 0;
            const visa = parseFloat(row.visa) || 0;
            const total = bankdep + bankbad + visa;
            
            peopleBalances[name].totalLay += total;
            peopleBalances[name].layTransactions.push({
                date: row.date,
                bankdep: bankdep,
                bankbad: bankbad,
                visa: visa,
                total: total
            });
        }
    });
    
    // Calculate final balance for each person
    // Balance = (Nhận AE + Nhận AE-QT) - Ngày Đổi - Ngày Lấy
    // Nhận VND: Tiền công NV kiếm được
    // Ngày Đổi: Tiền NV đổi crypto (trừ đi)
    // Ngày Lấy: Tiền NV đã ứng (trừ đi)
    // Positive = We owe them (Còn nợ NV)
    // Negative = They owe us (NV nợ)
    Object.keys(peopleBalances).forEach(name => {
        peopleBalances[name].balance = peopleBalances[name].totalTT_AE + peopleBalances[name].totalTT_AEQT - peopleBalances[name].totalDoi - peopleBalances[name].totalLay;
    });
    
    console.log('✅ Calculated balances for', Object.keys(peopleBalances).length, 'people');
    
    // Initial render
    applyFiltersAndSort();
}

// ====================================
// Apply Filters and Sort
// ====================================
function applyFiltersAndSort() {
    const searchTerm = (document.getElementById('search-name')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filter-status')?.value || 'all';
    const sortBy = document.getElementById('sort-by')?.value || 'name-asc';
    
    // Convert to array
    let people = Object.values(peopleBalances);
    
    // Apply search filter
    if (searchTerm) {
        people = people.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
        people = people.filter(p => {
            if (filterStatus === 'positive') return p.balance > 0;
            if (filterStatus === 'negative') return p.balance < 0;
            if (filterStatus === 'zero') return p.balance === 0;
            return true;
        });
    }
    
    // Apply sorting
    people.sort((a, b) => {
        switch (sortBy) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'balance-desc':
                return b.balance - a.balance;
            case 'balance-asc':
                return a.balance - b.balance;
            default:
                return 0;
        }
    });
    
    filteredPeople = people;
    renderPeopleList();
    updateStatistics();
}

// ====================================
// Render People List
// ====================================
function renderPeopleList() {
    const container = document.getElementById('people-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!container) return;
    
    if (filteredPeople.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = filteredPeople.map(person => {
        const balanceColor = person.balance > 0 ? '#10b981' : person.balance < 0 ? '#ef4444' : '#6b7280';
        const balanceBg = person.balance > 0 ? '#d1fae5' : person.balance < 0 ? '#fee2e2' : '#f3f4f6';
        const statusIcon = person.balance > 0 ? '💰' : person.balance < 0 ? '⚠️' : '✅';
        const statusText = person.balance > 0 ? 'Còn nợ NV' : person.balance < 0 ? 'NV nợ' : 'Cân bằng';
        
        return `
            <div class="person-card" onclick="showPersonDetail('${person.name.replace(/'/g, "\\'")}')" 
                style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease; border-left: 4px solid ${balanceColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                            👤 ${person.name}
                        </div>
                        <div style="font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                            ${statusIcon} ${statusText}
                        </div>
                    </div>
                    <div style="background: ${balanceBg}; padding: 8px 12px; border-radius: 6px;">
                        <div style="font-size: 16px; font-weight: 700; color: ${balanceColor};">
                            ${formatCurrency(Math.abs(person.balance))}
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <div>
                        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Ngày Đổi</div>
                        <div style="font-size: 14px; font-weight: 600; color: #3b82f6;">
                            ${formatCurrency(person.totalDoi)}
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                            ${person.doiTransactions.length} giao dịch
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Ngày Lấy</div>
                        <div style="font-size: 14px; font-weight: 600; color: #f59e0b;">
                            ${formatCurrency(person.totalLay)}
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                            ${person.layTransactions.length} giao dịch
                        </div>
                    </div>
                </div>
                
                ${(person.totalTT_AE > 0 || person.totalTT_AEQT > 0) ? `
                <div style="display: grid; grid-template-columns: ${person.totalTT_AE > 0 && person.totalTT_AEQT > 0 ? '1fr 1fr' : '1fr'}; gap: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    ${person.totalTT_AE > 0 ? `
                    <div>
                        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">💼 Nhận AE (×0.5)</div>
                        <div style="font-size: 14px; font-weight: 600; color: #8b5cf6;">
                            ${formatCurrency(person.totalTT_AE)}
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                            ${person.aeTransactions ? person.aeTransactions.length : 0} giao dịch
                        </div>
                    </div>
                    ` : ''}
                    ${person.totalTT_AEQT > 0 ? `
                    <div>
                        <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">🌐 Nhận AE-QT (×0.8)</div>
                        <div style="font-size: 14px; font-weight: 600; color: #ec4899;">
                            ${formatCurrency(person.totalTT_AEQT)}
                        </div>
                        <div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">
                            ${person.aeqtTransactions ? person.aeqtTransactions.length : 0} giao dịch
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div style="margin-top: 12px; text-align: center; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <span style="font-size: 12px; color: #6b7280; font-weight: 600;">
                        👆 Click để xem chi tiết
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add hover effects
    document.querySelectorAll('.person-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });
    });
}

// ====================================
// Update Statistics
// ====================================
function updateStatistics() {
    const allPeople = Object.values(peopleBalances);
    const totalPeople = allPeople.length;
    const positive = allPeople.filter(p => p.balance > 0).length;
    const negative = allPeople.filter(p => p.balance < 0).length;
    const zero = allPeople.filter(p => p.balance === 0).length;
    
    document.getElementById('stat-total-people').textContent = totalPeople;
    document.getElementById('stat-positive').textContent = positive;
    document.getElementById('stat-negative').textContent = negative;
    document.getElementById('stat-zero').textContent = zero;
}

// ====================================
// Show Person Detail Modal
// ====================================
function showPersonDetail(name) {
    const person = peopleBalances[name];
    if (!person) return;
    
    currentDetailPerson = person;
    
    // Update modal header
    document.getElementById('modal-name').textContent = person.name;
    document.getElementById('modal-total-doi').textContent = formatCurrency(person.totalDoi);
    document.getElementById('modal-total-lay').textContent = formatCurrency(person.totalLay);
    document.getElementById('modal-total-tt-ae').textContent = formatCurrency(person.totalTT_AE);
    document.getElementById('modal-total-tt-aeqt').textContent = formatCurrency(person.totalTT_AEQT);
    document.getElementById('count-doi').textContent = person.doiTransactions.length;
    document.getElementById('count-lay').textContent = person.layTransactions.length;
    document.getElementById('count-ae').textContent = person.aeTransactions.length;
    document.getElementById('count-aeqt').textContent = person.aeqtTransactions.length;
    
    // Render Ngày Đổi list
    const doiList = document.getElementById('modal-list-doi');
    if (person.doiTransactions.length > 0) {
        doiList.innerHTML = person.doiTransactions.map(tx => `
            <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">
                            📅 ${tx.date || 'N/A'}
                        </div>
                        <div style="font-size: 11px; color: #3b82f6;">
                            USDT: ${formatNumber(tx.usdt, 2)} | USD: ${formatNumber(tx.usd, 2)} | Giá: ${formatCurrency(tx.price)}
                        </div>
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e40af;">
                        ${formatCurrency(tx.vnd)}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        doiList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">Chưa có giao dịch</div>';
    }
    
    // Render Ngày Lấy list
    const layList = document.getElementById('modal-list-lay');
    if (person.layTransactions.length > 0) {
        layList.innerHTML = person.layTransactions.map(tx => `
            <div style="background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 4px;">
                            📅 ${tx.date || 'N/A'}
                        </div>
                        <div style="font-size: 11px; color: #f59e0b;">
                            Bank đẹp: ${formatCurrency(tx.bankdep)} | Bank xấu: ${formatCurrency(tx.bankbad)} | Visa: ${formatCurrency(tx.visa)}
                        </div>
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #92400e;">
                        ${formatCurrency(tx.total)}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        layList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">Chưa có giao dịch</div>';
    }
    
    // Render Bảng AE list
    const aeList = document.getElementById('modal-list-ae');
    if (person.aeTransactions.length > 0) {
        aeList.innerHTML = person.aeTransactions.map(tx => `
            <div style="background: #dbeafe; padding: 12px; border-radius: 8px; border-left: 3px solid #2563eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">
                            📅 ${tx.date || 'N/A'}
                        </div>
                        <div style="font-size: 11px; color: #3b82f6; margin-bottom: 2px;">
                            💰 Tiền làm: ${formatCurrency(tx.money)}
                        </div>
                        <div style="font-size: 11px; color: #2563eb; margin-bottom: 2px;">
                            💼 Chia: ${formatCurrency(tx.chia)}
                        </div>
                        <div style="font-size: 11px; color: #1e40af;">
                            🔒 Khóa: ${formatCurrency(tx.khoa)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">💵 NHẬN AE (×0.5)</div>
                        <div style="font-size: 16px; font-weight: 700; color: #1e40af; background: #eff6ff; padding: 4px 8px; border-radius: 4px;">
                            ${formatCurrency(tx.tt)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        aeList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">Chưa có giao dịch AE</div>';
    }
    
    // Render Bảng AE-QT list
    const aeqtList = document.getElementById('modal-list-aeqt');
    if (person.aeqtTransactions.length > 0) {
        aeqtList.innerHTML = person.aeqtTransactions.map(tx => `
            <div style="background: #fce7f3; padding: 12px; border-radius: 8px; border-left: 3px solid #ec4899;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 13px; font-weight: 600; color: #9f1239; margin-bottom: 4px;">
                            📅 ${tx.date || 'N/A'}
                        </div>
                        <div style="font-size: 11px; color: #db2777; margin-bottom: 2px;">
                            💰 Tiền làm: ${formatCurrency(tx.money)}
                        </div>
                        <div style="font-size: 11px; color: #ec4899; margin-bottom: 2px;">
                            🌐 Chia: ${formatCurrency(tx.chia)}
                        </div>
                        <div style="font-size: 11px; color: #9f1239;">
                            🔒 Khóa: ${formatCurrency(tx.khoa)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">💵 NHẬN AE-QT (×0.8)</div>
                        <div style="font-size: 16px; font-weight: 700; color: #9f1239; background: #fef2f2; padding: 4px 8px; border-radius: 4px;">
                            ${formatCurrency(tx.tt)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        aeqtList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">Chưa có giao dịch AE-QT</div>';
    }
    
    // Show modal
    const modal = document.getElementById('detail-modal');
    modal.style.display = 'flex';
}

// ====================================
// Close Detail Modal
// ====================================
function closeDetailModal() {
    document.getElementById('detail-modal').style.display = 'none';
    currentDetailPerson = null;
}

// ====================================
// Switch Modal Tab
// ====================================
function switchModalTab(tab) {
    // Update tabs
    document.querySelectorAll('.modal-tab').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.style.borderBottomColor = '#3b82f6';
            btn.style.color = '#3b82f6';
        } else {
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#6b7280';
        }
    });
    
    // Update content
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    if (tab === 'doi') {
        document.getElementById('modal-tab-doi').style.display = 'block';
    } else if (tab === 'lay') {
        document.getElementById('modal-tab-lay').style.display = 'block';
    } else if (tab === 'ae') {
        document.getElementById('modal-tab-ae').style.display = 'block';
    } else if (tab === 'aeqt') {
        document.getElementById('modal-tab-aeqt').style.display = 'block';
    }
}

// ====================================
// Export to Excel
// ====================================
function exportToExcel() {
    if (filteredPeople.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Tên,Tổng Ngày Đổi (VND),Tổng Ngày Lấy (VND),Số Dư (VND),Trạng Thái,Giao Dịch Đổi,Giao Dịch Lấy\n';

    filteredPeople.forEach(person => {
        const status = person.balance > 0 ? 'Nợ cho bạn' : person.balance < 0 ? 'Bạn nợ' : 'Cân bằng';
        csv += `${person.name},`;
        csv += `${person.totalDoi.toFixed(0)},`;
        csv += `${person.totalLay.toFixed(0)},`;
        csv += `${person.balance.toFixed(0)},`;
        csv += `${status},`;
        csv += `${person.doiTransactions.length},`;
        csv += `${person.layTransactions.length}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Balance_ByName_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================
// Setup Event Listeners
// ====================================
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-name');
    if (searchInput) {
        searchInput.addEventListener('input', applyFiltersAndSort);
    }
    
    // Filter
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', applyFiltersAndSort);
    }
    
    // Sort
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFiltersAndSort);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadAndCalculateBalances();
            alert('✅ Dữ liệu đã được làm mới!');
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('export-balance-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Close modal on background click
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDetailModal();
            }
        });
    }
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
window.showPersonDetail = showPersonDetail;
window.closeDetailModal = closeDetailModal;
window.switchModalTab = switchModalTab;
