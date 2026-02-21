# Icon Picker Extension

Welcome to the **Icon Picker** extension for MCLC! 🚀

## Overview

The Icon Picker is a lightweight extension for the MCLC Launcher that allows you to customize your Minecraft instance icons. Choose from a curated pack of default icons or upload your own images to make your instances stand out.

## Features

- **Icon Packs:** 8 high-quality default icons to choose from.
- **Custom Uploads:** Use any image from your computer as an instance icon.
- **Instant Preview:** Icons update in real-time in the sidebar and dashboard.
- **Easy Reset:** Switch back to the default "Cube" icon at any time.

## How it works

The extension registers a button in the **Instance Details** view. When you pick an icon, it communicates with the MCLC Backend using IPC to update the `instance.json` configuration file. The launcher detects these changes and updates the UI across the application.

## Installation

1. Ensure the `icon-picker` folder is in your MCLC extensions directory.
2. Go to the **Extensions** tab in the MCLC Launcher.
3. Enable the **Icon Picker** extension.
4. Open the details page for any instance and look for the **✨ Pick Icon** button!
