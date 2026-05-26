const redis = require('redis');

const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

let disturbanceInterval = null;
let isRunning = true;

console.log('Симулятор дрейфа запущен');

async function init() {
  try {
    await redisClient.connect();
    console.log('Симулятор дрейфа подключен к Redis');
    
    // Запускаем симуляцию возмущений
    disturbanceInterval = setInterval(applyDisturbance, 500);
    
  } catch (error) {
    console.error('Ошибка симулятора дрейфа:', error);
    process.exit(1);
  }
}

async function applyDisturbance() {
  if (!isRunning) return;
  
  try {
    // Получаем текущие координаты
    const coords = await redisClient.hGetAll('satellite:coords');
    if (!coords || !coords.x) return;
    
    let currentX = parseFloat(coords.x);
    let currentY = parseFloat(coords.y);
    let currentZ = parseFloat(coords.z);
    
    // Случайное возмущение от -2 до +2
    const disturbanceX = (Math.random() - 0.5) * 4;
    const disturbanceY = (Math.random() - 0.5) * 4;
    const disturbanceZ = (Math.random() - 0.5) * 4;
    
    currentX += disturbanceX;
    currentY += disturbanceY;
    currentZ += disturbanceZ;
    
    // Ограничиваем диапазон (чтобы не улетело в бесконечность)
    currentX = Math.max(-50, Math.min(50, currentX));
    currentY = Math.max(-50, Math.min(50, currentY));
    currentZ = Math.max(-50, Math.min(50, currentZ));
    
    await redisClient.hSet('satellite:coords', {
      x: currentX.toString(),
      y: currentY.toString(),
      z: currentZ.toString(),
      lastUpdate: Date.now().toString()
    });
    
    // Логируем только значительные возмущения (10% случаев)
    if (Math.abs(disturbanceX) > 1.5 || Math.abs(disturbanceY) > 1.5 || Math.abs(disturbanceZ) > 1.5) {
      console.log(`🌍 Возмущение: (${disturbanceX.toFixed(2)}, ${disturbanceY.toFixed(2)}, ${disturbanceZ.toFixed(2)}) -> координаты: (${currentX.toFixed(2)}, ${currentY.toFixed(2)}, ${currentZ.toFixed(2)})`);
    }
    
  } catch (error) {
    console.error('Ошибка применения возмущения:', error);
  }
}

process.on('SIGINT', async () => {
  console.log('Симулятор дрейфа завершает работу...');
  isRunning = false;
  if (disturbanceInterval) {
    clearInterval(disturbanceInterval);
  }
  await redisClient.quit();
  process.exit(0);
});

init().catch(console.error);