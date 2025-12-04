// ====================================
// Staff Manager
// Quản lý danh sách nhân viên
// ====================================

const STORAGE_KEY = 'staff_list';
let staffList = [];
let sortAscending = true;

// ====================================
// Initialize
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    loadStaffList();
    setupEventListeners();
    renderStaffList();
});

// ====================================
// Load Staff List
// ====================================
function loadStaffList() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            staffList = JSON.parse(stored);
        } else {
            staffList = [];
        }
    } catch (e) {
        console.error('Error loading staff list:', e);
        staffList = [];
    }
}

// ====================================
// Save Staff List
// ====================================
function saveStaffList() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
        console.log('✅ Staff list saved');
    } catch (e) {
        console.error('Error saving staff list:', e);
        alert('Lỗi khi lưu danh sách!');
    }
}

// ====================================
// Add Staff
// ====================================
function addStaff(name) {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
        alert('Vui lòng nhập tên nhân viên!');
        return false;
    }
    
    // Check duplicate
    if (staffList.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
        alert('Nhân viên này đã tồn tại!');
        return false;
    }
    
    staffList.push(trimmedName);
    saveStaffList();
    renderStaffList();
    
    // Clear input
    document.getElementById('staff-name-input').value = '';
    
    // Show notification
    showNotification(`✅ Đã thêm: ${trimmedName}`);
    return true;
}

// ====================================
// Edit Staff
// ====================================
function editStaff(oldName, newName) {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
        alert('Tên không được để trống!');
        return false;
    }
    
    // Check duplicate (except current name)
    if (staffList.some(s => s !== oldName && s.toLowerCase() === trimmedName.toLowerCase())) {
        alert('Tên này đã tồn tại!');
        return false;
    }
    
    const index = staffList.indexOf(oldName);
    if (index !== -1) {
        staffList[index] = trimmedName;
        saveStaffList();
        renderStaffList();
        showNotification(`✏️ Đã cập nhật: ${trimmedName}`);
        return true;
    }
    
    return false;
}

// ====================================
// Delete Staff
// ====================================
function deleteStaff(name) {
    if (!confirm(`Bạn có chắc muốn xóa "${name}"?`)) {
        return false;
    }
    
    const index = staffList.indexOf(name);
    if (index !== -1) {
        staffList.splice(index, 1);
        saveStaffList();
        renderStaffList();
        showNotification(`🗑️ Đã xóa: ${name}`);
        return true;
    }
    
    return false;
}

// ====================================
// Render Staff List
// ====================================
function renderStaffList() {
    const listContainer = document.getElementById('staff-list');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('staff-count');
    const searchTerm = document.getElementById('search-staff-input')?.value.toLowerCase() || '';
    
    // Filter by search
    let filtered = staffList;
    if (searchTerm) {
        filtered = staffList.filter(name => name.toLowerCase().includes(searchTerm));
    }
    
    // Update count
    if (countEl) countEl.textContent = staffList.length;
    
    // Show empty state
    if (filtered.length === 0) {
        listContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    listContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    // Render items
    listContainer.innerHTML = filtered.map((name, index) => `
        <div class="staff-item" style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e5e7eb; transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span style="font-size: 20px;">👤</span>
                <span class="staff-name" data-name="${name}" style="font-size: 15px; font-weight: 600; color: #1f2937; cursor: pointer;">
                    ${name}
                </span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="startEdit('${name.replace(/'/g, "\\'")}')" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                    ✏️ Sửa
                </button>
                <button onclick="deleteStaff('${name.replace(/'/g, "\\'")}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                    🗑️ Xóa
                </button>
            </div>
        </div>
    `).join('');
    
    // Add hover effects
    document.querySelectorAll('.staff-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.background = '#eff6ff';
            this.style.borderColor = '#3b82f6';
        });
        item.addEventListener('mouseleave', function() {
            this.style.background = '#f9fafb';
            this.style.borderColor = '#e5e7eb';
        });
    });
}

// ====================================
// Start Edit Mode
// ====================================
function startEdit(name) {
    const newName = prompt('Nhập tên mới:', name);
    if (newName !== null) {
        editStaff(name, newName);
    }
}

// ====================================
// Sort Staff List
// ====================================
function sortStaffList() {
    staffList.sort((a, b) => {
        if (sortAscending) {
            return a.localeCompare(b, 'vi');
        } else {
            return b.localeCompare(a, 'vi');
        }
    });
    
    sortAscending = !sortAscending;
    
    const btn = document.getElementById('sort-staff-btn');
    if (btn) {
        btn.innerHTML = sortAscending ? '<span>🔤</span> Sắp xếp A-Z' : '<span>🔤</span> Sắp xếp Z-A';
    }
    
    saveStaffList();
    renderStaffList();
}

// ====================================
// Export Staff List
// ====================================
function exportStaffList() {
    if (staffList.length === 0) {
        alert('Danh sách trống, không có gì để xuất!');
        return;
    }
    
    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'STT,Tên Nhân Viên\n';
    
    staffList.forEach((name, index) => {
        csv += `${index + 1},${name}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Staff_List_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('📥 Đã xuất danh sách!');
}

// ====================================
// Setup Event Listeners
// ====================================
function setupEventListeners() {
    // Add button
    const addBtn = document.getElementById('add-staff-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const input = document.getElementById('staff-name-input');
            if (input && input.value) {
                addStaff(input.value);
            }
        });
    }
    
    // Enter key on input
    const input = document.getElementById('staff-name-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value) {
                addStaff(input.value);
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('search-staff-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderStaffList);
    }
    
    // Sort button
    const sortBtn = document.getElementById('sort-staff-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', sortStaffList);
    }
    
    // Export button
    const exportBtn = document.getElementById('export-staff-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportStaffList);
    }
}

// ====================================
// Show Notification
// ====================================
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// ====================================
// Export Functions for Global Access
// ====================================
window.addStaff = addStaff;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.startEdit = startEdit;
window.getStaffList = function() {
    return staffList.slice(); // Return copy
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
