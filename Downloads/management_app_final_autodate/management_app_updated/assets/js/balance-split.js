// ====================================
// Render People List - Separate columns for AE and AE-QT
// ====================================
function renderPeopleList() {
    const containerAE = document.getElementById('people-list-ae');
    const containerAEQT = document.getElementById('people-list-aeqt');
    const emptyStateAE = document.getElementById('empty-state-ae');
    const emptyStateAEQT = document.getElementById('empty-state-aeqt');
    
    if (!containerAE || !containerAEQT) {
        console.error('Containers not found');
        return;
    }
    
    // Separate people by AE and AE-QT  
    const peopleAE = filteredPeople.filter(p => p.totalTT_AE > 0);
    const peopleAEQT = filteredPeople.filter(p => p.totalTT_AEQT > 0);
    
    console.log('👥 AE employees:', peopleAE.length);
    console.log('👥 AE-QT employees:', peopleAEQT.length);
    
    // Render AE list
    if (peopleAE.length === 0) {
        containerAE.style.display = 'none';
        if (emptyStateAE) emptyStateAE.style.display = 'block';
    } else {
        containerAE.style.display = 'flex';
        if (emptyStateAE) emptyStateAE.style.display = 'none';
        
        containerAE.innerHTML = peopleAE.map(person => renderPersonCard(person, 'ae')).join('');
    }
    
    // Render AE-QT list
    if (peopleAEQT.length === 0) {
        containerAEQT.style.display = 'none';
        if (emptyStateAEQT) emptyStateAEQT.style.display = 'block';
    } else {
        containerAEQT.style.display = 'flex';
        if (emptyStateAEQT) emptyStateAEQT.style.display = 'none';
        
        containerAEQT.innerHTML = peopleAEQT.map(person => renderPersonCard(person, 'aeqt')).join('');
    }
}

function renderPersonCard(person, type) {
    const balanceColor = person.balance > 0 ? '#10b981' : person.balance < 0 ? '#ef4444' : '#6b7280';
    const balanceBg = person.balance > 0 ? '#d1fae5' : person.balance < 0 ? '#fee2e2' : '#f3f4f6';
    const statusIcon = person.balance > 0 ? '💰' : person.balance < 0 ? '⚠️' : '✅';
    const statusText = person.balance > 0 ? 'Còn nợ NV' : person.balance < 0 ? 'NV nợ' : 'Cân bằng';
    
    const isAE = type === 'ae';
    const ttAmount = isAE ? person.totalTT_AE : person.totalTT_AEQT;
    const ttLabel = isAE ? '💼 AE (×0.5)' : '🌐 AE-QT (×0.8)';
    const ttColor = isAE ? '#8b5cf6' : '#ec4899';
    const ttCount = isAE ? (person.aeTransactions ? person.aeTransactions.length : 0) : (person.aeqtTransactions ? person.aeqtTransactions.length : 0);
    
    return `
        <div class="person-card" onclick="showPersonDetail('${person.name.replace(/'/g, "\\'")}')" 
            style="background: white; border-radius: 10px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); cursor: pointer; transition: all 0.3s ease; border-left: 3px solid ${balanceColor};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <div style="font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 3px;">
                        👤 ${person.name}
                    </div>
                    <div style="font-size: 10px; color: #6b7280; display: flex; align-items: center; gap: 3px;">
                        ${statusIcon} ${statusText}
                    </div>
                </div>
                <div style="background: ${balanceBg}; padding: 6px 10px; border-radius: 5px;">
                    <div style="font-size: 13px; font-weight: 700; color: ${balanceColor};">
                        ${formatCurrency(Math.abs(person.balance))}
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div>
                    <div style="font-size: 9px; color: #9ca3af; margin-bottom: 2px;">Ngày Đổi</div>
                    <div style="font-size: 12px; font-weight: 600; color: #3b82f6;">
                        ${formatCurrency(person.totalDoi)}
                    </div>
                    <div style="font-size: 8px; color: #9ca3af; margin-top: 1px;">
                        ${person.doiTransactions.length} giao dịch
                    </div>
                </div>
                <div>
                    <div style="font-size: 9px; color: #9ca3af; margin-bottom: 2px;">Ngày Lấy</div>
                    <div style="font-size: 12px; font-weight: 600; color: #f59e0b;">
                        ${formatCurrency(person.totalLay)}
                    </div>
                    <div style="font-size: 8px; color: #9ca3af; margin-top: 1px;">
                        ${person.layTransactions.length} giao dịch
                    </div>
                </div>
            </div>
            
            <div style="padding-top: 8px; border-top: 1px solid #e5e7eb; margin-top: 8px;">
                <div>
                    <div style="font-size: 9px; color: #9ca3af; margin-bottom: 2px;">${ttLabel}</div>
                    <div style="font-size: 12px; font-weight: 600; color: ${ttColor};">
                        ${formatCurrency(ttAmount)}
                    </div>
                    <div style="font-size: 8px; color: #9ca3af; margin-top: 1px;">
                        ${ttCount} giao dịch
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 8px; text-align: center; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <span style="font-size: 10px; color: #6b7280; font-weight: 600;">
                    👆 Click xem chi tiết
                </span>
            </div>
        </div>
    `;
}
