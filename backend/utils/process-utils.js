const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Gets CPU and Memory usage for a given process ID.
 * @param {number} pid - The process ID.
 * @returns {Promise<{cpu: number, memory: number}>}
 */
async function getProcessStats(pid) {
    try {
        if (!pid) return { cpu: 0, memory: 0 };

        const pidusage = require('pidusage');
        const pidtree = require('pidtree');

        let pids = [pid];
        try {
            // Get all child processes including the root (to catch java.exe spawned by cmd)
            const children = await pidtree(pid, { root: true });
            if (children && children.length > 0) {
                pids = children;
            }
        } catch (e) {

        }

        try {
            const statsObj = await pidusage(pids);
            let totalCpu = 0;
            let totalMemory = 0;

            for (const key in statsObj) {
                if (statsObj[key]) {
                    totalCpu += statsObj[key].cpu || 0;
                    totalMemory += statsObj[key].memory || 0;
                }
            }

            // If we got valid stats OR we are not on Windows, return them
            if (process.platform !== 'win32' || totalMemory > 50 * 1024 * 1024) { // over 50MB means we probably found Java
                return {
                    cpu: Math.min(Math.round(totalCpu), 100),
                    memory: Math.round(totalMemory / (1024 * 1024)) || 0
                };
            }
        } catch (e) {

        }

        // Fallback for Windows: the Java process might be completely detached from the PID tree (e.g., spawned via weird wrapper)
        if (process.platform === 'win32') {
            try {
                // Find all java/javaw processes and get their WorkingSetSize. 
                // We'll guess the Minecraft process is the largest Java process or any Java process with 'minecraft' in command line.
                const { stdout } = await execAsync(`wmic process where "name='javaw.exe' or name='java.exe'" get ProcessId, WorkingSetSize, CommandLine /format:csv`);
                const lines = stdout.trim().split('\n').slice(1); // skip headers
                let bestMatch = null;
                let maxMem = 0;

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    const parts = line.split(',');
                    // Node Name, CommandLine, ProcessId, WorkingSetSize
                    if (parts.length >= 4) {
                        const cmdLine = parts[1] || '';
                        const pId = parseInt(parts[2]);
                        const mem = parseInt(parts[3]);

                        // Determine if this is a Minecraft process
                        if (cmdLine.toLowerCase().includes('minecraft') || cmdLine.toLowerCase().includes('-djava.library.path')) {
                            if (mem > maxMem) {
                                maxMem = mem;
                                bestMatch = pId;
                            }
                        }
                    }
                }

                if (bestMatch) {
                    // We found a detached Java process that looks like Minecraft!
                    const finalStats = await pidusage(bestMatch);
                    return {
                        cpu: Math.min(Math.round(finalStats.cpu), 100),
                        memory: Math.round(finalStats.memory / (1024 * 1024)) || 0
                    };
                }
            } catch (e) {
                // Ignore wmic errors
            }
        }

        return { cpu: 0, memory: 0 };
    } catch (error) {
        return { cpu: 0, memory: 0 };
    }
}

module.exports = {
    getProcessStats
};
