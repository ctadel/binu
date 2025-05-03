import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import CommandRunner from './commands.js';

const ANIMATION_DURATION_MS = 50;

class CursorAnimator {
    constructor(original_cursor_size, animationDuration) {
        this.animationDuration = animationDuration;
        this.originalCursorSize = original_cursor_size;
    }

    async run() {
        try {
            const increasedSize = this.originalCursorSize * 3;
            this.setCursorSize(increasedSize);
            console.debug(`[binu] Cursor size tripled: ${increasedSize}`);

            await this.animateCursor();

            // Delay a bit before restoring, then restore size and wiggle
            await this.sleep(100);
            this.setCursorSize(this.originalCursorSize);
            console.debug(`[binu] Cursor size restored to ${this.originalCursorSize}`);

            this.nudgeCursor(); // force refresh
        } catch (error) {
            console.error(`[binu] Error in run(): ${error}`);
        }
    }

    setCursorSize(size) {
        try {
            let settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
            settings.set_int('cursor-size', size);
        } catch (error) {
            console.error(`[binu] Failed to set cursor size: ${error}`);
        }
    }

    async animateCursor() {
        try {
            const display = global.display;
            const currentMonitor = display.get_current_monitor();
            const nMonitors = display.get_n_monitors();
            const nextMonitor = (currentMonitor + 1) % nMonitors;

            const monitorGeom = display.get_monitor_geometry(nextMonitor);
            const centerX = monitorGeom.x + monitorGeom.width / 2;
            const centerY = monitorGeom.y + monitorGeom.height / 2;

            const [x, y] = global.get_pointer();
            const dx = centerX - x;
            const dy = centerY - y;
            const steps = 30;
            const delay = Math.floor(this.animationDuration / steps);

            for (let i = 0; i <= steps; i++) {
                const px = Math.round(x + dx * (i / steps));
                const py = Math.round(y + dy * (i / steps));
                await CommandRunner.runCommand(['xdotool', 'mousemove', px.toString(), py.toString()]);
                if (delay > 0) await this.sleep(delay);
            }

            console.debug(`[binu] Pointer moved to center of monitor ${nextMonitor}`);
        } catch (error) {
            console.error(`[binu] Failed to move pointer: ${error}`);
        }
    }

    nudgeCursor() {
        const [x, y] = global.get_pointer();
        CommandRunner.runCommand(['xdotool', 'mousemove', (x + 1).toString(), y.toString()]);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            CommandRunner.runCommand(['xdotool', 'mousemove', x.toString(), y.toString()]);
            return GLib.SOURCE_REMOVE;
        });
    }

    sleep(ms) {
        return new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            resolve();
            return GLib.SOURCE_REMOVE;
        }));
    }
}

export function getCursorSize() {
    let settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
    return settings.get_int('cursor-size');
}

export async function moveCursorToNextMonitor(cursor_size) {
    try {
        const animator = new CursorAnimator(cursor_size, ANIMATION_DURATION_MS);
        await animator.run();
    } catch (e) {
        console.error(`[binu] Unhandled error in moveCursorToNextMonitor: ${e}`);
    }
}
