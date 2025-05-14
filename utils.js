import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
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

export class ShortcutManager {
    constructor(settings) {
        this.settings = settings;
        this.registered = new Set();
    }

    register(name, handler) {
        if (!Main.wm.addKeybinding) return;

        Main.wm.addKeybinding(
            name,
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            handler
        );
        this.registered.add(name);
    }

    unregisterAll() {
        for (const name of this.registered) {
            Main.wm.removeKeybinding(name);
        }
        this.registered.clear();
    }
}

export class Preferences{
    constructor(settings){
      this._settings = settings
    }

    isMoveCursorEnabled() {
        // Move cursor while navigation
        return this._settings.get_boolean('move-cursor');
    }

    isAnimateCursorEnabled() {
        // Animate cursor movement
        return this._settings.get_boolean('animate-cursor');
    }

    isUpddateFocusEnabled() {
        // Do not change window focus
        return this._settings.get_boolean('update-focus');
    }

    getAnimationDuration() {
        return this._settings.get_int('animate-cursor-duration');
    }
}

export class System {
    static getDisplaySession() {
        return GLib.getenv('XDG_SESSION_TYPE')
    }
}
