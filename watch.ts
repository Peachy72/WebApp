import pug from "pug";
import fs from "fs";
import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";

const PUG_FILES = {
    "src/index.pug": "dist/index.html",
    "src/about.pug": "dist/about.html",
};

const srcDir = "src/";
const distDir = "dist/";

let last_timestamp = "";
const norm = (in_path: string) => in_path.replace(/\\/g, "/");

enum EventType {
    NORMAL,
    WARNING,
    ERROR,
}

const listFiles = (
    dir: string,
    ignored_extensions: string[] = [],
    _original_dir: string = dir,
) => {
    const files: string[] = [];
    dir = norm(dir);
    for (const item of fs.readdirSync(dir)) {
        if (item in [".git", "node_modules", ".DS_Store"]) continue;
        if (ignored_extensions.includes(item.split(".").pop() as string))
            continue;
        const currPath = path.join(dir, item);
        if (fs.statSync(currPath).isDirectory())
            files.push(
                ...listFiles(currPath, ignored_extensions, _original_dir),
            );
        else files.push(norm(currPath));
    }
    return files.map((file) => {
        file = file.startsWith(_original_dir)
            ? norm(path.join(...file.split("/").slice(1)))
            : file;
        return norm(file);
    });
};

const printMsg = (msg: string, type: EventType = EventType.NORMAL) => {
    let timestamp = new Date()
        .toLocaleTimeString("en-US", {
            hour12: true,
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        })
        .replace(/^(\d{1}):/, "0$1:")
        .replace(/^(.*)$/, "[$1]");
    let timestamp_print = "";
    timestamp == last_timestamp
        ? (timestamp_print = " ".repeat(timestamp.length))
        : (timestamp_print = timestamp);
    switch (type) {
        case EventType.NORMAL:
            console.log(`\x1b[32m${timestamp_print}\x1b[0m ${msg}`);
            break;
        case EventType.WARNING:
            console.log(`\x1b[33m${timestamp_print}\x1b[0m ${msg}`);
            break;
        case EventType.ERROR:
            console.log(`\x1b[31m${timestamp_print}\x1b[0m ${msg}`);
            break;
        default:
            console.log(`${timestamp_print} ${msg}`);
            break;
    }
    last_timestamp = timestamp;
};

const customCopy = (src: string, dest: string) => {
    src = norm(src);
    dest = norm(dest);
    if (dest.split("/").length > 2) {
        const subfolder = dest.slice(0, dest.lastIndexOf("/"));
        if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder);
    }
    fs.copyFileSync(src, dest);
};

const build_pug = () => {
    for (const [src, dest] of Object.entries(PUG_FILES)) {
        printMsg(`Rebuilding ${src} to ${dest}`, EventType.NORMAL);
        const html = pug.renderFile(src);
        fs.writeFileSync(dest, html);
    }
};

const build_copy = () => {
    for (let file of listFiles(srcDir, ["pug"])) {
        printMsg(`Copying ${file} to ${distDir}`, EventType.NORMAL);
        customCopy(path.join(srcDir, file), path.join(distDir, file));
    }
};

const build = () => {
    if (!fs.existsSync("dist")) fs.mkdirSync("dist");
    build_pug();
    build_copy();
};

const watch = () => {
    const watcher = chokidar.watch(srcDir);
    const helper = (path: string) => {
        if (path.endsWith(".pug")) {
            printMsg(
                `Rebuilding ${path} to ${path.replace(srcDir, distDir)}`,
                EventType.NORMAL,
            );
            build_pug();
        } else {
            const dist_path = path.replace(srcDir, distDir);
            printMsg(`Copying ${path} to dist/${path}`, EventType.NORMAL);
            customCopy(path, dist_path);
        }
    };
    watcher.on("add", (path) => helper(path));
    watcher.on("change", (path) => helper(path));
    watcher.on("unlink", (path) => {
        printMsg(`Removing ${path.replace(srcDir, distDir)}`, EventType.NORMAL);
        fs.rmSync(path.replace(srcDir, distDir));
    });
    watcher.on("addDir", (path) => {
        printMsg(
            `Creating directory ${path.replace(srcDir, distDir)}`,
            EventType.NORMAL,
        );
        if (!fs.existsSync(path.replace(srcDir, distDir)))
            fs.mkdirSync(path.replace(srcDir, distDir));
    });
};

const main = () => {
    build();

    const server = spawn("pnpm", [
        "light-server",
        "-s",
        distDir,
        "-w",
        "dist/**",
    ]);
    server.stdout.on("data", (data) => {
        for (const line of data.toString().split("\n")) {
            printMsg(line, EventType.NORMAL);
        }
    });
    server.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            printMsg(line, EventType.ERROR);
        }
    });
    server.on("close", (code) => {
        printMsg(`Server exited with code ${code}`, EventType.WARNING);
    });

    printMsg("Watching for changes...", EventType.NORMAL);

    watch();
};

if (process.argv.length == 2) {
    main();
}

if (process.argv.length == 3 && process.argv[2] == "--build") {
    build();
}
