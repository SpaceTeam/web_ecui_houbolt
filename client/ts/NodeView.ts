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
            collapse.appendChild(this.#createFieldElement(field, baseId, node.id));
        }

        return template;
    }

    #createFieldElement(field: Field, baseId: string, nodeId: number): HTMLElement
    {
        let el: HTMLElement;
        switch (field.type)
        {
            case "telemetry":
                el = this.#createTelemetryField(field, baseId);
                let textEl = el.querySelectorAll("input")[0];
                telemetryEventRegistrar.register(nodeId, field.id, this.#updateTelemetryField, textEl, SubscriptionType.nodeView);
                break;
            case "parameter":
                el = this.#createParameterField(field, baseId);
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

    #createParameterField(field: Field, baseId: string): HTMLElement
    {
        let template = cloneTemplateAsHtmlElement("tempParameterField");
        template.id = baseId + "_" + field.name;

        let label = template.querySelectorAll("label.field-label")[0] as HTMLElement;
        label.innerText = field.name;

        return template;
    }

    #updateTelemetryField(element: HTMLElement, telemetry: Telemetry): void
    {
        if (element instanceof HTMLInputElement)
        {
            element.value = String(telemetry.value.toFixed(2));
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