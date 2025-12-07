-- ========================================
-- SUPABASE DATABASE SETUP
-- Tạo đầy đủ các bảng cho Management App
-- Version: 3.0 - Updated December 2025
-- Features: AE, AE-QT, Dashboard (Conversion/Withdraw), System, USDT, Notes, Staff Color Coding
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. AE DATA TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ae_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_data_user_id ON ae_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ae_data_updated_at ON ae_data(updated_at DESC);

-- ========================================
-- 2. AE-QT DATA TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ae_qt_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_qt_data_user_id ON ae_qt_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ae_qt_data_updated_at ON ae_qt_data(updated_at DESC);

-- ========================================
-- 3. HISTORY DATA TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS history_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_data_user_id ON history_data(user_id);
CREATE INDEX IF NOT EXISTS idx_history_data_updated_at ON history_data(updated_at DESC);

-- ========================================
-- 4. DASHBOARD CONVERSION TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS dashboard_conversion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_conversion_user_id ON dashboard_conversion(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_conversion_updated_at ON dashboard_conversion(updated_at DESC);

-- ========================================
-- 5. DASHBOARD WITHDRAW TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS dashboard_withdraw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_withdraw_user_id ON dashboard_withdraw(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_withdraw_updated_at ON dashboard_withdraw(updated_at DESC);

-- ========================================
-- 6. RATE SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS rate_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_settings_user_id ON rate_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_settings_updated_at ON rate_settings(updated_at DESC);

-- ========================================
-- 7. SYSTEM CATEGORIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS system_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    data JSONB,
    table_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_system_categories_user_id ON system_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_system_categories_category_id ON system_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_system_categories_updated_at ON system_categories(updated_at DESC);

-- ========================================
-- 8. TABLE ROW NOTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS table_row_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_row_notes_user_id ON table_row_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_table_row_notes_updated_at ON table_row_notes(updated_at DESC);

-- ========================================
-- 9. USDT DATA TABLE (Legacy - usdt.html)
-- ========================================
CREATE TABLE IF NOT EXISTS usdt_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usdt_data_user_id ON usdt_data(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_data_updated_at ON usdt_data(updated_at DESC);

-- ========================================
-- 10. USDT PURCHASE DATA TABLE (New - usdt-purchase.html)
-- ========================================
CREATE TABLE IF NOT EXISTS usdt_purchase_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usdt_purchase_data_user_id ON usdt_purchase_data(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_purchase_data_updated_at ON usdt_purchase_data(updated_at DESC);

-- ========================================
-- 11. STAFF LIST AE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS staff_list_ae (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_list_ae_user_id ON staff_list_ae(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_list_ae_updated_at ON staff_list_ae(updated_at DESC);

-- ========================================
-- 12. STAFF LIST AE-QT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS staff_list_aeqt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_list_aeqt_user_id ON staff_list_aeqt(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_list_aeqt_updated_at ON staff_list_aeqt(updated_at DESC);

-- ========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE ae_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae_qt_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_conversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_withdraw ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_row_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_purchase_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_list_ae ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_list_aeqt ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES (Allow all for simplicity - single user mode)
-- ========================================

-- ae_data policies
DROP POLICY IF EXISTS "Allow all access to ae_data" ON ae_data;
CREATE POLICY "Allow all access to ae_data" ON ae_data FOR ALL USING (true) WITH CHECK (true);

-- ae_qt_data policies
DROP POLICY IF EXISTS "Allow all access to ae_qt_data" ON ae_qt_data;
CREATE POLICY "Allow all access to ae_qt_data" ON ae_qt_data FOR ALL USING (true) WITH CHECK (true);

-- history_data policies
DROP POLICY IF EXISTS "Allow all access to history_data" ON history_data;
CREATE POLICY "Allow all access to history_data" ON history_data FOR ALL USING (true) WITH CHECK (true);

-- dashboard_conversion policies
DROP POLICY IF EXISTS "Allow all access to dashboard_conversion" ON dashboard_conversion;
CREATE POLICY "Allow all access to dashboard_conversion" ON dashboard_conversion FOR ALL USING (true) WITH CHECK (true);

-- dashboard_withdraw policies
DROP POLICY IF EXISTS "Allow all access to dashboard_withdraw" ON dashboard_withdraw;
CREATE POLICY "Allow all access to dashboard_withdraw" ON dashboard_withdraw FOR ALL USING (true) WITH CHECK (true);

-- rate_settings policies
DROP POLICY IF EXISTS "Allow all access to rate_settings" ON rate_settings;
CREATE POLICY "Allow all access to rate_settings" ON rate_settings FOR ALL USING (true) WITH CHECK (true);

-- system_categories policies
DROP POLICY IF EXISTS "Allow all access to system_categories" ON system_categories;
CREATE POLICY "Allow all access to system_categories" ON system_categories FOR ALL USING (true) WITH CHECK (true);
-- table_row_notes policies
DROP POLICY IF EXISTS "Allow all access to table_row_notes" ON table_row_notes;
CREATE POLICY "Allow all access to table_row_notes" ON table_row_notes FOR ALL USING (true) WITH CHECK (true);

-- usdt_data policies
DROP POLICY IF EXISTS "Allow all access to usdt_data" ON usdt_data;
CREATE POLICY "Allow all access to usdt_data" ON usdt_data FOR ALL USING (true) WITH CHECK (true);

-- usdt_purchase_data policies
DROP POLICY IF EXISTS "Allow all access to usdt_purchase_data" ON usdt_purchase_data;
CREATE POLICY "Allow all access to usdt_purchase_data" ON usdt_purchase_data FOR ALL USING (true) WITH CHECK (true);

-- staff_list_ae policies
DROP POLICY IF EXISTS "Allow all access to staff_list_ae" ON staff_list_ae;
CREATE POLICY "Allow all access to staff_list_ae" ON staff_list_ae FOR ALL USING (true) WITH CHECK (true);

-- staff_list_aeqt policies
DROP POLICY IF EXISTS "Allow all access to staff_list_aeqt" ON staff_list_aeqt;
CREATE POLICY "Allow all access to staff_list_aeqt" ON staff_list_aeqt FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- AUTO-UPDATE TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_ae_data_updated_at ON ae_data;
CREATE TRIGGER update_ae_data_updated_at
    BEFORE UPDATE ON ae_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ae_qt_data_updated_at ON ae_qt_data;
CREATE TRIGGER update_ae_qt_data_updated_at
    BEFORE UPDATE ON ae_qt_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_history_data_updated_at ON history_data;
CREATE TRIGGER update_history_data_updated_at
    BEFORE UPDATE ON history_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_conversion_updated_at ON dashboard_conversion;
CREATE TRIGGER update_dashboard_conversion_updated_at
    BEFORE UPDATE ON dashboard_conversion
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_withdraw_updated_at ON dashboard_withdraw;
CREATE TRIGGER update_dashboard_withdraw_updated_at
    BEFORE UPDATE ON dashboard_withdraw
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rate_settings_updated_at ON rate_settings;
CREATE TRIGGER update_rate_settings_updated_at
    BEFORE UPDATE ON rate_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_categories_updated_at ON system_categories;
CREATE TRIGGER update_system_categories_updated_at
    BEFORE UPDATE ON system_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_table_row_notes_updated_at ON table_row_notes;
CREATE TRIGGER update_table_row_notes_updated_at
    BEFORE UPDATE ON table_row_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usdt_data_updated_at ON usdt_data;
CREATE TRIGGER update_usdt_data_updated_at
    BEFORE UPDATE ON usdt_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usdt_purchase_data_updated_at ON usdt_purchase_data;
CREATE TRIGGER update_usdt_purchase_data_updated_at
    BEFORE UPDATE ON usdt_purchase_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_list_ae_updated_at ON staff_list_ae;
CREATE TRIGGER update_staff_list_ae_updated_at
    BEFORE UPDATE ON staff_list_ae
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_list_aeqt_updated_at ON staff_list_aeqt;
CREATE TRIGGER update_staff_list_aeqt_updated_at
    BEFORE UPDATE ON staff_list_aeqt
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check all tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'ae_data',
        'ae_qt_data',
        'history_data',
        'dashboard_conversion',
        'dashboard_withdraw',
        'rate_settings',
        'system_categories',
        'table_row_notes',
        'usdt_data',
        'usdt_purchase_data',
        'staff_list_ae',
        'staff_list_aeqt'
    )
ORDER BY tablename;

-- Count records in each table
SELECT 'ae_data' as table_name, COUNT(*) as records FROM ae_data
UNION ALL
SELECT 'ae_qt_data', COUNT(*) FROM ae_qt_data
UNION ALL
SELECT 'history_data', COUNT(*) FROM history_data
UNION ALL
SELECT 'dashboard_conversion', COUNT(*) FROM dashboard_conversion
UNION ALL
SELECT 'dashboard_withdraw', COUNT(*) FROM dashboard_withdraw
UNION ALL
SELECT 'rate_settings', COUNT(*) FROM rate_settings
UNION ALL
SELECT 'system_categories', COUNT(*) FROM system_categories
UNION ALL
SELECT 'table_row_notes', COUNT(*) FROM table_row_notes
UNION ALL
SELECT 'usdt_data', COUNT(*) FROM usdt_data
UNION ALL
SELECT 'usdt_purchase_data', COUNT(*) FROM usdt_purchase_data
UNION ALL
SELECT 'staff_list_ae', COUNT(*) FROM staff_list_ae
UNION ALL
SELECT 'staff_list_aeqt', COUNT(*) FROM staff_list_aeqt
ORDER BY table_name;

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- Run this script in Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project: lnvqggdovsnyguaoyxzc
-- 3. Go to SQL Editor
-- 4. Paste this entire script
-- 5. Click "Run"
-- 
-- All 12 tables will be created with:
-- - UUID primary keys
-- - user_id for multi-tenant support
-- - JSONB data storage for flexibility
-- - Timestamps (created_at, updated_at)
-- - Indexes for performance optimization
-- - Row Level Security (RLS) enabled
-- - Auto-update triggers for updated_at
-- 
-- localStorage Keys Mapped:
-- - AE_sheet → ae_data
-- - AEQT_sheet → ae_qt_data
-- - historyData → history_data
-- - dashboard_conversion → dashboard_conversion
-- - dashboard_withdraw → dashboard_withdraw
-- - rate_settings → rate_settings
-- - system_categories_* → system_categories
-- - table_row_notes → table_row_notes
-- - usdt_sheet → usdt_data
-- - usdtPurchaseData → usdt_purchase_data
-- - staffList_AE → staff_list_ae
-- - staffList_AEQT → staff_list_aeqt
-- 
-- Features Supported:
-- ✅ AE và AE-QT: Bảng chính với công thức tính toán tự động
-- ✅ Dashboard: Conversion (Đổi USDT) và Withdraw (Rút tiền)
-- ✅ System: Quản lý danh mục động
-- ✅ USDT: Mua bán USDT
-- ✅ Notes: Ghi chú cho từng dòng bảng (Ctrl+Click, Right-click)
-- ✅ Staff Color Coding: Tự động tô màu tên nhân viên
--    - Xanh dương: Nhân viên AE-QT
--    - Đỏ đậm: Nhân viên AE
-- ✅ Text Color Highlight: Tô màu chữ tùy chỉnh
-- ✅ Export Excel/CSV
-- ✅ Auto-sync with localStorage
-- ========================================
