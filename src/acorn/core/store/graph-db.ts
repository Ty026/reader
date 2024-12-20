export interface GraphDB<Node, Edge> {
  addNode(entityName: string, node: Omit<Node, "name">): Promise<void>;
  hasNode(nodeId: string): Promise<boolean>;
  getNode(entityName: string): Promise<Node | null>;

  hasEdge(sourceId: string, targetId: string): Promise<boolean>;
  getEdge(sourceId: string, targetId: string): Promise<Edge | null>;
  addEdge(
    sourceNodeId: string,
    targetNodeId: string,
    edge: Omit<Edge, "sourceId" | "targetId">,
  ): Promise<void>;

  getNodeDegree(entityName: string): Promise<number>;
  getNodeEdges(entityName: string): Promise<[string, string][]>;
  edgeDegree(sourceId: string, targetId: string): Promise<number>;
}
