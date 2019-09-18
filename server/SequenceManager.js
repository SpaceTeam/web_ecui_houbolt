const sequenceSavePath = './sequence/Sequence.json';
const abortSequenceSavePath = './sequence/AbortSequence.json';
const fs = require('fs');

const timerMod = require('./Timer');

module.exports = class SequenceManager {

    static _sequence;
    static _abortSequence;
    static _timer;
    static _stopCallback;

    static init() {
        console.log('initialized SequenceManager');
        SequenceManager._sequence = SequenceManager.loadSequence();
        SequenceManager._abortSequence = SequenceManager.loadAbortSequence();
    }

    static startSequence(stopCallback) {
        SequenceManager._stopCallback = stopCallback;
        SequenceManager._timer = new timerMod(0.1, -5, 5, SequenceManager._timerTick, SequenceManager._timerDone);
        SequenceManager._timer.start();
    }

    static _timerTick(timer, time)
    {
        console.log(timer.time);
    }

    static _timerDone()
    {
        SequenceManager._stopCallback();
    }

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