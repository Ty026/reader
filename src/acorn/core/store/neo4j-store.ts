import neo4j, { Driver } from "neo4j-driver";
import { trim } from "lodash";
import type { GraphDB } from "./graph-db";
import { env } from "@/acorn/utils/env";

export class Neo4JStore<
  Node extends object = object,
  Edge extends object = object,
> implements GraphDB<Node, Edge>
{
  uri = env("NEO4J_URI");
  username = env("NEO4J_USERNAME");
  password = env("NEO4J_PASSWORD");
  _driver?: Driver;
  connected = false;

  constructor(public namespace: string) {}

  async getNodeDegree(entityName: string): Promise<number> {
    const entity_name_label = trim(entityName, '"');
    const query = `MATCH (n:\`${entity_name_label}\`) RETURN COUNT{ (n)--() } AS totalEdgeCount`;
    const db = await this.lazydb();
    const result = await db.session().run(query);
    const record = result.records[0];
    return record.get("totalEdgeCount").toNumber();
  }

  // Retrieves all edges (relationships) for a particular node identified by its label.
  //return: List of dictionaries containing edge information
  async getNodeEdges(entityName: string): Promise<[string, string][]> {
    const entityNameLabel = trim(entityName, '"');
    const query = `MATCH (n:\`${entityNameLabel}\`)
                  OPTIONAL MATCH (n)-[r]-(connected)
                  RETURN n, r, connected`;
    const db = await this.lazydb();
    const result = await db.session().run(query);
    const edges = [] as [string, string][];
    result.records.forEach((record) => {
      const source_node = record.get("n");
      const connected = record.get("connected");
      const source = source_node.labels[0] ?? null;
      const target = connected?.labels?.[0] ?? null;
      if (source && target) {
        edges.push([source, target]);
      }
    });
    return edges;
  }

  async edgeDegree(sourceId: string, targetId: string): Promise<number> {
    const entityNameLabelSource = trim(sourceId, '"');
    const entityNameLabelTarget = trim(targetId, '"');
    let src_degree = await this.getNodeDegree(entityNameLabelSource);
    let tgt_degree = await this.getNodeDegree(entityNameLabelTarget);
    src_degree = src_degree ?? 0;
    tgt_degree = tgt_degree ?? 0;
    const degrees = Number(src_degree) + Number(tgt_degree);
    return degrees;
  }

  async lazydb() {
    if (!this._driver) {
      this._driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password),
      );
    }
    if (!this.connected) {
      await this._driver.getServerInfo();
      this.connected = true;
    }
    return this._driver;
  }

  async hasNode(nodeId: string): Promise<boolean> {
    const entity_name_label = trim(nodeId, '"');
    const query = `MATCH (n: \`${entity_name_label}\`) RETURN COUNT(n) > 0 as node_exists`;
    const db = await this.lazydb();
    const result = await db.session().run(query);
    return result.records[0]!.get("node_exists");
  }

  async getNode(nodeId: string): Promise<null | Node> {
    const label = trim(nodeId, '"');
    const query = "MATCH (n:`" + label + "`) RETURN n";
    const db = await this.lazydb();
    const result = await db.session().run(query);
    if (result.records.length === 0) return null;
    const node = result.records[0]!.get("n").properties;
    return node;
  }

  async addNode(nodeId: string, data: Node) {
    const label = trim(nodeId, '"');
    const query = `MERGE (n:\`${label}\`) SET n+= $properties`;
    const db = await this.lazydb();
    await db.session().run(query, { properties: data });
  }

  async addEdge(
    sourceNodeId: string,
    targetNodeId: string,
    edge: Edge,
  ): Promise<void> {
    const sourceLabel = trim(sourceNodeId, '"');
    const targetLabel = trim(targetNodeId, '"');

    const query = `
      MATCH (source: \`${sourceLabel}\`)
      WITH source
      MATCH (target: \`${targetLabel}\`)
      MERGE (source)-[r:DIRECTED]->(target)
      SET r+= $properties
      RETURN r`;

    const db = await this.lazydb();
    await db.session().run(query, {
      properties: edge,
    });
  }

  async hasEdge(sourceId: string, targetId: string): Promise<boolean> {
    const name_source = trim(sourceId, '"');
    const name_target = trim(targetId, '"');
    const query = `
      MATCH (n1:\`${name_source}\`)-[r]->(n2:\`${name_target}\`)
      RETURN COUNT(r) > 0 AS edge_exists`;
    const db = await this.lazydb();
    const result = await db.session().run(query);
    return result.records[0]!.get("edge_exists");
  }

  async getEdge(sourceId: string, targetId: string): Promise<Edge | null> {
    const sourceLabel = trim(sourceId, '"');
    const targetLabel = trim(targetId, '"');
    const query = `
       MATCH (start: \`${sourceLabel}\`)-[r]->(end: \`${targetLabel}\`)
       RETURN properties(r) AS edge_properties LIMIT 1`;
    const db = await this.lazydb();
    const result = await db.session().run(query);
    if (result.records.length === 0) return null;
    const edge = result.records[0]!.get("edge_properties");
    return edge;
  }
}
