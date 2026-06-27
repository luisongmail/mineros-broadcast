import '@testing-library/jest-dom/vitest';

// ResizeObserver no existe en jsdom — mock que dispara callback inmediatamente con ancho fijo
globalThis.ResizeObserver = class ResizeObserver {
  private _cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) { this._cb = cb; }
  observe(el: Element) {
    this._cb([{ contentRect: { width: 1200 } } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
};
