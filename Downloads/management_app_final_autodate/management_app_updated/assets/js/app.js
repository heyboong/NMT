/*
 * Shared utility functions for the offline management app.
 *
 * These helpers abstract away persistence via localStorage and provide
 * simple APIs for loading and saving structured data. Everything is
 * serialised as JSON for ease of use.
 * 
 * Now supports configurable currency formatting and calculation formulas
 * through the Settings page.
 */

/**
 * Load application settings
 * @returns {Object} Settings object
 */
function loadAppSettings() {
    try {
        const stored = localStorage.getItem('app_settings');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
    // Return default settings if not found
    return {
        currency: { symbol: '₫', position: 'after', decimals: 0, separator: ',' },
        crypto: { symbol: '$', position: 'after', decimals: 2 },
        display: { rounding: 'round', showZero: true, editMode: 'raw', autoFormat: true },
        formulas: {
            ae: { total: 'money * 0.5', chia: 'money / (name || 2)' },
            aeqt: { total: 'money * 0.5', chia: 'money / (name || 2)' },
            conversion: { vnd: '(usdt + usd) * price', priority: true },
            withdraw: { total: 'bankdep + bankbad + visa' }
        }
    };
}

// Global settings object
let APP_SETTINGS = loadAppSettings();

// Listen for settings updates
window.addEventListener('settingsUpdated', (event) => {
    APP_SETTINGS = event.detail;
    console.log('Settings updated, reloading...');
});

/**
 * Persist data under a given key in localStorage.
 * @param {string} key - Storage key.
 * @param {*} data - Data to save (will be JSON stringified).
 */
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
        console.error('Error saving data for', key, err);
    }
}

/**
 * Retrieve data stored under a given key from localStorage.
 * @param {string} key - Storage key.
 * @returns {Array|Object} The parsed data or an empty array if none exists.
 */
function loadData(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Error loading data for', key, err);
        return [];
    }
}

/**
 * Add an entry into the global history store. Each entry is stamped
 * with a timestamp for easier sorting and auditing. History is keyed
 * separately from page-specific data so that it persists across edits.
 * @param {string} page - Identifier for the originating page (e.g. 'AE').
 * @param {Object} entry - The original entry object as saved on the page.
 */
function addToHistory(page, entry) {
    const history = loadData('history');
    const record = Object.assign({}, entry);
    record.page = page;
    record.timestamp = new Date().toISOString();
    history.push(record);
    saveData('history', history);
}

/**
 * Compute a numeric total for a given entry.
 * Now uses FormulaEngine for flexible calculation.
 * 
 * Calculation Logic (configurable via FormulaEngine):
 * - Default: Total = Money (direct value, no calculation)
 * - Can be customized through Settings
 * 
 * @param {Object} entry - Row data containing money and name fields
 * @param {string|number} entry.money - The monetary amount to calculate from
 * @param {string} entry.name - The name(s) associated with this entry
 * @returns {number} The calculated total, always a non-negative number
 * 
 * @example
 * computeRowTotal({ money: '1000', name: 'John' }) // Returns 1000 (with new formula)
 * computeRowTotal({ money: '1000', name: '' }) // Returns 1000
 * computeRowTotal({ money: 'abc', name: 'John' }) // Returns 0 (invalid money)
 */
function computeRowTotal(entry) {
    // Use FormulaEngine if available, otherwise fallback to direct money value
    if (window.FormulaEngine) {
        // Determine table based on entry data structure
        // This function is used in history, which may have mixed data
        const table = entry.page === 'AE-QT' ? 'aeqt' : 'ae';
        return window.FormulaEngine.calculate(table, 'total', entry) || 0;
    }
    
    // Fallback: return money value directly
    if (!entry || typeof entry !== 'object') {
        return 0;
    }
    
    const money = parseFloat(entry.money) || 0;
    return money >= 0 ? money : 0;
}

