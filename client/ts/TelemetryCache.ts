var telemetryCache: { [key: number]: TelemetryCacheNode } = {};
var telemetryEventRegistrar: TelemetryEventRegistrar;

enum SubscriptionType {
    pnid,
    nodeView
}

interface TelemetryCacheNode {
    id: number;
    name: string;
    telemetry: { [key: number]: Telemetry };
}

interface SubscriptionStorage {
    [key: string]: Subscriber[];
}

interface Subscriber {
    staticData: HTMLElement;
    callback: (data: HTMLElement, telemetry: Telemetry) => void;
}

class TelemetryEventRegistrar {
    // Holds a dictionary of telemetry IDs and what things want to be notified when there's new data.
    // based on registering/deregistering callbacks. Can pass extra static data to callback

    constructor()
    {
        this.#pnidSubscriptions = {};
        this.#nodeViewSubscriptions = {};
    }

    callEvents(telemetryList: TelemetryList): void
    {
        for (let node of telemetryList.nodes)
        {
            for (let telemetry of node.telemetry)
            {
                this.#callEvent(node.id, telemetry);
            }
        }
    }

    #callEvent(nodeId: number, telemetry: Telemetry): void
    {
        let key = nodeId + "_" + telemetry.id;

        let subscriptions = this.#pnidSubscriptions[key];
        this.#iterateSubscriptions(subscriptions, telemetry);

        subscriptions = this.#nodeViewSubscriptions[key];
        this.#iterateSubscriptions(subscriptions, telemetry);
    }

    #iterateSubscriptions(subscriptions: Subscriber[], telemetry: Telemetry): void
    {
        if (subscriptions !== undefined)
        {
            for (let sub of subscriptions)
            {
                sub.callback(sub.staticData, telemetry);
            }
        }
    }

    register(nodeId: number, fieldId: number, callback: (data: HTMLElement, telemetry: Telemetry) => void, data: any, type: SubscriptionType): void
    {
        let storage = this.#getSubscriptionStore(type);
        let key = nodeId + "_" + fieldId;
        if (storage[key] === undefined)
        {
            storage[key] = [];
        }

        storage[key].push({
            staticData: data,
            callback: callback,
        });
    }

    deregister(nodeId: number, fieldId: number, callback: (data: HTMLElement, telemetry: Telemetry) => void, type: SubscriptionType): void
    {
        let storage = this.#getSubscriptionStore(type);
        let key = nodeId + "_" + fieldId;
        if (storage[key] === undefined)
        {
            return;
        }

        for (let i = 0; i < storage[key].length; i++)
        {
            let sub = storage[key][i];
            if (sub.callback === callback)
            {
                storage[key].splice(i, 1);
            }
        }
    }

    #getSubscriptionStore(type: SubscriptionType): SubscriptionStorage
    {
        let ret: SubscriptionStorage = {};
        switch (type)
        {
            case SubscriptionType.pnid:
                ret = this.#pnidSubscriptions;
                break;
            case SubscriptionType.nodeView:
                ret = this.#nodeViewSubscriptions;
                break;
            default:
                console.error("Unknown subscription type: " + type);
                break;
        }
        return ret;
    }

    clear(type: SubscriptionType): void
    {
        switch (type)
        {
            case SubscriptionType.pnid:
                this.#pnidSubscriptions = {};
                break;
            case SubscriptionType.nodeView:
                this.#nodeViewSubscriptions = {};
                break;
            default:
                console.error("Unknown subscription type: " + type);
                break;
        }
    }

    // subscriptions kept separate to be quicker about filtering when they get invoked
    #pnidSubscriptions: SubscriptionStorage; // kept separate to easier clear on pnid switches
    #nodeViewSubscriptions: SubscriptionStorage; //
}

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
