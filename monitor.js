import  { CursorAnimator } from './cursor.js';
import CommandRunner from './commands.js';
import { Preferences } from './utils.js'


export const Direction = {
    NEXT: Symbol('next'),
    PREVIOUS: Symbol('previous'),
};

export class MonitorNavigator {
    constructor(settings, cursor_size) {
        this.settings = new Preferences(settings)
        this.cursor_size = cursor_size;
    }

    getCurrentMonitor(monitor) {
        const display = global.display;
        const totalMonitors = display.get_n_monitors();

        let currentMonitor = display.get_current_monitor();
        if(!this.settings.isMoveCursorEnabled()){
            let focusedWindow = global.display.get_focus_window();
            currentMonitor = focusedWindow ? focusedWindow.get_monitor() : null;
        }

        if (monitor === Direction.NEXT) {
            return (currentMonitor + 1) % totalMonitors;
        } else if (monitor === Direction.PREVIOUS) {
            return (currentMonitor - 1 + totalMonitors) % totalMonitors;
        } else if (Number.isInteger(monitor) && monitor >= 0 && monitor < totalMonitors) {
            return monitor;
        } else {
            throw new Error(`Invalid monitor argument: ${monitor}`);
        }
    }

    async navigateMonitor(monitor) {
        try {
            const targetMonitor = this.getCurrentMonitor(monitor);
            const geometry = global.display.get_monitor_geometry(targetMonitor);
            const centerX = geometry.x + geometry.width / 2;
            const centerY = geometry.y + geometry.height / 2;

            if (this.settings.isUpddateFocusEnabled()){
                this._focusMostRecentWindowOnMonitor(targetMonitor);
            }

            if (!this.settings.isMoveCursorEnabled()) {return}

            if (this.settings.isAnimateCursorEnabled()){
                const animator = new CursorAnimator(this.cursor_size);
                await animator.animateTo(centerX, centerY);
            } else{
                await CommandRunner.runCommand(['xdotool', 'mousemove', centerX.toString(), centerY.toString()]);
            }
        } catch (error) {
            console.error(`[binu] navigateMonitor error: ${error}`);
        }
    }

    swapWindowsWith(monitor) {
        try {
            let currentMonitor = global.display.get_current_monitor();
            if(!this.settings.isMoveCursorEnabled()){
                let focusedWindow = global.display.get_focus_window();
                currentMonitor = focusedWindow ? focusedWindow.get_monitor() : null;
            }
            const targetMonitor = this.getCurrentMonitor(monitor);

            if (targetMonitor === currentMonitor) {
                console.info(`[binu] Source and target monitors are the same.`);
                return;
            }

            const windows = global.get_window_actors().map(actor => actor.meta_window);
            const windowsOnCurrent = windows.filter(win => win.get_monitor() === currentMonitor);
            const windowsOnTarget = windows.filter(win => win.get_monitor() === targetMonitor);

            for (const win of windowsOnCurrent) {
                win.move_to_monitor(targetMonitor);
            }

            for (const win of windowsOnTarget) {
                win.move_to_monitor(currentMonitor);
            }

            if (this.settings.isUpddateFocusEnabled()){
                this._focusMostRecentWindowOnMonitor(currentMonitor);
            }

            console.debug(`[binu] Swapped windows between monitors ${currentMonitor} and ${targetMonitor}`);
        } catch (error) {
            console.error(`[binu] swapWindowsWith error: ${error}`);
        }
    }

    _focusMostRecentWindowOnMonitor(monitorIndex) {
        const recentWindows = global.display.get_tab_list(0, null);
        for (const win of recentWindows) {
            if (!win.minimized && !win.skip_taskbar && win.get_monitor() === monitorIndex) {
                win.activate(global.get_current_time());
                return;
            }
        }
    }
}
