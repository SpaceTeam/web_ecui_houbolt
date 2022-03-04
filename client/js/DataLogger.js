var log = {
    log: []
}; //a dict containing an array of dicts containing timestamp and state list array
//todo there has to be a cleaner way to do this. needs to be able to load from a string though and I think having a json dict containing an array is the only easy way to do so.
var logTimer = 0;
var logStartDateTime = 0;
var replayStartDateTime = 0;
var lastLogStepTime = 0;
var replayIndex = 0;

var executionTimes = [];

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

function replayLog(fixedDelay = undefined)
{
    if (replayIndex == 0)
    {
        executionTimes = [];
        replayStartDateTime = new Date();
    }
    if (replayIndex >= log["log"].length)
    {
        printLog("info", "Finished replaying the logged data.");
        replayIndex = 0;
        console.log("execution times:", executionTimes);
        let minExecTime = 10000;
        let maxExecTime = 0;
        let averageSum = 0;
        for (let time of executionTimes) {
            if (time < minExecTime) {
                minExecTime = time;
            }
            if (time > maxExecTime) {
                maxExecTime = time;
            }
            averageSum += time;
        }
        console.log(`min exec time: ${minExecTime}ms, max exec time: ${maxExecTime}ms\naverage exec time (n = ${executionTimes.length}): ${averageSum / executionTimes.length}ms\ntotal time to replay log: ${new Date() - replayStartDateTime}ms`);
        return;
    }
    //fetch log entry
    let logEntry = log["log"][replayIndex];
    //store actual time before executing this log step for later use
    lastLogStepTime = new Date();
    //display log entry
    updatePNID(logEntry["states"]); //this is potentially very long compared to the rest of the logging logic
    let executionTime = new Date() - lastLogStepTime;
    executionTimes.push(executionTime);
    
    //if there is no fixed time step specified, calculate from log timestamps
    let nextStepDelay = 0;
    if (fixedDelay == undefined)
    {
        //fetch previous log entry time (or current time if it's first log entry)
        //this is the "should" time which may have been delayed by too long execution time
        let previousTime = logEntry["time"];
        if (replayIndex > 0)
        {
            previousTime = log["log"][replayIndex - 1]["time"];
        }
        replayIndex++;
        //start timer for next step in the log
        nextStepDelay = logEntry["time"] - previousTime - executionTime;
        if (nextStepDelay < 0)
        {
            nextStepDelay = 0;
        }
    }
    else
    {
        nextStepDelay = fixedDelay;
    }
    
    setTimeout(replayLog, nextStepDelay);
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