const express = require('express');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR);
}

console.log('🚀 Командный модуль запускается...');

async function init() {
    try {
        await redisClient.connect();
        //4.3 Расскоментить и pm2 restart commander
        //throw new Error('Симуляция фатальной ошибки командного модуля');
        console.log('✅ Connected to Redis');
        
        const exists = await redisClient.exists('satellite:coords');
        if (!exists) {
            await redisClient.hSet('satellite:coords', {
                x: '0',
                y: '0',
                z: '0',
                lastUpdate: Date.now().toString()
            });
            console.log('✅ Координаты инициализированы');
        }
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Commander слушает порт ${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

app.get('/api/healthcheck', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/coords', async (req, res) => {
    try {
        const coords = await redisClient.hGetAll('satellite:coords');
        
        if (!coords || !coords.x) {
            return res.json({
                current: { x: 0, y: 0, z: 0 },
                target: { x: 0, y: 0, z: 0 },
                deviation: 0,
                isStable: true
            });
        }
        
        const target = { x: 0, y: 0, z: 0 };
        const currentX = parseFloat(coords.x);
        const currentY = parseFloat(coords.y);
        const currentZ = parseFloat(coords.z);
        
        const deltaX = target.x - currentX;
        const deltaY = target.y - currentY;
        const deltaZ = target.z - currentZ;
        const deviation = Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ);
        
        res.json({
            current: { x: currentX, y: currentY, z: currentZ },
            target: target,
            deviation: deviation,
            isStable: deviation <= 5
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal error' });
    }
});

app.put('/api/tasks/photo', async (req, res) => {
    try {
        const task = {
            id: Date.now(),
            command: 'photo',
            timestamp: Date.now(),
            status: 'pending'
        };
        
        await redisClient.rPush('tasks:photo', JSON.stringify(task));
        const queueLength = await redisClient.lLen('tasks:photo');
        
        console.log(`📷 Добавлена задача ${task.id}, очередь: ${queueLength}`);
        
        res.json({ 
            success: true, 
            message: 'Task added to queue',
            task: task,
            queueSize: queueLength
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add task' });
    }
});

app.get('/api/tasks/list', async (req, res) => {
    try {
        const tasks = await redisClient.lRange('tasks:photo', 0, -1);
        const parsed = tasks.map(t => JSON.parse(t));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

// Get photos list с правильными датами
app.get('/api/photos/list', (req, res) => {
    try {
        const files = fs.readdirSync(STORAGE_DIR);
        const photos = files
            .filter(f => f.includes('photo_') && f.endsWith('.txt'))
            .map(f => {
                const filePath = path.join(STORAGE_DIR, f);
                let photoData = {};
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    photoData = JSON.parse(content);
                } catch(e) {
                    photoData = { 
                        createdDate: new Date(fs.statSync(filePath).birthtime).toLocaleString(),
                        filename: f
                    };
                }
                
                return {
                    id: f,
                    name: f,
                    filename: f,
                    dateTime: photoData.createdDate || photoData.commandDate || 'Неизвестно',
                    commandDate: photoData.commandDate || 'Неизвестно',
                    size: fs.statSync(filePath).size
                };
            })
            .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
        
        console.log(`📸 Отправлено ${photos.length} фото`);
        res.json(photos);
    } catch (error) {
        console.error('Error getting photos:', error);
        res.status(500).json({ error: 'Failed to get photos' });
    }
});

// Get photo (download)
app.get('/api/photos/get/:id', (req, res) => {
    try {
        const photoPath = path.join(STORAGE_DIR, req.params.id);
        if (!fs.existsSync(photoPath)) {
            return res.status(404).json({ error: 'Photo not found', filename: req.params.id });
        }
        res.sendFile(photoPath);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get photo' });
    }
});

// Delete photo - ИСПРАВЛЕНО
app.delete('/api/photos/delete/:id', (req, res) => {
    try {
        const photoId = req.params.id;
        const photoPath = path.join(STORAGE_DIR, photoId);
        
        console.log(`🗑️ Попытка удалить: ${photoPath}`);
        
        if (!fs.existsSync(photoPath)) {
            return res.status(404).json({ error: 'Photo not found', filename: photoId });
        }
        
        fs.unlinkSync(photoPath);
        console.log(`✅ Удалено фото: ${photoId}`);
        res.json({ success: true, message: `Photo ${photoId} deleted` });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.get('/api/processes', (req, res) => {
    res.json([
        { name: 'orientation', status: 'online', restarts: 0 },
        { name: 'disturbance', status: 'online', restarts: 0 },
        { name: 'commander', status: 'online', restarts: 0 },
        { name: 'scheduler', status: 'online', restarts: 0 }
    ]);
});

process.on('SIGINT', async () => {
    await redisClient.quit();
    process.exit(0);
});

init().catch(console.error);