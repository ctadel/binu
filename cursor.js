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
            Cursor.setCursorSize(this.zoomedCursorSize);
            await this._animateCursor(targetX, targetY);

            await Timer.sleep(100);
            Cursor.setCursorSize(this.originalCursorSize);

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
            await Cursor.setCursorPosition(x, y)
            if (delay > 0) await Timer.sleep(delay);
        }
    }

    async _nudgeCursor() {
        const [x, y] = global.get_pointer();
        await Cursor.setCursorPosition(x + 1, y)
        await Timer.sleep(50);
        await Cursor.setCursorPosition(x, y)
    }
}

export class Cursor {

    static originalCursorSize = null

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

    static async setCursorPosition(x_axis, y_axis, animation = false) {
        if (animation) {
            const animator = new CursorAnimator(Cursor.originalCursorSize);
            await animator.animateTo(x_axis, y_axis);
        } else {
            await CommandRunner.runCommand(['xdotool', 'mousemove', x_axis.toString(), y_axis.toString()]);
        }
    }
}
