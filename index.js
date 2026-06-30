const mineflayer = require('mineflayer');
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// تخزين البوتات
const bots = new Map();

// =========================
// إنشاء بوت جديد
// =========================
function createBot(config) {
    const botId = config.id;

    const bot = mineflayer.createBot({
        host: config.host,
        port: parseInt(config.port) || 25565,
        username: config.username,
        version: config.version || false
    });

    const data = {
        id: botId,
        bot,
        config,
        status: 'connecting',
        logs: [],
        reconnect: true
    };

    bots.set(botId, data);

    function log(message) {
        const line = `[${new Date().toLocaleTimeString()}] ${message}`;
        data.logs.push(line);

        if (data.logs.length > 100) {
            data.logs.shift();
        }

        console.log(`[${botId}] ${message}`);
    }

    bot.on('spawn', () => {
        data.status = 'online';
        log('Bot connected successfully');
    });

    bot.on('chat', (username, message) => {
        log(`${username}: ${message}`);
    });

    bot.on('end', () => {
        data.status = 'offline';
        log('Disconnected');

        if (data.reconnect) {
            log('Reconnecting in 10 seconds...');

            setTimeout(() => {
                createBot(config);
            }, 10000);
        }
    });

    bot.on('error', (err) => {
        log(`Error: ${err.message}`);
    });

    return data;
}

// =========================
// الصفحة الرئيسية
// =========================
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Minecraft Bot Manager Running',
        bots: bots.size
    });
});

// =========================
// إنشاء بوت
// =========================
app.post('/api/bots/create', (req, res) => {

    const {
        id,
        host,
        port,
        username,
        version
    } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Bot ID required'
        });
    }

    if (bots.has(id)) {
        return res.status(400).json({
            success: false,
            message: 'Bot already exists'
        });
    }

    createBot({
        id,
        host,
        port,
        username,
        version
    });

    res.json({
        success: true,
        message: 'Bot created'
    });
});

// =========================
// حذف بوت
// =========================
app.delete('/api/bots/:id', (req, res) => {

    const id = req.params.id;

    const botData = bots.get(id);

    if (!botData) {
        return res.status(404).json({
            success: false
        });
    }

    botData.reconnect = false;
    botData.bot.quit();

    bots.delete(id);

    res.json({
        success: true,
        message: 'Bot removed'
    });
});

// =========================
// قائمة البوتات
// =========================
app.get('/api/bots', (req, res) => {

    const result = [];

    bots.forEach((data) => {

        result.push({
            id: data.id,
            username: data.config.username,
            host: data.config.host,
            status: data.status
        });

    });

    res.json(result);
});

// =========================
// إرسال رسالة أو أمر
// =========================
app.post('/api/bots/:id/chat', (req, res) => {

    const id = req.params.id;
    const { message } = req.body;

    const botData = bots.get(id);

    if (!botData) {
        return res.status(404).json({
            success: false
        });
    }

    botData.bot.chat(message);

    res.json({
        success: true
    });
});

// =========================
// السجلات
// =========================
app.get('/api/bots/:id/logs', (req, res) => {

    const id = req.params.id;

    const botData = bots.get(id);

    if (!botData) {
        return res.status(404).json({
            success: false
        });
    }

    res.json(botData.logs);
});

// =========================
// معلومات بوت
// =========================
app.get('/api/bots/:id', (req, res) => {

    const id = req.params.id;

    const botData = bots.get(id);

    if (!botData) {
        return res.status(404).json({
            success: false
        });
    }

    res.json({
        id: botData.id,
        username: botData.config.username,
        host: botData.config.host,
        version: botData.config.version,
        status: botData.status
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
