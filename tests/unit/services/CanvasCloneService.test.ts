import { CanvasCloneService } from '../../../src/services/CanvasCloneService.js';

/**
 * Canvas Clone Service Tests (TDD - Tests First)
 *
 * Task 7.2: Implement Canvas Clone (Canvas Reconstruction)
 * User Story 3: Canvas Visual Preservation
 *
 * Tests FR-020, FR-021, NFR-031
 */

describe('CanvasCloneService', () => {
  let canvasCloneService: CanvasCloneService;

  beforeEach(() => {
    canvasCloneService = new CanvasCloneService();
  });

  describe('reconstructCanvas', () => {
    it('should reconstruct canvas JSON from Mapping configuration', () => {
      const mapping = {
        configuration: {
          zoom: 1.5,
          viewX: 100,
          viewY: 200
        }
      };
      const nodeMappings: any[] = [];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      expect(canvas.zoom).toBe(1.5);
      expect(canvas.viewX).toBe(100);
      expect(canvas.viewY).toBe(200);
    });

    it('should reconstruct canvas nodes from NodeMappings', () => {
      const mapping = { configuration: {} };
      const nodeMappings = [
        {
          containedNodeId: 'note-id-1',
          containedNodeSlug: 'my-note',
          metadata: {
            x: 100,
            y: 200,
            width: 400,
            height: 300,
            color: '1',
            type: 'file',
            file: 'notes/my-note.md'
          }
        },
        {
          containedNodeId: 'text-node-id',
          metadata: {
            x: 600,
            y: 200,
            width: 300,
            height: 200,
            color: '2',
            type: 'text',
            text: 'Some text content'
          }
        }
      ];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      expect(canvas.nodes).toHaveLength(2);

      // Verify first node (file reference)
      expect(canvas.nodes[0]).toMatchObject({
        id: 'note-id-1',
        type: 'file',
        file: 'notes/my-note.md',
        x: 100,
        y: 200,
        width: 400,
        height: 300,
        color: '1'
      });

      // Verify second node (text node)
      expect(canvas.nodes[1]).toMatchObject({
        id: 'text-node-id',
        type: 'text',
        text: 'Some text content',
        x: 600,
        y: 200,
        width: 300,
        height: 200,
        color: '2'
      });
    });

    it('should reconstruct edges from relationship data', () => {
      const mapping = { configuration: {} };
      const nodeMappings: any[] = [];
      const edges = [
        {
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
          visualProperties: {
            fromSide: 'right',
            toSide: 'left',
            color: '3',
            label: 'connects to'
          }
        }
      ];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      expect(canvas.edges).toHaveLength(1);
      expect(canvas.edges[0]).toMatchObject({
        id: expect.any(String),
        fromNode: 'node-1',
        toNode: 'node-2',
        fromSide: 'right',
        toSide: 'left',
        color: '3',
        label: 'connects to'
      });
    });

    it('should preserve visual accuracy within 1 pixel (NFR-031)', () => {
      const mapping = { configuration: {} };
      const nodeMappings = [
        {
          containedNodeId: 'precise-node',
          metadata: {
            x: 123.456,
            y: 789.012,
            width: 400.789,
            height: 300.123,
            color: '4',
            type: 'file',
            file: 'note.md'
          }
        }
      ];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      const node = canvas.nodes[0];

      // NFR-031: Visual accuracy within ±1 pixel
      expect(Math.abs(node.x - 123.456)).toBeLessThan(1);
      expect(Math.abs(node.y - 789.012)).toBeLessThan(1);
      expect(Math.abs(node.width - 400.789)).toBeLessThan(1);
      expect(Math.abs(node.height - 300.123)).toBeLessThan(1);
    });

    it('should handle empty canvas with only configuration', () => {
      const mapping = {
        configuration: {
          zoom: 2.0,
          viewX: -500,
          viewY: -300
        }
      };
      const nodeMappings: any[] = [];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      expect(canvas.zoom).toBe(2.0);
      expect(canvas.viewX).toBe(-500);
      expect(canvas.viewY).toBe(-300);
      expect(canvas.nodes).toHaveLength(0);
      expect(canvas.edges).toHaveLength(0);
    });

    it('should handle canvas without viewport configuration', () => {
      const mapping = { configuration: {} };
      const nodeMappings = [
        {
          containedNodeId: 'node-1',
          metadata: {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            type: 'file',
            file: 'note.md'
          }
        }
      ];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      // Should use default values
      expect(canvas.zoom).toBeUndefined();
      expect(canvas.viewX).toBeUndefined();
      expect(canvas.viewY).toBeUndefined();
      expect(canvas.nodes).toHaveLength(1);
    });

    it('should preserve node IDs from contained nodes', () => {
      const mapping = { configuration: {} };
      const nodeMappings = [
        {
          containedNodeId: 'uuid-abc-123',
          metadata: {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            type: 'file',
            file: 'note.md'
          }
        }
      ];
      const edges: any[] = [];

      const canvas = canvasCloneService.reconstructCanvas(mapping, nodeMappings, edges);

      expect(canvas.nodes[0].id).toBe('uuid-abc-123');
    });
  });

  describe('generateCanvasJSON', () => {
    it('should generate valid JSON Canvas format', () => {
      const mapping = {
        configuration: {
          zoom: 1.0,
          viewX: 0,
          viewY: 0
        }
      };
      const nodeMappings = [
        {
          containedNodeId: 'node-1',
          metadata: {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            type: 'file',
            file: 'note.md'
          }
        }
      ];
      const edges: any[] = [];

      const json = canvasCloneService.generateCanvasJSON(mapping, nodeMappings, edges);

      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('nodes');
      expect(parsed).toHaveProperty('edges');
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toHaveLength(0);
    });

    it('should produce formatted JSON with indentation', () => {
      const mapping = { configuration: { zoom: 1.0 } };
      const nodeMappings: any[] = [];
      const edges: any[] = [];

      const json = canvasCloneService.generateCanvasJSON(mapping, nodeMappings, edges);

      // Check for indentation (formatted JSON)
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });
  });
});
