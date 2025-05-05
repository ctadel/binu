# Binu — Little Tweaks for GNOME

**Binu** is a minimal GNOME Shell extension focused on small, practical tweaks that improve your day-to-day desktop experience. It’s designed to be lightweight, modular, and helpful — adding just the right amount of automation and customization without getting in your way.

Whether you're juggling multiple monitors or want simple utilities to boost your GNOME workflow, Binu aims to be your silent sidekick.

---

## ✨ Features

### 🖱 Navigate between multiple monitors along with mouse pointer
Press a shortcut to focus on (next/previous) monitor and move the mouse pointer
Includes a visual animation with cursor resizing to make tracking easier.

### 🪟 Swap All Windows Between Two Monitors  
Move all open windows from one monitor to another and vice versa — useful for workspace reorganization or external display usage.

More tweaks and utilities are planned in future updates — including window tiling helpers, notification control, and more.

---

## ⚙️ Requirements

- [`xdotool`](https://manpages.ubuntu.com/manpages/latest/en/man1/xdotool.1.html)  
  Used for controlling the mouse pointer programmatically.

Install it via your package manager:  
```bash
sudo apt install xdotool
```

---

## 📦 Installation

1. Clone this repository or copy it into your GNOME extensions directory:  
   bash
   git clone https://github.com/ctadel/binu.git ~/.local/share/gnome-shell/extensions/binu@ctadel

2. Restart GNOME Shell:  
   - On **X11**: Press `Alt + F2`, type `r`, and press Enter.  
   - On **Wayland**: Log out and log back in.

3. Enable the extension using GNOME Tweaks or `gnome-extensions`:  
   bash
   gnome-extensions enable binu@ctadel

4. Set up keybindings using GNOME Settings or edit them in the extension's code (for now).

---

## 🛠️ Troubleshooting

If you encounter any issues with the extension, please try the following:

1. Make sure that your system meets the requirements for running GNOME Shell extensions.
2. Disable and re-enable the extension using the Extensions app or the `gnome-extensions` command.
3. Restart GNOME Shell by pressing `Alt`+`F2`, typing `r`, and pressing `Enter`.
4. If the issue persists, please open an issue on the [GitHub issue tracker](https://github.com/ctadel/binu/issues) with a detailed description of the problem and any relevant error messages.

---

## 📌 Notes

- Currently tested on GNOME 45+.
- Built with future extensibility in mind — the code is modular with separate files for each kind of usage.

---

## 🤝 Contributing

Contributions to Binu are welcome! If you would like to contribute, please follow these steps:

1. Fork the repository on GitHub.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive commit messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

Please ensure that your code follows the existing style and conventions, and that you have tested your changes thoroughly before submitting a pull request.

---

## 📝 License

Binu is released under the [MIT License](LICENSE).
