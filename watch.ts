import pug from "pug";
import fs from "fs";
import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";
import md5 from "md5";

const env = {
    last_timestamp: "",
    PUG_FILES: {
        "src/index.pug": "dist/index.html",
        "src/about.pug": "dist/about.html",
    },
    labworkPugBaseFile: "src/labwork.template.pug",
    templatePugExt: ".template.pug",
    srcDir: "src/",
    distDir: "dist/",
    labworkMatch: "src/labwork_",
};

enum PrinterEventType {
    NORMAL,
    WARNING,
    ERROR,
}

const helper = {
    norm: (in_path: string) => path.normalize(in_path).replace(/\\/g, "/"),
    listFiles: (dir: string, ignored_extensions: string[] = [], _original_dir: string = dir) => {
        const files: string[] = [];
        dir = helper.norm(dir);
        for (const item of fs.readdirSync(dir)) {
            if (item in [".git", "node_modules", ".DS_Store"]) continue;
            if (ignored_extensions.includes(item.split(".").pop() as string)) continue;
            const currPath = path.join(dir, item);
            if (fs.statSync(currPath).isDirectory())
                files.push(...helper.listFiles(currPath, ignored_extensions, _original_dir));
            else files.push(helper.norm(currPath));
        }
        return files.map((file) => {
            file = file.startsWith(_original_dir)
                ? helper.norm(path.join(...file.split("/").slice(1)))
                : file;
            return helper.norm(file);
        });
    },
    printMsg: (msg: string, type: PrinterEventType = PrinterEventType.NORMAL) => {
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
        if (
            fs.existsSync(dest) &&
            md5(fs.readFileSync(src, "utf-8")) == md5(fs.readFileSync(dest, "utf-8"))
        )
            return;
        helper.printMsg(`Copying ${src} to ${dest}`, PrinterEventType.NORMAL);
        if (dest.split("/").length > 2) {
            const subfolder = helper.norm(dest.slice(0, dest.lastIndexOf("/")));
            if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    },
    getAllLabworkFile: (src: string) => {
        // {
        //    "labwork_1": [
        //    "src/labwork_1/task1.html",
        //    "src/labwork_1/task2.html",
        //    "src/labwork_1/task3.html",
        //    ...],
        //    "labwork_2": [
        //    "src/labwork_2/task1.html",
        //    ...],
        //    ...
        // }

        // Get all task files
        const task_files = helper
            .listFiles(src)
            .filter((item) => item.startsWith("labwork_") && item.endsWith(".html"));
        const labwork_dirs = fs.readdirSync(src).filter((item) => {
            return item.startsWith("labwork_");
        });

        // Push task files to corresponding labwork
        const labwork_files: { [key: string]: string[] } = {};
        labwork_dirs.forEach((labwork_dir) => {
            labwork_files[labwork_dir] = [];
            task_files.forEach(
                (task_file) =>
                    task_file.startsWith(labwork_dir) &&
                    labwork_files[labwork_dir].push(helper.norm(path.join(env.srcDir, task_file))),
            );
        });

        // Sort task files to avoid task1.html, task10.html, task2.html
        Object.entries(labwork_files).forEach(([labwork, tasks]) => {
            labwork_files[labwork] = tasks.sort((a, b) => {
                const task_a = a.match(/task(\d+)\.html/);
                const task_b = b.match(/task(\d+)\.html/);
                return task_a && task_b ? parseInt(task_a[1]) - parseInt(task_b[1]) : 0;
            });
        });
        return labwork_files;
    },
};

const builder = {
    __compose_tasks_in_nav: (labwork: string, task_urls: string[]) => {
        return task_urls
            .map((task, index) => {
                return `<a href="${task.replace(`src/${labwork}/`, "")}">Task ${index + 1}</a>`;
            })
            .join("");
    },
    __filter_compose_nav: (allLabworkFile: { [key: string]: string[] }) => {
        return Object.entries(allLabworkFile)
            .map(([labwork, tasks]) => {
                return `
                <a class="dropbtn">${labwork.replace(/labwork_(\d+)/, "Labwork $1")}</a>
                <div class="dropdown-content">
                    ${builder.__compose_tasks_in_nav(labwork, tasks)}
                </div>
            `;
            })
            .join("\n");
    },
    build_labwork: () => {
        const allLabworkFile = helper.getAllLabworkFile(env.srcDir);
        for (const [labwork, tasks] of Object.entries(allLabworkFile)) {
            const subfolder = path.join(env.distDir, labwork);
            if (!fs.existsSync(subfolder)) fs.mkdirSync(subfolder);
            tasks.forEach((task, index) => {
                let html = pug.compileFile(env.labworkPugBaseFile, {
                    filters: {
                        "labwork-nav": () =>
                            `<li class="dropdown">${builder.__filter_compose_nav(
                                allLabworkFile,
                            )}</li>`,
                        "labwork-container": () => fs.readFileSync(task, "utf-8"),
                        task_number: () => `<h2>Task ${index + 1}</h2>`,
                        prev_task_btn: () => {
                            if (index == 0) return "";
                            const prev_task = tasks[index - 1].replace(`src/${labwork}/`, "");
                            return `
                                <a href="${prev_task}" class="prev-task-btn">
                                    <img src="https://img.icons8.com/ios/50/000000/circled-chevron-left.png">
                                </a>`;
                        },
                        next_task_btn: () => {
                            if (index == tasks.length - 1) return "";
                            const next_task = tasks[index + 1].replace(`src/${labwork}/`, "");
                            return `
                                <a href="${next_task}" class="next-task-btn">
                                    <img src="https://img.icons8.com/ios/50/000000/circled-chevron-right.png">
                                </a>`;
                        },
                    },
                })();
                html = html.replace("<|task_number|>", (index + 1).toString());
                const dest = path.join(env.distDir, task.replace(env.srcDir, ""));
                if (fs.existsSync(dest) && md5(fs.readFileSync(dest, "utf-8")) == md5(html)) return;
                helper.printMsg(`Rebuilding ${task} to ${dest}`, PrinterEventType.NORMAL);
                fs.writeFileSync(dest, html);
            });
        }
    },
    build_pug: (src: string, dest: string) => {
        dest = dest.replace(".pug", ".html");
        const html = pug.compileFile(src)();
        if (fs.existsSync(dest) && md5(fs.readFileSync(dest, "utf-8")) == md5(html)) return;
        helper.printMsg(`Rebuilding ${src} to ${dest}`, PrinterEventType.NORMAL);
        fs.writeFileSync(dest, html);
    },
    __build_pug_all: () => {
        for (const [src, dest] of Object.entries(env.PUG_FILES)) {
            builder.build_pug(src, dest);
        }
    },
    __build_copy_all: () => {
        for (let file of helper.listFiles(env.srcDir, ["pug", "html"])) {
            file = helper.norm(file);
            helper.customCopy(path.join(env.srcDir, file), path.join(env.distDir, file));
        }
    },
    build_all: () => {
        if (!fs.existsSync("dist")) fs.mkdirSync("dist");
        builder.__build_pug_all();
        builder.__build_copy_all();
        builder.build_labwork();
    },
};

const watcher = {
    __add_change_action: (choki_path: string) => {
        switch (true) {
            case choki_path.startsWith(helper.norm(path.join(env.srcDir, "labwork_"))):
                builder.build_labwork();
                return;
            case choki_path.endsWith(env.templatePugExt):
                return;
            case choki_path.endsWith(".pug") && !choki_path.endsWith(env.templatePugExt):
                builder.build_pug(
                    choki_path,
                    choki_path.replace(env.srcDir, env.distDir).replace(".pug", ".html"),
                );
                return;
            default:
                const dist_path = choki_path.replace(env.srcDir, env.distDir);
                helper.customCopy(choki_path, dist_path);
                return;
        }
    },
    __remove_action: (choki_path: string) => {
        helper.printMsg(
            `Removing ${choki_path.replace(env.srcDir, env.distDir)}`,
            PrinterEventType.NORMAL,
        );
        fs.rmSync(choki_path.replace(env.srcDir, env.distDir));
    },
    __new_dir_action: (choki_path: string) => {
        if (!fs.existsSync(choki_path.replace(env.srcDir, env.distDir))) {
            helper.printMsg(
                `Creating directory ${choki_path.replace(env.srcDir, env.distDir)}`,
                PrinterEventType.NORMAL,
            );
            fs.mkdirSync(choki_path.replace(env.srcDir, env.distDir));
        }
    },
    watch: () => {
        const choki_watcher = chokidar.watch(env.srcDir);
        choki_watcher.on("add", (path) => watcher.__add_change_action(helper.norm(path)));
        choki_watcher.on("change", (path) => watcher.__add_change_action(helper.norm(path)));
        choki_watcher.on("unlink", (path) => watcher.__remove_action(helper.norm(path)));
        choki_watcher.on("addDir", (path) => watcher.__new_dir_action(helper.norm(path)));
    },
};

const server = {
    start: () => {
        const live_server = spawn("pnpm", ["light-server", "-s", env.distDir, "-w", "dist/**"]);
        live_server.stdout.on("data", (data) => {
            for (const line of data.toString().split("\n")) {
                if (line.trim() != "") helper.printMsg(line, PrinterEventType.NORMAL);
            }
        });
        live_server.stderr.on("data", (data) => {
            const lines = data.toString().split("\n");
            for (const line of lines) {
                helper.printMsg(line, PrinterEventType.ERROR);
            }
        });
        live_server.on("close", (code) => {
            helper.printMsg(`Server exited with code ${code}`, PrinterEventType.WARNING);
        });
        return live_server;
    },
};

const main = () => {
    builder.build_all();
    server.start();
    watcher.watch();
    helper.printMsg("Watching for changes...", PrinterEventType.NORMAL);
};

if (require.main === module) {
    if (process.argv.length == 2) {
        main();
    }

    if (process.argv.length == 3 && process.argv[2] == "--build_stage_1") {
        const gitignore = fs.readFileSync(".gitignore", "utf-8");
        fs.writeFileSync(
            ".gitignore",
            gitignore
                .replace("\ndist/", "")
                .replace("dist/", "")
                .replace("\ndist", "")
                .replace("dist", ""),
        );
        helper.printMsg("Building...");
        builder.build_all();
    }

    if (process.argv.length == 3 && process.argv[2] == "--build_stage_2") {
        const gitignore = fs.readFileSync(".gitignore", "utf-8");
        fs.writeFileSync(".gitignore", gitignore + "\ndist/");
    }
}

export { helper, builder, watcher, server };
