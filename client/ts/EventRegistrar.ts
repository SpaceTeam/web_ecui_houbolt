var eventRegistrar: EventRegistrar;

enum EventType {
    telemetry,
    parameter,
}
enum SubscriberType {
    pnid,
    nodeView,
}

interface EventData {
    data: Telemetry | FieldGetResponse;
}

interface TelemetryCacheNode {
    id: number;
    name: string;
    telemetry: { [key: number]: Telemetry };
}

interface SubscriptionStorage {
    telemetry: { [key: string]: Subscriber[] };
    parameter: { [key: string]: Subscriber[] };
}

interface Subscriber {
    staticData: HTMLElement;
    callback: (data: HTMLElement, telemetry: EventData) => void;
}

class EventRegistrar {
    // Holds a dictionary of telemetry IDs and what things want to be notified when there's new data.
    // based on registering/deregistering callbacks. Can pass extra static data to callback

    constructor()
    {
        this.#pnidSubscriptions = {
            telemetry: {},
            parameter: {},
        };
        this.#nodeViewSubscriptions = {
            telemetry: {},
            parameter: {},
        };
    }

    invokeTelemetryEvents(list: TelemetryList): void
    {
        for (let node of list.nodes)
        {
            for (let telemetry of node.telemetry)
            {
                this.#invokeTelemetryEvent(telemetry);
            }
        }
    }

    #invokeTelemetryEvent(telemetry: Telemetry): void
    {
        let key = telemetry.name;
        let data: EventData = {
            data: telemetry,
        };

        let subscriptions = this.#pnidSubscriptions.telemetry[key];
        this.#iterateSubscriptions(subscriptions, data);

        subscriptions = this.#nodeViewSubscriptions.telemetry[key];
        this.#iterateSubscriptions(subscriptions, data);
    }

    invokeFieldGetEvent(fieldGet: FieldGetResponse): void
    {
        let key = fieldGet.name;
        let data: EventData = {
            data: fieldGet,
        };

        let subscriptions = this.#pnidSubscriptions.parameter[key];
        this.#iterateSubscriptions(subscriptions, data);

        subscriptions = this.#nodeViewSubscriptions.parameter[key];
        this.#iterateSubscriptions(subscriptions, data);
    }

    #iterateSubscriptions(subscriptions: Subscriber[], data: EventData): void
    {
        if (subscriptions !== undefined)
        {
            for (let sub of subscriptions)
            {
                sub.callback(sub.staticData, data);
            }
        }
    }

    register(fieldRawName: string, callback: (staticData: HTMLElement, data: EventData) => void, staticData: any, subType: SubscriberType, evType: EventType): void
    {
        let storage = this.#getEventTypeFromSubscriptionStore(this.#getSubscriptionStore(subType), evType);
        let key = fieldRawName;
        if (storage[key] === undefined)
        {
            storage[key] = [];
        }

        storage[key].push({
            staticData: staticData,
            callback: callback,
        });
    }

    deregister(fieldRawName: string, callback: (staticData: HTMLElement, data: EventData) => void, subType: SubscriberType, evType: EventType): void
    {
        let storage = this.#getEventTypeFromSubscriptionStore(this.#getSubscriptionStore(subType), evType);
        let key = fieldRawName;
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

    #getEventTypeFromSubscriptionStore(store: SubscriptionStorage, type: EventType): { [key: string]: Subscriber[] }
    {
        switch (type)
        {
            case EventType.telemetry:
                return store.telemetry;
            case EventType.parameter:
                return store.parameter;
        }
    }

    #getSubscriptionStore(type: SubscriberType): SubscriptionStorage
    {
        let ret: SubscriptionStorage = {
            telemetry: {},
            parameter: {},
        };
        switch (type)
        {
            case SubscriberType.pnid:
                ret = this.#pnidSubscriptions;
                break;
            case SubscriberType.nodeView:
                ret = this.#nodeViewSubscriptions;
                break;
            default:
                console.error("Unknown subscription type: " + type);
                break;
        }
        return ret;
    }

    clear(type: SubscriberType): void
    {
        switch (type)
        {
            case SubscriberType.pnid:
                this.#pnidSubscriptions = {
                    telemetry: {},
                    parameter: {},
                };
                break;
            case SubscriberType.nodeView:
                this.#nodeViewSubscriptions = {
                    telemetry: {},
                    parameter: {},
                };
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
