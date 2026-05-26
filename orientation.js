const redis = require('redis');

// Подключение к Redis
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

// Эталонные координаты (куда должен смотреть спутник)
const TARGET_COORDS = { x: 0, y: 0, z: 0 };
const DEVIATION_THRESHOLD = 5; // Порог отклонения
const CORRECTION_FACTOR = 0.1; // На сколько корректируем за раз (10%)

let correctionInterval = null;
let isShuttingDown = false;

// Генерация уникального ID для этого экземпляра
const instanceId = `${process.env.INSTANCE_ID || 'orientation'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

console.log(`[${instanceId}] Запущен модуль ориентации`);
// Имитация падения только для экземпляра с чётным pm_id (обычно orientation-0)
/*
if (instanceId.includes('orientation') && process.env.NODE_APP_INSTANCE === '0') {
    console.log(`[${instanceId}] СИМУЛЯЦИЯ ПАДЕНИЯ через 3 секунды...`);
    setTimeout(() => {
        throw new Error('Тестовое падение orientation-0');
    }, 3000);
}
*/
async function init() {
  try {
    await redisClient.connect();
    console.log(`[${instanceId}] Подключен к Redis`);
    
    // Инициализируем координаты если их нет
    const coordsExist = await redisClient.exists('satellite:coords');
    if (!coordsExist) {
      await redisClient.hSet('satellite:coords', {
        x: '0',
        y: '0',
        z: '0',
        lastUpdate: Date.now().toString()
      });
      console.log(`[${instanceId}] Инициализированы начальные координаты`);
    }
    
    // Запускаем цикл коррекции
    correctionInterval = setInterval(correctOrientation, 500);
    
  } catch (error) {
    console.error(`[${instanceId}] Ошибка инициализации:`, error);
    process.exit(1);
  }
}

async function correctOrientation() {
  if (isShuttingDown) return;
  
  try {
    // Получаем текущие координаты
    const coords = await redisClient.hGetAll('satellite:coords');
    if (!coords || !coords.x) return;
    
    const currentX = parseFloat(coords.x);
    const currentY = parseFloat(coords.y);
    const currentZ = parseFloat(coords.z);
    
    // Вычисляем отклонения
    const deltaX = TARGET_COORDS.x - currentX;
    const deltaY = TARGET_COORDS.y - currentY;
    const deltaZ = TARGET_COORDS.z - currentZ;
    
    const deviation = Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ);
    
    // Если отклонение превышает порог - корректируем
    if (deviation > DEVIATION_THRESHOLD) {
      // Плавная коррекция (не резко, чтобы не было колебаний)
      const correctionX = deltaX * CORRECTION_FACTOR;
      const correctionY = deltaY * CORRECTION_FACTOR;
      const correctionZ = deltaZ * CORRECTION_FACTOR;
      
      const newX = currentX + correctionX;
      const newY = currentY + correctionY;
      const newZ = currentZ + correctionZ;
      
      await redisClient.hSet('satellite:coords', {
        x: newX.toString(),
        y: newY.toString(),
        z: newZ.toString(),
        lastUpdate: Date.now().toString()
      });
      
      console.log(`[${instanceId}] Коррекция: отклонение=${deviation.toFixed(2)}, новые координаты=(${newX.toFixed(2)}, ${newY.toFixed(2)}, ${newZ.toFixed(2)})`);
    } else {
      // Небольшой вывод для мониторинга (раз в 5 секунд, чтобы не заспамить)
      if (Math.random() < 0.1) {
        console.log(`[${instanceId}] Стабильно: отклонение=${deviation.toFixed(2)}`);
      }
    }
    
  } catch (error) {
    console.error(`[${instanceId}] Ошибка коррекции:`, error);
  }
}

// Graceful shutdown для zero-downtime обновления
process.on('SIGINT', async () => {
  console.log(`[${instanceId}] Получен SIGINT, завершаем работу...`);
  isShuttingDown = true;
  
  if (correctionInterval) {
    clearInterval(correctionInterval);
  }
  
  await redisClient.quit();
  console.log(`[${instanceId}] Завершен`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`[${instanceId}] Получен SIGTERM, завершаем работу...`);
  isShuttingDown = true;
  
  if (correctionInterval) {
    clearInterval(correctionInterval);
  }
  
  await redisClient.quit();
  console.log(`[${instanceId}] Завершен`);
  process.exit(0);
});

// Запускаем модуль
init().catch(console.error);