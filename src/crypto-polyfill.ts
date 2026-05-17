import { webcrypto } from 'crypto';

// Polyfill crypto for Node.js
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

if (typeof global !== 'undefined' && !global.crypto) {
  global.crypto = webcrypto as any;
}

// Also handle global object
if (typeof window === 'undefined' && !((global as any).crypto)) {
  (global as any).crypto = webcrypto;
}
