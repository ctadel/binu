import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Swapper from './swapper.js';
import * as Cursor from './cursor.js';

export default class BinuExtension extends Extension {
    enable() {
        log("Enabling binu extension")
        this._settings = this.getSettings();
        log(this._settings)
        this._swapBinding = 'swap-hotkey';
        this._cursorBinding = 'cursor-hotkey';

        this._registerShortcut(this._swapBinding, () => Swapper.swapWindows());

        let originalCursorSize = 24;
        Cursor.getCursorSize().then(size => {
            originalCursorSize = size;
            log(`[binu] Original cursor size fetched: ${originalCursorSize}`);
        }).catch(error => {
            log(`[binu] Error fetching cursor size: ${error}`);
        });

        this._registerShortcut(this._cursorBinding, () => Cursor.moveCursorToNextMonitor(originalCursorSize));

        log('Binu extension enabled');
    }

    disable() {
        log("Disabling binu extension")
        Main.wm.removeKeybinding(this._swapBinding);
        Main.wm.removeKeybinding(this._cursorBinding);
        this._settings = null;
        log('Binu extension disabled');
    }

    _registerShortcut(name, handler) {
        if (!Main.wm.addKeybinding) return;

        Main.wm.addKeybinding(
            name,
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            handler
        );
    }
}
