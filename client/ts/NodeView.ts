var nodeView;

class NodeView {
    constructor()
    {
        this.#searchInput = document.getElementById("commandSearch")! as HTMLInputElement;
        this.#searchInput.value = "";

        this.#container = document.getElementById("command-list")!;

        this.#domCache = {};
    }

    load(nodes: NodesNode[]): void
    {
        console.log("Loading nodes");
        this.#container.replaceChildren();

        // reset caches
        this.#nodeNameCache = {};
        this.#mappedNameCache = {};
        this.#rawNameCache = {};
        this.#parentCache = {};

        for (let node of nodes)
        {
            this.#initNode(node);
        }
    }

    #createNodeElement(node: NodesNode): HTMLElement
    {
        console.log("Create node element");
        let template = cloneTemplateAsHtmlElement("tempNode");
        let baseId = "nv_node_" + node.name;
        template.id = baseId;
        let header = template.querySelectorAll("div.card-header")[0];
        header.id = "heading_" + baseId;
        let headerButton = template.querySelectorAll("button")[0];
        headerButton.dataset.target = `#collapse_${baseId}`;
        headerButton.setAttribute("aria-controls", `collapse_${baseId}`);
        headerButton.innerText = node.name;

        let collapse = template.querySelectorAll("div.collapse")[0];
        collapse.setAttribute("aria-labelledby", "heading_" + baseId);
        collapse.id = "collapse_" + baseId;

        for (let field of node.fields)
        {
            collapse.appendChild(this.#createFieldElement(field, baseId, node));
        }

        return template;
    }

    #createFieldElement(field: Field, baseId: string, node: NodesNode): HTMLElement
    {
        let el: HTMLElement;
        switch (field.type)
        {
            case "telemetry":
                el = this.#createTelemetryField(field, baseId);
                let telemCurr = el.querySelectorAll("input.current")[0] as HTMLInputElement;
                eventRegistrar.register(field.name, this.#updateTelemetryField, telemCurr , SubscriberType.nodeView, EventType.telemetry);
                break;
            case "parameter":
                el = this.#createParameterField(field, baseId, node.name);
                let paramCurr = el.querySelectorAll("input.current")[0] as HTMLInputElement;
                eventRegistrar.register(field.name, this.#updateParameterField, paramCurr, SubscriberType.nodeView, EventType.parameter);
                break;
            default:
                throw new Error(`Unknown field type: ${field.type}`);
        }

        return el;
    }

    #createTelemetryField(field: Field, baseId: string): HTMLElement
    {
        let template = cloneTemplateAsHtmlElement("tempTelemetryField");
        template.id = baseId + "_" + field.name;

        let label = template.querySelectorAll("label.field-label")[0] as HTMLElement;
        label.innerText = field.name;

        return template;
    }

    #createParameterField(field: Field, baseId: string, tempNodeName: string): HTMLElement
    {
        let template = cloneTemplateAsHtmlElement("tempParameterField");
        template.id = baseId + "_" + field.name;

        let label = template.querySelectorAll("label.field-label")[0] as HTMLElement;
        label.innerText = field.name;

        // TODO I don't love identifying the buttons just by their class
        let refreshButton = template.querySelectorAll("button.btn-outline-secondary")[0] as HTMLElement;
        refreshButton.dataset.fieldName = field.name;
        refreshButton.addEventListener("click", (e: Event): void => {
            let el = e.target as HTMLElement;
            let fieldName: string = el.dataset.fieldName!;
            if (el != refreshButton)
            {
                fieldName = (el.parentNode as HTMLElement).dataset.fieldName!;
            }
            sendGetField({
                field: {
                    value_type: "mapped",
                    name: fieldName,
                },
            });
        });

        let input = template.querySelectorAll("input:not([disabled])")[0] as HTMLInputElement;

        let setButton = template.querySelectorAll("button.btn-secondary")[0] as HTMLElement;
        setButton.dataset.fieldName = field.name;
        setButton.dataset.tempNodeName = tempNodeName;
        setButton.addEventListener("click", (e: Event): void => {
            let el = e.target as HTMLElement;
            sendSetParameter({
                field: {
                    value_type: "mapped",
                    name: el.dataset.fieldName!,
                    node_name: tempNodeName, // TODO this is a temporary hack due to ferroflow
                    field_name: el.dataset.fieldName!, // TODO this is a temporary hack due to ferroflow
                },
                value: Number.parseInt(input.value),
            });
        });

        return template;
    }

    #updateTelemetryField(element: HTMLElement, data: EventData): void
    {
        let telemetry = data.data as Telemetry;
        if (element instanceof HTMLInputElement)
        {
            element.value = String(telemetry.value.toFixed(2));
        }
        else
        {
            console.warn("Failed to update nodeview telemetry field because HTMLElement wasn't input element!");
        }
    }

    #updateParameterField(element: HTMLElement, data: EventData): void
    {
        let fieldGet = data.data as FieldGetResponse;
        if (element instanceof HTMLInputElement)
        {
            element.value = String(fieldGet.value.toFixed(2));
        }
        else
        {
            console.warn("Failed to update nodeview parameter field because HTMLElement wasn't input element!");
        }
    }

    #initNode(node: NodesNode): void
    {
        console.log("Init node");
        if (this.#domCache[node.id] === undefined)
        {
            let element = this.#createNodeElement(node);
            this.#container.appendChild(element);
            this.#domCache[node.id] = element;
        }
    }

    #searchInput: HTMLInputElement;
    #container: HTMLElement;
    #domCache: { [key: number]: HTMLElement };
}