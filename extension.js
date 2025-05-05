import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { MonitorNavigator, Direction } from './monitor.js';
import { Timer, ShortcutManager } from './utils.js';
import { CursorConfig } from './cursor.js';

export default class BinuExtension extends Extension {
    enable() {
        Timer.enable();
        this._settings = this.getSettings();
        this._swapBinding = 'swap-hotkey';
        this._cursorBinding = 'cursor-hotkey';

        this.originalCursorSize = CursorConfig.getCursorSize();
        this.navigation = new MonitorNavigator(this.originalCursorSize);
        this.shortcuts = new ShortcutManager(this._settings);

        this.shortcuts.register(this._swapBinding, () =>
            this.navigation.swapWindowsWith(Direction.NEXT)
        );
        this.shortcuts.register(this._cursorBinding, () =>
            this.navigation.navigateMonitor(Direction.NEXT)
        );

        console.info('Binu extension enabled');
    }

    disable() {
        Timer.disable();
        this.shortcuts.unregisterAll();
        this._settings = null;
        console.info('Binu extension disabled');
    }
}
