import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import { Timer } from './utils.js';

export class CursorAnimator {
    constructor(animationDuration) {
        this.animationDuration = animationDuration
        this.zoomedCursorSize = Cursor.originalCursorSize * 3
    }

    async animateTo(targetX, targetY) {
        try {
            Cursor.setCursorSize(this.zoomedCursorSize);
            await this._animateCursor(targetX, targetY);

            await Timer.sleep(30);
            Cursor.setCursorSize(Cursor.originalCursorSize);

            await this._nudgeCursor(); // to force refresh
        } catch (error) {
            console.error(`[binu] animateTo() error: ${error}`);
            Cursor.setCursorSize(Cursor.originalCursorSize);
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
            await Cursor._setCursorPosition(x, y)
            if (delay > 0) await Timer.sleep(delay);
        }
    }

    async _nudgeCursor() {
        const [x, y] = global.get_pointer();
        await Cursor._setCursorPosition(x + 1, y)
        await Timer.sleep(50);
        await Cursor._setCursorPosition(x, y)
    }
}

export class VirtualPointer {
    static virtualPointer = null;

    static initVirtualPointer() {
        if (VirtualPointer.virtualPointer)
            return;

        const seat = Clutter.get_default_backend().get_default_seat();
        VirtualPointer.virtualPointer = seat.create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    }

    static destroyVirtualPointer() {
        if (VirtualPointer.virtualPointer?.destroy)
            VirtualPointer.virtualPointer.destroy();
        VirtualPointer.virtualPointer = null;
    }
}

export class Cursor {

    // Initialized these static variables in the Extension's enable()
    static originalCursorSize = null
    static pointer = null

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

    static async _setCursorPosition(x_axis, y_axis) {
        const timestamp = global.get_current_time();
        Cursor.pointer.notify_absolute_motion(timestamp, x_axis, y_axis);
    }

    static async setCursorPosition(x_axis, y_axis, settings) {
        if (settings.isAnimateCursorEnabled()) {
            const animationDuration = settings.getAnimationDuration()
            const animator = new CursorAnimator(animationDuration);
            await animator.animateTo(x_axis, y_axis);
        } else {
            await Cursor._setCursorPosition(x_axis, y_axis)
        }
    }
}
