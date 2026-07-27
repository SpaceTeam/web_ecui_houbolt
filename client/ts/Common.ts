function cloneTemplateAsHtmlElement(id: string): HTMLElement
{
    let el = document.getElementById(id);
    if (el === null)
    {
        throw new Error(`Could not find template with id ${id}`);
    }
    if (el instanceof HTMLTemplateElement)
    {
        // We should move over to template tags over time, this code path should then become the only one
        el = el.content.children[0] as HTMLElement;
    }
    let clone = el.cloneNode(true) as HTMLElement;
    if (!(clone instanceof HTMLElement))
    {
        throw new Error(`Template with id ${id} was not an HTMLElement`);
    }
    return clone;
}