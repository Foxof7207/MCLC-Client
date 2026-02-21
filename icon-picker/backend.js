const path = require('path');
const fs = require('fs-extra');

exports.activate = async (api) => {
    const instancesDir = path.join(api.app.getPath('userData'), 'instances');

    // Register a custom IPC handler for the backend
    api.ipc.handle('set-instance-icon', async (event, { instanceName, iconData }) => {
        try {
            const configPath = path.join(instancesDir, instanceName, 'instance.json');
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                config.icon = iconData;
                await fs.writeJson(configPath, config, { spaces: 4 });
                return { success: true };
            }
            return { success: false, error: 'Instance not found' };
        } catch (e) {
            console.error(`[IconPicker:Backend] Failed to set icon for ${instanceName}:`, e);
            return { success: false, error: e.message };
        }
    });

    console.log(`[IconPicker:Backend] Activated for ${api.id}`);
};

exports.deactivate = () => {
    console.log("[IconPicker:Backend] Deactivated");
};
