const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { parsePdfFileToMarkdown } = require('./src/pdf-converter');

app.name = 'MD Wysiwyg';

let mainWindow;
let fileWatcher = null;
let currentWatchedPath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    title: 'MD Wysiwyg',
    icon: path.join(__dirname, 'assets/icon.png'),
    frame: false, // Frameless window for seamless menu bar integration
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    unwatchFile();
    mainWindow = null;
  });
}

function watchFile(filePath) {
  unwatchFile();
  if (!filePath || !fs.existsSync(filePath)) return;
  currentWatchedPath = filePath;
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change' && mainWindow) {
        mainWindow.webContents.send('file:externally-changed', filePath);
      }
    });
  } catch (err) {
    console.error('Error watching file:', err);
  }
}

function unwatchFile() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  currentWatchedPath = null;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window Control IPC Handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// File IPC Handlers
ipcMain.handle('app:get-cli-file', async () => {
  const args = process.argv;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-') && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
      const ext = path.extname(arg).toLowerCase();
      if (['.md', '.markdown', '.txt', '.mdown'].includes(ext)) {
        const content = fs.readFileSync(arg, 'utf-8');
        watchFile(arg);
        return { filePath: path.resolve(arg), fileName: path.basename(arg), content };
      } else if (ext === '.pdf') {
        return await parsePdfFileToMarkdown(arg);
      }
    }
  }
  return null;
});

ipcMain.handle('file:open-dialog', async () => {
  const docsPath = app.getPath('documents');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir archivo Markdown o PDF',
    defaultPath: docsPath,
    properties: ['openFile'],
    filters: [
      { name: 'Markdown y PDF (*.md, *.pdf)', extensions: ['md', 'markdown', 'pdf', 'mdown', 'txt'] },
      { name: 'Documentos PDF (*.pdf)', extensions: ['pdf'] },
      { name: 'Archivos Markdown (*.md)', extensions: ['md', 'markdown'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      return await parsePdfFileToMarkdown(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    watchFile(filePath);
    return {
      filePath,
      fileName: path.basename(filePath),
      content
    };
  } catch (err) {
    throw new Error(`No se pudo procesar el archivo: ${err.message}`);
  }
});

ipcMain.handle('file:read', async (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('El archivo no existe');
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return await parsePdfFileToMarkdown(filePath);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  watchFile(filePath);
  return { filePath, fileName: path.basename(filePath), content };
});

ipcMain.handle('file:save', async (event, { filePath, content }) => {
  let targetPath = filePath;
  if (!targetPath) {
    const docsPath = app.getPath('documents');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar archivo Markdown',
      defaultPath: path.join(docsPath, 'documento.md'),
      filters: [{ name: 'Markdown (*.md)', extensions: ['md'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    targetPath = result.filePath;
  }

  try {
    fs.writeFileSync(targetPath, content, 'utf-8');
    watchFile(targetPath);
    return {
      success: true,
      filePath: targetPath,
      fileName: path.basename(targetPath)
    };
  } catch (err) {
    throw new Error(`Error al guardar el archivo: ${err.message}`);
  }
});

ipcMain.handle('file:save-as', async (event, { content, defaultName }) => {
  const docsPath = app.getPath('documents');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar como...',
    defaultPath: path.join(docsPath, defaultName || 'documento.md'),
    filters: [
      { name: 'Markdown (*.md)', extensions: ['md'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    watchFile(result.filePath);
    return {
      success: true,
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    };
  } catch (err) {
    throw new Error(`Error al guardar como: ${err.message}`);
  }
});

ipcMain.handle('file:export-pdf', async (event, { defaultName }) => {
  const docsPath = app.getPath('documents');
  const pdfName = (defaultName || 'documento').replace(/\.md$/, '') + '.pdf';
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar a PDF',
    defaultPath: path.join(docsPath, pdfName),
    filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }]
  });

  if (saveResult.canceled || !saveResult.filePath) return { canceled: true };

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });
    fs.writeFileSync(saveResult.filePath, pdfData);
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    throw new Error(`Error al exportar PDF: ${err.message}`);
  }
});

ipcMain.handle('file:export-html', async (event, { contentHtml, title }) => {
  const docsPath = app.getPath('documents');
  const htmlName = (title || 'documento').replace(/\.md$/, '') + '.html';
  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar a HTML',
    defaultPath: path.join(docsPath, htmlName),
    filters: [{ name: 'Página Web (*.html)', extensions: ['html'] }]
  });

  if (saveResult.canceled || !saveResult.filePath) return { canceled: true };

  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Documento Markdown'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0f172a; color: #e2e8f0; }
    pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: "JetBrains Mono", monospace; font-size: 0.9em; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
    th { background: #1e293b; }
    blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 16px; color: #94a3b8; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

  try {
    fs.writeFileSync(saveResult.filePath, fullHtml, 'utf-8');
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    throw new Error(`Error al exportar HTML: ${err.message}`);
  }
});

ipcMain.handle('app:open-external', async (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
