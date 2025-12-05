/**
 * Supabase Sync Module
 * Auto-sync localStorage ↔ Supabase database
 */

// Supabase configuration
const SUPABASE_URL = 'https://lnvqggdovsnyguaoyxzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudnFnZ2RvdnNueWd1YW95eHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzUxNzksImV4cCI6MjA4MDExMTE3OX0.uZdbXMTfVHwQMeBtJDGWsCA34AmE7tV2faKsKrZooxg';

// Global singleton Supabase client - prevents multiple instances
let supabase = null;
let isInitialized = false;

// LocalStorage keys to sync
const SYNC_KEYS = {
    'AE_sheet': 'ae_data',                    // Bảng AE
    'AEQT_sheet': 'ae_qt_data',               // Bảng AE-QT
    'history-data': 'history_data',           // Lịch sử
    'dashboard_conversion': 'dashboard_conversion',  // Bảng Ngày đổi
    'dashboard_withdraw': 'dashboard_withdraw',      // Bảng Ngày lấy
    'rate-settings': 'rate_settings',         // Cài đặt tỷ giá
    'system_categories': 'system_categories', // Danh mục hệ thống
    'table_row_notes': 'table_row_notes',     // Ghi chú dòng bảng
    'usdt_data': 'usdt_data',                 // Bảng Nhập USDT (mới)
    'staff_list_ae': 'staff_list_ae',         // Danh sách NV Bảng AE
    'staff_list_aeqt': 'staff_list_aeqt'      // Danh sách NV Bảng AE-QT
    // Note: System table data (system_table_*) will be synced dynamically
};

const USER_ID = 'default_user'; // Simple single-user mode

/**
 * Initialize Supabase sync (Singleton pattern)
 */
async function initSupabaseSync() {
    // Prevent multiple initializations
    if (isInitialized) {
        // Silent check - already initialized (this is good!)
        return;
    }
    
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Supabase library not loaded. Sync disabled.');
            return;
        }

        // Create singleton Supabase client (only once)
        if (!supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase connected:', SUPABASE_URL);
        }

        // Mark as initialized
        isInitialized = true;

        // Initial sync: Pull data from Supabase
        await pullFromSupabase();

        // Setup auto-push on localStorage changes
        setupLocalStorageSync();

        // Setup real-time subscriptions for multi-user sync
        setupRealtimeSync();

        console.log('✅ Supabase sync initialized');
    } catch (error) {
        console.error('❌ Supabase sync error:', error);
        isInitialized = false; // Reset on error
    }
}

/**
 * Pull all data from Supabase to localStorage
 */
async function pullFromSupabase() {
    if (!supabase) return;

    console.log('📥 Pulling data from Supabase...');

    // Sync predefined keys
    for (const [localKey, tableName] of Object.entries(SYNC_KEYS)) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('user_id', USER_ID)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) {
                // Skip silently if table doesn't exist (no console spam)
                if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
                    // Table not created yet - this is normal on first run
                    continue;
                } else {
                    throw error;
                }
                continue;
            }

            if (data && data.length > 0) {
                const jsonData = data[0].data;
                const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
                localStorage.setItem(localKey, jsonString);
                console.log(`  ✓ ${localKey}: synced from cloud`);
            }
        } catch (err) {
            console.warn(`  ⚠️ ${localKey}: pull failed`, err.message);
        }
    }
    
    // Sync dynamic system tables
    await syncSystemTables();

    console.log('✅ Pull complete');
}

/**
 * Sync dynamic system category tables
 */
async function syncSystemTables() {
    try {
        // Get system categories from localStorage
        const categoriesData = localStorage.getItem('system_categories');
        if (!categoriesData) return;
        
        const categories = JSON.parse(categoriesData);
        if (!Array.isArray(categories)) return;
        
        // Sync each category's table data
        for (const category of categories) {
            const tableKey = `system_table_${category.id}`;
            const tableName = 'system_categories'; // All stored in same table with category_id
            
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('user_id', USER_ID)
                    .eq('category_id', category.id)
                    .order('updated_at', { ascending: false })
                    .limit(1);
                
                if (!error && data && data.length > 0) {
                    const tableData = data[0].table_data;
                    if (tableData) {
                        localStorage.setItem(tableKey, JSON.stringify(tableData));
                        console.log(`  ✓ ${tableKey}: synced`);
                    }
                }
            } catch (err) {
                console.warn(`  ⚠️ ${tableKey}: sync failed`, err.message);
            }
        }
    } catch (err) {
        console.warn('  ⚠️ System tables sync failed:', err.message);
    }
}

