const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");
const { startStaticServer } = require("./static-server.cjs");

const DEV_WEB_URL = process.env.CLINICA_WEB_URL || "http://localhost:5176";
const API_HEALTH = process.env.CLINICA_API_HEALTH || "http://127.0.0.1:4100/api/health";
const API_TARGET = process.env.CLINICA_API_TARGET || "http://127.0.0.1:4100";
const PROD_WEB_PORT = Number(process.env.CLINICA_ELECTRON_PORT || 5176);
const AUTO_START_API = process.env.CLINICA_AUTO_API !== "0";

let mainWindow = null;
let apiProcess = null;
let staticServer = null;

function getAppRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
}

function getDistDir() {
  return path.join(getAppRoot(), "frontend", "dist");
}

function getApiDir() {
  return path.join(process.resourcesPath, "api");
}

function waitForUrl(url, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (Date.now() > deadline) reject(new Error(`Timeout esperando ${url}`));
        else setTimeout(tick, 800);
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error(`Timeout esperando ${url}`));
        else setTimeout(tick, 800);
      });
    };
    tick();
  });
}

function startBackend() {
  if (apiProcess) return;

  if (app.isPackaged && process.platform === "win32") {
    const apiDir = getApiDir();
    const exe = path.join(apiDir, "Clinica.Api.exe");
    if (fs.existsSync(exe)) {
      apiProcess = spawn(exe, [], {
        cwd: apiDir,
        env: {
          ...process.env,
          ASPNETCORE_ENVIRONMENT: "Desktop",
          DOTNET_ENVIRONMENT: "Desktop",
          ASPNETCORE_URLS: "http://127.0.0.1:4100"
        },
        stdio: "ignore",
        windowsHide: true
      });
      apiProcess.on("exit", () => {
        apiProcess = null;
      });
      return;
    }
  }

  const dotnet = process.env.DOTNET_PATH || "dotnet";
  const project = path.join(getAppRoot(), "backend", "Clinica.Api", "Clinica.Api.csproj");
  apiProcess = spawn(
    dotnet,
    ["run", "--project", project],
    {
      cwd: getAppRoot(),
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT || "Development",
        PATH: `${process.env.HOME || ""}/.dotnet:${process.env.PATH || ""}`
      },
      stdio: "ignore"
    }
  );
  apiProcess.on("exit", () => {
    apiProcess = null;
  });
}

function stopBackend() {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill("SIGTERM");
    apiProcess = null;
  }
}

async function resolveWebUrl() {
  const useDevServer = !app.isPackaged && process.env.CLINICA_ELECTRON_USE_DIST !== "1";
  const distDir = getDistDir();

  if (useDevServer) {
    await waitForUrl(DEV_WEB_URL).catch(() => {});
    return DEV_WEB_URL;
  }

  if (!fs.existsSync(distDir)) {
    throw new Error(`No existe ${distDir}. Ejecute: npm run build --prefix frontend`);
  }

  if (AUTO_START_API) {
    startBackend();
    await waitForUrl(API_HEALTH).catch(() => {});
  } else {
    await waitForUrl(API_HEALTH).catch(() => {});
  }

  const started = await startStaticServer({
    distDir,
    port: PROD_WEB_PORT,
    apiTarget: API_TARGET
  });
  staticServer = started.server;
  return started.url;
}

async function createWindow() {
  const webUrl = await resolveWebUrl();

  if (process.platform === "linux") {
    app.commandLine.appendSwitch("no-sandbox");
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Clínica Integral",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(webUrl);

  if (!app.isPackaged && process.env.CLINICA_ELECTRON_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(async () => {
  if (!app.isPackaged && AUTO_START_API) {
    startBackend();
    await waitForUrl(API_HEALTH).catch(() => {});
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopBackend();
  if (staticServer) staticServer.close();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
