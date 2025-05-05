import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BinuPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const home = new HomeSettings(window._settings);
        const preferences = new PreferencesSettings(window._settings);
        const about = new AboutSettings();

        window.add(home.page);
        window.add(preferences.page);
        window.add(about.page);
    }
}

class HomeSettings {
    constructor(schema) {
        this.schema = schema;
        this.page = new Adw.PreferencesPage({ title: _('Home') });

        this.buildNavigationSettings();
        this.buildSwapSettings();
    }

    buildNavigationSettings() {
        const group = new Adw.PreferencesGroup({ title: _('Navigate Monitors') });

        this.addShortcut(group, 'monitor-next', _('Navigate to next monitor'));
        this.addShortcut(group, 'monitor-prev', _('Navigate to previous monitor'));

        const display = Gdk.Display.get_default();
        const monitors = display.get_monitors();
        const monitorCount = monitors.get_n_items();

        for (let i = 0; i < monitorCount; i++) {
            this.addShortcut(group, `monitor-${i + 1}`, _('Navigate to monitor ') + (i + 1));
        }

        this.page.add(group);
    }

    buildSwapSettings() {
        const group = new Adw.PreferencesGroup({ title: _('Swap Windows Between Monitors') });

        this.addShortcut(group, 'swap-next', _('Swap with next monitor'));
        this.addShortcut(group, 'swap-prev', _('Swap with previous monitor'));

        const display = Gdk.Display.get_default();
        const monitors = display.get_monitors();
        const monitorCount = monitors.get_n_items();

        for (let i = 0; i < monitorCount; i++) {
            this.addShortcut(group, `swap-${i + 1}`, _('Swap to monitor ') + (i + 1));
        }

        this.page.add(group);
    }

    addShortcut(group, key, title) {
        const row = new Adw.ActionRow({ title });
        const button = createShortcutButton(this.schema, key);
        row.add_suffix(button);
        group.add(row);
    }
}

class PreferencesSettings {
    constructor(schema) {
        this.schema = schema;
        this.page = new Adw.PreferencesPage({ title: _('Preferences') });

        const group = new Adw.PreferencesGroup({ title: _('Behavior') });

        const moveCursorSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('move-cursor'),
        });
        const moveCursorRow = new Adw.ActionRow({ title: _('Move cursor while navigating') });
        moveCursorRow.add_suffix(moveCursorSwitch);
        moveCursorRow.activatable_widget = moveCursorSwitch;

        const animateCursorSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('animate-cursor'),
            sensitive: moveCursorSwitch.active,
        });
        const animateCursorRow = new Adw.ActionRow({ title: _('Animate cursor while moving') });
        animateCursorRow.add_suffix(animateCursorSwitch);
        animateCursorRow.activatable_widget = animateCursorSwitch;

        const onlyCursorSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('only-cursor'),
        });
        const onlyCursorRow = new Adw.ActionRow({ title: _('Do not change window focus') });
        onlyCursorRow.add_suffix(onlyCursorSwitch);
        onlyCursorRow.activatable_widget = onlyCursorSwitch;

        moveCursorSwitch.connect('notify::active', () => {
            this.schema.set_boolean('move-cursor', moveCursorSwitch.active);
            animateCursorSwitch.set_sensitive(moveCursorSwitch.active);
        });

        animateCursorSwitch.connect('notify::active', () => {
            this.schema.set_boolean('animate-cursor', animateCursorSwitch.active);
        });

        onlyCursorSwitch.connect('notify::active', () => {
            this.schema.set_boolean('only-cursor', onlyCursorSwitch.active);
        });

        group.add(moveCursorRow);
        group.add(animateCursorRow);
        group.add(onlyCursorRow);

        this.page.add(group);
    }
}

class AboutSettings {
    constructor() {
        this.page = new Adw.PreferencesPage({ title: _('About') });

        const group = new Adw.PreferencesGroup();

        group.add(new Adw.ActionRow({ title: 'Binu Extension' }));
        group.add(new Adw.ActionRow({ title: _('Created by Prajwal') }));
        group.add(new Adw.ActionRow({ title: _('GitHub: https://github.com/prajwalpy/binu') }));
        group.add(new Adw.ActionRow({ title: '© 2025' }));

        this.page.add(group);
    }
}

function createShortcutButton(schema, pref) {
    const button = new Gtk.Button({ has_frame: false });

    const setLabelFromSettings = () => {
        const val = schema.get_strv(pref)[0];
        button.set_label(val || _('Disabled'));
    };

    setLabelFromSettings();

    button.connect('clicked', () => {
        if (button.isEditing) {
            button.set_label(button.isEditing);
            button.isEditing = null;
            return;
        }

        button.isEditing = button.label;
        button.set_label(_('Enter shortcut'));

        const controller = new Gtk.EventControllerKey();
        button.add_controller(controller);

        const id = controller.connect('key-pressed', (_ec, keyval, keycode, mask) => {
            mask &= Gtk.accelerator_get_default_mod_mask();

            if (mask === 0) {
                if (keyval === Gdk.KEY_Escape) {
                    button.set_label(button.isEditing);
                    button.isEditing = null;
                    return Gdk.EVENT_STOP;
                }
                if (keyval === Gdk.KEY_BackSpace) {
                    schema.set_strv(pref, []);
                    setLabelFromSettings();
                    button.isEditing = null;
                    controller.disconnect(id);
                    return Gdk.EVENT_STOP;
                }
            }

            const shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
            schema.set_strv(pref, [shortcut]);
            button.set_label(shortcut);
            button.isEditing = null;
            controller.disconnect(id);

            return Gdk.EVENT_STOP;
        });
    });

    return button;
}
