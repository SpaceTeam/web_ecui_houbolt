var nodeCache;

class NodeCache {
    init(nodes)
    {
        this.lastUpdate = Date.now();
        this.nodes = nodes;
    }

    lastUpdate;
    nodes;
}