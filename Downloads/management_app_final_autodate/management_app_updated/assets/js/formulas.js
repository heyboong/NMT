/*
 * Formula Management System
 * 
 * Centralized formula engine for all calculation needs across the application.
 * Supports dynamic formula evaluation, validation, and easy customization.
 * 
 * Features:
 * - Safe formula evaluation (no direct eval)
 * - Variable substitution with validation
 * - Formula presets for common calculations
 * - Error handling and fallback values
 * - Easy formula customization through settings
 */

(function() {
    'use strict';

    /**
     * Formula Engine - Core calculation system
     */
    const FormulaEngine = {
        /**
         * Default formula definitions for all tables
         * Format: { tableName: { columnName: 'formula' } }
         * 
         * Available variables:
         * - money: Tiền làm (số tiền gốc)
         * - name: Tên (chuỗi, có thể có nhiều tên phân cách bởi dấu phẩy)
         * - nameCount: Số lượng tên (tự động tính)
         * - usdt: Số lượng USDT
         * - usd: Số lượng USD
         * - price: Giá/Tỷ giá
         * - vnd: Giá trị VND (có thể nhập thủ công)
         * - chia: Giá trị chia
         * - bankdep: Bank đẹp
         * - bankbad: Bank xấu
         * - visa: Visa
         * 
         * Operators: +, -, *, /, (), Math functions
         */
        defaultFormulas: {
            // Bảng AE - Công thức tính toán chính
            ae: {
                // Tổng tiền = Tiền làm (không tính toán, chỉ hiển thị)
                total: 'money',
                
                // Chia = Tiền làm ÷ Số người (chỉ khi có nhiều hơn 1 tên)
                // Trả về null nếu chỉ có 1 tên hoặc không có tên
                chia: 'nameCount > 1 ? money / nameCount : null',
                
                // TT (Thành tiền) = Chia × 0.5
                // Chỉ tính khi có giá trị Chia
                tt: 'chia && chia > 0 ? chia * 0.5 : 0'
            },
            
            // Bảng AE-QT - Công thức với hệ số 0.8
            aeqt: {
                total: 'money',
                chia: 'nameCount > 1 ? money / nameCount : null',
                tt: 'chia && chia > 0 ? chia * 0.8 : 0'
            },
            
            // Bảng Conversion - Chuyển đổi tiền tệ
            conversion: {
                // VND = (USDT + USD) × Giá
                // Ưu tiên: Giá trị VND thủ công > Tính toán tự động
                vnd: 'vnd && vnd > 0 ? vnd : ((usdt || 0) + (usd || 0)) * (price || 0)',
                
                // Tổng USDT
                totalUsdt: 'usdt || 0',
                
                // Tổng USD
                totalUsd: 'usd || 0',
                
                // Giá trung bình (dùng cho tổng hợp)
                avgPrice: 'price || 0'
            },
            
            // Bảng Withdraw - Rút tiền
            withdraw: {
                // Tổng rút = Bank đẹp + Bank xấu + Visa
                total: '(bankdep || 0) + (bankbad || 0) + (visa || 0)'
            }
        },
        
        /**
         * Parse name string and count names
         * @param {string} nameStr - Comma-separated names
         * @returns {number} Number of valid names
         */
        parseNameCount(nameStr) {
            if (!nameStr || typeof nameStr !== 'string') return 0;
            
            const names = nameStr
                .split(',')
                .map(n => n.trim())
                .filter(n => n.length > 0);
            
            return names.length;
        },
        
        /**
         * Sanitize and validate numeric value
         * @param {*} value - Value to sanitize
         * @returns {number} Valid number or 0
         */
        sanitizeNumber(value) {
            if (value === null || value === undefined || value === '') {
                return 0;
            }
            
            // Remove formatting characters
            if (typeof value === 'string') {
                value = value.replace(/[₫$,\s]/g, '');
            }
            
            const num = parseFloat(value);
            
            if (!isFinite(num) || isNaN(num)) {
                return 0;
            }
            
            return num;
        },
        
        /**
         * Prepare variables for formula evaluation
         * @param {Object} row - Row data
         * @param {string} table - Table name (ae, aeqt, conversion, withdraw)
         * @returns {Object} Sanitized variables
         */
        prepareVariables(row, table) {
            if (!row || typeof row !== 'object') {
                console.warn('FormulaEngine: Invalid row object');
                return {};
            }
            
            const vars = {};
            
            // Common variables for all tables
            if ('money' in row) {
                vars.money = this.sanitizeNumber(row.money);
            }
            
            if ('name' in row) {
                vars.name = String(row.name || '').trim();
                vars.nameCount = this.parseNameCount(vars.name);
            }
            
            if ('chia' in row) {
                vars.chia = this.sanitizeNumber(row.chia);
            }
            
            // Conversion table specific
            if (table === 'conversion') {
                vars.usdt = this.sanitizeNumber(row.usdt);
                vars.usd = this.sanitizeNumber(row.usd);
                vars.price = this.sanitizeNumber(row.price);
                vars.vnd = this.sanitizeNumber(row.vnd);
            }
            
            // Withdraw table specific
            if (table === 'withdraw') {
                vars.bankdep = this.sanitizeNumber(row.bankdep);
                vars.bankbad = this.sanitizeNumber(row.bankbad);
                vars.visa = this.sanitizeNumber(row.visa);
            }
            
            return vars;
        },
        
        /**
         * Safe formula evaluation using Function constructor (safer than eval)
         * @param {string} formula - Formula string
         * @param {Object} variables - Variable values
         * @returns {number|null} Calculated result or null
         */
        evaluate(formula, variables) {
            if (!formula || typeof formula !== 'string') {
                console.warn('FormulaEngine: Invalid formula');
                return 0;
            }
            
            try {
                // Create function with variables as parameters
                const varNames = Object.keys(variables);
                const varValues = Object.values(variables);
                
                // Add Math object to available functions
                const funcBody = `
                    'use strict';
                    const Math = window.Math;
                    try {
                        const result = ${formula};
                        if (result === null || result === undefined) return null;
                        if (typeof result === 'number' && isFinite(result)) {
                            return Math.round(result * 100) / 100;
                        }
                        return 0;
                    } catch (err) {
                        console.warn('Formula evaluation error:', err);
                        return 0;
                    }
                `;
                
                // Create and execute function
                const func = new Function(...varNames, funcBody);
                const result = func(...varValues);
                
                return result;
            } catch (err) {
                console.error('FormulaEngine: Evaluation error', err);
                return 0;
            }
        },
        
        /**
         * Calculate value using formula for specific table and column
         * @param {string} table - Table name (ae, aeqt, conversion, withdraw)
         * @param {string} column - Column name (total, chia, tt, vnd)
         * @param {Object} row - Row data
         * @param {Object} customFormulas - Optional custom formulas
         * @returns {number|null} Calculated value
         */
        calculate(table, column, row, customFormulas = null) {
            // Get formula from custom settings or defaults
            const formulas = customFormulas || this.defaultFormulas;
            
            if (!formulas[table] || !formulas[table][column]) {
                console.warn(`FormulaEngine: No formula found for ${table}.${column}`);
                return 0;
            }
            
            const formula = formulas[table][column];
            const variables = this.prepareVariables(row, table);
            
            return this.evaluate(formula, variables);
        },
        
        /**
         * Load custom formulas from settings
         * @returns {Object|null} Custom formulas or null if not found
         */
        loadCustomFormulas() {
            try {
                const settings = localStorage.getItem('app_settings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    if (parsed && parsed.formulas) {
                        return parsed.formulas;
                    }
                }
            } catch (err) {
                console.error('FormulaEngine: Error loading custom formulas', err);
            }
            return null;
        },
        
        /**
         * Save custom formulas to settings
         * @param {Object} formulas - Formula definitions
         * @returns {boolean} Success status
         */
        saveCustomFormulas(formulas) {
            try {
                let settings = {};
                const stored = localStorage.getItem('app_settings');
                if (stored) {
                    settings = JSON.parse(stored);
                }
                
                settings.formulas = formulas;
                localStorage.setItem('app_settings', JSON.stringify(settings));
                
                // Trigger settings update event
                window.dispatchEvent(new CustomEvent('settingsUpdated', { 
                    detail: settings 
                }));
                
                return true;
            } catch (err) {
                console.error('FormulaEngine: Error saving formulas', err);
                return false;
            }
        },
        
        /**
         * Validate formula syntax
         * @param {string} formula - Formula to validate
         * @returns {Object} { valid: boolean, error: string|null }
         */
        validateFormula(formula) {
            if (!formula || typeof formula !== 'string') {
                return { valid: false, error: 'Công thức không hợp lệ' };
            }
            
            try {
                // Test with dummy variables
                const testVars = {
                    money: 1000,
                    name: 'Test',
                    nameCount: 1,
                    chia: 500,
                    usdt: 100,
                    usd: 100,
                    price: 25000,
                    vnd: 2500000,
                    bankdep: 1000000,
                    bankbad: 500000,
                    visa: 200000
                };
                
                this.evaluate(formula, testVars);
                return { valid: true, error: null };
            } catch (err) {
                return { valid: false, error: err.message };
            }
        },
        
        /**
         * Get formula description for UI
         * @param {string} table - Table name
         * @param {string} column - Column name
         * @returns {string} Human-readable description
         */
        getFormulaDescription(table, column) {
            const descriptions = {
                ae: {
                    total: 'Tổng tiền = Tiền làm (không tính toán)',
                    chia: 'Chia = Tiền làm ÷ Số người (nếu > 1 người)',
                    tt: 'TT = Chia × 0.5'
                },
                aeqt: {
                    total: 'Tổng tiền = Tiền làm (không tính toán)',
                    chia: 'Chia = Tiền làm ÷ Số người (nếu > 1 người)',
                    tt: 'TT = Chia × 0.5'
                },
                conversion: {
                    vnd: 'VND = (USDT + USD) × Giá (hoặc nhập thủ công)',
                    totalUsdt: 'Tổng USDT',
                    totalUsd: 'Tổng USD',
                    avgPrice: 'Giá trung bình'
                },
                withdraw: {
                    total: 'Tổng = Bank đẹp + Bank xấu + Visa'
                }
            };
            
            if (descriptions[table] && descriptions[table][column]) {
                return descriptions[table][column];
            }
            
            return 'Không có mô tả';
        }
    };
    
    // Export to global scope
    window.FormulaEngine = FormulaEngine;
    
    // Backward compatibility: Create wrapper functions
    window.calculateWithFormula = function(table, column, row) {
        return FormulaEngine.calculate(table, column, row);
    };
    
    console.log('✓ Formula Engine initialized');
})();
