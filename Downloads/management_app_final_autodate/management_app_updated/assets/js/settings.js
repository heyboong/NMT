/*
 * Settings management for the application
 * Handles currency, formula, and display configurations
 */

(function() {
    const SETTINGS_KEY = 'app_settings';
    
    // Default settings
    const DEFAULT_SETTINGS = {
        currency: {
            symbol: '₫',
            position: 'after',
            decimals: 0,
            separator: ',',
            decimalSeparator: '.'
        },
        crypto: {
            symbol: '$',
            position: 'after',
            decimals: 2
        },
        formulas: {
            ae: {
                total: 'money * 0.5',
                chia: 'money / (name || 2)'
            },
            aeqt: {
                total: 'money * 0.5',
                chia: 'money / (name || 2)'
            },
            conversion: {
                vnd: '(usdt + usd) * price',
                priority: true
            },
            withdraw: {
                total: 'bankdep + bankbad + visa'
            }
        },
        display: {
            rounding: 'round',
            showZero: true,
            negativeColor: '#d14c4c',
            editMode: 'raw',
            autoFormat: true
        },
        p2p: {
            adjustment: 11,
            spread: 0.3,
            manualBuyPrice: null,
            manualSellPrice: null
        }
    };

    // Load settings from localStorage
    function loadSettings() {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return mergeSettings(DEFAULT_SETTINGS, parsed);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    // Merge stored settings with defaults
    function mergeSettings(defaults, stored) {
        const result = JSON.parse(JSON.stringify(defaults));
        Object.keys(stored).forEach(key => {
            if (typeof stored[key] === 'object' && !Array.isArray(stored[key])) {
                result[key] = { ...result[key], ...stored[key] };
            } else {
                result[key] = stored[key];
            }
        });
        return result;
    }

    // Save settings to localStorage and broadcast changes
    function saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            
            // Broadcast settings update to other tabs/windows
            window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
            
            // Also update global APP_SETTINGS if it exists
            if (window.APP_SETTINGS) {
                window.APP_SETTINGS = settings;
            }
            
            return true;
        } catch (err) {
            console.error('Failed to save settings:', err);
            return false;
        }
    }

    // Load settings into form
    function populateForm(settings) {
        // Currency
        document.getElementById('currency-symbol').value = settings.currency.symbol;
        document.getElementById('currency-position').value = settings.currency.position;
        document.getElementById('currency-decimals').value = settings.currency.decimals;
        document.getElementById('currency-separator').value = settings.currency.separator;
        document.getElementById('currency-decimal-separator').value = settings.currency.decimalSeparator || '.';

        // Crypto
        document.getElementById('crypto-symbol').value = settings.crypto.symbol;
        document.getElementById('crypto-position').value = settings.crypto.position;
        document.getElementById('crypto-decimals').value = settings.crypto.decimals;

        // Formulas
        document.getElementById('formula-ae-total').value = settings.formulas.ae.total;
        document.getElementById('formula-ae-chia').value = settings.formulas.ae.chia;
        document.getElementById('formula-aeqt-total').value = settings.formulas.aeqt.total;
        document.getElementById('formula-aeqt-chia').value = settings.formulas.aeqt.chia;
        document.getElementById('formula-conv-vnd').value = settings.formulas.conversion.vnd;
        document.getElementById('formula-conv-priority').value = settings.formulas.conversion.priority.toString();
        document.getElementById('formula-withdraw-total').value = settings.formulas.withdraw.total;

        // Display
        document.getElementById('display-rounding').value = settings.display.rounding;
        document.getElementById('display-show-zero').value = settings.display.showZero.toString();
        document.getElementById('display-negative-color').value = settings.display.negativeColor;
        document.getElementById('display-edit-mode').value = settings.display.editMode;
        document.getElementById('display-auto-format').value = settings.display.autoFormat.toString();

        // P2P
        document.getElementById('p2p-adjustment').value = settings.p2p.adjustment;
        document.getElementById('p2p-spread').value = settings.p2p.spread;
        if (settings.p2p.manualBuyPrice) {
            document.getElementById('manual-buy-price').value = settings.p2p.manualBuyPrice;
        }
        if (settings.p2p.manualSellPrice) {
            document.getElementById('manual-sell-price').value = settings.p2p.manualSellPrice;
        }
    }

    // Collect settings from form with validation
    function collectSettings() {
        const currencyDecimals = parseInt(document.getElementById('currency-decimals').value, 10);
        const cryptoDecimals = parseInt(document.getElementById('crypto-decimals').value, 10);
        
        // Validate decimals range
        if (currencyDecimals < 0 || currencyDecimals > 4) {
            showStatus('⚠️ Số chữ số thập phân VND phải từ 0-4', 'error');
        }
        if (cryptoDecimals < 0 || cryptoDecimals > 8) {
            showStatus('⚠️ Số chữ số thập phân USD/USDT phải từ 0-8', 'error');
        }
        
        return {
            currency: {
                symbol: document.getElementById('currency-symbol').value || '₫',
                position: document.getElementById('currency-position').value,
                decimals: Math.max(0, Math.min(4, currencyDecimals)),
                separator: document.getElementById('currency-separator').value,
                decimalSeparator: document.getElementById('currency-decimal-separator').value || '.'
            },
            crypto: {
                symbol: document.getElementById('crypto-symbol').value || '$',
                position: document.getElementById('crypto-position').value,
                decimals: Math.max(0, Math.min(8, cryptoDecimals))
            },
            formulas: {
                ae: {
                    total: document.getElementById('formula-ae-total').value,
                    chia: document.getElementById('formula-ae-chia').value
                },
                aeqt: {
                    total: document.getElementById('formula-aeqt-total').value,
                    chia: document.getElementById('formula-aeqt-chia').value
                },
                conversion: {
                    vnd: document.getElementById('formula-conv-vnd').value,
                    priority: document.getElementById('formula-conv-priority').value === 'true'
                },
                withdraw: {
                    total: document.getElementById('formula-withdraw-total').value
                }
            },
            display: {
                rounding: document.getElementById('display-rounding').value,
                showZero: document.getElementById('display-show-zero').value === 'true',
                negativeColor: document.getElementById('display-negative-color').value,
                editMode: document.getElementById('display-edit-mode').value,
                autoFormat: document.getElementById('display-auto-format').value === 'true'
            },
            p2p: {
                adjustment: parseFloat(document.getElementById('p2p-adjustment').value),
                spread: parseFloat(document.getElementById('p2p-spread').value),
                manualBuyPrice: parseFloat(document.getElementById('manual-buy-price').value) || null,
                manualSellPrice: parseFloat(document.getElementById('manual-sell-price').value) || null
            }
        };
    }

    // Show status message
    function showStatus(message, type = 'success', duration = 3000) {
        const statusEl = document.getElementById('settings-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `settings-status settings-status-${type}`;
        statusEl.style.display = 'block';
        
        // Clear previous timeout if any
        if (statusEl.timeout) {
            clearTimeout(statusEl.timeout);
        }
        
        statusEl.timeout = setTimeout(() => {
            statusEl.style.display = 'none';
        }, duration);
    }

    // Update preview
    function updatePreview() {
        const settings = collectSettings();
        
        // Preview integer
        const integerValue = 1000000;
        const formattedInteger = formatNumber(integerValue, settings.currency);
        document.getElementById('preview-integer').textContent = formattedInteger;
        
        // Preview decimal
        const decimalValue = 1234.56;
        const formattedDecimal = formatNumber(decimalValue, { ...settings.currency, decimals: 2 });
        document.getElementById('preview-decimal').textContent = formattedDecimal;
        
        // Preview crypto
        const cryptoValue = 100.25;
        const formattedCrypto = formatNumber(cryptoValue, settings.crypto);
        document.getElementById('preview-crypto').textContent = formattedCrypto;
        
        // Preview negative
        const negativeValue = -500;
        const formattedNegative = formatNumber(negativeValue, settings.currency);
        const previewNegative = document.getElementById('preview-negative');
        previewNegative.textContent = formattedNegative;
        previewNegative.style.color = settings.display.negativeColor;
        
        // Preview large
        const largeValue = 123456789;
        const formattedLarge = formatNumber(largeValue, settings.currency);
        document.getElementById('preview-large').textContent = formattedLarge;
        
        // Preview small
        const smallValue = 0.0125;
        const formattedSmall = formatNumber(smallValue, { ...settings.crypto, decimals: 4 });
        document.getElementById('preview-small').textContent = formattedSmall;
        
        // Update color preview
        if (document.getElementById('color-preview')) {
            document.getElementById('color-preview').textContent = settings.display.negativeColor;
        }
    }
    
    // Format number helper
    function formatNumber(value, config) {
        const absValue = Math.abs(value);
        const parts = absValue.toFixed(config.decimals).split('.');
        let intPart = parts[0];
        
        // Add thousand separator
        if (config.separator) {
            intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.separator);
        }
        
        let result = parts.length > 1 ? intPart + '.' + parts[1] : intPart;
        
        if (config.position === 'before') {
            result = config.symbol + result;
        } else {
            result = result + config.symbol;
        }
        
        return value < 0 ? '-' + result : result;
    }
    
    // Tab switching
    function initTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const contents = document.querySelectorAll('.settings-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update contents
                contents.forEach(c => c.classList.remove('active'));
                const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }
    
    // Search functionality
    function initSearch() {
        const searchInput = document.getElementById('settings-search');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.settings-card');
            
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(query)) {
                    card.style.display = '';
                    card.style.animation = 'fadeIn 0.3s';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Quick action buttons
    function initQuickActions() {
        // Template buttons
        document.getElementById('template-vn-standard')?.addEventListener('click', () => {
            document.getElementById('currency-symbol').value = '₫';
            document.getElementById('currency-position').value = 'after';
            document.getElementById('currency-decimals').value = '0';
            document.getElementById('currency-separator').value = ',';
            document.getElementById('currency-decimal-separator').value = '.';
            document.getElementById('crypto-symbol').value = '$';
            document.getElementById('crypto-position').value = 'before';
            document.getElementById('crypto-decimals').value = '2';
            updatePreview();
            showStatus('✅ Đã áp dụng mẫu Việt Nam Chuẩn', 'success', 2000);
        });
        
        document.getElementById('template-vn-accounting')?.addEventListener('click', () => {
            document.getElementById('currency-symbol').value = 'VND';
            document.getElementById('currency-position').value = 'after';
            document.getElementById('currency-decimals').value = '0';
            document.getElementById('currency-separator').value = '.';
            document.getElementById('currency-decimal-separator').value = ',';
            document.getElementById('crypto-symbol').value = 'USD';
            document.getElementById('crypto-position').value = 'after';
            document.getElementById('crypto-decimals').value = '2';
            updatePreview();
            showStatus('✅ Đã áp dụng mẫu Kế Toán VN', 'success', 2000);
        });
        
        document.getElementById('template-international')?.addEventListener('click', () => {
            document.getElementById('currency-symbol').value = '₫';
            document.getElementById('currency-position').value = 'after';
            document.getElementById('currency-decimals').value = '2';
            document.getElementById('currency-separator').value = ',';
            document.getElementById('currency-decimal-separator').value = '.';
            document.getElementById('crypto-symbol').value = '$';
            document.getElementById('crypto-position').value = 'before';
            document.getElementById('crypto-decimals').value = '2';
            updatePreview();
            showStatus('✅ Đã áp dụng mẫu Quốc Tế', 'success', 2000);
        });
        
        document.getElementById('template-crypto')?.addEventListener('click', () => {
            document.getElementById('currency-symbol').value = '₫';
            document.getElementById('currency-position').value = 'after';
            document.getElementById('currency-decimals').value = '0';
            document.getElementById('currency-separator').value = ',';
            document.getElementById('currency-decimal-separator').value = '.';
            document.getElementById('crypto-symbol').value = '₮';
            document.getElementById('crypto-position').value = 'after';
            document.getElementById('crypto-decimals').value = '4';
            updatePreview();
            showStatus('✅ Đã áp dụng mẫu Crypto', 'success', 2000);
        });
        
        // USD Standard
        document.getElementById('quick-usd')?.addEventListener('click', () => {
            document.getElementById('crypto-symbol').value = '$';
            document.getElementById('crypto-position').value = 'before';
            document.getElementById('crypto-decimals').value = '2';
            updatePreview();
        });
        
        // USDT
        document.getElementById('quick-usdt')?.addEventListener('click', () => {
            document.getElementById('crypto-symbol').value = '₮';
            document.getElementById('crypto-position').value = 'after';
            document.getElementById('crypto-decimals').value = '2';
            updatePreview();
        });
        
        // Formula test buttons
        document.getElementById('test-ae-formula')?.addEventListener('click', () => {
            const money = parseFloat(document.getElementById('test-ae-money').value);
            if (!money) {
                document.getElementById('test-ae-result').innerHTML = '<span style="color: red;">⚠️ Vui lòng nhập số tiền</span>';
                return;
            }
            
            const formula = document.getElementById('formula-ae-total').value;
            try {
                const result = evaluateFormula(formula, { money });
                const settings = collectSettings();
                const formatted = formatNumber(result, settings.currency);
                document.getElementById('test-ae-result').innerHTML = `<span style="color: green;">✅ Kết quả: ${formatted}</span>`;
            } catch (err) {
                document.getElementById('test-ae-result').innerHTML = `<span style="color: red;">❌ Lỗi: ${err.message}</span>`;
            }
        });
        
        document.getElementById('test-aeqt-formula')?.addEventListener('click', () => {
            const money = parseFloat(document.getElementById('test-aeqt-money').value);
            if (!money) {
                document.getElementById('test-aeqt-result').innerHTML = '<span style="color: red;">⚠️ Vui lòng nhập số tiền</span>';
                return;
            }
            
            const formula = document.getElementById('formula-aeqt-total').value;
            try {
                const result = evaluateFormula(formula, { money });
                const settings = collectSettings();
                const formatted = formatNumber(result, settings.currency);
                document.getElementById('test-aeqt-result').innerHTML = `<span style="color: green;">✅ Kết quả: ${formatted}</span>`;
            } catch (err) {
                document.getElementById('test-aeqt-result').innerHTML = `<span style="color: red;">❌ Lỗi: ${err.message}</span>`;
            }
        });
        
        document.getElementById('test-conv-formula')?.addEventListener('click', () => {
            const usdt = parseFloat(document.getElementById('test-conv-usdt').value) || 0;
            const usd = parseFloat(document.getElementById('test-conv-usd').value) || 0;
            const price = parseFloat(document.getElementById('test-conv-price').value);
            
            if (!price) {
                document.getElementById('test-conv-result').innerHTML = '<span style="color: red;">⚠️ Vui lòng nhập giá</span>';
                return;
            }
            
            const formula = document.getElementById('formula-conv-vnd').value;
            try {
                const result = evaluateFormula(formula, { usdt, usd, price });
                const settings = collectSettings();
                const formatted = formatNumber(result, settings.currency);
                document.getElementById('test-conv-result').innerHTML = `<span style="color: green;">✅ Kết quả: ${formatted}</span>`;
            } catch (err) {
                document.getElementById('test-conv-result').innerHTML = `<span style="color: red;">❌ Lỗi: ${err.message}</span>`;
            }
        });
        
        document.getElementById('test-withdraw-formula')?.addEventListener('click', () => {
            const bankdep = parseFloat(document.getElementById('test-withdraw-bankdep').value) || 0;
            const bankbad = parseFloat(document.getElementById('test-withdraw-bankbad').value) || 0;
            const visa = parseFloat(document.getElementById('test-withdraw-visa').value) || 0;
            
            const formula = document.getElementById('formula-withdraw-total').value;
            try {
                const result = evaluateFormula(formula, { bankdep, bankbad, visa });
                const settings = collectSettings();
                const formatted = formatNumber(result, settings.currency);
                document.getElementById('test-withdraw-result').innerHTML = `<span style="color: green;">✅ Kết quả: ${formatted}</span>`;
            } catch (err) {
                document.getElementById('test-withdraw-result').innerHTML = `<span style="color: red;">❌ Lỗi: ${err.message}</span>`;
            }
        });
        
        // Formula quick actions
        document.querySelectorAll('[data-formula]').forEach(btn => {
            btn.addEventListener('click', () => {
                const formula = btn.dataset.formula;
                const value = btn.dataset.value;
                document.getElementById(`formula-${formula}`).value = value;
            });
        });
        
        // Color preview
        document.getElementById('display-negative-color')?.addEventListener('input', (e) => {
            if (document.getElementById('color-preview')) {
                document.getElementById('color-preview').textContent = e.target.value;
            }
            updatePreview();
        });
        
        // Clear cache
        document.getElementById('clear-cache')?.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa tất cả bộ nhớ cache? Thao tác này không thể hoàn tác!')) {
                const keysToKeep = [SETTINGS_KEY, 'rate-settings'];
                Object.keys(localStorage).forEach(key => {
                    if (!keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                    }
                });
                showStatus('🗑️ Đã xóa bộ nhớ cache thành công!', 'success');
            }
        });
    }
    
    // Evaluate formula helper
    function evaluateFormula(formula, variables) {
        // Create safe evaluation context
        const context = { ...variables };
        
        // Replace variable names in formula
        let evalStr = formula;
        Object.keys(context).forEach(key => {
            const regex = new RegExp('\\b' + key + '\\b', 'g');
            evalStr = evalStr.replace(regex, context[key]);
        });
        
        // Safe evaluation
        try {
            // eslint-disable-next-line no-new-func
            return new Function('return ' + evalStr)();
        } catch (err) {
            throw new Error('Công thức không hợp lệ');
        }
    }
    
    // Real-time preview update
    function initRealtimePreview() {
        const previewInputs = [
            'currency-symbol', 'currency-position', 'currency-decimals', 'currency-separator', 'currency-decimal-separator',
            'crypto-symbol', 'crypto-position', 'crypto-decimals', 'display-negative-color'
        ];
        
        previewInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', updatePreview);
                input.addEventListener('change', updatePreview);
            }
        });
    }
    
    // Auto-save with debounce
    let autoSaveTimeout;
    function autoSaveSettings() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            const newSettings = collectSettings();
            if (saveSettings(newSettings)) {
                showStatus('💾 Đã tự động lưu', 'success', 1500);
            }
        }, 1000);
    }
    
    function initAutoSave() {
        const allInputs = document.querySelectorAll('.settings-tab-content input, .settings-tab-content select');
        allInputs.forEach(input => {
            input.addEventListener('input', autoSaveSettings);
            input.addEventListener('change', autoSaveSettings);
        });
    }
    
    // Formula Builder
    function initFormulaBuilder() {
        const builderTable = document.getElementById('builder-table');
        const builderField = document.getElementById('builder-field');
        const builderFormula = document.getElementById('builder-formula');
        const builderValidation = document.getElementById('builder-validation');
        const builderVariables = document.getElementById('builder-variables');
        const builderTestArea = document.getElementById('builder-test-area');
        const builderTestInputs = document.getElementById('builder-test-inputs');
        const builderTestResult = document.getElementById('builder-test-result');
        const builderPreview = document.getElementById('builder-preview-result');
        const previewStatus = document.getElementById('preview-status');
        const builderCharCount = document.getElementById('builder-char-count');
        const builderVariableSearch = document.getElementById('builder-variable-search');
        const builderVariableCount = document.getElementById('builder-variable-count');
        
        // Undo/Redo stacks
        let undoStack = [];
        let redoStack = [];
        let currentFormula = '';
        
        // History management
        const HISTORY_KEY = 'formula_builder_history';
        let formulaHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        
        function saveToHistory(formula, context) {
            if (!formula.trim()) return;
            
            const historyItem = {
                formula: formula,
                context: context,
                timestamp: new Date().toISOString(),
                table: builderTable.value,
                field: builderField.value
            };
            
            // Remove duplicates
            formulaHistory = formulaHistory.filter(h => h.formula !== formula);
            formulaHistory.unshift(historyItem);
            
            // Keep only last 20
            if (formulaHistory.length > 20) {
                formulaHistory = formulaHistory.slice(0, 20);
            }
            
            localStorage.setItem(HISTORY_KEY, JSON.stringify(formulaHistory));
        }
        
        function renderHistory() {
            const panel = document.getElementById('builder-history-panel');
            const list = document.getElementById('builder-history-list');
            
            if (formulaHistory.length === 0) {
                list.innerHTML = '<div style="text-align: center; color: #9ca3af; font-size: 12px; padding: 20px;">Chưa có lịch sử</div>';
                return;
            }
            
            list.innerHTML = formulaHistory.map((item, index) => {
                const date = new Date(item.timestamp);
                const timeStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                return `
                    <div class="history-item" data-index="${index}" style="padding: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                            <span style="font-size: 11px; color: #6b7280;">${timeStr} • ${item.table} - ${item.field}</span>
                            <button type="button" class="history-delete" data-index="${index}" style="padding: 2px 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 3px; font-size: 10px; cursor: pointer;">×</button>
                        </div>
                        <code style="font-size: 12px; color: #667eea; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.formula}</code>
                    </div>
                `;
            }).join('');
            
            // Add event listeners
            document.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.classList.contains('history-delete')) return;
                    const index = parseInt(item.dataset.index);
                    builderFormula.value = formulaHistory[index].formula;
                    validateFormula();
                    updateLivePreview();
                    panel.style.display = 'none';
                    showStatus('📋 Đã tải công thức từ lịch sử', 'success', 2000);
                });
            });
            
            document.querySelectorAll('.history-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    formulaHistory.splice(index, 1);
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(formulaHistory));
                    renderHistory();
                });
            });
        }
        
        // Variable definitions for each context
        const variablesByContext = {
            ae: {
                total: ['money', 'name', 'chia', 'khoa'],
                chia: ['money', 'name', 'khoa']
            },
            aeqt: {
                total: ['money', 'name', 'chia', 'khoa'],
                chia: ['money', 'name', 'khoa']
            },
            conversion: {
                vnd: ['usdt', 'usd', 'price', 'vnd']
            },
            withdraw: {
                total: ['bankdep', 'bankbad', 'visa']
            }
        };
        
        const variableLabels = {
            money: '💰 Tiền làm',
            name: '👤 Tên',
            chia: '➗ Chia',
            khoa: '🔒 Khóa',
            usdt: '₮ USDT',
            usd: '$ USD',
            price: '💱 Giá',
            vnd: '₫ VND',
            bankdep: '🏦 Bank đẹp',
            bankbad: '🏧 Bank xấu',
            visa: '💳 Visa'
        };
        
        const variableDescriptions = {
            money: 'Số tiền làm việc (VND)',
            name: 'Chuỗi tên người',
            chia: 'Giá trị chia',
            khoa: 'Giá trị khóa',
            usdt: 'Số lượng USDT',
            usd: 'Số lượng USD',
            price: 'Giá quy đổi',
            vnd: 'Số tiền VND',
            bankdep: 'Số tiền Bank đẹp',
            bankbad: 'Số tiền Bank xấu',
            visa: 'Số tiền Visa'
        };
        
        // Update available variables based on context
        function updateBuilderVariables(searchTerm = '') {
            const table = builderTable.value;
            const field = builderField.value;
            const context = variablesByContext[table];
            
            if (!context) return;
            
            let variables = context[field] || [];
            
            // Filter by search term
            if (searchTerm) {
                variables = variables.filter(v => 
                    v.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    variableLabels[v].toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            builderVariableCount.textContent = `${variables.length} biến`;
            builderVariables.innerHTML = '';
            
            variables.forEach(varName => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'builder-variable';
                btn.innerHTML = variableLabels[varName] || varName;
                btn.dataset.var = varName;
                btn.title = variableDescriptions[varName] || varName;
                btn.style.cssText = 'padding: 8px 14px; background: rgba(255,255,255,0.9); color: #374151; border: 2px solid rgba(255,255,255,0.5); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.3s;';
                
                btn.addEventListener('click', () => {
                    insertAtCursor(builderFormula, varName);
                    pushToUndoStack();
                    validateFormula();
                    updateLivePreview();
                    updateCharCount();
                });
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#667eea';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#667eea';
                    btn.style.transform = 'translateY(-3px) scale(1.05)';
                    btn.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(255,255,255,0.9)';
                    btn.style.color = '#374151';
                    btn.style.borderColor = 'rgba(255,255,255,0.5)';
                    btn.style.transform = 'translateY(0) scale(1)';
                    btn.style.boxShadow = 'none';
                });
                
                builderVariables.appendChild(btn);
            });
        }
        
        // Update field options based on table
        function updateBuilderFields() {
            const table = builderTable.value;
            builderField.innerHTML = '';
            
            if (table === 'ae' || table === 'aeqt') {
                builderField.innerHTML = '<option value="total">💰 Tổng tiền</option><option value="chia">➗ Chia</option>';
            } else if (table === 'conversion') {
                builderField.innerHTML = '<option value="vnd">₫ VND</option>';
            } else if (table === 'withdraw') {
                builderField.innerHTML = '<option value="total">💵 Tổng</option>';
            }
            
            updateBuilderVariables();
            loadCurrentFormula();
        }
        
        // Load current formula into builder
        function loadCurrentFormula() {
            const table = builderTable.value;
            const field = builderField.value;
            
            let inputId = '';
            if (table === 'ae') {
                inputId = field === 'total' ? 'formula-ae-total' : 'formula-ae-chia';
            } else if (table === 'aeqt') {
                inputId = field === 'total' ? 'formula-aeqt-total' : 'formula-aeqt-chia';
            } else if (table === 'conversion') {
                inputId = 'formula-conv-vnd';
            } else if (table === 'withdraw') {
                inputId = 'formula-withdraw-total';
            }
            
            const input = document.getElementById(inputId);
            if (input) {
                builderFormula.value = input.value || '';
                currentFormula = builderFormula.value;
                undoStack = [];
                redoStack = [];
                validateFormula();
                updateLivePreview();
                updateCharCount();
            }
        }
        
        // Insert text at cursor position
        function insertAtCursor(textarea, text) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            
            textarea.value = value.substring(0, start) + text + value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.focus();
        }
        
        // Undo/Redo management
        function pushToUndoStack() {
            if (builderFormula.value !== currentFormula) {
                undoStack.push(currentFormula);
                redoStack = [];
                currentFormula = builderFormula.value;
                
                // Limit stack size
                if (undoStack.length > 50) {
                    undoStack.shift();
                }
            }
        }
        
        function undo() {
            if (undoStack.length > 0) {
                redoStack.push(currentFormula);
                currentFormula = undoStack.pop();
                builderFormula.value = currentFormula;
                validateFormula();
                updateLivePreview();
                updateCharCount();
                showStatus('↶ Đã hoàn tác', 'success', 1000);
            }
        }
        
        function redo() {
            if (redoStack.length > 0) {
                undoStack.push(currentFormula);
                currentFormula = redoStack.pop();
                builderFormula.value = currentFormula;
                validateFormula();
                updateLivePreview();
                updateCharCount();
                showStatus('↷ Đã làm lại', 'success', 1000);
            }
        }
        
        // Character count with complexity indicator
        function updateCharCount() {
            const count = builderFormula.value.length;
            const formula = builderFormula.value;
            
            // Update character count
            builderCharCount.textContent = `${count} ký tự`;
            if (count > 200) {
                builderCharCount.style.color = '#fbbf24';
            } else {
                builderCharCount.style.color = 'rgba(255,255,255,0.8)';
            }
            
            // Update complexity indicator
            const complexityIndicator = document.getElementById('builder-complexity');
            if (complexityIndicator) {
                let complexity = 'Đơn giản';
                let color = '#10b981';
                
                const operators = (formula.match(/[+\-*\/%]/g) || []).length;
                const parentheses = (formula.match(/[()]/g) || []).length;
                const variables = (formula.match(/[a-z]+/gi) || []).length;
                
                const score = operators + parentheses * 2 + variables;
                
                if (score > 15) {
                    complexity = 'Phức tạp';
                    color = '#ef4444';
                } else if (score > 8) {
                    complexity = 'Trung bình';
                    color = '#f59e0b';
                }
                
                complexityIndicator.textContent = `Độ phức tạp: ${complexity}`;
                complexityIndicator.style.background = color;
            }
        }
        
        // Live preview with sample data
        function updateLivePreview() {
            const formula = builderFormula.value.trim();
            
            if (!formula) {
                builderPreview.innerHTML = '<span style=\"color: #9ca3af; font-style: italic;\">Nhập công thức để xem kết quả...</span>';
                previewStatus.innerHTML = '⏳ Chờ nhập...';
                previewStatus.style.background = 'rgba(255,255,255,0.3)';
                return;
            }
            
            try {
                // Sample data for preview
                const sampleData = {
                    money: 1000000,
                    name: 'An, Bình',
                    chia: 500000,
                    khoa: 1,
                    usdt: 100,
                    usd: 50,
                    price: 25000,
                    vnd: 3750000,
                    bankdep: 2000000,
                    bankbad: 1000000,
                    visa: 750000
                };
                
                const result = evaluateFormula(formula, sampleData);
                const settings = collectSettings();
                const formatted = formatNumber(result, settings.currency);
                
                builderPreview.innerHTML = `
                    <div style=\"display: flex; justify-content: space-between; align-items: center;\">
                        <div>
                            <div style=\"font-size: 11px; color: #6b7280; margin-bottom: 4px;\">Kết quả với dữ liệu mẫu:</div>
                            <div style=\"font-size: 20px; font-weight: 700; color: #10b981;\">${formatted}</div>
                        </div>
                        <div style=\"text-align: right; font-size: 10px; color: #9ca3af;\">
                            <div>money: 1,000,000</div>
                            <div>usdt: 100 | usd: 50</div>
                            <div>price: 25,000</div>
                        </div>
                    </div>
                `;
                
                previewStatus.innerHTML = '✅ Hợp lệ';
                previewStatus.style.background = '#10b981';
                previewStatus.style.color = 'white';
            } catch (err) {
                builderPreview.innerHTML = `<div style=\"color: #ef4444;\">❌ ${err.message}</div>`;
                previewStatus.innerHTML = '❌ Lỗi';
                previewStatus.style.background = '#ef4444';
                previewStatus.style.color = 'white';
            }
        }
        
        // Validate formula
        function validateFormula() {
            const formula = builderFormula.value.trim();
            
            if (!formula) {
                builderValidation.style.display = 'none';
                return;
            }
            
            try {
                // Basic syntax check
                const testVars = { money: 100, name: 'test', chia: 50, khoa: 1, usdt: 100, usd: 50, price: 25000, vnd: 1000000, bankdep: 500000, bankbad: 300000, visa: 200000 };
                evaluateFormula(formula, testVars);
                
                builderValidation.style.display = 'block';
                builderValidation.style.background = 'rgba(16, 185, 129, 0.2)';
                builderValidation.style.color = '#065f46';
                builderValidation.style.border = '2px solid #10b981';
                builderValidation.innerHTML = '✅ Công thức hợp lệ! Sẵn sàng áp dụng.';
            } catch (err) {
                builderValidation.style.display = 'block';
                builderValidation.style.background = 'rgba(239, 68, 68, 0.2)';
                builderValidation.style.color = '#991b1b';
                builderValidation.style.border = '2px solid #ef4444';
                builderValidation.innerHTML = `❌ Lỗi: ${err.message}`;
            }
        }
        
        // Apply formula
        document.getElementById('builder-apply')?.addEventListener('click', () => {
            const table = builderTable.value;
            const field = builderField.value;
            const formula = builderFormula.value.trim();
            
            if (!formula) {
                showStatus('⚠️ Vui lòng nhập công thức!', 'error');
                return;
            }
            
            // Validate first
            try {
                const testVars = { money: 100, name: 'test', chia: 50, khoa: 1, usdt: 100, usd: 50, price: 25000, vnd: 1000000, bankdep: 500000, bankbad: 300000, visa: 200000 };
                evaluateFormula(formula, testVars);
            } catch (err) {
                showStatus('❌ Công thức không hợp lệ: ' + err.message, 'error');
                return;
            }
            
            // Apply to target input
            let inputId = '';
            if (table === 'ae') {
                inputId = field === 'total' ? 'formula-ae-total' : 'formula-ae-chia';
            } else if (table === 'aeqt') {
                inputId = field === 'total' ? 'formula-aeqt-total' : 'formula-aeqt-chia';
            } else if (table === 'conversion') {
                inputId = 'formula-conv-vnd';
            } else if (table === 'withdraw') {
                inputId = 'formula-withdraw-total';
            }
            
            const input = document.getElementById(inputId);
            if (input) {
                input.value = formula;
                showStatus('✅ Đã áp dụng công thức!', 'success');
                autoSaveSettings();
            }
        });
        
        // Test formula
        document.getElementById('builder-test')?.addEventListener('click', () => {
            const table = builderTable.value;
            const field = builderField.value;
            const formula = builderFormula.value.trim();
            
            if (!formula) {
                showStatus('⚠️ Vui lòng nhập công thức!', 'error');
                return;
            }
            
            // Show test area
            builderTestArea.style.display = 'block';
            
            // Generate test inputs based on context
            const context = variablesByContext[table];
            if (!context) return;
            
            const variables = context[field] || [];
            builderTestInputs.innerHTML = '';
            
            variables.forEach(varName => {
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `builder-test-${varName}`;
                input.placeholder = variableLabels[varName] || varName;
                input.step = '0.01';
                input.style.cssText = 'flex: 1; padding: 8px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.3);';
                builderTestInputs.appendChild(input);
            });
            
            // Add test button
            const testBtn = document.createElement('button');
            testBtn.type = 'button';
            testBtn.textContent = '🧪 Tính';
            testBtn.style.cssText = 'padding: 8px 20px; background: #10b981; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;';
            testBtn.addEventListener('click', () => {
                const testVars = {};
                variables.forEach(varName => {
                    const input = document.getElementById(`builder-test-${varName}`);
                    testVars[varName] = parseFloat(input.value) || 0;
                });
                
                try {
                    const result = evaluateFormula(formula, testVars);
                    const settings = collectSettings();
                    const formatted = formatNumber(result, settings.currency);
                    builderTestResult.innerHTML = `<span style=\"color: #065f46; font-size: 16px;\">✅ Kết quả: <strong>${formatted}</strong></span>`;
                } catch (err) {
                    builderTestResult.innerHTML = `<span style=\"color: #991b1b;\">❌ Lỗi: ${err.message}</span>`;
                }
            });
            builderTestInputs.appendChild(testBtn);
            
            builderTestResult.innerHTML = '<span style=\"color: #6b7280;\">Nhập dữ liệu test và nhấn Tính</span>';
        });
        
        // Clear builder
        document.getElementById('builder-clear')?.addEventListener('click', () => {
            builderFormula.value = '';
            builderValidation.style.display = 'none';
            builderTestArea.style.display = 'none';
            builderPreview.innerHTML = '<span style=\"color: #9ca3af; font-style: italic;\">Nhập công thức để xem kết quả...</span>';
            previewStatus.innerHTML = '⏳ Chờ nhập...';
            previewStatus.style.background = 'rgba(255,255,255,0.3)';
            updateCharCount();
        });
        
        // Undo/Redo buttons
        document.getElementById('builder-undo')?.addEventListener('click', undo);
        document.getElementById('builder-redo')?.addEventListener('click', redo);
        
        // Copy/Paste buttons
        document.getElementById('builder-copy')?.addEventListener('click', () => {
            const formula = builderFormula.value;
            if (!formula) {
                showStatus('⚠️ Không có công thức để copy', 'error', 2000);
                return;
            }
            navigator.clipboard.writeText(formula).then(() => {
                showStatus('📋 Đã copy công thức', 'success', 2000);
            });
        });
        
        document.getElementById('builder-paste')?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    builderFormula.value = text;
                    pushToUndoStack();
                    validateFormula();
                    updateLivePreview();
                    updateCharCount();
                    showStatus('📄 Đã paste công thức', 'success', 2000);
                }
            } catch (err) {
                showStatus('❌ Không thể paste', 'error', 2000);
            }
        });
        
        // Help button
        document.getElementById('builder-help')?.addEventListener('click', () => {
            const panel = document.getElementById('builder-help-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        // History button
        document.getElementById('builder-history')?.addEventListener('click', () => {
            const panel = document.getElementById('builder-history-panel');
            renderHistory();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Clear history
        document.getElementById('builder-history-clear')?.addEventListener('click', () => {
            if (confirm('Xóa toàn bộ lịch sử công thức?')) {
                formulaHistory = [];
                localStorage.removeItem(HISTORY_KEY);
                renderHistory();
                showStatus('🗑️ Đã xóa lịch sử', 'success', 2000);
            }
        });
        
        // Variable search
        builderVariableSearch?.addEventListener('input', (e) => {
            updateBuilderVariables(e.target.value);
        });
        
        // Keyboard shortcuts
        builderFormula?.addEventListener('keydown', (e) => {
            // Ctrl+Enter: Apply
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('builder-apply').click();
            }
            // Ctrl+Space: Test
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                document.getElementById('builder-test').click();
            }
            // Escape: Clear
            if (e.key === 'Escape') {
                e.preventDefault();
                document.getElementById('builder-clear').click();
            }
            // Ctrl+Z: Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z: Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                redo();
            }
            // Ctrl+F: Focus search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                builderVariableSearch?.focus();
            }
            // Ctrl+D: Duplicate line
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                const formula = builderFormula.value;
                builderFormula.value = formula + '\n' + formula;
                pushToUndoStack();
                validateFormula();
                updateLivePreview();
                updateCharCount();
            }
        });
        
        // Operator buttons
        document.querySelectorAll('.builder-operator').forEach(btn => {
            btn.addEventListener('click', () => {
                const op = btn.dataset.op;
                if (op === '()') {
                    insertAtCursor(builderFormula, '()');
                    builderFormula.selectionStart = builderFormula.selectionEnd = builderFormula.selectionStart - 1;
                } else {
                    insertAtCursor(builderFormula, op);
                }
                pushToUndoStack();
                validateFormula();
                updateLivePreview();
                updateCharCount();
            });
        });
        
        // Formula templates
        document.querySelectorAll('.formula-template').forEach(template => {
            template.addEventListener('click', () => {
                builderFormula.value = template.dataset.formula;
                pushToUndoStack();
                validateFormula();
                updateLivePreview();
                updateCharCount();
                showStatus('📋 Đã chọn mẫu: ' + template.dataset.desc, 'success', 2000);
            });
            
            template.addEventListener('mouseenter', () => {
                template.style.transform = 'translateY(-4px)';
                template.style.boxShadow = '0 8px 16px rgba(16, 185, 129, 0.2)';
                template.style.borderColor = '#10b981';
            });
            
            template.addEventListener('mouseleave', () => {
                template.style.transform = 'translateY(0)';
                template.style.boxShadow = 'none';
                template.style.borderColor = '#d1fae5';
            });
        });
        
        // Event listeners
        builderTable.addEventListener('change', updateBuilderFields);
        builderField.addEventListener('change', () => {
            updateBuilderVariables();
            loadCurrentFormula();
        });
        
        // Beautify/Format button
        document.getElementById('builder-beautify')?.addEventListener('click', () => {
            let formula = builderFormula.value;
            
            // Add spaces around operators
            formula = formula.replace(/([+\-*\/%])/g, ' $1 ');
            
            // Clean up multiple spaces
            formula = formula.replace(/\s+/g, ' ').trim();
            
            // Format parentheses
            formula = formula.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
            
            builderFormula.value = formula;
            pushToUndoStack();
            validateFormula();
            updateLivePreview();
            updateCharCount();
            showStatus('✨ Đã format công thức', 'success', 2000);
        });
        
        // Smart suggest button
        document.getElementById('builder-smart-suggest')?.addEventListener('click', () => {
            const table = builderTable.value;
            const field = builderField.value;
            let suggestions = [];
            
            if (table === 'ae' || table === 'aeqt') {
                if (field === 'total') {
                    suggestions = [
                        'money * 0.4 (40% tiền làm)',
                        'money * 0.5 (50% tiền làm)',
                        'money * 0.8 (80% tiền làm)'
                    ];
                } else {
                    suggestions = [
                        'money / (nameCount || 2) (Chia đều theo số người)',
                        'money * 0.5 (50% tiền làm)'
                    ];
                }
            } else if (table === 'conversion') {
                suggestions = [
                    '(usdt + usd) * price (Tổng quy đổi)',
                    'usdt * price + usd * price (Tổng chi tiết)'
                ];
            } else if (table === 'withdraw') {
                suggestions = [
                    'bankdep + bankbad + visa (Tổng 3 nguồn)',
                    'bankdep + visa (Chỉ Bank đẹp + Visa)'
                ];
            }
            
            const message = suggestions.length > 0 
                ? '💡 Gợi ý:\n\n' + suggestions.join('\n')
                : 'Không có gợi ý cho ngữ cảnh này';
                
            alert(message);
        });
        
        // Shortcuts toggle button
        document.getElementById('builder-shortcuts-toggle')?.addEventListener('click', () => {
            const extended = document.getElementById('builder-shortcuts-extended');
            const btn = document.getElementById('builder-shortcuts-toggle');
            
            if (extended.style.display === 'none') {
                extended.style.display = 'block';
                btn.textContent = 'Thu gọn';
            } else {
                extended.style.display = 'none';
                btn.textContent = 'Xem thêm';
            }
        });
        
        // Real-time validation and preview
        let previewTimeout;
        builderFormula.addEventListener('input', () => {
            updateCharCount();
            pushToUndoStack();
            
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(() => {
                validateFormula();
                updateLivePreview();
            }, 300);
        });
        
        // Initialize
        updateBuilderFields();
        updateCharCount();
    }

    // Initialize page
    document.addEventListener('DOMContentLoaded', () => {
        const settings = loadSettings();
        populateForm(settings);
        
        // Initialize new features
        initTabs();
        initSearch();
        initQuickActions();
        initRealtimePreview();
        initAutoSave();
        initFormulaBuilder();
        updatePreview();

        // Save settings button
        document.getElementById('save-settings').addEventListener('click', () => {
            const newSettings = collectSettings();
            if (saveSettings(newSettings)) {
                showStatus('✅ Đã lưu cài đặt thành công!', 'success');
                // Trigger event for other pages to reload settings
                window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: newSettings }));
            } else {
                showStatus('❌ Lỗi khi lưu cài đặt!', 'error');
            }
        });

        // Reset settings button
        document.getElementById('reset-settings').addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn khôi phục cài đặt mặc định? Tất cả tùy chỉnh sẽ bị xóa.')) {
                saveSettings(DEFAULT_SETTINGS);
                populateForm(DEFAULT_SETTINGS);
                showStatus('🔄 Đã khôi phục cài đặt mặc định!', 'success');
                window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: DEFAULT_SETTINGS }));
            }
        });

        // Export settings button
        document.getElementById('export-settings').addEventListener('click', () => {
            const settings = loadSettings();
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `settings_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showStatus('📥 Đã xuất cài đặt thành công!', 'success');
        });

        // Import settings button
        document.getElementById('import-settings').addEventListener('click', () => {
            document.getElementById('import-settings-file').click();
        });

        document.getElementById('import-settings-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    const merged = mergeSettings(DEFAULT_SETTINGS, importedSettings);
                    saveSettings(merged);
                    populateForm(merged);
                    showStatus('📤 Đã nhập cài đặt thành công!', 'success');
                    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: merged }));
                } catch (err) {
                    showStatus('❌ File cài đặt không hợp lệ!', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Save manual rate button
        document.getElementById('save-manual-rate').addEventListener('click', async () => {
            const buyPrice = parseFloat(document.getElementById('manual-buy-price').value);
            const sellPrice = parseFloat(document.getElementById('manual-sell-price').value);
            
            if (!buyPrice || !sellPrice) {
                showStatus('⚠️ Vui lòng nhập cả giá mua và giá bán!', 'error');
                return;
            }

            try {
                // Sử dụng relative path để hoạt động với cả development và production
                const apiUrl = window.RATE_PROXY_URL || 
                              (window.location.protocol === 'file:' ? 'http://localhost:3001' : '') + '/api/p2p-rate/manual';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ buyPrice, sellPrice })
                });

                if (response.ok) {
                    showStatus('✅ Đã lưu giá thủ công thành công!', 'success');
                } else {
                    showStatus('❌ Lỗi khi lưu giá thủ công!', 'error');
                }
            } catch (err) {
                showStatus('❌ Không thể kết nối đến server!', 'error');
            }
        });
    });

    // Export settings globally
    window.AppSettings = {
        load: loadSettings,
        save: saveSettings,
        defaults: DEFAULT_SETTINGS
    };
})();
