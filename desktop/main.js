const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });
    
    mainWindow.loadFile('index.html');
    
    const menuTemplate = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打开文件',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => { mainWindow.webContents.send('menu-open-file'); }
                },
                { type: 'separator' },
                { label: '退出', role: 'quit' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
            ]
        },
        {
            label: '查看',
            submenu: [
                { label: '刷新', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '项目主页',
                    click: () => { shell.openExternal('https://github.com/your/repo'); }
                },
                { label: '关于', role: 'about' }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
