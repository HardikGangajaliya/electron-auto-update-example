const {app, Menu, Tray, BrowserWindow, autoUpdater,ipcMain,nativeImage} = require('electron');
const {setup: setupPushReceiver} = require('electron-push-receiver');
const path = require("path");

let window = null;
const agent = 'windows' // windows, mac, linux

let currentBadgeCount = 0;
let tray = null
app.whenReady().then(() => {
    const iconPath = path.join(__dirname,'resources','favicon-16x16.png');
    tray = new Tray(nativeImage.createFromPath(iconPath));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open UBS Chat', click: () => {
                window.show()
                if (process.platform === 'darwin') app.dock.show()
            }
        },
        {label: 'Close UBS Chat', click: () => app.exit()},
    ])
    tray.on("click", () => {
        window.show();
        if (process.platform === 'darwin') app.dock.show()
    })
    tray.setToolTip('UBS Chat App')
    tray.setContextMenu(contextMenu)
})


function createWindow() {
    window = new BrowserWindow({
        width: 1366,
        height: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            nativeWindowOpen: true
        },
        icon: './resources/icon.png'
    });
    // const startURL = 'http://localhost:3001';
    const startURL = `https://chat.artoon.in/`;
    // const startURL = `https://chat.ubsapp.com/`;

    if (agent === 'windows') {
        const badgeOptions = {}
        const Badge = require('electron-windows-badge');
        new Badge(window, badgeOptions);
    }

    window.setMenuBarVisibility(false);
    window.setMenu(null)
    window.loadURL(startURL);
    window.webContents.openDevTools();
    window.once('closed', () => {
        const windows = BrowserWindow.getAllWindows();
        if (!windows.length) {
            return;
        }
        window = null
    });
    window.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            window.hide();
            if (process.platform === 'darwin') app.dock.hide()
        }
        return false;
    });
    window.webContents.once('dom-ready', () => {
        setupPushReceiver(window.webContents);
    });
    setupCounter({}, window, setDockBadge);
    window.once('ready-to-show', () => {
        autoUpdater.checkForUpdates()
    });
}

const setupCounter = (options, window, setDockBadge) => {
    window.on('page-title-updated', (event, title) => {
        const itemCountRegex = /[([{]([\d.,]*)\+?[}\])]/;
        const match = itemCountRegex.exec(title);
        const counterValue = match ? match[1] : undefined;

        if (counterValue) setDockBadge(counterValue, true);
        else setDockBadge('');
    });
}
const setDockBadge = agent === 'mac'
    ? (count, bounce) => {
        if (count !== undefined) {
            app.dock.setBadge(count.toString());
            if (bounce && count > currentBadgeCount) app.dock.bounce();
            currentBadgeCount = typeof count === 'number' ? count : 0;
        }
    }
    : (count) => {
        window.webContents.send('asynchronous-message', {count});
    };

app.setAppUserModelId("UBS Chat");
app.on('ready', () => createWindow());
app.on('window-all-closed', () => {

});

app.on("activate", () => {
    if (window === null) createWindow();
});

// Event handler for asynchronous incoming messages
ipcMain.on('asynchronous-message', (event, arg) => {
    window.focus()
    window.moveTop()
})

ipcMain.on('app_version', (event) => {
    console.log('================= app_version  ' ,event)
    event.sender.send('app_version', {version: app.getVersion()});
});

autoUpdater.on('update-available', () => {
    console.log('================= update_available  ' )
    mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
    console.log('================= update-downloaded  ' )
    mainWindow.webContents.send('update_downloaded');
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});
