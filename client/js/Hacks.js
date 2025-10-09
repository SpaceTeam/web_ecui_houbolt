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
    if (name.includes("GSEConnection"))
    {
        console.log("found heartbeat", name, value);
        console.log(engineHeartbeatEnableElement)
    }
    switch (name)
    {
        case "rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                engineHeartbeatEnableElement.innerText = "Off";
            }
            else
            {
                engineHeartbeatEnableElement.innerText = "On";
            }
            break;
        case "fuel_rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                fuelHeartbeatEnableElement.innerText = "Off";
            }
            else
            {
                fuelHeartbeatEnableElement.innerText = "On";
            }
            break;
        case "ox_rocket:GSEConnectionAbortEnable":
            if (value == 0)
            {
                oxHeartbeatEnableElement.innerText = "Off";
            }
            else
            {
                oxHeartbeatEnableElement.innerText = "On";
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