/**
 * Compute the Chia (division) value for work distribution.
 * Now uses FormulaEngine for flexible calculation.
 * 
 * Business Rules (configurable via FormulaEngine):
 * 1. Single name (e.g., "John") → null (no division needed)
 * 2. Multiple names (e.g., "John,Jane") → Money ÷ Name Count
 * 3. No name → null (division not applicable)
 * 4. No money → 0 (nothing to divide)
 * 
 * Name Parsing:
 * - Names separated by commas are counted individually
 * - Empty segments are ignored: "A,,B" counts as 2, not 3
 * - Whitespace is trimmed: "A , B" is same as "A,B"
 * 
 * @param {Object} entry - Row data containing money and name fields
 * @param {string|number} entry.money - The amount to divide
 * @param {string} entry.name - Comma-separated list of names
 * @returns {number|null} Division result, or null if not applicable
 * 
 * @example
 * computeChia({ money: '1000', name: 'John' }) // Returns null (1 name)
 * computeChia({ money: '1000', name: 'John,Jane' }) // Returns 500 (1000÷2)
 * computeChia({ money: '1000', name: 'A,B,C' }) // Returns 333.33 (1000÷3)
 * computeChia({ money: '0', name: 'John,Jane' }) // Returns 0
 * computeChia({ money: '1000', name: '' }) // Returns null
 */
function computeChia(entry) {
    // Use FormulaEngine if available
    if (window.FormulaEngine) {
        // Determine table based on entry data structure
        const table = entry.page === 'AE-QT' ? 'aeqt' : 'ae';
        return window.FormulaEngine.calculate(table, 'chia', entry);
    }
    
    // Fallback: original implementation
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    
    const money = parseFloat(entry.money) || 0;
    const rawName = String(entry.name || '').trim();
    
    if (!rawName) return null;
    
    const nameCount = rawName.split(',').map(n => n.trim()).filter(n => n.length > 0).length;
    
    if (nameCount <= 1) return null;
    if (money <= 0) return 0;
    
    return Math.round((money / nameCount) * 100) / 100;
}

/**
 * Sum the totals across an array of entries using computeRowTotal.
 * @param {Array} list - Array of entry objects.
 * @returns {number} Sum of totals.
 */
function sumTotals(list) {
    return list.reduce((sum, item) => sum + computeRowTotal(item), 0);
}

/**
 * Format number as VND currency with configurable options.
 * 
 * Features:
 * - Configurable symbol (₫), position (before/after), decimals
 * - Thousand separator customization
 * - Rounding modes: round, floor, ceil
 * - Negative number handling with color support
 * - Zero display control
 * 
 * @param {number|string} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "1,000,000₫")
 * 
 * @example
 * formatVND(1000000) // Returns "1,000,000₫" (default settings)
 * formatVND(-500) // Returns "-500₫"
 * formatVND(0) // Returns "0₫" or "" based on showZero setting
 * formatVND('abc') // Returns "0₫" or "" (invalid input)
 */
function formatVND(value) {
    // Load current settings
    const settings = APP_SETTINGS.currency;
    const displaySettings = APP_SETTINGS.display;
    
    // Parse input value
    const num = parseFloat(value);
    
    // Handle invalid inputs
    if (!isFinite(num) || isNaN(num)) {
        if (displaySettings.showZero) {
            return settings.position === 'after' ? `0${settings.symbol}` : `${settings.symbol}0`;
        }
        return '';
    }
    
    // Apply rounding strategy from settings
    let rounded;
    switch (displaySettings.rounding) {
        case 'floor':
            rounded = Math.floor(num);
            break;
        case 'ceil':
            rounded = Math.ceil(num);
            break;
        case 'round':
        default:
            rounded = Math.round(num);
            break;
    }
    
    // Separate sign and absolute value
    const isNegative = rounded < 0;
    const absValue = Math.abs(rounded);
    
    // Format with locale and apply custom separator
    const formatted = absValue.toLocaleString('en-US', {
        minimumFractionDigits: settings.decimals || 0,
        maximumFractionDigits: settings.decimals || 0
    }).replace(/,/g, settings.separator || ',');
    
    // Build final string based on position
    let result;
    if (settings.position === 'before') {
        result = `${settings.symbol}${formatted}`;
    } else {
        result = `${formatted}${settings.symbol}`;
    }
    
    // Add sign for negative numbers
    if (isNegative) {
        result = `-${result}`;
    }
    
    return result;
}

