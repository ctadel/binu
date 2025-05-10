import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { MonitorNavigator, Direction } from './monitor.js';
import { Timer, ShortcutManager } from './utils.js';
import { CursorConfig } from './cursor.js';

export default class BinuExtension extends Extension {
    enable() {
        Timer.enable();
        this._settings = this.getSettings();
        this.originalCursorSize = CursorConfig.getCursorSize();
        this.navigation = new MonitorNavigator(this._settings, this.originalCursorSize);
        this.shortcuts = new ShortcutManager(this._settings);

        // Binding Window Navigation shortcuts
        this.shortcuts.register('monitor-next', () =>
            this.navigation.navigateMonitor(Direction.NEXT)
        );
        this.shortcuts.register('monitor-prev', () =>
            this.navigation.navigateMonitor(Direction.PREVIOUS)
        );

        for (let i = 0; i < 8; i++) {
            this.shortcuts.register(`monitor-${i}`, () =>
                this.navigation.navigateMonitor(i)
            );
        }

        // Binding Swapping windows shortcuts
        this.shortcuts.register('swap-next', () =>
            this.navigation.swapWindowsWith(Direction.NEXT)
        );
        this.shortcuts.register('swap-prev', () =>
            this.navigation.swapWindowsWith(Direction.PREVIOUS)
        );

        for (let i = 0; i < 8; i++) {
            this.shortcuts.register(`swap-${i}`, () =>
                this.navigation.swapWindowsWith(i)
            );
        }

        console.info('Binu extension enabled');
    }

    disable() {
        Timer.disable();
        this.shortcuts.unregisterAll();
        this.shortcuts = null
        this._settings = null;
        this.navigation = null
        this.originalCursorSize = null
        console.info('Binu extension disabled');
    }
}
