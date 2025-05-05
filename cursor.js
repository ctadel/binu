import Gio from 'gi://Gio';
import CommandRunner from './commands.js';
import { Timer } from './utils.js';

const ANIMATION_DURATION_MS = 50;

export class CursorAnimator {
    constructor(originalCursorSize, animationDuration = ANIMATION_DURATION_MS) {
        this.originalCursorSize = originalCursorSize;
        this.animationDuration = animationDuration;
        this.zoomedCursorSize = originalCursorSize * 3
    }

    async animateTo(targetX, targetY) {
        try {
            CursorConfig.setCursorSize(this.zoomedCursorSize);
            await this._animateCursor(targetX, targetY);

            await Timer.sleep(100);
            CursorConfig.setCursorSize(this.originalCursorSize);

            await this._nudgeCursor(); // to force refresh
        } catch (error) {
            console.error(`[binu] animateTo() error: ${error}`);
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
    }

    async _nudgeCursor() {
        const [x, y] = global.get_pointer();
        await CommandRunner.runCommand(['xdotool', 'mousemove', (x + 1).toString(), y.toString()]);
        await Timer.sleep(50);
        await CommandRunner.runCommand(['xdotool', 'mousemove', x.toString(), y.toString()]);
    }
}

export class CursorConfig {
    static getCursorSize() {
        const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
        return settings.get_int('cursor-size');
    }

    static setCursorSize(size) {
        try {
            const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
            settings.set_int('cursor-size', size);
        } catch (error) {
            console.error(`[binu] Failed to set cursor size: ${error}`);
        }
    }
}
