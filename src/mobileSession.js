export function isMobileLaunch() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// No password or progress data is cached here. Supabase owns session persistence.
export function installForegroundRefresh(refresh) {
  const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
}
