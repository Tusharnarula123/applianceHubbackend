import { webcrypto } from 'crypto';
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
    globalThis.crypto = webcrypto;
}
if (typeof global !== 'undefined' && !global.crypto) {
    global.crypto = webcrypto;
}
if (typeof window === 'undefined' && !(global.crypto)) {
    global.crypto = webcrypto;
}
//# sourceMappingURL=crypto-polyfill.js.map