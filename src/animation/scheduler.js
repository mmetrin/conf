// One browser RAF, with all queued measurements before DOM/canvas writes.
export function createScheduler(host = window) {
  let frame = 0,
    nextId = 0,
    disposed = false;
  const reads = new Map(),
    writes = new Map();
  function flush(now) {
    frame = 0;
    const measuring = [...reads.values()];
    reads.clear();
    for (const callback of measuring) callback(now);
    const painting = [...writes.values()];
    writes.clear();
    for (const callback of painting) callback(now);
    if (reads.size || writes.size) wake();
  }
  function wake() {
    if (!frame && !disposed) frame = host.requestAnimationFrame(flush);
  }
  function request(callback, phase = "write") {
    if (disposed) return 0;
    const id = ++nextId;
    (phase === "read" ? reads : writes).set(id, callback);
    wake();
    return id;
  }
  function cancel(id) {
    reads.delete(id);
    writes.delete(id);
  }
  return {
    request,
    cancel,
    dispose() {
      disposed = true;
      host.cancelAnimationFrame(frame);
      reads.clear();
      writes.clear();
    },
  };
}
