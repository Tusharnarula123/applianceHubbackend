// Polyfill for crypto in Node.js environment
import { webcrypto } from 'crypto';

// Make crypto available globally
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Also set it in globalThis
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
