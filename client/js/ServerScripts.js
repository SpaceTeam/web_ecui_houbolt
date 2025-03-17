/**
 * @typedef {Object} ScriptConfig
 * @property {string} id
 * @property {string} title
 * @property {string} command
 * @property {?[string|{title: string, type: "user-input"}|{type: "tmp-file-path", download: boolean}]} args
 */

/**
 * 
 * @param {[ScriptConfig]} scriptsJson 
 */
function loadScripts(scriptsJson) {
    for (const script of scriptsJson) {
        const serverScriptHtml = $("#server-script-template").clone();
        serverScriptHtml.find(".script-title").text(script.title);
        serverScriptHtml.find(".run-script-btn").click(() => onServerScriptExecute(script, serverScriptHtml));
        const parameterTemplate = serverScriptHtml.find(".parameter-group").first();

        for (const arg of script.args ?? []) {
            if (typeof arg === "string") {
                continue;
            }
            if (arg.type === "user-input") {
                const parameterHtml = parameterTemplate.clone();
                parameterHtml.find(".parameter-title").text(arg.title);
                parameterTemplate.after(parameterHtml);
            }
        }

        parameterTemplate.remove();
        serverScriptHtml.appendTo($("#server-scripts-list"));
    }
}

function onServerScriptExecute(script, serverScriptHtml) {
    const args = [];
    serverScriptHtml.find(".parameter-group").each((index, element) => {
        const value = $(element).find(".parameter").val();

        args.push(value);

    });
    $("#server-scripts-feedback").text("");
    socket.emit("execute-script", { id: script.id, args });
}

function onServerScriptFeedback(message) {
    const elem = $("#server-scripts-feedback");
    elem.text(elem.text() + "\n" + message);
}
/**
 * 
 * @param {{path: string, downloadName: string}} file 
 */
function onServerScriptFileFeedback(file) {
    // Initiate download
    const link = document.createElement("a");
    link.href = "scripts/outputs/" + file.path;
    link.download = file.downloadName;
    link.click();
    
}

$.get('/web_config/scripts', function (data) {
    loadScripts(data);
});