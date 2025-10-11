import * as crypto from 'crypto';

/**
 * Canvas Clone Service
 *
 * Reconstructs Obsidian .canvas files from Mujarrad Mapping/NodeMapping data
 * Preserves visual properties with ±1 pixel accuracy (NFR-031)
 *
 * Implements:
 * - FR-020: Canvas reconstruction from Mappings
 * - FR-021: Visual property restoration
 * - NFR-031: Visual accuracy within ±1 pixel
 */

export interface CanvasJSON {
  nodes: CanvasNodeJSON[];
  edges: CanvasEdgeJSON[];
  zoom?: number;
  viewX?: number;
  viewY?: number;
}

export interface CanvasNodeJSON {
  id: string;
  type: string;
  file?: string;
  text?: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface CanvasEdgeJSON {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  color?: string;
  label?: string;
}

export interface MappingData {
  configuration: {
    zoom?: number;
    viewX?: number;
    viewY?: number;
  };
}

export interface NodeMappingData {
  containedNodeId: string;
  containedNodeSlug?: string;
  metadata: {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    type?: string;
    file?: string;
    text?: string;
    url?: string;
  };
}

export interface EdgeData {
  sourceNodeId: string;
  targetNodeId: string;
  visualProperties?: {
    fromSide?: string;
    toSide?: string;
    color?: string;
    label?: string;
  };
}

export class CanvasCloneService {
  /**
   * Reconstruct canvas JSON from Mapping, NodeMappings, and edges
   *
   * @param mapping - Mapping with viewport configuration
   * @param nodeMappings - NodeMappings with visual properties
   * @param edges - Edges with visual properties
   * @returns Reconstructed canvas object
   */
  reconstructCanvas(
    mapping: MappingData,
    nodeMappings: NodeMappingData[],
    edges: EdgeData[]
  ): CanvasJSON {
    const canvas: CanvasJSON = {
      nodes: [],
      edges: []
    };

    // Step 1: Extract viewport configuration from Mapping
    if (mapping.configuration) {
      if (mapping.configuration.zoom !== undefined) {
        canvas.zoom = mapping.configuration.zoom;
      }
      if (mapping.configuration.viewX !== undefined) {
        canvas.viewX = mapping.configuration.viewX;
      }
      if (mapping.configuration.viewY !== undefined) {
        canvas.viewY = mapping.configuration.viewY;
      }
    }

    // Step 2: Reconstruct nodes from NodeMappings
    for (const nodeMapping of nodeMappings) {
      const node: CanvasNodeJSON = {
        id: nodeMapping.containedNodeId,
        type: nodeMapping.metadata.type || 'file',
        x: nodeMapping.metadata.x,
        y: nodeMapping.metadata.y,
        width: nodeMapping.metadata.width,
        height: nodeMapping.metadata.height
      };

      // Add optional properties
      if (nodeMapping.metadata.color) {
        node.color = nodeMapping.metadata.color;
      }
      if (nodeMapping.metadata.file) {
        node.file = nodeMapping.metadata.file;
      }
      if (nodeMapping.metadata.text) {
        node.text = nodeMapping.metadata.text;
      }
      if (nodeMapping.metadata.url) {
        node.url = nodeMapping.metadata.url;
      }

      canvas.nodes.push(node);
    }

    // Step 3: Reconstruct edges with visual properties
    for (const edge of edges) {
      const canvasEdge: CanvasEdgeJSON = {
        id: this.generateEdgeId(),
        fromNode: edge.sourceNodeId,
        toNode: edge.targetNodeId
      };

      // Add visual properties if present
      if (edge.visualProperties) {
        if (edge.visualProperties.fromSide) {
          canvasEdge.fromSide = edge.visualProperties.fromSide;
        }
        if (edge.visualProperties.toSide) {
          canvasEdge.toSide = edge.visualProperties.toSide;
        }
        if (edge.visualProperties.color) {
          canvasEdge.color = edge.visualProperties.color;
        }
        if (edge.visualProperties.label) {
          canvasEdge.label = edge.visualProperties.label;
        }
      }

      canvas.edges.push(canvasEdge);
    }

    return canvas;
  }

  /**
   * Generate canvas JSON string from reconstructed data
   *
   * @param mapping - Mapping data
   * @param nodeMappings - NodeMapping data
   * @param edges - Edge data
   * @returns Formatted JSON string for .canvas file
   */
  generateCanvasJSON(
    mapping: MappingData,
    nodeMappings: NodeMappingData[],
    edges: EdgeData[]
  ): string {
    const canvas = this.reconstructCanvas(mapping, nodeMappings, edges);
    return JSON.stringify(canvas, null, 2);
  }

  /**
   * Generate unique edge ID
   */
  private generateEdgeId(): string {
    return crypto.randomUUID();
  }
}
