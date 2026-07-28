interface FieldGetResponse {
    node_id: number;
    node_name: string;
    raw_name: string;
    mapped_name: string;
    name: string;
    raw: number;
    value: number;
    unit: string;
    logical: string;
}

interface GetFieldRaw {
    field: FieldIdentifierRaw;
}

interface GetFieldMapped {
    field: FieldIdentifierMapped;
}

interface SetParameterRaw {
    field: FieldIdentifierRaw;
    value: number;
}

interface SetParameterMapped {
    field: FieldIdentifierMapped;
    value: number;
}

interface FieldIdentifierMapped {
    value_type: "mapped";
    name: string;
}

interface FieldIdentifierRaw {
    value_type: "raw";
    name: string;
}

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