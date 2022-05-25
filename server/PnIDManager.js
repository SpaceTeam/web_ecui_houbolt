const pnidSaveDir = 'client/pnid_houbolt/client/';
const fs = require('fs');
const pathMod = require('path');
const childprocess = require('child_process');

const { exception } = require('console');

module.exports = class PnIDManager {

    static _curPnID = "";
    static _pnids = [];
    static _parsedPnids = {};
    static _configPath = "";

    constructor(programDirPath, configPath) {
        PnIDManager._configPath = configPath;
        PnIDManager._programDirPath = programDirPath;
        PnIDManager.parsePnIDs();
        PnIDManager._curPnID = PnIDManager.getAllPnIDs()[0];
    }

    static parsePnIDs() {
        let files = PnIDManager.createFileList(pathMod.join(PnIDManager._configPath, "pnid", "schematics"));
        if (files.length > 0) {
            console.log("found schematics for parsing to pnids");
            console.log(files);
            files.forEach(file => {
                let fileName = file.split("/").pop().slice(0, -4); //remove leading path segments and trailing file extension
                try {
                    console.log("Parsing", fileName + "...");
                    let parserProc = childprocess.execSync(
                        `node ./client/pnid_houbolt/kicad-schematic-parser.js "${file}" \
                        "${pathMod.join(PnIDManager._configPath, 'pnid', 'schematics', 'pnid-lib', 'PnID.lib')}" \
                        "${pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid')}"`, {stdio: "inherit"}
                    );
                    //I really dislike having to write the pnid to disk and then delete it again but I can't find a different reasonably easy solution
                    //The parser would need to somehow directly return the data (via pipe?) to the caller process, but the parser should also be able to
                    //write to file so that'd need more CLI args for the parser and that's all just too much to do on something that is slated to be replaced anyways
                    PnIDManager._parsedPnids[fileName] = fs.readFileSync(pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid'));
                    fs.unlinkSync(pathMod.join(PnIDManager._programDirPath, 'client', 'pnid_houbolt', 'client', fileName + '.pnid'));
                } catch (e) {
                    //todo better error handling
                    console.log("Error while parsing schematic '" + fileName + "':", e.stderr);
                }
            });
        } else {
            console.log("found no schematics for parsing to pnids");
        }
        
    }

    static createFileList(curPath, curFiles = []) {
        let files = fs.readdirSync(curPath);
        
        files.forEach(file => {
            if (fs.statSync(pathMod.join(curPath, file)).isDirectory()) {
                curFiles = PnIDManager.createFileList(pathMod.join(curPath, file), curFiles);
            } else {
                //get the file extension
                if (file.split(".").pop() == "sch") {
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
        return PnIDManager._pnids;
    }

    
};