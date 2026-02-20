exports.activate = async (api) => {
    console.log(`[StatsMonitor:Backend] Activated for ${api.id}`);

    // Register a custom IPC handler for the backend
    api.ipc.handle('get-greeting', () => {
        return "Hello from Backend!";
    });

    // We can also use app or other modules
    console.log(`[StatsMonitor:Backend] App version: ${api.app.getVersion()}`);
};

exports.deactivate = () => {
    console.log("[StatsMonitor:Backend] Deactivated");
};
