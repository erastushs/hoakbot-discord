module.exports = {
  apps: [
    {
      name: 'hoakbot',
      script: 'dist/bootstrap.js',
      interpreter: 'node',

      max_memory_restart: '512M',
      max_restarts: 10,
      restart_delay: 5000,

      kill_timeout: 15000,
      wait_ready: true,
      listen_timeout: 20000,

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
      },

      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
