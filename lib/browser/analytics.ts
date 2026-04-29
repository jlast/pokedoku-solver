declare global {
  interface Window {
    sa_event: (event: string, metadata?: Record<string, string | number>) => void;
    sa_loaded: boolean;
  }
}

export function trackEvent(name: string, metadata?: Record<string, string | number>, callback?: () => void) {
  if (window.sa_loaded) {
    window.sa_event(name, metadata);
    if (callback) callback();
  } else if (callback) {
    callback();
  }
}
