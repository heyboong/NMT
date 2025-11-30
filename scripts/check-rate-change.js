const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');

const STATE_FILE = path.join(__dirname, 'rate-snapshot.json');
const PROXY_URL = process.env.ALERT_PROXY_URL || 'http://localhost:3001/api/p2p-rate';
const THRESHOLD_PERCENT = parseFloat(process.env.ALERT_THRESHOLD_PERCENT) || 0.5;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO;
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM;
const ALERT_SMTP_HOST = process.env.ALERT_SMTP_HOST;
const ALERT_SMTP_PORT = parseInt(process.env.ALERT_SMTP_PORT, 10) || 587;
const ALERT_SMTP_USER = process.env.ALERT_SMTP_USER;
const ALERT_SMTP_PASS = process.env.ALERT_SMTP_PASS;
const ALERT_WEBHOOK = process.env.ALERT_WEBHOOK_URL;

async function loadSnapshot() {
    try {
        const raw = await fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return {};
    }
}

async function saveSnapshot(data) {
    await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2));
}

function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
}

async function sendEmailAlert(subject, text) {
    if (!ALERT_EMAIL_TO || !ALERT_EMAIL_FROM || !ALERT_SMTP_HOST) {
        console.log('Email not configured, skipping alert email.');
        return;
    }
    const transporter = nodemailer.createTransport({
        host: ALERT_SMTP_HOST,
        port: ALERT_SMTP_PORT,
        secure: ALERT_SMTP_PORT === 465,
        auth: {
            user: ALERT_SMTP_USER,
            pass: ALERT_SMTP_PASS
        }
    });
    await transporter.sendMail({
        from: ALERT_EMAIL_FROM,
        to: ALERT_EMAIL_TO,
        subject,
        text
    });
    console.log('Alert email sent.');
}

async function postWebhook(message) {
    if (!ALERT_WEBHOOK) return;
    try {
        await fetch(ALERT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });
        console.log('Webhook notified.');
    } catch (err) {
        console.error('Webhook notification failed:', err.message);
    }
}

async function notifyChange(oldRate, newRate, percentChange) {
    const subject = 'Alert: Tỷ giá USDT→VND thay đổi';
    const text = `Giá cũ: ${oldRate.toLocaleString('vi-VN')}₫\n` +
        `Giá mới: ${newRate.toLocaleString('vi-VN')}₫\n` +
        `Thay đổi: ${formatPercentage(percentChange)}\n` +
        `Nguồn: ${PROXY_URL}`;
    console.log('Threshold reached, sending alert:', text);
    await Promise.all([
        sendEmailAlert(subject, text),
        postWebhook(text)
    ]);
}

async function fetchProxyRate() {
    const response = await fetch(PROXY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Proxy fetch failed (${response.status})`);
    const payload = await response.json();
    const sell = parseFloat(payload.sellPrice) || 0;
    const buy = parseFloat(payload.buyPrice) || 0;
    const value = sell || buy;
    if (!value) throw new Error('Proxy returned zero rate');
    return value;
}

(async () => {
    try {
        const currentRate = await fetchProxyRate();
        const snapshot = await loadSnapshot();
        const previousRate = snapshot?.rate || currentRate;
        const delta = Math.abs(currentRate - previousRate);
        const percentChange = previousRate > 0 ? (delta / previousRate) * 100 : 0;
        const thresholdReached = previousRate > 0 && percentChange >= THRESHOLD_PERCENT;
        if (thresholdReached) {
            await notifyChange(previousRate, currentRate, percentChange);
        } else {
            console.log('Change below threshold:', formatPercentage(percentChange));
        }
        const nextState = {
            rate: currentRate,
            timestamp: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            lastChangePercent: percentChange,
            thresholdPercent: THRESHOLD_PERCENT,
            lastAlertAt: thresholdReached ? new Date().toISOString() : snapshot?.lastAlertAt || null,
            lastAlertChange: thresholdReached ? percentChange : snapshot?.lastAlertChange || null,
            lastAlertRate: thresholdReached ? currentRate : snapshot?.lastAlertRate || null
        };
        await saveSnapshot(nextState);
    } catch (err) {
        console.error('Rate alert job failed:', err.message);
    }
})();
