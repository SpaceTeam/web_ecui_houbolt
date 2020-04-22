const checklistSavePath = './checklists/Checklist.json';
const fs = require('fs');

module.exports = class ChecklistManager {

    _checklist;
    _ids = [];
    _tickedIds = [];

    //TODO: make the start process in spereate start method so ChecklistManager becomes static (singleton) class
    constructor() {
        console.log('created ChecklistManager');
        this.init()
    }

    init()
    {
        this._ids = [];

        this._checklist = ChecklistManager.loadChecklist();
        try {
            for (let item in this._checklist) {
                this._ids.push(this._checklist[item].id);
            }
        }
        catch (e) {
            console.log(e.message)
        }
        this._tickedIds = [];
    }

    //returns true if checklist is completed
    tick(id)
    {
        //cast
        if (!Number.isInteger(id)) {
            id = parseInt(id);
        }
        //process
        if (this._ids.includes(id)) //use tickedIds for untick functionality
        {
            if (!this._tickedIds.includes(id))
            {
                this._tickedIds.push(id)
                console.log(id);
                console.log(this._tickedIds);
                if (this._tickedIds.length >= this._ids.length)
                {
                    console.log("checklist finished")
                    return 1;
                }
                else
                {
                    return 0;
                }
            }
            else
            {
                console.log(id + " already ticked off")
                return -1;
            }
        }
        else
        {
            console.log(id + " not in checklist")
            return -1;
        }

    }

    static saveChecklist(checklist)
    {
        try
        {
            let data = JSON.stringify(checklist, null, 4);
            fs.writeFileSync(checklistSavePath, data);
        }
        catch (e) {
            console.error(e.message)
        }

    }

    static loadChecklist()
    {
        let rawdata = fs.readFileSync(checklistSavePath);
        let list = JSON.parse(rawdata);
        return list
    }
};