/**
 * Push data from localStorage to Supabase (auto-sync)
 */
async function pushToSupabase(localKey) {
    if (!supabase || !SYNC_KEYS[localKey]) return;

    const tableName = SYNC_KEYS[localKey];
    const value = localStorage.getItem(localKey);

    if (!value) return;

    try {
        let parsedData;
        try {
            parsedData = JSON.parse(value);
        } catch {
            parsedData = value;
        }

        // Check if record exists
        const { data: existing } = await supabase
            .from(tableName)
            .select('id')
            .eq('user_id', USER_ID)
            .limit(1);

        if (existing && existing.length > 0) {
            // Update existing record
            const { error } = await supabase
                .from(tableName)
                .update({ 
                    data: parsedData, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', existing[0].id);

            if (error) throw error;
        } else {
            // Insert new record
            const { error } = await supabase
                .from(tableName)
                .insert({ 
                    user_id: USER_ID, 
                    data: parsedData 
                });

            if (error) throw error;
        }

        console.log(`☁️ Auto-synced: ${localKey}`);
        showSyncActivity('Đã lưu cloud');
    } catch (err) {
        console.warn(`⚠️ Auto-sync failed for ${localKey}:`, err.message);
    }
}

/**
 * Setup localStorage change detection with auto-sync
 */
function setupLocalStorageSync() {
    // Intercept localStorage.setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        
        // Auto-sync on change
        const shouldSync = SYNC_KEYS[key] || key.startsWith('system_table_');
        
        if (shouldSync) {
            // Show sync activity
            showSyncActivity('Đang lưu...');
            
            // Debounce push to avoid too many requests
            clearTimeout(window._syncTimeout);
            window._syncTimeout = setTimeout(() => {
                if (SYNC_KEYS[key]) {
                    pushToSupabase(key);
                } else if (key.startsWith('system_table_')) {
                    pushSystemTable(key);
                }
            }, 500); // 500ms debounce - fast response
        }
    };

    console.log('✅ Auto-sync localStorage monitoring active');
}

/**
 * Push system table data to Supabase (auto-sync)
 */
async function pushSystemTable(tableKey) {
    if (!supabase) return;
    
    // Extract category ID from key (system_table_category_xxx_xxx)
    const categoryId = tableKey.replace('system_table_', '');
    const value = localStorage.getItem(tableKey);
    
    if (!value) return;
    
    try {
        const tableData = JSON.parse(value);
        
        // Check if record exists
        const { data: existing } = await supabase
            .from('system_categories')
            .select('id')
            .eq('user_id', USER_ID)
            .eq('category_id', categoryId)
            .limit(1);
        
        if (existing && existing.length > 0) {
            // Update existing record
            const { error } = await supabase
                .from('system_categories')
                .update({ 
                    table_data: tableData,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', existing[0].id);
            
            if (error) throw error;
        } else {
            // Insert new record
            const { error } = await supabase
                .from('system_categories')
                .insert({ 
                    user_id: USER_ID,
                    category_id: categoryId,
                    table_data: tableData
                });
            
            if (error) throw error;
        }
        
        console.log(`☁️ Auto-synced: ${tableKey}`);
        showSyncActivity('Đã lưu cloud');
    } catch (err) {
        console.warn(`⚠️ Auto-sync failed for ${tableKey}:`, err.message);
    }
}

/**
 * Setup real-time subscriptions for multi-user sync
 */
function setupRealtimeSync() {
    if (!supabase) return;

    for (const [localKey, tableName] of Object.entries(SYNC_KEYS)) {
        supabase
            .channel(`${tableName}_changes`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: tableName,
                    filter: `user_id=eq.${USER_ID}`
                }, 
                (payload) => {
                    console.log(`🔄 Real-time update: ${tableName}`, payload);
                    
                    // Update localStorage with remote changes
                    if (payload.new && payload.new.data) {
                        const jsonString = typeof payload.new.data === 'string' 
                            ? payload.new.data 
                            : JSON.stringify(payload.new.data);
                        
                        // Use originalSetItem to avoid triggering push
                        const originalSetItem = Storage.prototype.setItem;
                        originalSetItem.call(localStorage, localKey, jsonString);
                        
                        // Trigger storage event for other tabs
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: localKey,
                            newValue: jsonString,
                            url: window.location.href
                        }));
                    }
                }
            )
            .subscribe();
    }

    console.log('✅ Real-time sync active');
}

