import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BinuPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const home = new HomeSettings(window._settings);
        const preferences = new PreferencesSettings(window._settings);
        const about = new AboutPage(this.metadata);

        window.add(home.page, 'system-run');
        window.add(preferences.page, 'preferences-system');
        window.add(about, 'help-about');
    }
}

function _getMonitorName(index) {
    const display = Gdk.Display.get_default();
    const monitors = display.get_monitors();

    if (index < 0 || index >= monitors.get_n_items()) {
        return _('Invalid Monitor');
    }

    const monitor = monitors.get_item(index);

    try {
        const model = monitor.get_model();
        if (model && model.trim() !== '') {
            return model;
        }
    } catch (_) {
    }
    return monitor.get_connector()
}

class HomeSettings {
    constructor(schema) {
        this.schema = schema;
        this.page = new Adw.PreferencesPage({
            title: _('Home'),
            icon_name: 'go-home-symbolic'
        });

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
            this.addShortcut(group, `monitor-${i}`, _(`Navigate to monitor ${i + 1} [${_getMonitorName(i)}]`));
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
            this.addShortcut(group, `swap-${i}`, _(`Swap to monitor ${i + 1} [${_getMonitorName(i)}]`));
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
        this.page = new Adw.PreferencesPage({
            title: _('Preferences'),
            icon_name: 'preferences-system-symbolic'
        });

        const group = new Adw.PreferencesGroup({ title: _('Behavior') });

        const moveCursorSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('move-cursor'),
            valign: Gtk.Align.CENTER
        });
        const moveCursorRow = new Adw.ActionRow({ title: _('Move cursor while navigating') });
        moveCursorRow.add_suffix(moveCursorSwitch);
        moveCursorRow.activatable_widget = moveCursorSwitch;

        const animateCursorSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('animate-cursor'),
            sensitive: moveCursorSwitch.active,
            valign: Gtk.Align.CENTER
        });
        const animateCursorRow = new Adw.ActionRow({ title: _('Animate cursor while moving') });
        animateCursorRow.add_suffix(animateCursorSwitch);
        animateCursorRow.activatable_widget = animateCursorSwitch;

        const updateFocusAfterNavigation = new Gtk.Switch({
            active: this.schema.get_boolean('update-focus'),
            valign: Gtk.Align.CENTER
        });
        const changeFocus = new Adw.ActionRow({ title: _('Update the focus to the window on the navigated monitor') });
        changeFocus.add_suffix(updateFocusAfterNavigation);
        changeFocus.activatable_widget = updateFocusAfterNavigation;

        moveCursorSwitch.connect('notify::active', () => {
            this.schema.set_boolean('move-cursor', moveCursorSwitch.active);
            animateCursorSwitch.set_sensitive(moveCursorSwitch.active);
        });

        animateCursorSwitch.connect('notify::active', () => {
            this.schema.set_boolean('animate-cursor', animateCursorSwitch.active);
        });

        updateFocusAfterNavigation.connect('notify::active', () => {
            this.schema.set_boolean('update-focus', updateFocusAfterNavigation.active);
        });

        group.add(moveCursorRow);
        group.add(animateCursorRow);
        group.add(changeFocus);

        this.page.add(group);
    }
}


const AboutPage = GObject.registerClass(
class AboutPage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic'
        });

        const PROJECT_NAME = _('Binu');
        const PROJECT_DESCRIPTION = _('Little Tweaks for GNOME for multiple monitors');
        const VERSION = metadata['version-name'] ? metadata['version-name'] : metadata.version.toString();

        const projectHeaderGroup = new Adw.PreferencesGroup();
        this.add(projectHeaderGroup);

        const projectHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false,
        });

        const projectTitleLabel = new Gtk.Label({
            label: _(PROJECT_NAME),
            css_classes: ['title-1'],
            vexpand: true,
            valign: Gtk.Align.FILL,
        });

        const projectDescriptionLabel = new Gtk.Label({
            label: PROJECT_DESCRIPTION,
            hexpand: false,
            vexpand: false,
        });
        projectHeaderBox.append(projectTitleLabel);
        projectHeaderBox.append(projectDescriptionLabel);
        projectHeaderGroup.add(projectHeaderBox);

        const infoGroup = new Adw.PreferencesGroup();
        this.add(infoGroup);

        const projectVersionRow = new Adw.ActionRow({
            title: _('%s Version').format(PROJECT_NAME),
        });
        projectVersionRow.add_suffix(new Gtk.Label({
            label: VERSION,
            css_classes: ['dim-label'],
        }));
        infoGroup.add(projectVersionRow);

        const githubRow = this._createLinkRow(_('%s on Github').format(PROJECT_NAME), `${metadata.url}`);
        infoGroup.add(githubRow);

        const reportIssueRow = this._createLinkRow(_('Report an Issue'), `${metadata.url}/issues/new`);
        infoGroup.add(reportIssueRow);

        const miscGroup = new Adw.PreferencesGroup();
        this.add(miscGroup);

        const {subpage: legalSubPage, page: legalPage} = this._createSubPage(_('Legal'));
        const legalRow = this._createSubPageRow(_('Legal'), legalSubPage);
        miscGroup.add(legalRow);

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        legalPage.add(gnuSoftwareGroup);

        const license_header = _('<a href="%s">%s</a>').format('https://github.com/ctadel/binu/blob/master/LICENSE', _('MIT Licenses'));
        const contents = 'Copyright (c) 2025 ctadel\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.'

        const gnuSofwareLabel = new Gtk.Label({
            label: `${_(license_header)}\n\n${_(contents)}`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });
        gnuSoftwareGroup.add(gnuSofwareLabel);
        // -----------------------------------------------------------------------
    }

    _createSubPage(title) {
        const subpage = new Adw.NavigationPage({
            title,
        });

        const headerBar = new Adw.HeaderBar();

        const sidebarToolBarView = new Adw.ToolbarView();

        sidebarToolBarView.add_top_bar(headerBar);
        subpage.set_child(sidebarToolBarView);
        const page = new Adw.PreferencesPage();
        sidebarToolBarView.set_content(page);

        return {subpage, page};
    }

    _createSubPageRow(title, subpage) {
        const subpageRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
        });

        subpageRow.connect('activated', () => {
            this.get_root().push_subpage(subpage);
        });

        const goNextImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        subpageRow.add_suffix(goNextImage);
        return subpageRow;
    }

    _createLinkRow(title, uri, subtitle = null) {
        const image = new Gtk.Image({
            icon_name: 'adw-external-link-symbolic',
            valign: Gtk.Align.CENTER,
        });
        const linkRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
            tooltip_text: uri,
            subtitle: subtitle ? _(subtitle) : null,
        });
        linkRow.connect('activated', () => {
            Gtk.show_uri(this.get_root(), uri, Gdk.CURRENT_TIME);
        });
        linkRow.add_suffix(image);

        return linkRow;
    }
});

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
