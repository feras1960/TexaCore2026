const path = require('path');
const fs = require('fs');

// Mock electron
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'electron') {
    return { app: { isPackaged: false, getPath: () => '/tmp' }, ipcMain: { handle: () => {} } };
  }
  return originalRequire.apply(this, arguments);
};

const ServiceManager = require('./texacore-installer/src/service-manager.js');
const appDataDir = path.join(process.env.HOME, 'Library', 'Application Support', 'texacore-installer');
const sm = new ServiceManager(appDataDir);
sm.migrationsDir = path.join(__dirname, 'texacore-installer', 'migrations');

sm.runMigrations().then(res => {
  console.log("Migrations result:", res);
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