/**
 * Manual sync handler (for backward compatibility and force sync)
 */
async function manualSync() {
    if (!supabase) {
        console.warn('⚠️ Supabase not connected');
        return;
    }

    const indicator = document.getElementById('sync-status-indicator');
    
    if (indicator) {
        showSyncActivity('Đồng bộ toàn bộ...');
    }

    console.log('🔄 Force sync started...');
    
    try {
        // Push all local data to cloud
        for (const localKey of Object.keys(SYNC_KEYS)) {
            await pushToSupabase(localKey);
        }

        // Pull latest from cloud
        await pullFromSupabase();

        console.log('✅ Force sync complete!');
        
        if (indicator) {
            showSyncActivity('Hoàn tất đồng bộ');
        }
    } catch (error) {
        console.error('❌ Force sync failed:', error);
        
        if (indicator) {
            const text = indicator.querySelector('.sync-status-text');
            text.textContent = 'Lỗi đồng bộ';
            indicator.style.background = 'rgba(239, 68, 68, 0.95)';
            
            setTimeout(() => {
                text.textContent = 'Tự động đồng bộ';
                indicator.style.background = 'rgba(102, 126, 234, 0.95)';
            }, 3000);
        }
    }
}

// Export functions
window.SupabaseSync = {
    init: initSupabaseSync,
    push: pushToSupabase,
    pull: pullFromSupabase,
    manualSync: manualSync,
    isConnected: () => supabase !== null
};

/**
 * Auto-initialize on page load (with singleton protection)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check if already initialized by another script
    if (window._supabaseSyncInitialized) {
        // Silent skip - another module already initialized
        return;
    }
    
    console.log('🚀 Initializing Supabase auto-sync...');
    window._supabaseSyncInitialized = true;
    
    await initSupabaseSync();
    
    // Add sync status indicator instead of manual button
    addSyncStatusIndicator();
});

/**
 * Add a sync status indicator (auto-sync mode)
 */
function addSyncStatusIndicator() {
    // Skip if indicator already exists
    if (document.getElementById('sync-status-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'sync-status-indicator';
    indicator.className = 'sync-status-indicator';
    indicator.innerHTML = `
        <div class="sync-status-icon">☁️</div>
        <div class="sync-status-text">Tự động đồng bộ</div>
    `;
    indicator.title = 'Đang tự động đồng bộ với Cloud';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        border-radius: 20px;
        padding: 6px 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.3s ease;
        cursor: default;
        opacity: 0;
        pointer-events: none;
    `;
    
    // Icon styling
    const icon = indicator.querySelector('.sync-status-icon');
    icon.style.cssText = `
        font-size: 18px;
        animation: float 3s ease-in-out infinite;
    `;
    
    // Add floating animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        
        .sync-status-indicator:hover {
            opacity: 1 !important;
            transform: scale(1.05);
        }
        
        .sync-status-indicator.syncing {
            opacity: 1 !important;
            pointer-events: auto;
            background: rgba(76, 175, 80, 0.95);
        }
        
        .sync-status-indicator.show {
            opacity: 0.85 !important;
            pointer-events: auto;
        }
        
        .sync-status-indicator.syncing .sync-status-icon {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Hover to show more info
    indicator.addEventListener('mouseenter', () => {
        const text = indicator.querySelector('.sync-status-text');
        const lastSync = localStorage.getItem('last_sync_time');
        if (lastSync) {
            const time = new Date(lastSync).toLocaleTimeString('vi-VN');
            text.textContent = `Sync lần cuối: ${time}`;
        }
    });
    
    indicator.addEventListener('mouseleave', () => {
        const text = indicator.querySelector('.sync-status-text');
        text.textContent = 'Tự động đồng bộ';
    });
    
    document.body.appendChild(indicator);
    console.log('✅ Auto-sync status indicator added');
}

/**
 * Show sync activity on the indicator
 */
function showSyncActivity(message = 'Đang lưu...') {
    const indicator = document.getElementById('sync-status-indicator');
    if (!indicator) return;
    
    indicator.classList.add('syncing', 'show');
    const text = indicator.querySelector('.sync-status-text');
    text.textContent = message;
    
    setTimeout(() => {
        indicator.classList.remove('syncing');
        text.textContent = '✓ Đã lưu';
        localStorage.setItem('last_sync_time', new Date().toISOString());
        
        setTimeout(() => {
            indicator.classList.remove('show');
            text.textContent = 'Tự động đồng bộ';
        }, 1500);
    }, 800);
}
