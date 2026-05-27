# 🛰️ Отказоустойчивое бортовое ПО спутника

Система управления спутником с автоматическим восстановлением после сбоев на базе PM2 и Redis.

## 📋 Требования

- Node.js 18+
- Docker
- PM2 (`npm install -g pm2`)
- Git

## 🚀 Быстрый старт

```bash
# Клонирование
git clone https://github.com/ваш-username/satellite-project.git
cd satellite-project

# Установка зависимостей
npm install

# Запуск Redis
docker run -d --name redis -p 6379:6379 --restart always redis

# Запуск проекта
pm2 start ecosystem.config.js

# Открыть веб-интерфейс
# http://localhost:8080
📁 Структура проекта
text
satellite-project/
├── public/
│   └── index.html          # Веб-интерфейс
├── storage/                 # Хранилище фото (создаётся автоматически)
├── ecosystem.config.js     # Конфигурация PM2
├── orientation.js          # Управление ориентацией (2 экземпляра)
├── disturbance.js          # Симулятор дрейфа
├── commander.js            # API команд (порт 3000)
├── scheduler.js            # Планировщик фото
├── gateway.js              # API шлюз (порт 8080)
└── package.json

🎮 Команды PM2
bash
pm2 status                # Статус всех процессов
pm2 logs                  # Просмотр логов
pm2 restart all           # Перезапуск всех
pm2 reload scheduler      # Zero-downtime перезагрузка
pm2 stop all              # Остановка всех
pm2 delete all            # Удаление всех процессов
pm2 monit                 # Мониторинг в реальном времени
🐛 Устранение проблем
Redis не подключается
bash
docker restart redis
docker exec -it redis redis-cli ping  # Должен вернуть PONG
Процессы в статусе error
bash
pm2 logs --err --lines 30  # Посмотреть ошибки
pm2 delete all
pm2 start ecosystem.config.js
Порт занят
bash
# Найти процесс на порту 3000 или 8080
netstat -ano | findstr :3000
taskkill /PID <PID> /F
Модули не найдены
bash
npm install
📄 Лицензия
MIT
