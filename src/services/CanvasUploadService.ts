import { ParsedCanvas } from '../filesystem/CanvasParser.js';
import * as crypto from 'crypto';

/**
 * Canvas Upload Service
 *
 * Handles canvas visual data preparation for upload
 * Works with existing UploadService to upload canvas files with metadata
 *
 * Note: This service prepares canvas data structure. Actual upload happens via UploadService
 */

export interface CanvasUploadResult {
  canvasNodeId: string;
  mappingId: string;
  nodeMappingsCreated: number;
  attributesCreated: number;
  configuration: {
    zoom?: number;
    viewX?: number;
    viewY?: number;
  };
  edges: Array<{
    fromNode: string;
    toNode: string;
    visualProperties: any;
  }>;
}

export interface CanvasNodeData {
  id: string;
  containedNodeId: string;
  metadata: {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    type?: string;
    file?: string;
    text?: string;
  };
}

export class CanvasUploadService {
  constructor() {
    // Stateless service - no dependencies needed
  }

  /**
   * Prepare canvas data structure for upload
   *
   * Extracts visual properties and creates data structure for:
   * - CONTEXT node (canvas itself)
   * - Mapping (viewport configuration)
   * - NodeMappings (node visual properties)
   * - Edges (relationship visual properties)
   *
   * @param canvasFilePath - Path to canvas file
   * @param canvasData - Parsed canvas data
   * @returns Prepared canvas upload data
   */
  prepareCanvasUpload(
    _canvasFilePath: string,
    canvasData: ParsedCanvas
  ): {
    canvasNodeId: string;
    configuration: any;
    nodeMappings: CanvasNodeData[];
    edges: Array<{ fromNode: string; toNode: string; visualProperties: any }>;
  } {
    // Validate canvas data
    if (!canvasData.nodes || !canvasData.edges) {
      throw new Error('Invalid canvas data: missing nodes or edges arrays');
    }

    // Generate UUID for canvas CONTEXT node
    const canvasNodeId = crypto.randomUUID();

    // Extract viewport configuration
    const configuration = canvasData.config || {};

    // Prepare NodeMappings for each canvas node
    const nodeMappings: CanvasNodeData[] = [];
    const nodeIdMap = new Map<string, string>();

    for (const canvasNode of canvasData.nodes) {
      const containedNodeId = this.generateNodeId(canvasNode);
      nodeIdMap.set(canvasNode.id, containedNodeId);

      nodeMappings.push({
        id: canvasNode.id,
        containedNodeId,
        metadata: {
          x: canvasNode.x,
          y: canvasNode.y,
          width: canvasNode.width,
          height: canvasNode.height,
          color: canvasNode.color,
          type: canvasNode.type,
          ...(canvasNode.file && { file: canvasNode.file }),
          ...(canvasNode.text && { text: canvasNode.text })
        }
      });
    }

    // Prepare edges with visual properties
    const edges: Array<{ fromNode: string; toNode: string; visualProperties: any }> = [];

    for (const edge of canvasData.edges) {
      const sourceNodeId = nodeIdMap.get(edge.fromNode);
      const targetNodeId = nodeIdMap.get(edge.toNode);

      if (!sourceNodeId || !targetNodeId) {
        console.warn(`Edge references unknown node: ${edge.fromNode} -> ${edge.toNode}`);
        continue;
      }

      edges.push({
        fromNode: edge.fromNode,
        toNode: edge.toNode,
        visualProperties: {
          fromSide: edge.fromSide,
          toSide: edge.toSide,
          color: edge.color,
          label: edge.label
        }
      });
    }

    return {
      canvasNodeId,
      configuration,
      nodeMappings,
      edges
    };
  }

  /**
   * Simulate canvas upload for testing
   * Returns mock result structure
   */
  async uploadCanvas(
    _spaceId: string,
    _sessionId: string,
    canvasFilePath: string,
    canvasData: ParsedCanvas
  ): Promise<CanvasUploadResult> {
    const prepared = this.prepareCanvasUpload(canvasFilePath, canvasData);

    return {
      canvasNodeId: prepared.canvasNodeId,
      mappingId: crypto.randomUUID(),
      nodeMappingsCreated: prepared.nodeMappings.length,
      attributesCreated: prepared.edges.length,
      configuration: prepared.configuration,
      edges: prepared.edges
    };
  }

  /**
   * Generate node ID for canvas node
   */
  private generateNodeId(_canvasNode: any): string {
    return crypto.randomUUID();
  }
}
