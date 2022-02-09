var log = {
    log: []
}; //a dict containing an array of dicts containing timestamp and state list array
//todo there has to be a cleaner way to do this. needs to be able to load from a string though and I think having a json dict containing an array is the only easy way to do so.
var logTimer = 0;
var logStartDateTime = 0;
var replayIndex = 0;

function startLogging(duration)
{
    logStartDateTime = new Date();
    if (duration <= 0) {
        printLog("info", "Started logging without timeout. Logging needs to be stopped manually by calling <code>stopLogging();</code>");
    }
    setTimeout(stopLogging, duration);
    printLog("info", "Started logging data.");
}

function stopLogging()
{
    logStartDateTime = 0;
    printLog("info", "Stopped logging data.");
}

function saveLog()
{
    //todo: maybe a request to the server with log data so it can save it as a file?
    console.log(JSON.stringify(log));
}

function logStates(stateList)
{
    if (logStartDateTime != 0) {
        log["log"].push({
            time: new Date() - logStartDateTime,
            states: stateList,
        });
    }
}

function replayLog()
{
    if (replayIndex >= log["log"].length) {
        printLog("info", "Finished replaying the logged data.");
        return;
    }
    //fetch log entry
    let logEntry = log["log"][replayIndex];
    //display log entry
    updatePNID(logEntry["states"])
    
    //fetch previous log entry time (or current time if it's first log entry)
    let previousTime = logEntry["time"];
    if (replayIndex > 0) {
        previousTime = log["log"][replayIndex - 1]["time"];
    }
    replayIndex++;
    //start timer for next step in the log
    setTimeout(replayLog, logEntry["time"] - previousTime);
}

function abortLogReplay()
{
    clearTimeout(logTimer);
}

function clearLog()
{
    log["log"] = [];
}

function loadLog(loadedLog)
{
    log = JSON.parse(loadedLog);
}