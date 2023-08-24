import pug from "pug";
import fs from "fs";
import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";

const env = {
    last_timestamp: "",
    PUG_FILES: {
        "src/index.pug": "dist/index.html",
        "src/about.pug": "dist/about.html",
    },
    srcDir: "src/",
    distDir: "dist/",
};

enum PrinterEventType {
    NORMAL,
    WARNING,
    ERROR,
}

const helper = {
    norm: (in_path: string) => path.normalize(in_path).replace(/\\/g, "/"),
    listFiles: (
        dir: string,
        ignored_extensions: string[] = [],
        _original_dir: string = dir,
    ) => {
        const files: string[] = [];
        dir = helper.norm(dir);
        for (const item of fs.readdirSync(dir)) {
            if (item in [".git", "node_modules", ".DS_Store"]) continue;
            if (ignored_extensions.includes(item.split(".").pop() as string))
                continue;
            const currPath = path.join(dir, item);
            if (fs.statSync(currPath).isDirectory())
                files.push(
                    ...helper.listFiles(
                        currPath,
                        ignored_extensions,
                        _original_dir,
                    ),
                );
            else files.push(helper.norm(currPath));
        }
        return files.map((file) => {
            file = file.startsWith(_original_dir)
                ? helper.norm(path.join(...file.split("/").slice(1)))
                : file;
            return helper.norm(file);
        });
    },
    printMsg: (
        msg: string,
        type: PrinterEventType = PrinterEventType.NORMAL,
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
        timestamp == env.last_timestamp
            ? (timestamp_print = " ".repeat(timestamp.length))
            : (timestamp_print = timestamp);
        switch (type) {
            case PrinterEventType.NORMAL:
                console.log(`\x1b[32m${timestamp_print}\x1b[0m ${msg}`);
                break;
            case PrinterEventType.WARNING:
                console.log(`\x1b[33m${timestamp_print}\x1b[0m ${msg}`);
                break;
            case PrinterEventType.ERROR:
                console.log(`\x1b[31m${timestamp_print}\x1b[0m ${msg}`);
                break;
            default:
                console.log(`${timestamp_print} ${msg}`);
                break;
        }
        env.last_timestamp = timestamp;
    },
    customCopy: (src: string, dest: string) => {
        src = helper.norm(src);
        dest = helper.norm(dest);
        if (dest.split("/").length > 2) {
            const subfolder = helper.norm(dest.slice(0, dest.lastIndexOf("/")));
            if (!fs.existsSync(subfolder))
                fs.mkdirSync(subfolder, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    },
};

const builder = {
    build_pug: (src: string, dest: string) => {
        helper.printMsg(
            `Rebuilding ${src} to ${dest}`,
            PrinterEventType.NORMAL,
        );
        const html = pug.renderFile(src);
        fs.writeFileSync(dest, html);
    },
    __build_pug_all: () => {
        for (const [src, dest] of Object.entries(env.PUG_FILES)) {
            builder.build_pug(src, dest);
        }
    },
    __build_copy_all: () => {
        for (let file of helper.listFiles(env.srcDir, ["pug"])) {
            file = helper.norm(file);
            helper.printMsg(
                `Copying ${helper.norm(
                    path.join(env.srcDir, file),
                )} to ${helper.norm(path.join(env.distDir, file))}`,
                PrinterEventType.NORMAL,
            );
            helper.customCopy(
                path.join(env.srcDir, file),
                path.join(env.distDir, file),
            );
        }
    },
    build_all: () => {
        if (!fs.existsSync("dist")) fs.mkdirSync("dist");
        builder.__build_pug_all();
        builder.__build_copy_all();
    },
};

const watcher = {
    __add_change_action: (path: string) => {
        if (path.endsWith(".pug")) {
            helper.printMsg(
                `Rebuilding ${path} to ${path.replace(
                    env.srcDir,
                    env.distDir,
                )}`,
                PrinterEventType.NORMAL,
            );
            builder.build_pug(
                path,
                path.replace(env.srcDir, env.distDir).replace(".pug", ".html"),
            );
        } else {
            const dist_path = path.replace(env.srcDir, env.distDir);
            helper.printMsg(
                `Copying ${path} to dist/${path}`,
                PrinterEventType.NORMAL,
            );
            helper.customCopy(path, dist_path);
        }
    },
    __remove_action: (path: string) => {
        helper.printMsg(
            `Removing ${path.replace(env.srcDir, env.distDir)}`,
            PrinterEventType.NORMAL,
        );
        fs.rmSync(path.replace(env.srcDir, env.distDir));
    },
    __new_dir_action: (path: string) => {
        helper.printMsg(
            `Creating directory ${path.replace(env.srcDir, env.distDir)}`,
            PrinterEventType.NORMAL,
        );
        if (!fs.existsSync(path.replace(env.srcDir, env.distDir)))
            fs.mkdirSync(path.replace(env.srcDir, env.distDir));
    },
    watch: () => {
        const choki_watcher = chokidar.watch(env.srcDir);
        choki_watcher.on("add", (path) =>
            watcher.__add_change_action(helper.norm(path)),
        );
        choki_watcher.on("change", (path) =>
            watcher.__add_change_action(helper.norm(path)),
        );
        choki_watcher.on("unlink", (path) =>
            watcher.__remove_action(helper.norm(path)),
        );
        choki_watcher.on("addDir", (path) =>
            watcher.__new_dir_action(helper.norm(path)),
        );
    },
};

const server = {
    start: () => {
        const live_server = spawn("pnpm", [
            "light-server",
            "-s",
            env.distDir,
            "-w",
            "dist/**",
        ]);
        live_server.stdout.on("data", (data) => {
            for (const line of data.toString().split("\n")) {
                helper.printMsg(line, PrinterEventType.NORMAL);
            }
        });
        live_server.stderr.on("data", (data) => {
            const lines = data.toString().split("\n");
            for (const line of lines) {
                helper.printMsg(line, PrinterEventType.ERROR);
            }
        });
        live_server.on("close", (code) => {
            helper.printMsg(
                `Server exited with code ${code}`,
                PrinterEventType.WARNING,
            );
        });
        return live_server;
    },
};

const main = () => {
    builder.build_all();
    server.start();
    helper.printMsg("Watching for changes...", PrinterEventType.NORMAL);
    watcher.watch();
};

if (process.argv.length == 2) {
    main();
}

if (process.argv.length == 3 && process.argv[2] == "--build") {
    builder.build_all();
}
