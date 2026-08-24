export class NetworkStore {
  private manualOffline: boolean;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.manualOffline = localStorage.getItem('manualOffline') === 'true';
    
    window.addEventListener('online', () => this.notify());
    window.addEventListener('offline', () => this.notify());
  }

  get isOffline() {
    return this.manualOffline || !navigator.onLine;
  }

  get isManualOffline() {
    return this.manualOffline;
  }

  get isBrowserOffline() {
    return !navigator.onLine;
  }

  setManualOffline(value: boolean) {
    this.manualOffline = value;
    localStorage.setItem('manualOffline', String(value));
    this.notify();
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkStore = new NetworkStore();
