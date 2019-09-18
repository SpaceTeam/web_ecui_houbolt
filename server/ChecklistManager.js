const checklistSavePath = './sequence/Checklist.json'
const fs = require('fs');

module.exports = class ChecklistManager {

    _listItems;
    _currListItem;
    _checklist;

    constructor() {
        console.log('created SequenceManager');
        this.init()
    }

    init()
    {
        this._checklist = ChecklistManager._loadChecklist();
        this._listItems = Object.keys(this._checklist).length;
        this._currListItem = 0;
    }

    //returns true if checklist is completed
    tick()
    {
        this._currListItem++;
        if (this._currListItem >= this._listItems)
        {
            return true;
        }
        else
        {
            return false;
        }
    }
    static saveChecklist(checklist)
    {
        let data = JSON.stringify(checklist, null, 4);
        fs.writeFileSync(checklistSavePath, data);

    }

    static _loadChecklist()
    {
        let rawdata = fs.readFileSync(checklistSavePath);
        let list = JSON.parse(rawdata);
        return list
    }
};