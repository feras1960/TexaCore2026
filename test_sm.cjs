const path = require('path');
const os = require('os');
const ServiceManager = require('./texacore-installer/src/service-manager.js');

const appDataDir = path.join(os.homedir(), 'Library/Application Support/texacore-installer');
const sm = new ServiceManager(appDataDir);

(async () => {
    console.log('Starting services...');
    try {
        const result = await sm.startAll();
        console.log('Start result:', result);
    } catch (err) {
        console.error('Error starting services:', err);
    } finally {
        process.exit();
    }
})();
