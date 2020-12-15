const sequenceSaveDir = './sequence/';
const abortSequenceSaveDir = "./sequence/abort_sequence/";
const fs = require('fs');

const timerMod = require('./Timer');

module.exports = class SequenceManager {

    static _sequence;
    static _abortSequence;
    static _timer;
    static _stopCallback;
    static _syncCallback;
    static _running = false;
    static _syncInterval;
    static _sequencePath = sequenceSaveDir + SequenceManager.getAllSequences()[0];
    static _abortSequencePath = abortSequenceSaveDir + "AbortSequence.json";

    static init() {
        console.log('initialized SequenceManager');
        SequenceManager._sequence = SequenceManager.loadSequence();
        SequenceManager._abortSequence = SequenceManager.loadAbortSequence();
    }

    static startSequence(syncInterval, syncCallback, stopCallback) {
        if (SequenceManager._sequence !== undefined && SequenceManager._abortSequence !== undefined) {
            if (!SequenceManager._running) {
                SequenceManager._running = true;
                SequenceManager._syncInterval = syncInterval * 1000;
                SequenceManager._syncCallback = syncCallback;
                SequenceManager._stopCallback = stopCallback;

                let seq = SequenceManager._sequence;

                SequenceManager._timer = new timerMod(seq.globals.interval, seq.globals.startTime, seq.globals.endTime, SequenceManager._timerTick, SequenceManager._timerDone);
                SequenceManager._timer.start();
            } else {
                console.error("can't start sequence, already running");
            }
        }
        else
        {
            console.error("can't start sequence, sequence or abort-sequence not loaded yet, check sequences for errors!");
        }
    }

    static abortSequence() {
        SequenceManager._timer.stop();
    }

    static _timerTick(timer)
    {
        if (timer.timeMillis % SequenceManager._syncInterval === 0)
        {
            SequenceManager._syncCallback(timer.time);
        }
        //console.log(timer.time);
    }

    static _timerDone()
    {
        SequenceManager._running = false;
        SequenceManager._stopCallback();
    }

    //TODO: maybe prohibit sequence writing when sequence is running
    static saveSequence(sequence)
    {
        try
        {
            let data = JSON.stringify(sequence, null, 4);
            fs.writeFileSync(sequenceSaveDir + SequenceManager._sequencePath, data);
        }
        catch (e) {
            console.error(e.message)
        }
    }

    static saveAbortSequence(abortSequence)
    {
        try
        {
            let data = JSON.stringify(abortSequence, null, 4);
            fs.writeFileSync(abortSequenceSaveDir + SequenceManager._abortSequencePath, data);
        }
        catch (e) {
            console.error(e.message)
        }
    }

    //returns list of sequences where the currently selected gets positioned first
    static getAllSequences()
    {
        let sequences = [];

        fs.readdirSync(sequenceSaveDir).forEach(function(file) {

            let filePath = sequenceSaveDir + file;
            var stat = fs.statSync(filePath);

            if (stat && stat.isFile())
            {
                if (file.match(/.*(\.json)$/))
                {
                    if (filePath === SequenceManager._sequencePath)
                    {
                        sequences.splice( 0, 0, file);
                    }
                    else
                    {
                        sequences.push(file);
                    }
                }
            }
            else
            {
                console.log("ignored " + file + " folder");
            }

        });

        return sequences;
    }

    static getAllAbortSequences()
    {
        let abortSequences = [];

        fs.readdirSync(abortSequenceSaveDir).forEach(function(file) {

            let filePath = abortSequenceSaveDir + file;
            var stat = fs.statSync(filePath);

            if (stat && stat.isFile()) {
                if (file.match(/.*(\.json)$/))
                {
                    if (filePath === SequenceManager._abortSequencePath)
                    {
                        abortSequences.splice( 0, 0, file);
                    }
                    else
                    {
                        abortSequences.push(file);
                    }
                }
            }
            else
            {
                console.log("ignored " + file + " folder");
            }

        });

        return abortSequences;
    }

    static setSequence(fileName)
    {
        SequenceManager._sequencePath = sequenceSaveDir + fileName;
    }

    static setAbortSequence(fileName)
    {
        SequenceManager._abortSequencePath = abortSequenceSaveDir + fileName;

    }

    static loadSequence()
    {
        let rawdata = fs.readFileSync(SequenceManager._sequencePath);
        let seq;
        try {
            seq = JSON.parse(rawdata);
        } catch(e) {
            console.error(e); // error in the above string (in this case, yes)!
        }
        return seq
    }

    static loadAbortSequence()
    {
        let rawdata = fs.readFileSync(SequenceManager._abortSequencePath);
        let seq;
        try {
            seq = JSON.parse(rawdata);
        } catch(e) {
            console.error(e); // error in the above string (in this case, yes)!
        }
        return seq
    }
};