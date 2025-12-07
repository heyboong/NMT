/**
 * Auto-update current month label on homepage
 * Updates "TỔNG THÁNG X" label based on current month
 */
(function() {
    function updateMonthLabel() {
        const monthLabel = document.getElementById('current-month-label');
        if (!monthLabel) return;

        const currentMonth = new Date().getMonth() + 1; // 1-12
        monthLabel.textContent = `TỔNG THÁNG ${currentMonth}`;
    }

    // Update on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateMonthLabel);
    } else {
        updateMonthLabel();
    }
})();
