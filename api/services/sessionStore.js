const store = new Map();
const TTL = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.ts > TTL) del(k);
  }
}, 60000);

function set(id, data) { store.set(id, { ...data, ts: Date.now() }); }
function get(id) { const e = store.get(id); return e && Date.now() - e.ts < TTL ? e : null; }
function del(id) {
  const e = store.get(id);
  if (e) {
    if (e.page) e.page.close().catch(() => {});
    if (e.ctx) e.ctx.close().catch(() => {});
  }
  store.delete(id);
}

function cleanupAll() {
  for (const [k] of store) del(k);
}

module.exports = { set, get, del, cleanupAll };
