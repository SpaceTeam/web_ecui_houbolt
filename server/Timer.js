module.exports = class Timer {

    _intervalMillis;
    _startTime;
    _endTime;
    _timerTickCallback;
    _timerStopCallback;
    _timeMillis;
    _intervalDelegate;

    constructor(interval, startTime, endTime, timerTickCallback, timerStopCallback) {
        this._intervalMillis = interval * 1000;
        this._startTime = startTime;
        this._endTime = endTime;
        this._timerTickCallback = timerTickCallback;
        this._timerStopCallback = timerStopCallback;
        this._timeMillis = this._startTime * 1000;
    }

    start() {

        this._intervalDelegate =  setInterval(this._timerTick, this._intervalMillis, this);
        console.log('Timer: start');
    }

    stop() {

        clearInterval(this._intervalDelegate);
        this._timerTickCallback(this);
        this._timerStopCallback();
        console.log('Timer: end');
    }

    _timerTick(thisTimer)
    {
        thisTimer._timeMillis += thisTimer._intervalMillis;

        if (thisTimer._timeMillis >= thisTimer._endTime * 1000)
        {
            thisTimer.stop();
        }
        else
        {
            thisTimer._timerTickCallback(thisTimer);
        }
    }

    get time()
    {
        return this._timeMillis / 1000;
    }

    get timeMillis()
    {
        return this._timeMillis;
    }
}