/**
 * Format number as USDT/USD cryptocurrency with configurable options.
 * 
 * Features:
 * - Configurable symbol ($, ₮), position, decimals (default 2)
 * - Standard crypto formatting with thousand separators
 * - Negative number support
 * - Consistent with formatVND behavior
 * 
 * @param {number|string} value - The numeric value to format
 * @returns {string} Formatted crypto string (e.g., "$100.25" or "100.25₮")
 * 
 * @example
 * formatUSDT(100.5) // Returns "$100.50" (default settings)
 * formatUSDT(-50.25) // Returns "-$50.25"
 * formatUSDT(1000.5) // Returns "$1,000.50"
 */
function formatUSDT(value) {
    // Load crypto settings
    const settings = APP_SETTINGS.crypto;
    const displaySettings = APP_SETTINGS.display;
    
    // Parse input
    const num = parseFloat(value);
    
    // Handle invalid inputs
    if (!isFinite(num) || isNaN(num)) {
        if (displaySettings.showZero) {
            return settings.position === 'after' ? `0${settings.symbol}` : `${settings.symbol}0`;
        }
        return '';
    }
    
    // Handle negative numbers
    const isNegative = num < 0;
    const absValue = Math.abs(num);
    
    // Format with proper decimal places (usually 2 for crypto)
    const formatted = absValue.toLocaleString('en-US', {
        minimumFractionDigits: settings.decimals || 2,
        maximumFractionDigits: settings.decimals || 2
    });
    
    // Build result based on symbol position
    let result;
    if (settings.position === 'before') {
        result = `${settings.symbol}${formatted}`;
    } else {
        result = `${formatted}${settings.symbol}`;
    }
    
    // Add negative sign if needed
    if (isNegative) {
        result = `-${result}`;
    }
    
    return result;
}

/**
 * Format number as USD currency (same as USDT)
 * @param {number|string} value - The value to format
 * @returns {string} Formatted string with number and $ symbol
 */
function formatUSD(value) {
    return formatUSDT(value);
}

/**
 * Format number as currency (legacy function, defaults to VND)
 * @param {number|string} value - The value to format
 * @returns {string} Formatted string with number and ₫ symbol
 */
function formatCurrency(value) {
    return formatVND(value);
}

/**
 * Highlight a table row as recently updated with animation.
 * Adds visual feedback (yellow highlight + pulse animation + label) that fades after 5 seconds.
 * 
 * Features:
 * - Yellow background with pulse animation
 * - "✏️ Đã cập nhật" label that slides in
 * - Auto-removes highlight after 5 seconds
 * - Only one row highlighted at a time per table
 * 
 * @param {HTMLTableRowElement} row - The table row element to highlight
 * @param {number} duration - Duration in milliseconds before removing highlight (default: 5000)
 * 
 * @example
 * const row = document.querySelector('tr[data-row="5"]');
 * highlightRecentRow(row); // Highlights for 5 seconds
 * highlightRecentRow(row, 3000); // Highlights for 3 seconds
 */
function highlightRecentRow(row, duration = 3000) {
    if (!row || !(row instanceof HTMLTableRowElement)) {
        console.warn('highlightRecentRow: Invalid row element');
        return;
    }
    
    // Remove previous highlight from other rows in the same table
    const table = row.closest('table');
    if (table) {
        const previousHighlighted = table.querySelectorAll('tr.recently-updated');
        previousHighlighted.forEach(tr => {
            tr.classList.remove('recently-updated');
        });
    }
    
    // Add highlight class to trigger animation
    row.classList.add('recently-updated');
    
    // Scroll row into view smoothly if not fully visible
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Remove highlight after duration
    setTimeout(() => {
        row.classList.remove('recently-updated');
    }, duration);
}
