/*
 * This file contains a bunch of hardcoded hacks that don't neatly apply to the generic/configurable ECUI/PnID setup
 * but we need them anyways for some reason
 */

var engineHeartbeatEnableElement = $("hack-heartbeat-engine-enabled");
var engineHeartbeatTimerElement = $("hack-heartbeat-engine-timer");
var fuelHeartbeatEnableElement = $("hack-heartbeat-fuel-enabled");
var fuelHeartbeatTimerElement = $("hack-heartbeat-fuel-timer");
var oxHeartbeatEnableElement = $("hack-heartbeat-ox-enabled");
var oxHeartbeatTimerElement = $("hack-heartbeat-ox-timer");

function hackShowHeartbeat(commandStates)
{
    for (let command in commandStates)
    {
        switch (command)
        {
            case ""
        }
    }
}
