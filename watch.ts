import pug from "pug";
import fs from "fs";
import { spawn } from "child_process";

const PUG_FILES = {
    "src/index.pug": "dist/index.html",
    "src/about.pug": "dist/about.html",
};

enum EventType {
    NORMAL,
    WARNING,
    ERROR,
}

const listFiles = (dir: string) => {
    const files: string[] = [];
    dir = dir.startsWith("./") ? dir.slice(2) : dir;
    dir = dir.endsWith("/") ? dir.slice(0, -1) : dir;
    for (const item of fs.readdirSync(dir)) {
        if (item in [".git", "node_modules", ".DS_Store"]) continue;
        const path = `${dir}/${item}`;
        if (fs.statSync(path).isDirectory()) files.push(...listFiles(path));
        else files.push(path);
    }
    return files.map((file) => (file.startsWith("./") ? file.slice(2) : file));
};

const printMsg = (
    msg: string,
    type: EventType = EventType.NORMAL,
    last_timestamp: string = "",
) => {
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
    return timestamp;
};

const build_pug = (last_timestamp: string = "") => {
    for (const [src, dest] of Object.entries(PUG_FILES)) {
        last_timestamp = printMsg(
            `Rebuilding ${src} to ${dest}`,
            EventType.NORMAL,
            last_timestamp,
        );
        const html = pug.renderFile(src);
        fs.writeFileSync(dest, html);
    }
    return last_timestamp;
};

const build_copy = (last_timestamp: string = "") => {
    for (let file of listFiles("src")) {
        if ((file as string).endsWith(".pug")) continue;
        file = file.replace("src/", "");
        last_timestamp = printMsg(
            `Copying ${file} to dist/`,
            EventType.NORMAL,
            last_timestamp,
        );
        if (file.includes("/")) {
            const subfolder = file.slice(0, file.lastIndexOf("/"));
            if (!fs.existsSync(`dist/${subfolder}`)) {
                fs.mkdirSync(`dist/${subfolder}`, { recursive: true });
            }
        }
        fs.copyFileSync(`src/${file}`, `dist/${file}`);
    }
    return last_timestamp;
};

const build = () => {
    let last_timestamp = "";
    if (!fs.existsSync("dist")) fs.mkdirSync("dist");
    last_timestamp = build_pug(last_timestamp);
    last_timestamp = build_copy(last_timestamp);
};

const watch_pug = (last_timestamp: string) => {
    for (const [src, dest] of Object.entries(PUG_FILES)) {
        fs.watchFile(src, () => {
            last_timestamp = printMsg(
                `Rebuilding ${src} to ${dest}`,
                EventType.NORMAL,
                last_timestamp,
            );
            const html = pug.renderFile(src);
            fs.writeFileSync(dest, html);
        });
    }
    return last_timestamp;
};

const watch_copy = (last_timestamp: string) => {
    for (let file of listFiles("src")) {
        if ((file as string).endsWith(".pug")) continue;
        file = file.replace("src/", "");
        fs.watchFile(`src/${file}`, () => {
            last_timestamp = printMsg(
                `Copying src/${file} to dist/${file}`,
                EventType.NORMAL,
                last_timestamp,
            );
            if (file.includes("/")) {
                const subfolder = file.slice(0, file.lastIndexOf("/"));
                if (!fs.existsSync(`dist/${subfolder}`)) {
                    fs.mkdirSync(`dist/${subfolder}`, { recursive: true });
                }
            }
            fs.copyFileSync(`src/${file}`, `dist/${file}`);
        });
    }
    return last_timestamp;
};

const main = () => {
    build();

    const server = spawn("pnpm", [
        "light-server",
        "-s",
        "dist/",
        "-w",
        "dist/**",
    ]);
    let last_timestamp = "";
    server.stdout.on("data", (data) => {
        for (const line of data.toString().split("\n")) {
            last_timestamp = printMsg(line, EventType.NORMAL, last_timestamp);
        }
    });
    server.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            last_timestamp = printMsg(line, EventType.ERROR, last_timestamp);
        }
    });
    server.on("close", (code) => {
        printMsg(`Server exited with code ${code}`, EventType.WARNING);
    });

    printMsg("Watching for changes...", EventType.NORMAL);
    last_timestamp = watch_pug(last_timestamp);
    last_timestamp = watch_copy(last_timestamp);
};

if (process.argv.length == 2) {
    main();
}

if (process.argv.length == 3 && process.argv[2] == "--build") {
    build();
}
