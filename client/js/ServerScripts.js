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

/**
 * 
 * @param {[ScriptConfig]} scriptsJson 
 */
function loadScripts(scriptsJson) {
    for (const script of scriptsJson) {
        const serverScriptHtml = $("#server-script-template").clone();
        serverScriptHtml.find(".script-title").text(script.title);
        serverScriptHtml.find(".run-script-btn").click(() => onServerScriptExecute(script, serverScriptHtml));
        const parameterContainer = serverScriptHtml.find(".parameter-container");

        for (const [index, arg] of script.args?.entries() ?? []) {
            if (typeof arg === "string") {
                continue;
            }
            let parameterHtml;
            if (arg.type === "param") {
                parameterHtml = $("#server-script-param-template").find(".parameter-group").clone();
                parameterHtml.find(".parameter-title").text(arg.title);
                parameterHtml.data("arg-name", arg.name);
            } else if (arg.type === "flag") {
                parameterHtml = $("#server-script-flag-template").find(".parameter-group").clone();
                const inputId = `script-${script.id}-${arg.name}-flag`;
                parameterHtml.find(".parameter-title").text(arg.title).attr("for", inputId);
                parameterHtml.find(".parameter").attr("id", inputId);
                parameterHtml.data("arg-name", arg.name);
            } else if (arg.type === "multi-param") {
                parameterHtml = $("#server-script-multi-param-template").find(".parameter-group").clone();
                parameterHtml.find(".parameter-title").text(arg.title);
                parameterHtml.data("arg-name", arg.name);
            }

            if (parameterHtml) {
                parameterHtml.data("arg-index", index);
                parameterContainer.append(parameterHtml);
            }
        }

        serverScriptHtml.appendTo($("#server-scripts-list"));
    }
}

function onServerScriptExecute(script, serverScriptHtml) {
    const args = [];
    serverScriptHtml.find(".parameter-group").each((_index, element) => {
        const argType = $(element).data("arg-type");
        const parameterElement = $(element).find(".parameter");
        const index = $(element).data("arg-index");
        let value;

        if (argType === "param") {
            value = parameterElement.val();
            if (value) {
                args.push({ type: argType, name: $(element).data("arg-name"), value, index });
            }
        } else if (argType === "flag") {
            if (parameterElement.is(":checked")) {
                args.push({ type: argType, name: $(element).data("arg-name"), index });
            }
        } else if (argType === "multi-param") {
            value = parameterElement.val();
            if (value) {
                const values = value.split(",").map(s => s.trim()).filter(s => s);
                args.push({ type: argType, name: $(element).data("arg-name"), values, index });
            }
        }
    });
    $("#server-scripts-feedback").text("");
    socket.emit("execute-script", { id: script.id, args });
}

function onServerScriptFeedback(message) {
    const elem = $("#server-scripts-feedback");
    elem.text(elem.text() + message);
}
/**
 * 
 * @param {{path: string, downloadName: string}} file 
 */
function onServerScriptFileFeedback(file) {
    // Initiate download
    const link = document.createElement("a");
    link.href = file.path;
    link.download = file.downloadName;
    link.click();

}

$.get('/web_config/scripts', function (data) {
    loadScripts(data);
});
