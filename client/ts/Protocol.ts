interface NodesNode {
    id: number;
    name: string;
    fields: Field[];
}

interface Field {
    id: number;
    type: string;
    name: string;
    raw_name: string;
    mapped_name: string;
}

interface TelemetryList {
    nodes: TelemetryNode[];
}

interface TelemetryNode {
    id: number;
    name: string;
    telemetry: Telemetry[];
}

interface Telemetry {
    id: number;
    name: string;
    raw_name: string;
    mapped_name: string;
    raw: number;
    value: number;
    unit: string;
    logical: string;
    prev_timestamp?: number;
    timestamp: number;
}