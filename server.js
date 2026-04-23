const express = require('express');
const path = require('path');
const app = express();
const FormData = require('form-data');
const fetch = require('node-fetch');
const multer = require('multer');

// Multer ማዋቀር (ለፋይል መጫን)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB ገደብ
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ============ ከRender Environment Variables ============
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || '000000'; // ደህንነቱ የተጠበቀ ኮድ

// ============ GET endpoint ለሙከራ ============
app.get('/api/telegram', (req, res) => {
    res.json({ message: 'API is working! Use POST to send messages.' });
});

// ============ POST endpoint ለመልእክት መላክ ============
app.post('/api/telegram', upload.single('image'), async (req, res) => {
    console.log('📨 POST request received');
    
    try {
        const { chatId, message } = req.body;
        const imageFile = req.file;
        
        if (!BOT_TOKEN) {
            return res.json({ success: false, error: 'BOT_TOKEN not set' });
        }
        
        const targetId = chatId || ADMIN_ID;
        
        if (imageFile) {
            // ምስል መላክ
            console.log('🖼️ Sending photo...');
            const formData = new FormData();
            formData.append('chat_id', targetId);
            formData.append('photo', imageFile.buffer, {
                filename: imageFile.originalname,
                contentType: imageFile.mimetype
            });
            formData.append('caption', message || '');
            
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            });
            const result = await response.json();
            res.json({ success: result.ok });
        } else {
            // ጽሁፍ ብቻ መላክ
            console.log('📝 Sending text...');
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetId, text: message })
            });
            const result = await response.json();
            res.json({ success: result.ok });
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ success: false, error: error.message });
    }
});

// ============ Config endpoint ============
app.get('/api/config', (req, res) => {
    // ሚስጥራዊ ኮዱን ከዚህ አንልክም፤ ማረጋገጫ የሚደረገው በሰርቨሩ ነው
    res.json({ adminId: ADMIN_ID, channelId: CHANNEL_ID });
});

// ============ የአስተዳዳሪ ኮድ ማረጋገጫ ============
app.post('/api/verify-admin', (req, res) => {
    const { code } = req.body;
    if (code === ADMIN_SECRET_CODE) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// ============ ዋና ገጽ ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ ሰርቨር ማስጀመሪያ ============
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`✅ Server on port ${port}`);
    console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅' : '❌'}`);
    console.log(`👤 ADMIN_ID: ${ADMIN_ID ? '✅' : '❌'}`);
    console.log(`📢 CHANNEL_ID: ${CHANNEL_ID ? '✅' : '❌'}`);
    console.log(`🔐 ADMIN_SECRET_CODE: ${ADMIN_SECRET_CODE ? '✅' : '❌ (Using default)'}`);
});
