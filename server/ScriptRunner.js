const path = require("path");
const { spawn } = require("child_process");

const fs = require('fs');


/**
 * @typedef {Object} ScriptConfig
 * @property {string} id
 * @property {string} title
 * @property {string} command
 * @property {?[string|{title: string, type: "user-input"}|{type: "tmp-file-path", download: boolean, downloadName: string}]} args
 */

module.exports = class ScriptRunner {
    #configPath;

    constructor(configPath) {
        this.#configPath = path.join(configPath, "web", "server_scripts.json");

    }

    /**
     * 
     * @param {{id: string, args: [string]}} script 
     * @param {*} socket 
     */
    onExecuteScript(script, socket) {
        console.log("Executing script", script);
        const scriptConfig = this.getScriptConfig(script.id);

        if (!scriptConfig) {
            console.error(`Script with ID ${script.id} not found.`);
            socket.emit("script-feedback", "Script not found");
            return;
        }

        const args = [];
        /**
         * @type {{path: string, downloadName: string}[]}
         */
        const filesToDownload = [];

        let userArgIndex = 0;
        for (const arg of scriptConfig.args ?? []) {
            if (typeof arg === "string") {
                args.push(arg);
                continue;
            } else if (arg.type === "user-input") {
                args.push(script.args[userArgIndex++]);
            } else if (arg.type === "tmp-file-path") {
                const tmpFilePath = this.getTmpFilePath();
                args.push(tmpFilePath);
                if (arg.download) {
                    filesToDownload.push({path: tmpFilePath, downloadName: arg.downloadName});
                }
            }
        }

        socket.emit("script-feedback", `Executing script "${scriptConfig.title}".\ncommand: "${scriptConfig.command}". args: ${JSON.stringify(args)}`);

        const child = spawn(scriptConfig.command, args);

        child.stdout.on("data", (data) => {
            socket.emit("script-feedback", data.toString());
        });

        child.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);
            socket.emit("script-feedback", data.toString());
        });

        child.on("close", (code) => {
            console.log(`Child process exited with code ${code}`);
            socket.emit("script-feedback", "Execution complete");
            for (const file of filesToDownload) {
                if (!fs.existsSync(file.path)) {
                    console.error(`Output file not found: ${file.path}`);
                    socket.emit("script-feedback", `Output file ${file.downloadName} not found`);
                    continue;
                }

                socket.emit("script-feedback-file", {path: path.basename(file.path), downloadName: file.downloadName});
            }
        });

        child.on("error", (err) => {
            console.error(`Failed to start script: ${err.message}`);
            socket.emit("script-feedback", "Failed to start script: " + err.message);
        });
    }

    /**
     * 
     * @param {string} scriptId 
     * @returns {ScriptConfig}
     */
    getScriptConfig(scriptId) {
        const scripts = this.loadScripts();
        return scripts.find(script => script.id === scriptId);
    }

    loadScripts() {
        const fs = require("fs");
        const scriptsJson = fs.readFileSync(this.#configPath);
        return JSON.parse(scriptsJson);
    }

    getFileOutputDirectory() {
        const fs = require('fs');
        const outputDir = path.join(__dirname, '..', 'script_output_files');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        return outputDir;
    }

    getTmpFilePath() {
        const crypto = require('crypto');

        const timestamp = Date.now();
        const randomHash = crypto.randomBytes(8).toString('hex');
        const filename = `tmp_${timestamp}_${randomHash}.tmp`;

        const outputDir = this.getFileOutputDirectory();
        const tmpFilePath = path.join(outputDir, filename);

        return tmpFilePath;
    }

    downloadOutputFile(fileName, res) {
        const fs = require('fs');
        const outputDir = this.getFileOutputDirectory();
        const filePath = path.join(outputDir, path.basename(fileName));

        if (!fs.existsSync(filePath)) {
            console.error(`Output file not found: ${filePath}`);
            res.status(404).send("Output file not found");
            return;
        }

        res.sendFile(filePath);
    }
}
