import Gio from 'gi://Gio';
import CommandRunner from './commands.js';
import { Timer } from './utils.js';

const ANIMATION_DURATION_MS = 50;

export class CursorAnimator {
    constructor(originalCursorSize, animationDuration = ANIMATION_DURATION_MS) {
        this.originalCursorSize = originalCursorSize;
        this.animationDuration = animationDuration;
    }

    async animateTo(targetX, targetY) {
        try {
            const increasedSize = this.originalCursorSize * 3;
            this.setCursorSize(increasedSize);
            console.debug(`[binu] Cursor size increased to: ${increasedSize}`);

            await this._animateCursor(targetX, targetY);

            await Timer.sleep(100);
            this.setCursorSize(this.originalCursorSize);
            console.debug(`[binu] Cursor size restored to: ${this.originalCursorSize}`);

            await this._nudgeCursor(); // to force refresh
        } catch (error) {
            console.error(`[binu] animateTo() error: ${error}`);
        }
    }

    setCursorSize(size) {
        try {
            const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
            settings.set_int('cursor-size', size);
        } catch (error) {
            console.error(`[binu] Failed to set cursor size: ${error}`);
        }
    }

    async _animateCursor(targetX, targetY) {
        const [startX, startY] = global.get_pointer();
        const dx = targetX - startX;
        const dy = targetY - startY;

        const steps = 30;
        const delay = Math.floor(this.animationDuration / steps);

        for (let i = 0; i <= steps; i++) {
            if (!Timer.enabled) return;
            const x = Math.round(startX + dx * (i / steps));
            const y = Math.round(startY + dy * (i / steps));
            await CommandRunner.runCommand(['xdotool', 'mousemove', x.toString(), y.toString()]);
            if (delay > 0) await Timer.sleep(delay);
        }

        console.debug(`[binu] Cursor animated to (${targetX}, ${targetY})`);
    }

    async _nudgeCursor() {
        const [x, y] = global.get_pointer();
        await CommandRunner.runCommand(['xdotool', 'mousemove', (x + 1).toString(), y.toString()]);
        await Timer.sleep(50);
        await CommandRunner.runCommand(['xdotool', 'mousemove', x.toString(), y.toString()]);
    }
}

export function getCursorSize() {
    const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
    return settings.get_int('cursor-size');
}

export async function moveCursorToNextMonitor(cursorSize) {
    try {
        const display = global.display;
        const currentMonitor = display.get_current_monitor();
        const totalMonitors = display.get_n_monitors();
        const nextMonitor = (currentMonitor + 1) % totalMonitors;

        const geometry = display.get_monitor_geometry(nextMonitor);
        const centerX = geometry.x + geometry.width / 2;
        const centerY = geometry.y + geometry.height / 2;

        const animator = new CursorAnimator(cursorSize);
        await animator.animateTo(centerX, centerY);
    } catch (error) {
        console.error(`[binu] moveCursorToNextMonitor error: ${error}`);
    }
}
