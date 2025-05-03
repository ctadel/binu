import GLib from 'gi://GLib';

export class Timer {
    static _timeouts = new Set();
    static enabled = false;

    static enable() {
        Timer.enabled = true;
    }

    static disable() {
        Timer.enabled = false;
        for (const id of Timer._timeouts) {
            GLib.Source.remove(id);
        }
        Timer._timeouts.clear();
    }

    static sleep(ms) {
        if (!Timer.enabled) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
                Timer._timeouts.delete(id);
                resolve();
                return GLib.SOURCE_REMOVE;
            });
            Timer._timeouts.add(id);
        });
    }

    static runLater(ms, cb) {
        if (!Timer.enabled || typeof cb !== 'function') return null;
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            Timer._timeouts.delete(id);
            cb();
            return GLib.SOURCE_REMOVE;
        });
        Timer._timeouts.add(id);
        return id;
    }
}
