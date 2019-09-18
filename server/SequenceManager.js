const sequenceSavePath = './sequence/Sequence.json';
const abortSequenceSavePath = './sequence/AbortSequence.json';
const fs = require('fs');

module.exports = class SequenceManager {

    constructor() {
        console.log('created SequenceManager');
    }

    static saveSequence(sequence)
    {
        let data = JSON.stringify(sequence, null, 4);
        fs.writeFileSync(sequenceSavePath, data);
    }

    static saveAbortSequence(abortSequence)
    {
        let data = JSON.stringify(abortSequence, null, 4);
        fs.writeFileSync(abortSequenceSavePath, data);
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