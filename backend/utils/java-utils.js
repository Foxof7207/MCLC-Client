const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const ADOPTIUM_API = 'https://api.adoptium.net/v3';

async function downloadFile(url, destPath, onProgress) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 60000
    });

    if (response.status !== 200) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;

    response.data.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && !isNaN(totalLength) && totalLength > 0) {
            const percent = Math.round((downloaded / totalLength) * 100);
            onProgress(percent);
        }
    });

    const writer = fs.createWriteStream(destPath);
    await streamPipeline(response.data, writer);

    const stats = await fs.stat(destPath);
    if (stats.size === 0) throw new Error("Downloaded file is empty");
}

async function installJava(version, runtimesDir, onProgress) {
    console.log(`[JavaUtils] Installing Java ${version}`);
    if (onProgress) onProgress('Fetching release info...', 0);
    const apiUrl = `${ADOPTIUM_API}/assets/feature_releases/${version}/ga?architecture=x64&heap_size=normal&image_type=jdk&jvm_impl=hotspot&os=windows`;

    const res = await axios.get(apiUrl);
    if (!res.data || res.data.length === 0) {
        throw new Error(`No release found for Java ${version}`);
    }

    const binary = res.data[0].binaries[0];
    const downloadUrl = binary.package.link;
    const fileName = binary.package.name;
    const releaseName = res.data[0].release_name;

    const versionDir = path.join(runtimesDir, releaseName);
    const javaExePath = path.join(versionDir, 'bin', 'java.exe');

    if (await fs.pathExists(javaExePath)) {
        return { success: true, path: javaExePath };
    }
    await fs.ensureDir(runtimesDir);
    const tempZipPath = path.join(runtimesDir, fileName);

    await downloadFile(downloadUrl, tempZipPath, (percent) => {
        if (onProgress) onProgress(`Downloading Java ${version}...`, percent);
    });
    if (onProgress) onProgress('Extracting...', 100);
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(runtimesDir, true);
    await fs.remove(tempZipPath);

    if (await fs.pathExists(javaExePath)) {
        return { success: true, path: javaExePath };
    }
    const subdirs = await fs.readdir(runtimesDir);
    for (const dir of subdirs) {
        const potentialPath = path.join(runtimesDir, dir, 'bin', 'java.exe');
        if (dir.includes(`jdk-${version}`) || dir.includes(`jre-${version}`)) {
            if (await fs.pathExists(potentialPath)) {
                return { success: true, path: potentialPath };
            }
        }
    }

    throw new Error(`Could not locate java.exe after extraction in ${runtimesDir}`);
}

module.exports = {
    installJava
};