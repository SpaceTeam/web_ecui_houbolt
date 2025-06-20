const pnidSaveDir = 'client/pnid_houbolt/client/';
const fs = require('fs');
const pathMod = require('path');
const childprocess = require('child_process');
const chokidar = require('chokidar');

const kicad_parser = require("kicad_svg_parser");

const { exception } = require('console');
const { setEnvironmentData } = require('worker_threads');
const { SchematicCoordinateSystem } = require('kicad_svg_parser/out/util/coordinate_system');

module.exports = class PnIDManager {

    static _curPnID = "";
    static _pnids = [];
    static _parsedPnids = {};
    static _configPath = "";
    static _pnidPath = "";
    static _watcher = undefined

    constructor(programDirPath, configPath) {
        PnIDManager._configPath = configPath;
        PnIDManager._pnidPath = pathMod.join(PnIDManager._configPath, "pnid", "schematics");
        PnIDManager._programDirPath = programDirPath;
        //PnIDManager.parsePnIDs();

        PnIDManager._watcher = chokidar.watch(PnIDManager._pnidPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });
        PnIDManager._watcher.on("add", path => {
            let fileFullName = path.split("/").pop();
            let fileExt = path.split("/").pop().split(".").pop();
            if (fileExt == "kicad_sch" && !path.includes("backup")) {
                console.log("Found schematic for parsing to PnID:", fileFullName);
                PnIDManager.parsePnIDs([path]);
            }
        });
        PnIDManager._watcher.on("change", path => {
            let fileFullName = path.split("/").pop();
            let fileExt = path.split("/").pop().split(".").pop();
            if (fileExt == "kicad_sch") {
                console.log("Detected change in schematic, updating PnID:", fileFullName);
                PnIDManager.parsePnIDs([path]);
            }
        });
        PnIDManager._watcher.on("unlink", path => {
            let fileFullName = path.split("/").pop();
            let fileExt = fileFullName.split(".").pop();
            let fileName = fileFullName.slice(0, -(fileExt.length + 1)); //remove leading path segments and trailing file extension
            if (fileExt == "kicad_sch") {
                console.log("Detected deletion of schematic, removing from PnID list:", fileFullName);
                if (PnIDManager._curPnID === fileName) {
                    PnIDManager._curPnID = PnIDManager.getAllPnIDs()[0];
                }
                delete PnIDManager._parsedPnids[fileName];
            }
        })

        //TODO: Potentially fragile because unknown behavior if parsing takes longer than timeout (if no pnid parsed within timeout: error, if only some parsed default selection may be inconsistent)
        setTimeout(function () { PnIDManager._curPnID = PnIDManager.getAllPnIDs()[0] }, 1000);
    }

    static parsePnIDs(fileList = undefined) {
        let files = fileList || PnIDManager.createFileList(PnIDManager._pnidPath);
        if (files.length > 0) {
            //console.log("found schematics for parsing to pnids");
            //console.log(files);
            files.forEach(file => {
                let fileFullName = file.split("/").pop();
                let fileExt = fileFullName.split(".").pop();
                let fileName = fileFullName.slice(0, -(fileExt.length + 1)); //remove leading path segments and trailing file extension
                try {
                    console.log("Parsing", fileName + "...", file);
                    PnIDManager._parsedPnids[fileName] = PnIDManager.convertPnID(file);
                    /*let parserProc = childprocess.execSync(
                        `node ./client/pnid_houbolt/kicad-schematic-parser.js "${file}" \
                        "${pathMod.join(PnIDManager._pnidPath, 'pnid-lib', 'PnID.lib')}" \
                        "${pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid')}"`, {stdio: "inherit"}
                    );
                    //I really dislike having to write the pnid to disk and then delete it again but I can't find a different reasonably easy solution
                    //The parser would need to somehow directly return the data (via pipe?) to the caller process, but the parser should also be able to
                    //write to file so that'd need more CLI args for the parser and that's all just too much to do on something that is slated to be replaced anyways
                    PnIDManager._parsedPnids[fileName] = fs.readFileSync(pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid'));
                    fs.unlinkSync(pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid'));*/
                } catch (e) {
                    //todo better error handling
                    console.log("Error while parsing schematic '" + fileName + "':", e);
                }
            });
        } else {
            console.log("found no schematics for parsing to pnids");
        }
    }

    static convertPnID(schematic_file) {
        // Read schematic file
        // Schematic file path needs to be passed as the first argument of the script
        const schematic_txt = fs.readFileSync(schematic_file, 'utf-8');
        // parse the schematic file contents
        const schematic = kicad_parser.readSchematic(schematic_txt)
        //console.log(Object.keys(schematic));
        //console.log(Object.entries(schematic.lib_symbols));
        // log schematic version
        console.info(`Loaded schematic '${schematic_file}'`)
        console.info(`- version: ${schematic.version}`)
        console.info(`- symbols: ${schematic.$symbol?.length ?? 0}`)
        console.info(`- wires: ${schematic.$wire?.length ?? 0}`)


        // create a generator with customized settings
        let incReference = 0;
        const generator = new kicad_parser.SVGGenerator({
            debug: kicad_parser.DEFAULT_SVG_DEBUG_SETTINGS,
            classes: {
                DIAGRAM: "pnid-svg",
                SYMBOL: "comp",
                WIRE: "wire",
                GRAPHICS: "pnid-graphics", //not needed in old
                SYMBOL_GRAPHICS: "pnid-symbol-graphics", //not needed in old
                PROPERTY: "pnid-property", //text, not sure if I can control this as I'd want to (all texts get the same class)
                PIN: "pnid-graphics",
                PIN_NUMBER: "", //doesn't occur?
                PIN_NAME: "pin-name", //doesn't occur?
                BOUNDS: "" //doesn't occur?
            },
            styleVars: { // I don't want any of those, the old pnid did styling differently and they approaches are *way* too different to adapt this now.
                DEFAULT_STROKE_WIDTH: "--none)\" data-ignore=\"", // I hate this, but it works
                DEFAULT_STROKE_COLOR: "--none)\" data-ignore=\"",
                DEFAULT_FILL_COLOR: "--none)\" data-ignore=\"",
                DEFAULT_STROKE_STYLE: "--none)\" data-ignore=\"",
                DEFAULT_JUNCTION_RADIUS: "--none)\" data-ignore=\""
            },
            createHiddenTexts: true,
            callbacks: {
                NET_ATTRIBUTES: net => {
                    return `data-pnid-net="${net.name}"`;
                },
                NET_CLASSES: net => {},
                SYMBOL_CLASSES: symbol => {
                    incReference += 1;
                    let type = symbol.lib_id.replace(":", "-");
                    let valueReference = symbol.$property?.find(p => p.key === "Value").value.replaceAll(":", "-");
                    return [incReference.toString(), type, valueReference];
                },
                SYMBOL_ATTRIBUTES: symbol => {
                    const unit = symbol.$property?.find(p => p.key === "Unit")?.value;
                    const sensorTag = ":sensor";
                    const sensor = symbol.$property?.find(p => p.key === "Value" && p.value.endsWith(sensorTag))?.value?.slice(0, -sensorTag.length);
                    const content = symbol.$property?.find(p => p.key === "Data_Content")?.value;
                    const actionRef = symbol.$property?.find(p => p.key === "Action_Reference")?.value;
                    const type = symbol.lib_id.substring(symbol.lib_id.indexOf(":") + 1);

                    const typeAttr = `data-pnid-type="${type}"`; //not necessary?
                    const unitAttr = `data-unit="${unit?.trim() ?? ""}"`;
                    const sensorAttr = sensor ? `data-pnid-sensor="${sensor}"` : ""; //not necessary?
                    const contentAttr = `data-content="${content?.trim() ?? ""}"`;
                    const actionRefAttr = `data-action-reference="${(actionRef ?? "").replaceAll(":", "-")}"`;
                    const valueAttr = `data-value=""`;
                    const actionRefValueAttr = `data-action-reference-value=""`;

                    return `${typeAttr} ${unitAttr} ${sensorAttr} ${contentAttr} ${actionRefAttr} ${valueAttr} ${actionRefValueAttr}`;
                },
                SYMBOL_ADDITIONAL_ELEMENTS: symbol => {
                    let valueReference = symbol.$property?.find(p => p.key === "Value").value.replaceAll(":", "-");
                    let actionReference = symbol.$property?.find(p => p.key === "Action_Reference")?.value.replaceAll(":", "-").trim();
                    let eventListenerTarget = valueReference;
                    if (actionReference)
                    {
                        eventListenerTarget = actionReference
                    }
                    return `<rect class="rect hitbox" visibility="hidden" pointer-events="all" onclick="clickEventListener('${eventListenerTarget}')"></rect>`;
                },
                PROPERTY_ATTRIBUTES: (symbol, property) => {
                    return `visibility="${property.effects["$hide"] ? "hidden" : "visible"}"`;
                },
                PROPERTY_TEXT: (symbol, property) => {},
                PROPERTY_CLASSES: (symbol, property) => {
                    let key = property.key;
                    let value = property.value;
                    let effects = property.effects;
                    let keyPrepared = key.toLowerCase();
                    if (keyPrepared == "action_reference") { // fix class names to fit the idiosyncrasies of the pnid software. no there is no clear pattern. no I will not fix it.
                        keyPrepared = "actionReferenceValue";
                    } else if (keyPrepared == "unit") {
                        keyPrepared = "Unit";
                    }
                    return key == "Reference" ? [keyPrepared, "static-color"] : [keyPrepared];
                },
            }
        })
        // generate svg file contents
        console.info(`Generating html for schematic...`)
        let schematicData = new kicad_parser.SchematicData(schematic, undefined);
        //console.log(schematicData)
        const svg = PnIDManager.convertSvgToOldFormat(PnIDManager.svgManualFixes(generator.generateSVG(schematicData)));
        //fs.writeFileSync("out.html", svg);
        return svg;
        /*console.info(`Saving file '${output_file_name}'...`)
        // save svg file
        console.info(`Done.`)*/
    }

    //Ideally this function should not exist, but the new parser (for KiCad 6 and up) returns slightly different formatting which we need to adapt to what the PnID software was made to expect. If someone wants to take the task of updating the PnID software to work with the (arguably nicer) format of the new parser, be my guest.
    static convertSvgToOldFormat(svg) {
        svg = svg.replace("<g>", "");
        let searchIndex = svg.lastIndexOf("</g>")
        console.log("search index", searchIndex);
        if (searchIndex != -1) {
            svg = svg.substr(0, searchIndex) + svg.substr(searchIndex + "</g>".length);
        }
        return svg;
    }

    //Kind of does the same as "convertSvgToOldFormat", but with a different connotation: The things in here are not necessarily useless hacks that only exist to fit the idiosyncrasies of the old parser, but genuine things that need clean up from the new parser
    static svgManualFixes(svg) {
        //remove padding. CAUTION/TODO: If the default padding in the parser changes this will break shit. Ideal solution would be to make padding customizable in parser!
        let viewBoxResult = [...svg.matchAll(/viewBox="([+-]?\d+\.?\d*) ([+-]?\d+\.?\d*) ([+-]?\d+\.?\d*) ([+-]?\d+\.?\d*)"/g)];
        let viewBox = [viewBoxResult[0][1], viewBoxResult[0][2], viewBoxResult[0][3], viewBoxResult[0][4]]; //why is JS such an utter pile of garbage?
        let undoPadX = 5;
        let undoPadY = 10;
        viewBox[0] = Number(viewBox[0]) + undoPadX;
        viewBox[1] = Number(viewBox[1]) + undoPadY;
        viewBox[2] = Number(viewBox[2]) - undoPadX * 2;
        viewBox[3] = Number(viewBox[3]) - undoPadY * 2;

        // align pnid more central
        viewBox[2] += viewBox[0];
        viewBox[0] = 0;

        // apply view box fixes
        svg = svg.replace(/viewBox=".*"/, `viewBox="${viewBox.join(' ')}"`);
        return svg;
    }

    static createFileList(curPath, curFiles = []) {
        let files = fs.readdirSync(curPath);
        
        files.forEach(file => {
            if (fs.statSync(pathMod.join(curPath, file)).isDirectory()) {
                curFiles = PnIDManager.createFileList(pathMod.join(curPath, file), curFiles);
            } else {
                //get the file extension
                if (file.split(".").pop() == "kicad_sch") {
                    //todo: this will probably also include a file just called "sch" without anything else
                    curFiles.push(pathMod.join(curPath, file));
                }
            }
        });
        return curFiles;
    }

    static setPnID(filename) {
        if (PnIDManager._pnids.length === 0)
        {
            PnIDManager.getAllPnIDs();
        }
        console.log(PnIDManager._pnids, filename);
        if (PnIDManager._pnids.includes(filename))
        {
            PnIDManager._curPnID = filename;
        }
        else
        {
            console.error("pnid file not found, defaulting back to first in list");
            PnIDManager._curPnID = PnIDManager._pnids[0];
        }
    }

    static getPnID()
    {
        if (PnIDManager._curPnID === undefined)
        {
            throw exception("no pnids found inside pnid folder");
        }
        //if this is a pnid that got automatically parsed, return the data from RAM
        if (PnIDManager._parsedPnids[PnIDManager._curPnID] != undefined)
        {
            return PnIDManager._parsedPnids[PnIDManager._curPnID];
        }
        //else read from file and return that
        return fs.readFileSync(pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', PnIDManager._curPnID)).toString();
    }

    //returns list of sequences where the currently selected gets positioned first
    static getAllPnIDs()
    {
        PnIDManager._pnids = [];
        fs.readdirSync(pnidSaveDir).forEach(function(file) {

            let filePath = pnidSaveDir + file;
            var stat = fs.statSync(filePath);

            if (stat && stat.isFile())
            {
                if (file.match(/.*(\.pnid)$/))
                {
                    if (filePath === PnIDManager._pnidPath)
                    {
                        PnIDManager._pnids.splice( 0, 0, file);
                    }
                    else
                    {
                        PnIDManager._pnids.push(file);
                        console.log(file);
                    }
                }
            }
            else
            {
                console.log("ignored " + file + " folder");
            }

        });
        for (const [key, value] of Object.entries(PnIDManager._parsedPnids))
        {
            PnIDManager._pnids.push(key);
        }

        if (PnIDManager._pnids.length === 0)
        {
            throw exception("no pnids found to parse or already parsed in client folder");
        }
        return PnIDManager._pnids.sort();
    }

    
};
