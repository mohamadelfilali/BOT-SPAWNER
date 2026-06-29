const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// تفعيل قراءة البيانات المرسلة بصيغة JSON (مهم لربطه بالواجهة لاحقاً)
app.use(express.json());

let bot = null;

// 1. سيرفر الويب لمنع توقف الاستضافة وللربط مع الواجهة
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send({ status: bot ? "مصل" : "غير متصل", message: "سيرفر البوت يعمل بنجاح" });
});

// 2. دالة تشغيل البوت وإعداداتها
function startBot(options) {
    // إذا كان هناك بوت يعمل حالياً، نقوم بفصله أولاً قبل تشغيل الجديد
    if (bot) {
        bot.quit();
    }

    console.log(`جاري تشغيل البوت للإصدار: ${options.version || 'تلقائي'}`);

    bot = mineflayer.createBot({
        host: options.host || process.env.MC_HOST,
        port: parseInt(options.port) || parseInt(process.env.MC_PORT) || 25565,
        username: options.username || process.env.MC_USERNAME || 'Bot_Railway',
        version: options.version || process.env.MC_VERSION || false // دعم تغيير الإصدارات
    });

    // أحداث البوت (Events)
    bot.on('spawn', () => {
        console.log(`[${bot.username}] دخل السيرفر بنجاح!`);
    });

    bot.on('chat', (username, message) => {
        console.log(`[شات اللعبة] ${username}: ${message}`);
    });

    bot.on('disconnect', (reason) => {
        console.log(`انقطع الاتصال: ${reason}`);
    });

    bot.on('error', (err) => {
        console.error('حدث خطأ في البوت:', err);
    });
}

// 3. مسار (API) لاستقبال الرسائل والأوامر من الواجهة ليرسلها البوت داخل السيرفر
app.post('/api/send-chat', (req, res) => {
    const { message } = req.body;
    if (bot && bot.spawned) {
        bot.chat(message); // إرسال الرسالة أو الأمر (مثال: /spawn) داخل السيرفر
        return res.json({ success: true, message: "تم إرسال الرسالة بنجاح" });
    }
    return res.status(400).json({ success: false, message: "البوت غير متصل بالسيرفر حالياً" });
});

// 4. مسار (API) لتغيير إعدادات البوت (الإصدار، السيرفر، الاسم) وتشغيله من جديد
app.post('/api/connect', (req, res) => {
    const { host, port, username, version } = req.body;
    startBot({ host, port, username, version });
    res.json({ success: true, message: "جاري تشغيل البوت بالإعدادات الجديدة..." });
});

// تشغيل البوت تلقائياً عند تشغيل السيرفر بالإعدادات الافتراضية
startBot({});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
