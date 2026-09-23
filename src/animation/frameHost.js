let activeHost = null;

export function configureFrameHost(host) {
  activeHost = host;
  return () => {
    if (activeHost === host) activeHost = null;
  };
}

export function requestSharedFrame(callback) {
  return activeHost
    ? activeHost.request(callback)
    : window.requestAnimationFrame(callback);
}

export function cancelSharedFrame(id) {
  if (activeHost) activeHost.cancel(id);
  else window.cancelAnimationFrame(id);
}
