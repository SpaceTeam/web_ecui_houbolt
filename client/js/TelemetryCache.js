var telemetryCache = {};

function updateTelemetryCache(telemetryList) {
    for (let node of telemetryList.nodes)
    {
        if (telemetryCache[node.id] === undefined)
        {
            telemetryCache[node.id] = node;
        }
        else
        {
            for (let telemetry of node.telemetry)
            {
                // TODO remove forced true once FerroFlow is patched with individual timestamps
                if (true || telemetry.timestamp > telemetryCache[node.id][telemetry.id].timestamp)
                {
                    telemetryCache[node.id][telemetry.id] = telemetry;
                }
                else
                {
                    // TODO send to ECUI
                    console.error("received a telemetry value with older timestamp than we already got previously!");
                }
            }
        }
    }
}

function reconstructTelemetryList()
{
    let telemetryList = { "nodes": [] };
    for (let node in telemetryCache)
    {
        let reconstructedNode = {
            "id": node.id,
            "name": node.name,
            "telemetry": []
        };
        for (let telemetry in node.telemetry)
        {
            reconstructedNode.telemetry.push(telemetry);
        }
    }

    return telemetryList;
}
