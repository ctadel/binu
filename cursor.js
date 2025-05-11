import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import CommandRunner from './commands.js';
import { Timer } from './utils.js';


const ANIMATION_DURATION_MS = 50;

export class CursorAnimator {
    constructor(displaySession) {
        this.displaySession = displaySession
        this.zoomedCursorSize = Cursor.originalCursorSize * 3
    }

    async animateTo(targetX, targetY) {
        try {
            Cursor.setCursorSize(this.zoomedCursorSize);
            await this._animateCursor(targetX, targetY);

            await Timer.sleep(100);
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
        const delay = Math.floor(ANIMATION_DURATION_MS / steps);

        for (let i = 0; i <= steps; i++) {
            if (!Timer.enabled) return;
            const x = Math.round(startX + dx * (i / steps));
            const y = Math.round(startY + dy * (i / steps));
            await Cursor._setCursorPosition(this.displaySession, x, y)
            if (delay > 0) await Timer.sleep(delay);
        }
    }

    async _nudgeCursor() {
        const [x, y] = global.get_pointer();
        await Cursor._setCursorPosition(this.displaySession, x + 1, y)
        await Timer.sleep(50);
        await Cursor._setCursorPosition(this.displaySession, x, y)
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
    static wayland_pointer = null

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

    static async _setCursorPosition(displaySession, x_axis, y_axis) {
        if (displaySession === 'x11'){
            await CommandRunner.runCommand(['xdotool', 'mousemove', x_axis.toString(), y_axis.toString()]);
        } else {
            const timestamp = global.get_current_time();
            Cursor.wayland_pointer.notify_absolute_motion(timestamp, x_axis, y_axis);
        }
    }

    static async setCursorPosition(displaySession, x_axis, y_axis, animation = false) {
        if (animation) {
            const animator = new CursorAnimator(displaySession);
            await animator.animateTo(x_axis, y_axis);
        } else {
            await Cursor._setCursorPosition(displaySession, x_axis, y_axis)
        }
    }
}
