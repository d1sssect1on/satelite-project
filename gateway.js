const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pm2 = require('pm2');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = 8080;
const COMMANDER_URL = 'http://localhost:3000';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

let pm2Connected = false;

pm2.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к PM2:', err);
        process.exit(1);
    }
    pm2Connected = true;
    console.log('✅ PM2 API подключен');
});

app.get('/api/status', async (req, res) => {
    try {
        let coords = null;
        let commanderStatus = 'offline';
        
        try {
            const coordsResponse = await axios.get(`${COMMANDER_URL}/api/coords`, { timeout: 2000 });
            coords = coordsResponse.data;
            commanderStatus = 'online';
        } catch (err) {
            console.error('Ошибка получения координат:', err.message);
        }
        
        let processes = [];
        if (pm2Connected) {
            pm2.list((err, list) => {
                if (!err && list) {
                    processes = list.map(p => ({
                        name: p.name,
                        id: p.pm_id,
                        status: p.pm2_env.status,
                        uptime: p.pm2_env.pm_uptime,
                        restarts: p.pm2_env.restart_time,
                        cpu: p.monit ? p.monit.cpu : 0,
                        memory: p.monit ? p.monit.memory : 0,
                        instance: p.pm2_env.instance_var || 'default'
                    }));
                }
            });
            await sleep(100);
        }
        
        res.json({
            timestamp: Date.now(),
            commanderStatus: commanderStatus,
            coords: coords,
            processes: processes
        });
        
    } catch (error) {
        console.error('Ошибка получения статуса:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/command', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Команда не указана' });
        }
        
        const parts = command.split(' ');
        const method = parts[0];
        let urlPath = parts[1];
        
        if (!method || !urlPath) {
            return res.status(400).json({ error: 'Неверный формат команды' });
        }
        
        let response;
        if (method === 'GET') {
            response = await axios.get(`${COMMANDER_URL}${urlPath}`, { timeout: 5000 });
        } else if (method === 'POST') {
            response = await axios.post(`${COMMANDER_URL}${urlPath}`, {}, { timeout: 5000 });
        } else if (method === 'PUT') {
            response = await axios.put(`${COMMANDER_URL}${urlPath}`, {}, { timeout: 5000 });
        } else if (method === 'DELETE') {
            response = await axios.delete(`${COMMANDER_URL}${urlPath}`, { timeout: 5000 });
        } else {
            return res.status(400).json({ error: 'Неподдерживаемый метод' });
        }
        
        res.json({
            success: true,
            command: command,
            response: response.data
        });
        
    } catch (error) {
        console.error('Ошибка выполнения команды:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            command: req.body.command
        });
    }
});

app.post('/api/restart/:name', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    pm2.restart(req.params.name, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс ${req.params.name} перезапущен` });
    });
});

app.post('/api/reload/:name', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    pm2.reload(req.params.name, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс ${req.params.name} перезагружен` });
    });
});

app.post('/api/stop/:name', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    pm2.stop(req.params.name, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс ${req.params.name} остановлен` });
    });
});

app.get('/api/processes', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    pm2.list((err, list) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const processes = list.map(p => ({
            name: p.name,
            id: p.pm_id,
            status: p.pm2_env.status,
            restarts: p.pm2_env.restart_time,
            cpu: p.monit ? p.monit.cpu : 0,
            memory: p.monit ? p.monit.memory : 0
        }));
        
        res.json(processes);
    });
});

// Получить логи - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get('/api/logs/:name', (req, res) => {
    const processName = req.params.name;
    const logsDir = `C:\\Users\\${process.env.USERNAME}\\.pm2\\logs\\`;
    
    try {
        const files = fs.readdirSync(logsDir);
        const logFiles = files.filter(f => 
            f.startsWith(processName) && 
            f.includes('-out') && 
            f.endsWith('.log')
        );
        
        if (logFiles.length === 0) {
            return res.json({ logs: [
                `❌ Лог файлы не найдены для ${processName}`,
                `📁 Искали в: ${logsDir}`,
                `💡 Чтобы создать логи, выполните: pm2 logs ${processName}`
            ]});
        }
        
        logFiles.sort((a, b) => {
            const statA = fs.statSync(path.join(logsDir, a));
            const statB = fs.statSync(path.join(logsDir, b));
            return statB.mtimeMs - statA.mtimeMs;
        });
        
        const latestLogFile = logFiles[0];
        const logPath = path.join(logsDir, latestLogFile);
        
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim() && l.length > 0);
        const lastLines = lines.slice(-30);
        
        res.json({ logs: lastLines.length ? lastLines : [`[${new Date().toLocaleTimeString()}] Логов пока нет`] });
        
    } catch (error) {
        console.error('Ошибка чтения логов:', error);
        res.json({ logs: [`Ошибка: ${error.message}`] });
    }
});

// Получить фото
app.get('/api/photo/:filename', (req, res) => {
    const filename = req.params.filename;
    const photoPath = path.join(__dirname, 'storage', filename);
    
    console.log(`📸 Запрос фото: ${filename} -> ${photoPath}`);
    
    if (fs.existsSync(photoPath)) {
        res.sendFile(photoPath);
    } else {
        res.status(404).send(`Фото не найдено: ${filename}`);
    }
});
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
    console.log(`✅ Шлюз запущен на порту ${PORT}`);
    console.log(`🌐 Открой: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    if (pm2Connected) pm2.disconnect();
    process.exit(0);
});
// Остановить процесс по ID
app.post('/api/stop-id/:id', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    const processId = parseInt(req.params.id);
    
    pm2.stop(processId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс с ID ${processId} остановлен` });
    });
});

// Запустить процесс по ID
app.post('/api/start-id/:id', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    const processId = parseInt(req.params.id);
    
    pm2.start(processId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс с ID ${processId} запущен` });
    });
});

// Перезапустить процесс по ID
app.post('/api/restart-id/:id', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    const processId = parseInt(req.params.id);
    
    pm2.restart(processId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс с ID ${processId} перезапущен` });
    });
});

// Запустить процесс по имени
app.post('/api/start/:name', (req, res) => {
    if (!pm2Connected) return res.status(503).json({ error: 'PM2 не подключен' });
    
    const processName = req.params.name;
    
    pm2.start(processName, (err, proc) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Процесс ${processName} запущен` });
    });
});