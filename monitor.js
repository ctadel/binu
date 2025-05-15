import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Cursor } from './cursor.js';
import { Preferences } from './utils.js'


export const Direction = {
    NEXT: Symbol('next'),
    PREVIOUS: Symbol('previous'),
};

export class MonitorNavigator {
    constructor(settings) {
        this.settings = new Preferences(settings)
    }

    getTargetMonitor(monitor) {
        const display = global.display;
        const totalMonitors = display.get_n_monitors();

        let currentMonitor = display.get_current_monitor();
        if(!this.settings.isMoveCursorEnabled()){
            let focusedWindow = global.display.get_focus_window();
            currentMonitor = focusedWindow ? focusedWindow.get_monitor() : null;
        }

        if (monitor === Direction.NEXT)
            return (currentMonitor + 1) % totalMonitors;
        else if (monitor === Direction.PREVIOUS)
            return (currentMonitor - 1 + totalMonitors) % totalMonitors;
        else if (Number.isInteger(monitor) && monitor >= 0 && monitor < totalMonitors)
            return monitor;
        else
            throw new Error(`Invalid monitor argument: ${monitor}`);
    }

    async navigateMonitor(monitor) {
        try {
            const targetMonitor = this.getTargetMonitor(monitor);
            const geometry = global.display.get_monitor_geometry(targetMonitor);
            const centerX = geometry.x + geometry.width / 2;
            const centerY = geometry.y + geometry.height / 2;

            if (this.settings.isUpddateFocusEnabled()){
                this._focusMostRecentWindowOnMonitor(targetMonitor);
            }

            if (!this.settings.isMoveCursorEnabled()) {return}
            await Cursor.setCursorPosition(
                centerX, centerY,
                this.settings
            )
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
            const targetMonitor = this.getTargetMonitor(monitor);

            if (targetMonitor === currentMonitor) {
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

export class MonitorHandler{
    static _monitors = [];
    static _settings = null;
    static _signalId = null;

    static _getDisplayConfigInterface() {
        return `
        <node>
          <interface name="org.gnome.Mutter.DisplayConfig">
            <method name="GetCurrentState">
              <arg type="u" direction="out" name="serial"/>
              <arg type="a((ssss)a(siiddada{sv})a{sv})" direction="out" name="monitors"/>
              <arg type="a(iiduba(ssss)a{sv})" direction="out" name="logical_monitors"/>
              <arg type="a{sv}" direction="out" name="properties"/>
            </method>
          </interface>
        </node>`;
    }

    static _createDisplayConfigProxy(callback) {
        const DisplayConfigProxy = Gio.DBusProxy.makeProxyWrapper(MonitorHandler._getDisplayConfigInterface());
        return new DisplayConfigProxy(
            Gio.DBus.session,
            'org.gnome.Mutter.DisplayConfig',
            '/org/gnome/Mutter/DisplayConfig',
            callback
        );
    }

    static _fetchMonitorDetails(callback) {
        MonitorHandler._createDisplayConfigProxy(async (proxy, error) => {
            if (error) {
                log('Error creating proxy: ' + error.message);
                callback([]);
                return;
            }

            try {
                const [serial, monitors] = await proxy.GetCurrentStateAsync();

                const monitorDetails = monitors.map((monitor, index) => {
                    const [connector, vendor, product] = monitor[0];
                    const modes = monitor[1];

                    const currentMode = modes.find(mode => "is-current" in mode[6]);
                    const resolutionWidth = currentMode ? currentMode[1] : null;
                    const resolutionHeight = currentMode ? currentMode[2] : null;

                    const isBuiltIn = connector.toLowerCase().startsWith('edp') ||
                                      connector.toLowerCase().startsWith('lvds');

                    const displayName = isBuiltIn ? "Built-in display" : `${vendor} ${product}`;

                    return {
                        index,
                        brand: vendor,
                        model: product,
                        serial,
                        resolution: resolutionWidth && resolutionHeight ? {
                            width: resolutionWidth,
                            height: resolutionHeight
                        } : {},
                        displayName,
                        connector,
                        isBuiltIn
                    };
                });

                MonitorHandler._monitors = monitorDetails;

                let jsonMonitors = JSON.stringify(monitorDetails);
                MonitorHandler._settings.set_string('monitor-config', jsonMonitors);

                callback(monitorDetails);
                MonitorUIBridge.getInstance().emitMonitorsUpdated('monitors-updated');
            } catch (e) {
                log('Error in GetCurrentStateAsync: ' + e.message);
                callback([]);
            }
        });
    }

    static updateMonitorList() {
        MonitorHandler._fetchMonitorDetails(() => {});
    }

    static startWatching(settings) {
        MonitorHandler._settings = settings
        if (MonitorHandler._signalId !== null) {
            MonitorHandler.stopWatching();
        }

        MonitorHandler._signalId = Main.layoutManager.connect('monitors-changed', () => {
            log('Monitor change detected. Updating monitor list...');
            MonitorHandler.updateMonitorList();
        });

        MonitorHandler.updateMonitorList()
    }

    static stopWatching() {
        if (MonitorHandler._signalId !== null) {
            Main.layoutManager.disconnect(MonitorHandler._signalId);
            MonitorHandler._signalId = null;
            log('MonitorHandler: stopped watching monitor layout changes');
        }
    }

    static getMonitors() {
        return MonitorHandler._monitors;
    }
}

export const MonitorUIBridge = GObject.registerClass({
    Signals: {
        'monitors-updated': {},
    },
}, class MonitorUIBridge extends GObject.Object {
    static _instance;
    static getInstance() {
        if (!MonitorUIBridge._instance) {
            MonitorUIBridge._instance = new MonitorUIBridge();
        }
        return MonitorUIBridge._instance;
    }

    _monitorsUpdatedSignalId = null;

    onMonitorsUpdated(callback) {
        if (this._monitorsUpdatedSignalId) {
            this.disconnect(this._monitorsUpdatedSignalId);
        }

        this._monitorsUpdatedSignalId = this.connect('monitors-updated', callback);
    }

    emitMonitorsUpdated() {
        this.emit('monitors-updated');
    }

    getMonitors() {
        return MonitorHandler.getMonitors();
    }
});
