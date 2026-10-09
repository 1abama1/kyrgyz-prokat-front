const path = require('node:path');
const fs = require('node:fs');

function contractPath(root, filename) {
  if (typeof filename !== 'string' || filename.length > 180 ||
      /[<>:"/\\|?*\x00-\x1f]/.test(filename) || !/\.xlsx$/i.test(filename) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename) || filename.endsWith(' ')) {
    throw new Error('Недопустимое имя Excel-файла');
  }
  const canonicalRoot = fs.realpathSync(root);
  const target = path.resolve(canonicalRoot, filename);
  if (path.dirname(target) !== canonicalRoot) throw new Error('Путь вне папки договоров');
  if (fs.existsSync(target) && (fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target)) {
    throw new Error('Ссылки на файлы запрещены');
  }
  return target;
}
function existingContractPath(root, input) {
  if (typeof input !== 'string') throw new Error('Неверный путь');
  const target = contractPath(root, path.basename(input));
  if (path.resolve(input) !== target || !fs.statSync(target).isFile()) throw new Error('Файл вне папки договоров');
  return target;
}
function externalUrl(input) {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Неверная ссылка');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Разрешены только HTTPS-ссылки');
  return url.href;
}
function trustedSender(event, window, expectedUrl) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
      new URL(event.senderFrame.url).href.split('#')[0] !== new URL(expectedUrl).href.split('#')[0]) {
    throw new Error('Недоверенный источник IPC');
  }
}
function excelBuffer(input) {
  if (!(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input)) throw new Error('Неверный файл');
  if (input.byteLength < 4 || input.byteLength > 25 * 1024 * 1024) throw new Error('Недопустимый размер файла');
  const bytes = input instanceof ArrayBuffer ? Buffer.from(input) : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Ожидается XLSX-файл');
  return bytes;
}
module.exports = { contractPath, existingContractPath, externalUrl, trustedSender, excelBuffer };
