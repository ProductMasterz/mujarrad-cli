/**
 * Canvas node structure from Obsidian .canvas files
 */
export interface CanvasNode {
  /** Unique node identifier */
  id: string;
  /** Type of node (file, text, link, group) */
  type?: string;
  /** File path if node references a file */
  file?: string;
  /** Text content if node doesn't reference a file */
  text?: string;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Node width */
  width: number;
  /** Node height */
  height: number;
  /** Color identifier (optional) */
  color?: string;
  /** Whether node has an associated file */
  hasFile?: boolean;
}

/**
 * Canvas edge structure connecting nodes
 */
export interface CanvasEdge {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  fromNode: string;
  /** Target node ID */
  toNode: string;
  /** Side of source node (top, right, bottom, left) */
  fromSide?: string;
  /** Side of target node (top, right, bottom, left) */
  toSide?: string;
  /** Color identifier (optional) */
  color?: string;
  /** Label text (optional) */
  label?: string;
}

/**
 * Canvas configuration (viewport settings)
 */
export interface CanvasConfig {
  /** Zoom level */
  zoom?: number;
  /** Viewport X offset */
  viewX?: number;
  /** Viewport Y offset */
  viewY?: number;
}

/**
 * Visual properties extracted from canvas nodes
 */
export interface VisualProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

/**
 * Parsed canvas structure
 */
export interface ParsedCanvas {
  /** Canvas nodes with visual properties */
  nodes: (CanvasNode & { visualProperties: VisualProperties })[];
  /** Canvas edges */
  edges: CanvasEdge[];
  /** Canvas viewport configuration */
  config: CanvasConfig;
}

/**
 * CanvasParser parses Obsidian .canvas JSON files
 *
 * Features:
 * - Parses canvas JSON structure (nodes, edges, config)
 * - Extracts visual properties (position, size, color)
 * - Handles nodes with and without file references
 * - Identifies nested canvas files
 * - Validates JSON structure
 *
 * Canvas Format (JSON Canvas spec):
 * ```json
 * {
 *   "nodes": [
 *     {
 *       "id": "node1",
 *       "type": "file",
 *       "file": "note.md",
 *       "x": 0,
 *       "y": 0,
 *       "width": 400,
 *       "height": 300,
 *       "color": "1"
 *     }
 *   ],
 *   "edges": [
 *     {
 *       "id": "edge1",
 *       "fromNode": "node1",
 *       "toNode": "node2"
 *     }
 *   ],
 *   "zoom": 1.0,
 *   "viewX": 0,
 *   "viewY": 0
 * }
 * ```
 *
 * Usage:
 * ```typescript
 * const parser = new CanvasParser(canvasJSON);
 * const parsed = parser.parse();
 * const config = parser.extractConfig();
 * const edges = parser.extractEdges();
 * const nested = parser.findNestedCanvases();
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-008: Canvas JSON parsing
 * Implements FR-CLI-009: Visual property extraction
 */
export class CanvasParser {
  private content: string;
  private parsedData: any;

  constructor(canvasContent: string) {
    this.content = canvasContent;
  }

  /**
   * Parse canvas JSON and extract all components
   *
   * @returns Parsed canvas with nodes, edges, and config
   * @throws Error if JSON is invalid or not a canvas structure
   */
  parse(): ParsedCanvas {
    try {
      this.parsedData = JSON.parse(this.content);
    } catch (error: any) {
      throw new Error(`Failed to parse canvas JSON: ${error.message}`);
    }

    // Validate that parsed data is an object (not array or null)
    if (typeof this.parsedData !== 'object' || this.parsedData === null || Array.isArray(this.parsedData)) {
      throw new Error('Invalid canvas format: expected object');
    }

    const nodes = this.parseNodes();
    const edges = this.extractEdges();
    const config = this.extractConfig();

    return {
      nodes,
      edges,
      config
    };
  }

  /**
   * Parse canvas nodes and extract visual properties
   *
   * @returns Array of nodes with visual properties
   */
  private parseNodes(): (CanvasNode & { visualProperties: VisualProperties })[] {
    const rawNodes = this.parsedData.nodes || [];

    return rawNodes.map((node: any) => {
      const hasFile = node.file !== undefined && node.file !== null;

      const visualProperties: VisualProperties = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      };

      if (node.color !== undefined) {
        visualProperties.color = node.color;
      }

      return {
        id: node.id,
        type: node.type,
        file: node.file,
        text: node.text,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        color: node.color,
        hasFile,
        visualProperties
      };
    });
  }

  /**
   * Extract canvas viewport configuration
   *
   * @returns Canvas config with zoom and viewport offsets
   */
  extractConfig(): CanvasConfig {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    const config: CanvasConfig = {};

    if (this.parsedData.zoom !== undefined) {
      config.zoom = this.parsedData.zoom;
    }

    if (this.parsedData.viewX !== undefined) {
      config.viewX = this.parsedData.viewX;
    }

    if (this.parsedData.viewY !== undefined) {
      config.viewY = this.parsedData.viewY;
    }

    return config;
  }

  /**
   * Extract canvas edges
   *
   * @returns Array of edges with visual properties
   */
  extractEdges(): CanvasEdge[] {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    const rawEdges = this.parsedData.edges || [];

    return rawEdges.map((edge: any) => ({
      id: edge.id,
      fromNode: edge.fromNode,
      toNode: edge.toNode,
      fromSide: edge.fromSide,
      toSide: edge.toSide,
      color: edge.color,
      label: edge.label
    }));
  }

  /**
   * Find nested canvas file references
   *
   * Identifies nodes that reference other .canvas files
   *
   * @returns Array of nested canvas file paths
   */
  findNestedCanvases(): string[] {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    const nodes = this.parsedData.nodes || [];
    const nested: string[] = [];

    for (const node of nodes) {
      if (node.file && node.file.endsWith('.canvas')) {
        nested.push(node.file);
      }
    }

    return nested;
  }

  /**
   * Get all nodes from the canvas
   *
   * @returns Array of canvas nodes
   */
  getNodes(): CanvasNode[] {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    return this.parsedData.nodes || [];
  }

  /**
   * Get all edges from the canvas
   *
   * @returns Array of canvas edges
   */
  getEdges(): CanvasEdge[] {
    return this.extractEdges();
  }

  /**
   * Get node count
   *
   * @returns Number of nodes in canvas
   */
  getNodeCount(): number {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    return (this.parsedData.nodes || []).length;
  }

  /**
   * Get edge count
   *
   * @returns Number of edges in canvas
   */
  getEdgeCount(): number {
    if (!this.parsedData) {
      this.parsedData = JSON.parse(this.content);
    }

    return (this.parsedData.edges || []).length;
  }
}
