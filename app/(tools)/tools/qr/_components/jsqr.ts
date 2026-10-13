// The QR decoder, loaded on demand by QrScanner. Re-exported from this module
// so the dynamic import gets an ES module with a named export, rather than a
// CommonJS default that needs interop at the call.
export { default as jsQR } from "jsqr";
