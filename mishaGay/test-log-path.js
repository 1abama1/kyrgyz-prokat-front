const log = require('electron-log');
const { app } = require('electron');

console.log('Log file path:', log.transports.file.getFile().path);
console.log('App path:', app ? app.getPath('userData') : 'N/A (app not initialized)');
