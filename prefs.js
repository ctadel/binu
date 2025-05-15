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

    _getMonitors() {
        try {
            const monitorsJSON = this.schema.get_string('monitor-config')
            return JSON.parse(monitorsJSON)
        }
        catch {return []}
    }

    buildNavigationSettings() {
        const group = new Adw.PreferencesGroup({ title: _('Navigate Monitors') });

        this.addShortcut(group, 'monitor-next', _('Navigate to next monitor'));
        this.addShortcut(group, 'monitor-prev', _('Navigate to previous monitor'));

        const monitors = this._getMonitors()
        for (const monitor of monitors) {
            this.addShortcut(group, `monitor-${monitor.index}`,
                  _(`Navigate to monitor ${monitor.index + 1} [${monitor.connector}]`),
                  _(`Directly jump to the screen - <b>${monitor.displayName}</b>`));
        }

        this.page.add(group);
    }

    buildSwapSettings() {
        const group = new Adw.PreferencesGroup({ title: _('Swap all the Applications between Monitors') });

        this.addShortcut(group, 'swap-next', _('Swap with next monitor'));
        this.addShortcut(group, 'swap-prev', _('Swap with previous monitor'));

        const monitors = this._getMonitors()
        for (const monitor of monitors) {
            this.addShortcut(group, `swap-${monitor.index}`,
                  _(`Swap with monitor ${monitor.index + 1} [${monitor.connector}]`),
                  _(`Swap all applications from current monitor with <b>${monitor.displayName}</b>`));
        }

        this.page.add(group);
    }

    addShortcut(group, key, title, subtitle = '') {
        const row = new Adw.ActionRow({ title:title , subtitle:subtitle});
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

        const cursorGroup = new Adw.PreferencesGroup({ title: _('Cursor Settings') });
        const focusGroup = new Adw.PreferencesGroup({ title: _('Window Focus Settings') });

        const cursorMovementSwitch = new Gtk.Switch({
            active: this.schema.get_boolean('move-cursor'),
            valign: Gtk.Align.CENTER
        });
        const cursorMovementRow = new Adw.ActionRow({ title: _('Move cursor while navigating'), subtitle: _('Do you also want to move your cursor while navigating to target monitor?')});
        cursorMovementRow.add_suffix(cursorMovementSwitch);
        cursorMovementRow.activatable_widget = cursorMovementSwitch;

        cursorMovementSwitch.connect('notify::active', () => {
            this.schema.set_boolean('move-cursor', cursorMovementSwitch.active);
        });
        cursorGroup.add(cursorMovementRow)

        const cursorAnimation = new Adw.ExpanderRow({
            title: _('Animate cursor while while cursor movement'),
            show_enable_switch: true,
            expanded: false,
            enable_expansion: this.schema.get_boolean('animate-cursor'),
        });
        cursorAnimation.connect('notify::enable-expansion', widget => {
            this.schema.set_boolean('animate-cursor', widget.enable_expansion);
        });
        cursorGroup.add(cursorAnimation);

        const animationDuration = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 50, upper: 1000, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
        });
        animationDuration.set_value(this.schema.get_int('animate-cursor-duration'));
        animationDuration.connect('value-changed', widget => {
            this.schema.set_int('animate-cursor-duration', widget.get_value());
        });

        const animationDurationRow = new Adw.ActionRow({
            title: _('Animation Duration'),
            subtitle: _('Animation duration to move cursor from one monitor to another (ms)'),
            activatable_widget: animationDuration,
        });
        animationDurationRow.add_suffix(animationDuration);
        cursorAnimation.add_row(animationDurationRow);

        const updateFocusAfterNavigation = new Gtk.Switch({
            active: this.schema.get_boolean('update-focus'),
            valign: Gtk.Align.CENTER
        });
        const changeFocus = new Adw.ActionRow({ title: _('Update the focus to the window on the navigated monitor'), subtitle: _('This focuses on the most recent window in your target monitor while navigating') });
        changeFocus.add_suffix(updateFocusAfterNavigation);
        changeFocus.activatable_widget = updateFocusAfterNavigation;

        updateFocusAfterNavigation.connect('notify::active', () => {
            this.schema.set_boolean('update-focus', updateFocusAfterNavigation.active);
        });

        focusGroup.add(changeFocus);

        this.page.add(cursorGroup);
        this.page.add(focusGroup);
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

        const reportIssueRow = this._createLinkRow(_('Report an Issue'), `${metadata.url}/issues/new`, 'Please add an issue to our github repository if you\'re faceing any problems')
        infoGroup.add(reportIssueRow);

        const commentsRow = this._createLinkRow(_('Loving this extension?'), `https://extensions.gnome.org/extension/8091/binu/`, 'Show us some love by leaving a comment and rating our extension')
        infoGroup.add(commentsRow);

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
