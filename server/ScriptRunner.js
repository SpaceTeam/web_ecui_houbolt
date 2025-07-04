const path = require("path");
const fs = require('fs');
const fetch = require('node-fetch');


/**
 * @typedef {Object} ScriptConfig
 * @property {string} id
 * @property {string} title
 * @property {string} command
 * @property {Array<
 *   string |
 *   { type: "tmp-file-path", download: boolean } |
 *   { type: "param", name: string|null, title: string } |
 *   { type: "flag", name: string, title: string } |
 *   { type: "multi-param", name: string, title: string }
 * >} args
 */

module.exports = class ScriptRunner {
    #configPath;
    #scriptRunnerIp;
    #scriptRunnerPort;

    constructor(configPath) {
        this.#configPath = path.join(configPath, "web", "server_scripts.json");
        // Load config file and extract SCRIPT_RUNNER/ip and /port
        const configFilePath = path.join(configPath, "config.json");
        let config = {};
        try {
            config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
        } catch (e) {
            console.error("Failed to read config.json:", e);
        }
        this.#scriptRunnerIp = config?.SCRIPT_RUNNER?.ip || "localhost";
        this.#scriptRunnerPort = config?.SCRIPT_RUNNER?.port || 8000;
    }

    /**
     * 
     * @param {{id: string, args: [{
     *  type: "param" | "flag" | "multi-param",
     *  index: number,
     *  value?: string,
     *  values?: string[],
     *  name?: string,
     *  title?: string
     * }]}} script 
     * @param {*} socket 
     */
    async onExecuteScript(script, socket) {
        console.log("Executing script", script);
        const scriptConfig = this.getScriptConfig(script.id);

        if (!scriptConfig) {
            console.error(`Script with ID ${script.id} not found.`);
            socket.emit("script-feedback", "Script not found" + script.id + "\n");
            return;
        }

        const args = [];
        let clientArgIndex = 0;

        for (const [index, argConfig] of scriptConfig.args?.entries() ?? []) {
            if (typeof argConfig === "string") {
                args.push(argConfig);
            } else if (argConfig.type === "tmp-file-path") {
                // tmp-file-path arguments are handled by the script-runner itself, not passed from the client
                // so we just push the config as is.
                args.push(argConfig);
            } else {
                const clientArg = script.args[clientArgIndex];
                // For other types, we expect a corresponding argument from the client
                if (clientArg?.index === index) {
                    if (clientArg.type === "param") {
                        if (clientArg.name) {
                            args.push(`${clientArg.name}`);
                        }
                        args.push(clientArg.value);
                    } else if (clientArg.type === "flag") {
                        args.push(`${clientArg.name}`);
                    } else if (clientArg.type === "multi-param") {
                        if (clientArg.name) {
                            args.push(`${clientArg.name}`);
                        }
                        args.push(...clientArg.values);
                    }
                    clientArgIndex++;
                }
            }
        }

        socket.emit("script-feedback", `Executing script "${scriptConfig.title}".\ncommand: "${scriptConfig.command}". args: ${JSON.stringify(args)}\n`);

        try {
            const response = await fetch(
                `http://${this.#scriptRunnerIp}:${this.#scriptRunnerPort}/execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        command: scriptConfig.command,
                        args: args
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Script execution failed with status ${response.status}: ${errorText}`);
            }

            const decoder = new TextDecoder();
            let fullResponseText = '';
            for await (const chunk of response.body) {
                const textChunk = decoder.decode(chunk, { stream: true });
                socket.emit("script-feedback", textChunk); // stream chunk to client
                fullResponseText += textChunk; // buffer chunk
            }

            const downloadInfoMarker = '\n---DOWNLOAD-INFO---\n';
            if (fullResponseText.includes(downloadInfoMarker)) {
                const parts = fullResponseText.split(downloadInfoMarker);
                const downloadInfoRaw = parts[parts.length - 1];
                try {
                    const downloadInfo = JSON.parse(downloadInfoRaw);
                    for (const file of downloadInfo.temp_files) {
                        socket.emit("script-feedback-file", {
                            path: file.download_url,
                            downloadName: file.download_name
                        });
                    }
                } catch (e) {
                    console.error("Error parsing download info:", e);
                }
            }

            socket.emit("script-feedback", "Execution complete\n");
        } catch (err) {
            console.error(`Failed to start script: ${err.message}`);
            socket.emit("script-feedback", "Failed to start script: " + err.message + "\n");
        }
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

    async downloadOutputFile(fileName, res) {
        const scriptRunnerUrl = `http://${this.#scriptRunnerIp}:${this.#scriptRunnerPort}${fileName}`;

        try {
            const response = await fetch(scriptRunnerUrl);

            if (!response.ok) {
                res.status(response.status).send("File not found on script-runner");
                return;
            }

            const contentDisposition = response.headers.get("content-disposition");
            if (contentDisposition) {
                res.setHeader("Content-Disposition", contentDisposition);
            }

            response.body.pipe(res);
        } catch (error) {
            console.error(`Error downloading file from script-runner: ${error.message}`);
            res.status(500).send("Error downloading file");
        }
    }
}
