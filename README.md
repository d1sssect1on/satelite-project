## 🛰️ Отказоустойчивое бортовое ПО спутника
Последнюю версию программы можно скачать на странице [Releases](https://github.com/d1sssect1on/satelite-project/releases/tag/v1.0.0).
```markdown

Система управления спутником с автоматическим восстановлением после сбоев на базе PM2 и Redis.

## 📥 Скачать

```bash
git clone https://github.com/ваш-username/satellite-project.git
cd satellite-project

```

## 🚀 Установка и запуск

**1. Установите зависимости**

```bash
npm install
```

**2. Запустите Redis**

```bash
docker run -d --name redis -p 6379:6379 --restart always redis
```

**3. Установите PM2**

```bash
npm install -g pm2
```

**4. Запустите проект**

```bash
pm2 start ecosystem.config.js
pm2 start gateway.js --name gateway
```

**5. Откройте веб-интерфейс**

```
http://localhost:8080
```

## 💻 Системные требования

| Компонент | Требование |
|-----------|-------------|
| Операционная система | Windows / macOS / Linux |
| Node.js | версия 18 или выше |
| Docker | для запуска Redis |
| PM2 | устанавливается глобально |
| Оперативная память | от 1 ГБ |
| Свободное место | от 100 МБ |

## 🏗️ Компоненты системы

| Компонент | Порт | Режим | Кол-во | Описание |
|-----------|------|-------|--------|----------|
| orientation | - | cluster | 2 | Управление ориентацией спутника |
| disturbance | - | fork | 1 | Симулятор дрейфа |
| commander | 3000 | fork | 1 | Командный API |
| scheduler | - | fork | 1 | Планировщик фото |
| gateway | 8080 | fork | 1 | Веб-шлюз |

## 👥 Роли в системе

| Роль | Возможности |
|------|-------------|
| Оператор | Просмотр состояния спутника, отправка команд, управление фото |
| Администратор | Управление процессами PM2 (restart/reload/stop/start) |

## 📡 API эндпоинты

**Commander API (порт 3000)**

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /api/healthcheck | Проверка доступности |
| GET | /api/coords | Получить координаты спутника |
| GET | /api/tasks/list | Список задач в очереди |
| PUT | /api/tasks/photo | Добавить задачу на фото |
| GET | /api/photos/list | Список готовых фото |
| DELETE | /api/photos/delete/{id} | Удалить фото |

**Gateway API (порт 8080)**

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | /api/status | Полный статус системы |
| GET | /api/processes | Список процессов PM2 |
| POST | /api/command | Отправка команды |
| POST | /api/restart/{name} | Перезапуск процесса |
| POST | /api/reload/{name} | Zero-downtime reload |
| POST | /api/stop/{name} | Остановка процесса |
| GET | /api/logs/{name} | Получить логи процесса |

## 📁 Структура проекта

```
satellite-project/
├── public/
│   └── index.html          # Веб-интерфейс
├── storage/                 # Хранилище фото (создаётся автоматически)
├── ecosystem.config.js     # Конфигурация PM2
├── orientation.js          # Управление ориентацией
├── disturbance.js          # Симулятор дрейфа
├── commander.js            # Командный модуль
├── scheduler.js            # Планировщик фото
├── gateway.js              # API шлюз
└── package.json
```

## 🛠️ Технологии

| Технология | Назначение |
|------------|------------|
| Node.js | Среда выполнения |
| Express | Веб-сервер |
| PM2 | Менеджер процессов |
| Redis | Общая шина данных |
| Axios | HTTP-запросы |

## 🎮 Команды управления

```bash
pm2 start "name".js --name "name"      # Запуск процесса
pm2 status                             # Статус всех процессов
pm2 logs                               # Просмотр логов
pm2 restart all                        # Перезапуск всех процессов
pm2 reload scheduler                   # Zero-downtime перезагрузка
pm2 stop all                           # Остановка всех процессов
pm2 list                               # Мониторинг процессов
docker restart redis                   # Перезапуск Redis
docker exec -it redis redis-cli ping   # Проверка работы Redis
```

## 📄 Лицензия

MIT
```
MIT License

Copyright (c) 2026 d1sssect1on

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
