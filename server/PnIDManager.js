const pnidSaveDir = 'client/pnid_houbolt/client/';
const fs = require('fs');
const pathMod = require('path');
const childprocess = require('child_process');

const { exception } = require('console');

module.exports = class PnIDManager {

    static _curPnID = PnIDManager.getAllPnIDs()[0];
    static _pnids = [];
    static _configPath = "";

    constructor(configPath) {
        PnIDManager._configPath = configPath;
        //PnIDManager.parsePnIDs();
    }

    static parsePnIDs() {
        console.log("parse pnids");
        let files = PnIDManager.createFileList(pathMod.join(PnIDManager._configPath, "pnid", "schematics"));
        console.log("found schematic files for parsing");
        console.log(files);
        files.forEach(file => {
            let fileName = file.split("/").pop();
            try {
                let parserProc = childprocess.execSync(
                    "./client/pnid_houbolt/kicad-schematic-parser.js",
                    [file, pathMod.join(PnIDManager._configPath, "pnid", "schematics", "PnID.lib"),
                    pathMod.join("client", fileName + ".pnid")], {stdio: "pipe"}
                );
            } catch (e) {
                console.log("Error while parsing schematic '" + fileName + "':", e.stderr);
            }
            

            //parserProc.on("error", );
        });
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
        return pnidSaveDir + PnIDManager._curPnID;
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

        if (PnIDManager._pnids.length === 0)
        {
            throw exception("no pnids found inside pnid folder");
        }
        return PnIDManager._pnids;
    }

    
};