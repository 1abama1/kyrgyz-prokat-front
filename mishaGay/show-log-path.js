const log = require('electron-log');
const path = require('path');
const os = require('os');

// Получаем путь к логам
const logPath = log.transports.file.getFile().path;

console.log('='.repeat(80));
console.log('📝 ПУТЬ К ЛОГАМ ПРИЛОЖЕНИЯ');
console.log('='.repeat(80));
console.log('');
console.log('Полный путь к файлу логов:');
console.log(logPath);
console.log('');
console.log('Папка с логами:');
console.log(path.dirname(logPath));
console.log('');
console.log('Для открытия папки в проводнике, выполните:');
console.log(`explorer "${path.dirname(logPath)}"`);
console.log('');
console.log('='.repeat(80));

// Также выводим стандартные пути
console.log('');
console.log('📂 СТАНДАРТНЫЕ ПУТИ ELECTRON:');
console.log('='.repeat(80));
console.log('');
console.log('AppData (Roaming):');
console.log(path.join(os.homedir(), 'AppData', 'Roaming', 'Rental Desktop App'));
console.log('');
console.log('Logs (стандартный путь):');
console.log(path.join(os.homedir(), 'AppData', 'Roaming', 'Rental Desktop App', 'logs'));
console.log('');
console.log('='.repeat(80));
