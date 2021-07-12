const pnidSaveDir = './sequence/';
const fs = require('fs');

const timerMod = require('./Timer');

module.exports = class PnIDManager {

    static _curPnID;
    static _timer;
    static _stopCallback;
    static _syncCallback;
    static _running = false;
    static _syncInterval;
    static _pnidPath = pnidSaveDir + PnIDManager.getAllPnIDs()[0];

    static init() {
        console.log('initialized PnIDManager');
        PnIDManager._curPnID = PnIDManager.getAllPnIDs()[0];
    }

    static setPnID(filename) {
        fetch("0.0.0.0:8080/pnid", {
            method: "POST",
            body: filename
        });
        PnIDManager._curPnID = pnidSaveDir + filename;
    }

    static loadPnID()
    {
        return curPnID;
    }

    //returns list of sequences where the currently selected gets positioned first
    static getAllPnIDs()
    {
        let pnids = [];

        /*fs.readdirSync(pnidSaveDir).forEach(function(file) {

            let filePath = pnidSaveDir + file;
            var stat = fs.statSync(filePath);

            if (stat && stat.isFile())
            {
                if (file.match(/.*(\.json)$/))
                {
                    if (filePath === PnIDManager._pnidPath)
                    {
                        pnids.splice( 0, 0, file);
                    }
                    else
                    {
                        pnids.push(file);
                    }
                }
            }
            else
            {
                console.log("ignored " + file + " folder");
            }

        });*/

        return pnids;
    }

    
};