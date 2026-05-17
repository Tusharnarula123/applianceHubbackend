// CommonJS polyfill that runs before the app starts
const { webcrypto } = require('crypto');

Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
