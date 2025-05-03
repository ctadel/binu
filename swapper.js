export function swapWindows() {
    const windows = global.get_window_actors().map(actor => actor.meta_window);

    const windowsByMonitor = windows.reduce((acc, win) => {
        const monitor = win.get_monitor();
        if (!acc[monitor]) acc[monitor] = [];
        acc[monitor].push(win);
        return acc;
    }, {});

    const monitorsWithWindows = Object.keys(windowsByMonitor).map(Number);
    const totalMonitors = global.display.get_n_monitors();

    if (monitorsWithWindows.length === 2) {
        const [mon1, mon2] = monitorsWithWindows;
        for (const win of windowsByMonitor[mon1]) {
            win.move_to_monitor(mon2);
        }
        for (const win of windowsByMonitor[mon2]) {
            win.move_to_monitor(mon1);
        }
        console.debug(`[binu] Swapped windows between monitors ${mon1} and ${mon2}`);
    } else if (monitorsWithWindows.length === 1 && totalMonitors >= 2) {
        const sourceMonitor = monitorsWithWindows[0];
        const targetMonitor = [...Array(totalMonitors).keys()].find(m => m !== sourceMonitor);

        for (const win of windowsByMonitor[sourceMonitor]) {
            win.move_to_monitor(targetMonitor);
        }

        console.debug(`[binu] Moved all windows from monitor ${sourceMonitor} to monitor ${targetMonitor}`);
    } else {
        console.info(`[binu] Cannot swap windows – need at least 2 monitors.`);
    }
}
