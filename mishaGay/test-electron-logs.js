const { app } = require('electron');
const log = require('electron-log');

// Настраиваем так же, как в main.ts
log.transports.file.level = 'info';

app.whenReady().then(() => {
    const path = log.transports.file.getFile().path;
    console.log('Попытка записи в:', path);

    log.info('=== ТЕСТОВЫЙ ЗАПУСК ДЛЯ ПРОВЕРКИ ЛОГОВ ===');
    log.info('Время записи: ' + new Date().toLocaleString());
    log.info('Приложение готово, логи должны быть здесь.');

    console.log('Запись выполнена. Проверьте файл через 2 секунды.');

    setTimeout(() => {
        app.quit();
    }, 2000);
});
