module.exports = {
  apps: [
    {
      name: 'orientation',
      script: './orientation.js',
      instances: 2,              // Два экземпляра для отказоустойчивости
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '100M',
      kill_timeout: 5000,
      listen_timeout: 3000,
      env: {
        NODE_ENV: 'production',
        INSTANCE_ID: 'orientation'
      }
    },
    {
      name: 'disturbance',
      script: './disturbance.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '50M',
      kill_timeout: 3000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'commander',
      script: './commander.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '150M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'scheduler',
      script: './scheduler.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '100M',
      kill_timeout: 10000,     // 10 секунд на graceful shutdown
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};