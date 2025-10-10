/*
 * This file contains a bunch of hardcoded hacks that don't neatly apply to the generic/configurable ECUI/PnID setup
 * but we need them anyways for some reason
 */

var engineHeartbeatEnableElement = $("#hack-heartbeat-engine-enabled")[0];
var engineHeartbeatTimerElement = $("#hack-heartbeat-engine-timer")[0];
var fuelHeartbeatEnableElement = $("#hack-heartbeat-fuel-enabled")[0];
var fuelHeartbeatTimerElement = $("#hack-heartbeat-fuel-timer")[0];
var oxHeartbeatEnableElement = $("#hack-heartbeat-ox-enabled")[0];
var oxHeartbeatTimerElement = $("#hack-heartbeat-ox-timer")[0];

var heartbeatShouldOn = false;
function toggleHeartbeat()
{
    if (heartbeatShouldOn)
    {
        setHeartbeatActive(true);
    }
    else
    {
        setHeartbeatActive(false);
    }
}

function startHeartbeatPoll()
{
    setInterval(pollHeartbeatState, 5000);
}

function pollHeartbeatState()
{
    sendCommand("rocket:GetGSEConnectionAbortEnable", []);
    sendCommand("rocket:GetGSEConnectionAbortTimer", []);
    //sendCommand("fuel_rocket:GetGSEConnectionAbortEnable", []);
    //sendCommand("fuel_rocket:GetGSEConnectionAbortTimer", []);
    //sendCommand("ox_rocket:GetGSEConnectionAbortEnable", []);
    //sendCommand("ox_rocket:GetGSEConnectionAbortTimer", []);
}

function setHeartbeatActive(active)
{
    let value = active ? 1 : 0;
    sendCommand("rocket:SetGSEConnectionAbortEnable", [value]);
    //sendCommand("fuel_rocket:SetGSEConnectionAbortEnable", value);
    //sendCommand("ox_rocket:SetGSEConnectionAbortEnable", value);
}

function hackShowHeartbeat(name, value)
{
    switch (name)
    {
        case "rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                heartbeatShouldOn = false;
                engineHeartbeatEnableElement.innerText = "E: Off";
            }
            else
            {
                heartbeatShouldOn = true;
                engineHeartbeatEnableElement.innerText = "E: On";
            }
            break;
        case "fuel_rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                fuelHeartbeatEnableElement.innerText = "F: Off";
            }
            else
            {
                fuelHeartbeatEnableElement.innerText = "F: On";
            }
            break;
        case "ox_rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                oxHeartbeatEnableElement.innerText = "O: Off";
            }
            else
            {
                oxHeartbeatEnableElement.innerText = "O: On";
            }
            break;
        case "rocket:GSEConnectionAbortTimer":
            engineHeartbeatTimerElement.innerText = `${( value/1000.0 ).toFixed(1)}s`;
            break;
        case "fuel_rocket:GSEConnectionAbortTimer":
            fuelHeartbeatTimerElement.innerText = `${( value/1000.0 ).toFixed(1)}s`;
            break;
        case "ox_rocket:GSEConnectionAbortTimer":
            oxHeartbeatTimerElement.innerText = `${( value/1000.0 ).toFixed(1)}s`;
            break;
    }
}
