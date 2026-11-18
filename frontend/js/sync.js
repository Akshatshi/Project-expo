(function () {
    if (!window.SM || !SM.auth.token()) return;
    const SYNCED = /^sm_(resume|apps|cover|note_[a-z0-9_]+|best_[a-z0-9_]+)$/, timers = {};
    const sync = {
        get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
        set(k, v) {
            try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
            if (!SYNCED.test(k)) return;
            clearTimeout(timers[k]);
            timers[k] = setTimeout(() => SM.api.put('/data/' + k, { value: v }).catch(() => {}), 800);
        },
        del(k) { localStorage.removeItem(k); if (SYNCED.test(k)) SM.api.del('/data/' + k).catch(() => {}); },
        async pull() {
            const { data } = await SM.api.get('/data');
            Object.keys(data).forEach((k) => localStorage.setItem(k, JSON.stringify(data[k])));
            Object.keys(localStorage).filter((k) => SYNCED.test(k) && !(k in data)).forEach((k) => SM.api.put('/data/' + k, { value: sync.get(k) }).catch(() => {}));
        },
    };
    sync.ready = sync.pull().catch(() => {});
    SM.sync = sync;
})();
