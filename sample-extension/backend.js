exports.activate = async (api) => {
    console.log(`[StatsMonitor:Backend] Activated for ${api.id}`);
    api.ipc.handle('get-greeting', () => {
        return "Hello from Backend!";
    });
    console.log(`[StatsMonitor:Backend] App version: ${api.app.getVersion()}`);
};

exports.deactivate = () => {
    console.log("[StatsMonitor:Backend] Deactivated");
};