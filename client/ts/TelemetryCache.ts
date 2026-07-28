var telemetryCache: { [key: number]: TelemetryCacheNode } = {};

function updateTelemetryCache(telemetryList: TelemetryList) {
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
                if (true || telemetry.timestamp > telemetryCache[node.id].telemetry[telemetry.id].timestamp)
                {
                    telemetryCache[node.id] = {
                        id: node.id,
                        name: node.name,
                        telemetry: {},
                    };
                    telemetryCache[node.id].telemetry[telemetry.id] = telemetry;
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
    for (let key of Object.keys(telemetryCache))
    {
        let node = telemetryCache[Number.parseInt(key)];
        let reconstructedNode: TelemetryNode = {
            id: node.id,
            name: node.name,
            telemetry: [],
        };
        for (let key of Object.keys(node.telemetry))
        {
            let telemetry = node.telemetry[Number.parseInt(key)];
            reconstructedNode.telemetry.push(telemetry);
        }
    }

    return telemetryList;
}
