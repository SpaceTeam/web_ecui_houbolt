const sequenceSavePath = './sequence/Sequence.json';
const abortSequenceSavePath = './sequence/AbortSequence.json';
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

    static init() {
        console.log('initialized SequenceManager');
        SequenceManager._sequence = SequenceManager.loadSequence();
        SequenceManager._abortSequence = SequenceManager.loadAbortSequence();
    }

    static startSequence(syncInterval, syncCallback, stopCallback) {
        if (!SequenceManager._running) {
            SequenceManager._running = true;
            SequenceManager._syncInterval = syncInterval * 1000;
            SequenceManager._syncCallback = syncCallback;
            SequenceManager._stopCallback = stopCallback;

            let seq = SequenceManager._sequence;

            SequenceManager._timer = new timerMod(seq.globals.interval, seq.globals.startTime, seq.globals.endTime, SequenceManager._timerTick, SequenceManager._timerDone);
            SequenceManager._timer.start();
        }
        else
        {
            console.error("can't start sequence, already running");
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
        console.log(timer.time);
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
            fs.writeFileSync(sequenceSavePath, data);
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
            fs.writeFileSync(abortSequenceSavePath, data);
        }
        catch (e) {
            console.error(e.message)
        }
    }

    static loadSequence()
    {
        let rawdata = fs.readFileSync(sequenceSavePath);
        let seq = JSON.parse(rawdata);
        return seq
    }

    static loadAbortSequence()
    {
        let rawdata = fs.readFileSync(abortSequenceSavePath);
        let seq = JSON.parse(rawdata);
        return seq
    }
};