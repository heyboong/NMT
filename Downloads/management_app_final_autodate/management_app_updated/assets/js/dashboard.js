/*
 * Dashboard logic for the management app.
 *
 * This script handles three main responsibilities:
 * 1. Rendering summary cards showing totals and counts for AE, AE-QT,
 *    history and the latest rate conversion.
 * 2. Displaying a miniature exchange‑rate widget which automatically
 *    fetches the USDT→VND rate via Binance and a public FX API, and
 *    calculates a VND value for a user‑entered USDT amount.
 * 3. Providing two spreadsheet‑style tables (conversion and withdraw)
 *    that allow users to enter data directly into cells. Totals are
 *    calculated per table and persisted via localStorage.
 */

(function() {
    /* ===================== SUMMARY CARD SECTION ===================== */
    const cardsContainer = document.getElementById('dashboard-cards');

    // Use global formatVND from app.js

    /**
     * Round VND exchange rate to the nearest unit (whole number).
     * 
     * Business Rule: Exchange rates should always be rounded to whole VND
     * for practical currency exchange (no fractional dong).
     * 
     * Rounding Method: Mathematical rounding (0.5 rounds up)
     * - 27,785.5 → 27,786
     * - 27,785.4 → 27,785
     * - 27,785.6 → 27,786
     * 
     * @param {number|string} value - The rate to round
     * @returns {number} Integer value rounded to nearest unit
     * 
     * @example
     * roundToUnit(27785.5) // Returns 27786
     * roundToUnit(27785.4) // Returns 27785
     * roundToUnit('27785.7') // Returns 27786
     * roundToUnit('abc') // Returns 0 (invalid input)
     */
    function roundToUnit(value) {
        // Parse input (handle both numbers and strings)
        const num = parseFloat(value);
        
        // Validate: must be finite number
        if (!isFinite(num) || isNaN(num)) {
            console.warn('roundToUnit: Invalid input:', value);
            return 0;
        }
        
        // Mathematical rounding to nearest integer
        return Math.round(num);
    }

    /**
     * Create a summary card element.
     * @param {string} title
     * @param {number} total
     * @param {number} count
     * @param {boolean} isRate
     * @returns {HTMLElement}
     */
    function createCard(title, total, count, isRate) {
        const div = document.createElement('div');
        div.className = 'card';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const totalP = document.createElement('p');
        if (isRate) {
            totalP.textContent = 'Thành tiền gần nhất: ' + formatVND(total);
        } else {
            totalP.textContent = 'Tổng tiền: ' + formatVND(total);
        }
        const countP = document.createElement('p');
        countP.textContent = 'Số dòng: ' + count;
        div.appendChild(h3);
        div.appendChild(totalP);
        div.appendChild(countP);
        return div;
    }

    /**
     * Render all summary cards based on stored data.
     */
    function renderCards() {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';
        
        // AE summary
        const aeData = loadData('ae-data') || [];
        cardsContainer.appendChild(createCard('💼 AE', sumTotals(aeData), aeData.length));
        
        // AE-QT summary
        const aeqtData = loadData('ae-qt-data') || [];
        cardsContainer.appendChild(createCard('🌐 AE-QT', sumTotals(aeqtData), aeqtData.length));
        
        // History summary
        const historyData = loadData('history-data') || [];
        cardsContainer.appendChild(createCard('📜 Lịch Sử', sumTotals(historyData), historyData.length));
        
        // Rate summary (from rate-settings)
        const rateSettings = loadData('rate-settings') || {};
        const sellPrice = parseFloat(rateSettings.sellPrice) || 0;
        cardsContainer.appendChild(createCard('💱 Tỷ Giá USDT', sellPrice, 1, true));
    }

    /* ===================== RATE WIDGET SECTION ===================== */
    const todayDateEl    = document.getElementById('dash-today-date');
    // Elements for the mini P2P rate widget
    const sellPriceEl    = document.getElementById('dash-sell-price');
    const buyPriceEl     = document.getElementById('dash-buy-price');
    const usdtAmountInput= document.getElementById('dash-usdt-amount');
    const valueSellEl    = document.getElementById('dash-usdt-value-sell');
    const valueBuyEl     = document.getElementById('dash-usdt-value-buy');
    // Stored prices
    let sellPrice        = 0;
    let buyPrice         = 0;
    let crossRate        = 0;
    const settingsKey    = 'rate-settings';
    const BACKEND_URL    = 'https://nmt-qj4t.onrender.com';
    const p2pProxy       = BACKEND_URL + '/api/p2p-rate';
    const alertEndpoint   = p2pProxy.replace(/\/api\/p2p-rate\/?$/, '/api/p2p-rate/alert');
    const alertBanner     = document.getElementById('rate-alert-banner');
    const alertMessageEl  = document.getElementById('rate-alert-message');
    const alertBadgeEl    = document.getElementById('rate-alert-badge');
    const ALERT_REFRESH_INTERVAL = 5 * 60 * 1000;

    async function fetchRates() {
        // Hiển thị loading
        if (buyPriceEl) {
            buyPriceEl.textContent = '⏳ Đang tải...';
            buyPriceEl.style.color = '#6b7280';
        }
        
        let fetchedFromAPI = false;
        try {
            console.log('🔄 Fetching P2P rates from API...');
            const res = await fetch(p2pProxy, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (!res.ok) throw new Error('Backend proxy failed');
            const data = await res.json();
            console.log('📊 API Response:', data);
            if (data && data.sellPrice && data.buyPrice) {
                sellPrice = data.sellPrice;
                buyPrice = data.buyPrice;
                crossRate = data.crossRate || data.sellPrice;
                fetchedFromAPI = true;
                console.log('✅ P2P rates fetched successfully:', { sellPrice, buyPrice });
            }
        } catch (err) {
            console.warn('❌ Proxy fetch failed, using fallback:', err);
            await fetchFallbackRates();
        }
        // Chỉ dùng giá từ localStorage nếu không lấy được từ API
        if (!fetchedFromAPI) {
            console.warn('⚠️ Using stored prices from localStorage');
            applyStoredPrices();
        }
        updateRateWidget();
    }

    async function fetchFallbackRates() {
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BUSDUSDT');
            const busdData = await res.json();
            const busdPrice = parseFloat(busdData.price);
            const usdtToUsd = busdPrice > 0 ? 1 / busdPrice : 1;
            const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
            const fxData = await fxRes.json();
            const usdToVnd = fxData && fxData.rates && fxData.rates.VND ? fxData.rates.VND : 0;
            crossRate = usdtToUsd * usdToVnd;
            sellPrice = crossRate;
            buyPrice = crossRate;
        } catch (err) {
            console.error('Error fetching fallback rates:', err);
        }
    }

    function applyStoredPrices() {
        const settings = loadData(settingsKey);
        let s = null;
        let b = null;
        if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
            s = parseFloat(settings.sellPrice);
            b = parseFloat(settings.buyPrice);
        }
        if (s && s > 0) sellPrice = s;
        if (b && b > 0) buyPrice = b;
        if (!sellPrice && !buyPrice && crossRate > 0) {
            sellPrice = buyPrice = crossRate;
        }
    }

    /**
     * Update the rate widget display using the fetched price and user input.
     */
    /**
     * Update mini rate widget: show sell/buy prices and compute values.
     */
    function updateRateWidget() {
        // Làm tròn tỷ giá đến hàng đơn vị trước khi hiển thị
        const roundedSellPrice = roundToUnit(sellPrice);
        const roundedBuyPrice = roundToUnit(buyPrice);
        sellPriceEl.textContent = formatVND(roundedSellPrice);
        
        // Hiển thị giá mua với thời gian cập nhật
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        buyPriceEl.textContent  = formatVND(roundedBuyPrice);
        buyPriceEl.style.color = '#059669';
        buyPriceEl.style.fontWeight = '700';
        buyPriceEl.title = `Cập nhật lúc ${timeStr} - Giá P2P thực tế từ Binance`;
        
        console.log(`✅ Rate widget updated: ${formatVND(roundedBuyPrice)} (at ${timeStr})`);
        
        computeUsdtValue();
    }

    /**
     * Compute and display VND values for the entered USDT amount using
     * both sell and buy prices.
     */
    function computeUsdtValue() {
        const amount = parseFloat(usdtAmountInput.value) || 0;
        const vSell = sellPrice * amount;
        const vBuy  = buyPrice  * amount;
        valueSellEl.textContent = formatVND(vSell);
        valueBuyEl.textContent  = formatVND(vBuy);
    }

    function formatDate(timestamp) {
        if (!timestamp) return '–';
        try {
            return new Date(timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        } catch (e) {
            return timestamp;
        }
    }

    async function fetchAlertState() {
        if (!alertBanner) return;
        try {
            const res = await fetch(alertEndpoint);
            if (!res.ok) throw new Error('Alert fetch failed');
            const data = await res.json();
            const status = data.alertActive ? 'active' : 'inactive';
            alertBanner.dataset.status = status;
            if (alertMessageEl) {
                alertMessageEl.textContent = data.message || 'Không có cảnh báo';
            }
            if (alertBadgeEl) {
                alertBadgeEl.textContent = data.alertActive ? 'Bật' : 'Tắt';
            }
            alertBanner.style.display = data.alertActive ? 'block' : 'none';
        } catch (err) {
            console.warn('Alert fetch failed:', err);
            alertBanner.dataset.status = 'error';
            if (alertBadgeEl) alertBadgeEl.textContent = 'Lỗi';
            alertBanner.style.display = 'none';
        }
    }

    function renderAlertBanner(state) {
        if (!alertBanner || !alertMessageEl || !alertBadgeEl) return;
        if (!state?.lastCheckedAt) {
            alertMessageEl.textContent = 'Chưa có dữ liệu cảnh báo.';
            alertBadgeEl.textContent = 'Đang chờ';
            alertBanner.dataset.status = 'idle';
            return;
        }
        const changePct = (state.lastChangePercent ?? 0).toFixed(2);
        const threshold = (state.thresholdPercent ?? 0).toFixed(2);
        let message = `Cập nhật ${formatDate(state.lastCheckedAt)} · Biến động ${changePct}% (ngưỡng ${threshold}%)`;
        if (state.lastAlertAt) {
            const alertChange = (state.lastAlertChange ?? 0).toFixed(2);
            message += ` · Cảnh báo lần cuối ${formatDate(state.lastAlertAt)} (${alertChange}%)`;
            alertBanner.dataset.status = 'alert';
            alertBadgeEl.textContent = 'Cảnh báo';
        } else {
            alertBanner.dataset.status = 'ok';
            alertBadgeEl.textContent = 'Ổn định';
        }
        alertMessageEl.textContent = message;
    }

    // Bind input event to recalculate on user entry
    if (usdtAmountInput) {
        usdtAmountInput.addEventListener('input', computeUsdtValue);
    }
    // Set today's date in Vietnamese format using Hanoi time zone
    if (todayDateEl) {
        try {
            todayDateEl.textContent = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        } catch (e) {
            // Fallback if timeZone is not supported
            todayDateEl.textContent = new Date().toLocaleDateString('vi-VN');
        }
    }

    /* ===================== CONVERSION TABLE SECTION ===================== */
    const convTableBody = document.querySelector('#conversion-table tbody');
    const convTotalDisplay = document.getElementById('conversion-total-display');
    const convColumns = ['date', 'usdt', 'usd', 'price', 'vnd', 'staff'];
    const CONV_INITIAL_ROWS = 50; // Số dòng ban đầu
    const CONV_MAX_ROWS = 200; // Số dòng tối đa
    let convData = loadData('dashboard_conversion');
    if (!Array.isArray(convData)) convData = [];
    // Ensure there are at least CONV_INITIAL_ROWS entries
    for (let i = convData.length; i < CONV_INITIAL_ROWS; i++) {
        convData.push({ date: '', usdt: '', usd: '', price: '', vnd: '', staff: '' });
    }

    /**
     * Kiểm tra xem một dòng conversion có đã nhập hết các cột quan trọng không
     * @param {Object} row
     * @returns {boolean}
     */
    function isConversionRowComplete(row) {
        // Một dòng được coi là đã nhập hết nếu có:
        // - Ngày đổi VÀ
        // - (USDT hoặc USD) VÀ
        // - Giá VÀ
        // - VND (tự động tính hoặc nhập thủ công)
        const hasDate = row.date && row.date.trim() !== '';
        const hasUsdtOrUsd = (row.usdt && parseFloat(row.usdt) > 0) || (row.usd && parseFloat(row.usd) > 0);
        const hasPrice = row.price && parseFloat(row.price) > 0;
        const hasVnd = row.vnd && parseFloat(row.vnd) > 0;
        return hasDate && hasUsdtOrUsd && hasPrice && hasVnd;
    }

    /**
     * Thêm dòng mới vào conversion table nếu cần (tối đa CONV_MAX_ROWS)
     */
    function addNewConversionRowIfNeeded() {
        // Kiểm tra nếu đã đạt tối đa
        if (convData.length >= CONV_MAX_ROWS) {
            return; // Không thêm nữa nếu đã đạt max
        }
        
        // Kiểm tra dòng cuối cùng
        const lastRow = convData[convData.length - 1];
        if (lastRow && isConversionRowComplete(lastRow)) {
            // Nếu dòng cuối đã nhập hết, thêm dòng mới
            convData.push({ date: '', usdt: '', usd: '', price: '', vnd: '', staff: '' });
            renderConversionTable();
            // Focus vào ô đầu tiên của dòng mới (USDT)
            const newRowIndex = convData.length - 1;
            const newRow = convTableBody.children[newRowIndex];
            if (newRow) {
                const usdtCell = newRow.querySelector('td[data-col="usdt"]');
                if (usdtCell) {
                    // Delay một chút để đảm bảo DOM đã render
                    setTimeout(() => {
                        usdtCell.focus();
                    }, 50);
                }
            }
        }
    }

    /**
     * Compute VND total for a conversion row - uses FormulaEngine.
     * 
     * Calculation Priority (configurable):
     * 1. Explicit VND value (manual entry) - highest priority
     * 2. Calculated from USDT: USDT × Price
     * 3. Calculated from USD: USD × Price
     * 4. Sum both if both USDT and USD present: (USDT + USD) × Price
     * 
     * Business Rules:
     * - USDT and USD are independent (can have both)
     * - Price must be positive to calculate
     * - Manual VND overrides calculations
     * - Result rounded to 2 decimal places for precision
     * 
     * @param {Object} row - Conversion row data
     * @param {string|number} row.usdt - USDT amount
     * @param {string|number} row.usd - USD amount  
     * @param {string|number} row.price - VND exchange rate
     * @param {string|number} row.vnd - Manual VND entry (optional)
     * @returns {number} Calculated VND total
     * 
     * @example
     * computeConversionTotal({ usdt: 100, price: 25000 }) // Returns 2500000
     * computeConversionTotal({ usdt: 50, usd: 50, price: 25000 }) // Returns 2500000
     * computeConversionTotal({ usdt: 100, price: 25000, vnd: 3000000 }) // Returns 3000000 (manual)
     */
    function computeConversionTotal(row) {
        // Use FormulaEngine if available
        if (window.FormulaEngine) {
            return window.FormulaEngine.calculate('conversion', 'vnd', row) || 0;
        }
        
        // Fallback: original implementation
        if (!row || typeof row !== 'object') {
            return 0;
        }
        
        const usdt = parseFloat(row.usdt) || 0;
        const usd = parseFloat(row.usd) || 0;
        const price = parseFloat(row.price) || 0;
        const vndVal = parseFloat(row.vnd);
        
        if (isFinite(vndVal) && !isNaN(vndVal) && vndVal > 0) {
            return Math.round(vndVal * 100) / 100;
        }
        
        if (price <= 0) return 0;
        
        let total = 0;
        if (usdt > 0) total += usdt * price;
        if (usd > 0) total += usd * price;
        
        return Math.round(total * 100) / 100;
    }

    /**
     * Render the conversion table body from convData.
     */
    function refreshTableResize(tableId, options) {
        if (window.TableResizer && tableId) {
            window.TableResizer.initTable(tableId, options);
        }
    }

    /**
     * Normalize date string to YYYY-MM-DD format for comparison
     * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
     */
    function normalizeDateForComparison(dateStr) {
        if (!dateStr) return '';
        const cleaned = dateStr.trim();
        if (!cleaned) return '';
        
        // Try DD/MM/YYYY or DD-MM-YYYY format
        const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }
        
        // Try YYYY-MM-DD format
        const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Return as-is if no pattern matches
        return cleaned;
    }

    function renderConversionTable() {
        convTableBody.innerHTML = '';
        
        // Sắp xếp dữ liệu theo ngày để dòng kẻ xanh hoạt động đúng
        const sortedData = [...convData].sort((a, b) => {
            const dateA = normalizeDateForComparison(a.date);
            const dateB = normalizeDateForComparison(b.date);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.localeCompare(dateB);
        });
        
        let previousDate = null; // Theo dõi ngày trước đó (normalized)
        
        sortedData.forEach((row, rowIndex) => {
            const originalIndex = convData.indexOf(row);
            const tr = document.createElement('tr');
            
            // Chuẩn hóa và kiểm tra nếu ngày thay đổi so với dòng trước
            const currentDate = normalizeDateForComparison(row.date);
            if (currentDate && previousDate && currentDate !== previousDate) {
                // Thêm border-top màu xanh lá để ngăn cách ngày mới
                tr.style.borderTop = '3px solid #10b981';
                tr.style.boxShadow = '0 -2px 4px rgba(16, 185, 129, 0.1)';
            }
            previousDate = currentDate;
            
            const header = document.createElement('th');
            header.className = 'row-header';
            header.textContent = rowIndex + 2;
            tr.appendChild(header);
            convColumns.forEach(col => {
                const td = document.createElement('td');
                td.dataset.row = originalIndex;
                td.dataset.col = col;
                td.setAttribute('contenteditable', 'true');
                
                // Format display based on column type
                let displayValue = row[col] || '';
                if (displayValue && col === 'price') {
                    // Format Price column as VND
                    const priceNum = parseFloat(displayValue);
                    if (!isNaN(priceNum)) {
                        displayValue = formatVND(priceNum);
                    }
                } else if (displayValue && col === 'vnd') {
                    // Format VND column
                    const vndNum = parseFloat(displayValue);
                    if (!isNaN(vndNum)) {
                        displayValue = formatVND(vndNum);
                    }
                } else if (displayValue && (col === 'usdt' || col === 'usd')) {
                    // Format USDT/USD columns with comma separator
                    const num = parseFloat(displayValue);
                    if (!isNaN(num)) {
                        displayValue = num.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                        });
                    }
                }
                
                td.textContent = displayValue;
                // Highlight the VND column as a total cell
                if (col === 'vnd') {
                    td.classList.add('total-cell');
                }
                td.addEventListener('input', onConvCellInput);
                
                // Add blur event to reformat after editing
                td.addEventListener('blur', function() {
                    const savedValue = convData[originalIndex][col];
                    if (savedValue && ['price', 'vnd'].includes(col)) {
                        const numValue = parseFloat(savedValue);
                        if (!isNaN(numValue)) {
                            td.textContent = formatVND(numValue);
                        }
                    } else if (savedValue && ['usdt', 'usd'].includes(col)) {
                        const numValue = parseFloat(savedValue);
                        if (!isNaN(numValue)) {
                            td.textContent = numValue.toLocaleString('en-US', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        }
                    }
                });
                
                // Add focus event to show raw number for easier editing
                td.addEventListener('focus', function() {
                    const savedValue = convData[originalIndex][col];
                    if (savedValue && ['price', 'vnd', 'usdt', 'usd'].includes(col)) {
                        td.textContent = savedValue;
                    }
                });
                
                tr.appendChild(td);
            });
            convTableBody.appendChild(tr);
        });
        updateConversionTotal();
        refreshTableResize('conversion-table', { enableRowResize: true });
    }

    /**
     * Format date to Vietnamese format (DD/MM/YYYY)
     * @param {Date} date
     * @returns {string}
     */
    function formatDateInput(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Get current date in Vietnamese timezone
     * @returns {Date}
     */
    function getCurrentDate() {
        try {
            // Lấy ngày hiện tại theo múi giờ Việt Nam
            const now = new Date();
            const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            return vnTime;
        } catch (e) {
            return new Date();
        }
    }

    /**
     * Handler for conversion cell edits. Updates convData, recalculates
     * any dependent fields (USD and VND) and persists to storage.
     * @param {Event} e
     */
    function onConvCellInput(e) {
        const td = e.target;
        const rowIndex = parseInt(td.dataset.row, 10);
        const col = td.dataset.col;
        if (!Number.isInteger(rowIndex) || !col) return;
        
        let inputValue = td.textContent.trim();
        
        // Clean format characters for numeric columns
        if (['usdt', 'usd', 'price', 'vnd'].includes(col)) {
            // Remove currency symbols and commas
            inputValue = inputValue.replace(/[₫$,]/g, '');
        }
        
        convData[rowIndex][col] = inputValue;
        
        const tr = td.parentElement;
        
        // Kiểm tra nếu cả USDT và USD đều trống (hoặc chỉ chứa khoảng trắng)
        const usdtValue = col === 'usdt' ? inputValue : (convData[rowIndex].usdt || '');
        const usdValue = col === 'usd' ? inputValue : (convData[rowIndex].usd || '');
        const usdtNum = parseFloat(usdtValue);
        const usdNum = parseFloat(usdValue);
        const bothEmpty = (!usdtValue || isNaN(usdtNum) || usdtNum <= 0) && 
                          (!usdValue || isNaN(usdNum) || usdNum <= 0);
        
        // Nếu cả USDT và USD đều trống, xóa Giá và VND
        if (bothEmpty) {
            convData[rowIndex].price = '';
            convData[rowIndex].vnd = '';
            
            const priceTd = tr.querySelector('td[data-col="price"]');
            const vndTd = tr.querySelector('td[data-col="vnd"]');
            if (priceTd) priceTd.textContent = '';
            if (vndTd) vndTd.textContent = '';
            
            updateConversionTotal();
            saveData('dashboard_conversion', convData);
            return;
        }
        
        // Tự động điền ngày tháng nếu người dùng nhập dữ liệu vào USDT, USD, hoặc Price
        // và cột date đang trống
        if (['usdt', 'usd', 'price'].includes(col) && inputValue && !convData[rowIndex].date) {
            const currentDate = formatDateInput(getCurrentDate());
            convData[rowIndex].date = currentDate;
            const dateTd = tr.querySelector('td[data-col="date"]');
            if (dateTd) dateTd.textContent = currentDate;
        }
        
        // Tự động điền giá P2P USDT vào cột "price" khi nhập USDT hoặc USD
        // Chỉ điền nếu cột price đang trống hoặc bằng 0
        if (['usdt', 'usd'].includes(col) && inputValue) {
            const currentPrice = parseFloat(convData[rowIndex].price);
            if (!currentPrice || currentPrice === 0) {
                // Sử dụng giá P2P hiện tại (buyPrice)
                const p2pPrice = Math.round(buyPrice); // Làm tròn đến số nguyên
                if (p2pPrice > 0) {
                    convData[rowIndex].price = p2pPrice.toString();
                    const priceTd = tr.querySelector('td[data-col="price"]');
                    if (priceTd) {
                        priceTd.textContent = formatVND(p2pPrice);
                    }
                    console.log(`✅ Auto-filled P2P price: ${formatVND(p2pPrice)} for row ${rowIndex + 1}`);
                }
            }
        }
        
        // Tự động cập nhật tỷ giá vào cột "Giá (VND)" khi nhập USDT hoặc USD
        if ((col === 'usdt' || col === 'usd') && inputValue) {
            const currentPrice = parseFloat(convData[rowIndex].price) || 0;
            // Nếu cột giá đang trống hoặc bằng 0, tự động điền tỷ giá hiện tại
            if (!currentPrice || currentPrice === 0) {
                // Sử dụng giá bán (sellPrice) làm giá mặc định, làm tròn đến hàng đơn vị
                const autoPrice = roundToUnit(sellPrice || buyPrice || crossRate || 0);
                if (autoPrice > 0) {
                    convData[rowIndex].price = autoPrice.toString();
                    const priceTd = tr.querySelector('td[data-col="price"]');
                    if (priceTd) {
                        priceTd.textContent = formatVND(autoPrice);
                    }
                }
            }
        }
        
        // USDT và USD là riêng biệt, không tự động mirror
        // Khi người dùng thay đổi USDT, USD hoặc Price, xóa VND cũ để tính lại
        if (['usdt', 'usd', 'price'].includes(col)) {
            // Xóa giá trị VND cũ để buộc tính lại
            convData[rowIndex].vnd = '';
        }
        
        // Recalculate VND if price or quantity changed
        if (['usdt', 'usd', 'price', 'vnd'].includes(col)) {
            const total = computeConversionTotal(convData[rowIndex]);
            convData[rowIndex].vnd = total ? total.toString() : '';
            const vndTd = tr.querySelector('td[data-col="vnd"]');
            if (vndTd) {
                vndTd.textContent = convData[rowIndex].vnd ? formatVND(convData[rowIndex].vnd) : '';
            }
        }
        updateConversionTotal();
        saveData('dashboard_conversion', convData);
        
        // Tự động thêm dòng mới nếu dòng hiện tại đã nhập hết (tối đa 200 dòng)
        if (isConversionRowComplete(convData[rowIndex])) {
            addNewConversionRowIfNeeded();
        }
        
        // Highlight row as recently updated
        highlightRecentRow(tr, 5000);
    }

    /**
     * Sum the VND totals across all conversion rows and display.
     */
    function updateConversionTotal() {
        let sumVnd = 0;
        let sumUsdt = 0;
        let sumUsd = 0;
        
        convData.forEach(row => {
            const vnd = computeConversionTotal(row);
            if (typeof vnd === 'number' && !isNaN(vnd)) sumVnd += vnd;
            
            const usdt = parseFloat(row.usdt) || 0;
            if (usdt > 0) sumUsdt += usdt;
            
            const usd = parseFloat(row.usd) || 0;
            if (usd > 0) sumUsd += usd;
        });
        
        convTotalDisplay.textContent = 'Tổng cộng: ' + formatVND(sumVnd);
        
        // Cập nhật tổng trong bảng tổng
        updateTotalsTable();
    }
    
    /**
     * Kiểm tra xem một ngày có thuộc tháng hiện tại không
     * @param {string} dateStr - Định dạng DD/MM/YYYY
     * @returns {boolean}
     */
    function isCurrentMonth(dateStr) {
        if (!dateStr || !dateStr.trim()) return false;
        try {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return false;
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            const now = getCurrentDate();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            
            return month === currentMonth && year === currentYear;
        } catch (e) {
            return false;
        }
    }

    /**
     * Cập nhật bảng tổng các mục
     */
    function updateTotalsTable() {
        // Tổng bảng Ngày đổi
        let sumUsdt = 0;
        let sumUsd = 0;
        let sumConvVnd = 0;
        let sumPriceMonth = 0; // Tổng giá trong tháng
        let countPriceMonth = 0; // Số lượng giao dịch có giá trong tháng
        
        convData.forEach(row => {
            const usdt = parseFloat(row.usdt) || 0;
            if (usdt > 0) sumUsdt += usdt;
            
            const usd = parseFloat(row.usd) || 0;
            if (usd > 0) sumUsd += usd;
            
            const vnd = computeConversionTotal(row);
            if (typeof vnd === 'number' && !isNaN(vnd)) {
                sumConvVnd += vnd;
            }
            
            // Tính giá trung bình trong tháng hiện tại
            const price = parseFloat(row.price) || 0;
            if (price > 0 && isCurrentMonth(row.date)) {
                sumPriceMonth += price;
                countPriceMonth++;
            }
        });
        
        // Tính giá trung bình
        const avgPriceMonth = countPriceMonth > 0 ? sumPriceMonth / countPriceMonth : 0;
        
        const totalUsdtEl = document.getElementById('total-usdt');
        const totalUsdEl = document.getElementById('total-usd');
        const totalConvVndEl = document.getElementById('total-conv-vnd');
        const totalConvMonthEl = document.getElementById('total-conv-month');
        
        if (totalUsdtEl) totalUsdtEl.textContent = sumUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
        if (totalUsdEl) totalUsdEl.textContent = sumUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
        if (totalConvVndEl) totalConvVndEl.textContent = formatVND(sumConvVnd);
        if (totalConvMonthEl) totalConvMonthEl.textContent = formatVND(avgPriceMonth);
        
        // Tổng bảng Ngày lấy
        let sumBankDep = 0;
        let sumBankBad = 0;
        let sumVisa = 0;
        
        wData.forEach(row => {
            const bankDep = parseFloat(row.bankdep) || 0;
            if (bankDep > 0) sumBankDep += bankDep;
            
            const bankBad = parseFloat(row.bankbad) || 0;
            if (bankBad > 0) sumBankBad += bankBad;
            
            const visa = parseFloat(row.visa) || 0;
            if (visa > 0) sumVisa += visa;
        });
        
        const totalBankDepEl = document.getElementById('total-bank-dep');
        const totalBankBadEl = document.getElementById('total-bank-bad');
        const totalVisaEl = document.getElementById('total-visa');
        const totalWithdrawAllEl = document.getElementById('total-withdraw-all');
        
        const totalWithdraw = sumBankDep + sumBankBad + sumVisa;
        
        if (totalBankDepEl) totalBankDepEl.textContent = formatVND(sumBankDep);
        if (totalBankBadEl) totalBankBadEl.textContent = formatVND(sumBankBad);
        if (totalVisaEl) totalVisaEl.textContent = formatVND(sumVisa);
        if (totalWithdrawAllEl) totalWithdrawAllEl.textContent = formatVND(totalWithdraw);
    }

    /* ===================== WITHDRAW TABLE SECTION ===================== */
    const wTableBody = document.querySelector('#withdraw-table tbody');
    const wTotalDisplay = document.getElementById('withdraw-total-display');
    const wColumns = ['date', 'bankdep', 'bankbad', 'visa', 'staff'];
    const W_INITIAL_ROWS = 50; // Số dòng ban đầu
    const W_MAX_ROWS = 200; // Số dòng tối đa
    let wData = loadData('dashboard_withdraw');
    if (!Array.isArray(wData)) wData = [];
    for (let i = wData.length; i < W_INITIAL_ROWS; i++) {
        wData.push({ date: '', bankdep: '', bankbad: '', visa: '', staff: '' });
    }

    /**
     * Kiểm tra xem một dòng withdraw có đã nhập hết các cột quan trọng không
     * @param {Object} row
     * @returns {boolean}
     */
    function isWithdrawRowComplete(row) {
        // Một dòng được coi là đã nhập hết nếu có:
        // - Ngày lấy VÀ
        // - Ít nhất một trong: Bank đẹp, Bank xấu, hoặc Visa
        const hasDate = row.date && row.date.trim() !== '';
        const hasBankDep = row.bankdep && parseFloat(row.bankdep) > 0;
        const hasBankBad = row.bankbad && parseFloat(row.bankbad) > 0;
        const hasVisa = row.visa && parseFloat(row.visa) > 0;
        return hasDate && (hasBankDep || hasBankBad || hasVisa);
    }

    /**
     * Thêm dòng mới vào withdraw table nếu cần (tối đa W_MAX_ROWS)
     */
    function addNewWithdrawRowIfNeeded() {
        // Kiểm tra nếu đã đạt tối đa
        if (wData.length >= W_MAX_ROWS) {
            return; // Không thêm nữa nếu đã đạt max
        }
        
        // Kiểm tra dòng cuối cùng
        const lastRow = wData[wData.length - 1];
        if (lastRow && isWithdrawRowComplete(lastRow)) {
            // Nếu dòng cuối đã nhập hết, thêm dòng mới
            wData.push({ date: '', bankdep: '', bankbad: '', visa: '', staff: '' });
            renderWithdrawTable();
            // Focus vào ô đầu tiên của dòng mới (Bank đẹp)
            const newRowIndex = wData.length - 1;
            const newRow = wTableBody.children[newRowIndex];
            if (newRow) {
                const bankDepCell = newRow.querySelector('td[data-col="bankdep"]');
                if (bankDepCell) {
                    // Delay một chút để đảm bảo DOM đã render
                    setTimeout(() => {
                        bankDepCell.focus();
                    }, 50);
                }
            }
        }
    }

    /**
     * Compute total for a withdrawal row - uses FormulaEngine.
     * 
     * Calculation: Bank đẹp + Bank xấu + Visa
     * 
     * Business Rule: All withdrawal sources are additive
     * - Each field is optional (defaults to 0 if empty)
     * - Only positive values are summed
     * - Result rounded to 2 decimal places
     * 
     * @param {Object} row - Withdraw row data
     * @param {string|number} row.bankdep - Bank deposit withdrawal
     * @param {string|number} row.bankbad - Bank bad withdrawal
     * @param {string|number} row.visa - Visa withdrawal
     * @returns {number} Total withdrawal amount
     * 
     * @example
     * computeWithdrawTotal({ bankdep: 1000, bankbad: 500, visa: 200 }) // Returns 1700
     * computeWithdrawTotal({ bankdep: 1000 }) // Returns 1000
     * computeWithdrawTotal({}) // Returns 0
     */
    function computeWithdrawTotal(row) {
        // Use FormulaEngine if available
        if (window.FormulaEngine) {
            return window.FormulaEngine.calculate('withdraw', 'total', row) || 0;
        }
        
        // Fallback: original implementation
        if (!row || typeof row !== 'object') {
            return 0;
        }
        
        const bDep = Math.max(0, parseFloat(row.bankdep) || 0);
        const bBad = Math.max(0, parseFloat(row.bankbad) || 0);
        const visa = Math.max(0, parseFloat(row.visa) || 0);
        
        const total = bDep + bBad + visa;
        return Math.round(total * 100) / 100;
    }

    /**
     * Render the withdraw table body from wData.
     */
    function renderWithdrawTable() {
        wTableBody.innerHTML = '';
        
        // Sắp xếp dữ liệu theo ngày để dòng kẻ xanh hoạt động đúng
        const sortedData = [...wData].sort((a, b) => {
            const dateA = normalizeDateForComparison(a.date);
            const dateB = normalizeDateForComparison(b.date);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.localeCompare(dateB);
        });
        
        let previousDate = null; // Theo dõi ngày trước đó (normalized)
        
        sortedData.forEach((row, rowIndex) => {
            const originalIndex = wData.indexOf(row);
            const tr = document.createElement('tr');
            
            // Chuẩn hóa và kiểm tra nếu ngày thay đổi so với dòng trước
            const currentDate = normalizeDateForComparison(row.date);
            if (currentDate && previousDate && currentDate !== previousDate) {
                // Thêm border-top màu xanh lá để ngăn cách ngày mới
                tr.style.borderTop = '3px solid #10b981';
                tr.style.boxShadow = '0 -2px 4px rgba(16, 185, 129, 0.1)';
            }
            previousDate = currentDate;
            
            const header = document.createElement('th');
            header.className = 'row-header';
            header.textContent = rowIndex + 2;
            tr.appendChild(header);
            wColumns.forEach(col => {
                const td = document.createElement('td');
                td.dataset.row = originalIndex;
                td.dataset.col = col;
                td.setAttribute('contenteditable', 'true');
                
                // Format display based on column type
                let displayValue = row[col] || '';
                if (displayValue && ['bankdep', 'bankbad', 'visa'].includes(col)) {
                    // Format money columns as VND
                    const moneyNum = parseFloat(displayValue);
                    if (!isNaN(moneyNum)) {
                        displayValue = formatVND(moneyNum);
                    }
                }
                
                td.textContent = displayValue;
                // Highlight the numeric columns as total cells when editing
                if (['bankdep', 'bankbad', 'visa'].includes(col)) {
                    td.classList.add('total-cell');
                }
                td.addEventListener('input', onWCellInput);
                
                // Add blur event to reformat after editing
                td.addEventListener('blur', function() {
                    const savedValue = wData[originalIndex][col];
                    if (savedValue && ['bankdep', 'bankbad', 'visa'].includes(col)) {
                        const numValue = parseFloat(savedValue);
                        if (!isNaN(numValue)) {
                            td.textContent = formatVND(numValue);
                        }
                    }
                });
                
                // Add focus event to show raw number for easier editing
                td.addEventListener('focus', function() {
                    const savedValue = wData[originalIndex][col];
                    if (savedValue && ['bankdep', 'bankbad', 'visa'].includes(col)) {
                        td.textContent = savedValue;
                    }
                });
                
                tr.appendChild(td);
            });
            wTableBody.appendChild(tr);
        });
        updateWithdrawTotal();
        refreshTableResize('withdraw-table', { enableRowResize: true });
    }

    /**
     * Handler for withdraw cell edits. Updates wData, recalculates
     * totals and persists to storage.
     * @param {Event} e
     */
    function onWCellInput(e) {
        const td = e.target;
        const rowIndex = parseInt(td.dataset.row, 10);
        const col = td.dataset.col;
        if (!Number.isInteger(rowIndex) || !col) return;
        
        let inputValue = td.textContent.trim();
        
        // Clean format characters for numeric columns
        if (['bankdep', 'bankbad', 'visa'].includes(col)) {
            // Remove currency symbols and commas
            inputValue = inputValue.replace(/[₫,]/g, '');
        }
        
        wData[rowIndex][col] = inputValue;
        
        // Tự động điền ngày tháng nếu người dùng nhập dữ liệu vào Bank đẹp, Bank xấu, hoặc Visa
        // và cột date đang trống
        if (['bankdep', 'bankbad', 'visa'].includes(col) && inputValue && !wData[rowIndex].date) {
            const currentDate = formatDateInput(getCurrentDate());
            wData[rowIndex].date = currentDate;
            // Cập nhật ô ngày tháng trên giao diện
            const tr = td.parentElement;
            const dateTd = tr.querySelector('td[data-col="date"]');
            if (dateTd) {
                dateTd.textContent = currentDate;
            }
        }
        
        updateWithdrawTotal();
        saveData('dashboard_withdraw', wData);
        
        // Tự động thêm dòng mới nếu dòng hiện tại đã nhập hết (tối đa 200 dòng)
        if (isWithdrawRowComplete(wData[rowIndex])) {
            addNewWithdrawRowIfNeeded();
        }
        
        // Highlight row as recently updated
        const tr = td.parentElement;
        if (tr) {
            highlightRecentRow(tr, 5000);
        }
    }

    /**
     * Sum the totals across all withdraw rows and display.
     */
    function updateWithdrawTotal() {
        let sum = 0;
        wData.forEach(row => {
            const v = computeWithdrawTotal(row);
            if (typeof v === 'number' && !isNaN(v)) sum += v;
        });
        wTotalDisplay.textContent = 'Tổng cộng: ' + formatVND(sum);
        
        // Cập nhật tổng trong bảng tổng
        updateTotalsTable();
    }

    /* ===================== COLUMN RESIZE FUNCTIONALITY ===================== */
    // Initial renders
    console.log('📊 Dashboard initializing...');
    console.log('🔄 Fetching P2P rates on page load...');
    fetchRates();
    if (alertBanner) {
        fetchAlertState();
        setInterval(fetchAlertState, ALERT_REFRESH_INTERVAL);
    }
    
    // Tự động cập nhật giá P2P USDT mỗi 10 phút
    setInterval(() => {
        console.log('🔄 Auto-refreshing P2P USDT rates (10-minute interval)...');
        fetchRates();
    }, 10 * 60 * 1000); // 10 phút = 10 × 60 giây × 1000ms
    
    // Thêm nút làm mới thủ công
    const refreshBtn = document.getElementById('refresh-p2p-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Manual refresh P2P rates...');
            fetchRates();
        });
    }
    
    renderConversionTable();
    renderWithdrawTable();
    // Cập nhật bảng tổng lần đầu
    updateTotalsTable();
    
    if (window.TableResizer) {
        window.TableResizer.initTables([
            'dashboard-rate-table',
            'dashboard-totals-conversion-table',
            'dashboard-totals-withdraw-table'
        ]);
    }
})();