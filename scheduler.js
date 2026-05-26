const redis = require('redis');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR);
}

const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

// Убираем ограничение MAX_PHOTOS
let isRunning = true;
let currentTask = null;

console.log('📸 Планировщик фото ЗАПУЩЕН (без ограничений)');

async function init() {
    try {
        await redisClient.connect();
        console.log('✅ Подключен к Redis');
        
        // Обработка каждые 10 секунд
        setInterval(processQueue, 10000);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

async function processQueue() {
    if (!isRunning) return;
    
    try {
        // Проверяем наличие задач в очереди
        const queueLength = await redisClient.lLen('tasks:photo');
        
        if (queueLength === 0) {
            return;
        }
        
        // Берем задачу из очереди
        const taskJson = await redisClient.lPop('tasks:photo');
        
        if (!taskJson) {
            return;
        }
        
        const task = JSON.parse(taskJson);
        const taskTimestamp = task.timestamp;
        const taskDate = new Date(taskTimestamp);
        const taskDateStr = `${String(taskDate.getDate()).padStart(2, '0')}/${String(taskDate.getMonth() + 1).padStart(2, '0')}/${taskDate.getFullYear()} ${String(taskDate.getHours()).padStart(2, '0')}:${String(taskDate.getMinutes()).padStart(2, '0')}:${String(taskDate.getSeconds()).padStart(2, '0')}`;
        
        console.log(`📷 Начинаем обработку задачи ${task.id}`);
        console.log(`   Команда создана: ${taskDateStr}`);
        currentTask = task;
        
        // Симуляция съемки 10 секунд (для теста)
        console.log(`⏳ Съемка... (10 сек)`);
        await sleep(10000);
        
        // Создаем файл фото
        const now = new Date();
        const nowDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Используем task.id как имя файла
        const photoName = `photo_${task.id}.txt`;
        const photoPath = path.join(STORAGE_DIR, photoName);

        const existingPhotos = fs.readdirSync(STORAGE_DIR).filter(f => f.startsWith('photo_'));
        if (existingPhotos.length >= 5) {
            console.log(`❌ Лимит 5 фото достигнут. Задача ${task.id} отклонена.`);
            return;  // не создаём фото
        }
        
        const photoContent = {
            id: task.id,
            commandTimestamp: task.timestamp,
            commandDate: taskDateStr,
            createdTimestamp: Date.now(),
            createdDate: nowDateStr,
            description: 'Снимок спутника',
            filename: photoName
        };
        
        fs.writeFileSync(photoPath, JSON.stringify(photoContent, null, 2));
        
        console.log(`✅ Фото создано: ${photoName}`);
        console.log(`   Дата съемки: ${nowDateStr}`);
        currentTask = null;
        
    } catch (error) {
        console.error('❌ Ошибка обработки:', error);
        currentTask = null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('SIGINT', async () => {
    console.log('🛑 Остановка планировщика...');
    isRunning = false;
    if (currentTask) {
        console.log(`⚠️ Возвращаем задачу ${currentTask.id} в очередь`);
        await redisClient.rPush('tasks:photo', JSON.stringify(currentTask));
    }
    console.log('🔄 Graceful handover completed — очередь сохранена в Redis');
    await redisClient.quit();
    process.exit(0);
});

init().catch(console.error);