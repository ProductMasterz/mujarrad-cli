import { CanvasUploadService } from '../../../src/services/CanvasUploadService.js';
import { ParsedCanvas } from '../../../src/filesystem/CanvasParser.js';

/**
 * Canvas Upload Service Tests (TDD - Tests First)
 *
 * Task 7.1: Implement Canvas Upload (NodeMapping Creation)
 * User Story 3: Canvas Visual Preservation
 *
 * Tests FR-003, FR-008, FR-009, FR-033 to FR-038
 */

describe('CanvasUploadService', () => {
  let canvasUploadService: CanvasUploadService;

  beforeEach(() => {
    canvasUploadService = new CanvasUploadService();
  });

  describe('prepareCanvasUpload', () => {
    it('should prepare canvas data with CONTEXT node', () => {
      const canvasData: ParsedCanvas = {
        nodes: [],
        edges: [],
        config: {}
      };

      const result = canvasUploadService.prepareCanvasUpload('my-canvas.canvas', canvasData);

      expect(result.canvasNodeId).toBeDefined();
      expect(result.canvasNodeId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should extract viewport configuration from canvas config', () => {
      const canvasData: ParsedCanvas = {
        nodes: [],
        edges: [],
        config: {
          zoom: 1.5,
          viewX: 100,
          viewY: 200
        }
      };

      const result = canvasUploadService.prepareCanvasUpload('canvas.canvas', canvasData);

      expect(result.configuration).toEqual({
        zoom: 1.5,
        viewX: 100,
        viewY: 200
      });
    });

    it('should create NodeMappings for each canvas node with visual properties', () => {
      const canvasData: ParsedCanvas = {
        nodes: [
          {
            id: 'canvas-node-1',
            type: 'file',
            file: 'notes/note-1.md',
            x: 100,
            y: 200,
            width: 400,
            height: 300,
            color: '1',
            hasFile: true,
            visualProperties: { x: 100, y: 200, width: 400, height: 300, color: '1' }
          },
          {
            id: 'canvas-node-2',
            type: 'text',
            text: 'Some text',
            x: 600,
            y: 200,
            width: 300,
            height: 200,
            color: '2',
            hasFile: false,
            visualProperties: { x: 600, y: 200, width: 300, height: 200, color: '2' }
          }
        ],
        edges: [],
        config: {}
      };

      const result = canvasUploadService.prepareCanvasUpload('canvas.canvas', canvasData);

      expect(result.nodeMappings).toHaveLength(2);

      // Verify first node mapping (file node)
      expect(result.nodeMappings[0]).toMatchObject({
        id: 'canvas-node-1',
        metadata: {
          x: 100,
          y: 200,
          width: 400,
          height: 300,
          color: '1',
          type: 'file',
          file: 'notes/note-1.md'
        }
      });
      expect(result.nodeMappings[0].containedNodeId).toBeDefined();

      // Verify second node mapping (text node)
      expect(result.nodeMappings[1]).toMatchObject({
        id: 'canvas-node-2',
        metadata: {
          x: 600,
          y: 200,
          width: 300,
          height: 200,
          color: '2',
          type: 'text',
          text: 'Some text'
        }
      });
    });

    it('should create edges with visual properties', () => {
      const canvasData: ParsedCanvas = {
        nodes: [
          {
            id: 'node-1',
            file: 'note-1.md',
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            hasFile: true,
            visualProperties: { x: 0, y: 0, width: 400, height: 300 }
          },
          {
            id: 'node-2',
            file: 'note-2.md',
            x: 500,
            y: 0,
            width: 400,
            height: 300,
            hasFile: true,
            visualProperties: { x: 500, y: 0, width: 400, height: 300 }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            fromNode: 'node-1',
            toNode: 'node-2',
            fromSide: 'right',
            toSide: 'left',
            color: '2',
            label: 'relates to'
          }
        ],
        config: {}
      };

      const result = canvasUploadService.prepareCanvasUpload('canvas.canvas', canvasData);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toEqual({
        fromNode: 'node-1',
        toNode: 'node-2',
        visualProperties: {
          fromSide: 'right',
          toSide: 'left',
          color: '2',
          label: 'relates to'
        }
      });
    });

    it('should handle canvas without edges', () => {
      const canvasData: ParsedCanvas = {
        nodes: [
          {
            id: 'node-1',
            file: 'note.md',
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            hasFile: true,
            visualProperties: { x: 0, y: 0, width: 400, height: 300 }
          }
        ],
        edges: [],
        config: {}
      };

      const result = canvasUploadService.prepareCanvasUpload('canvas.canvas', canvasData);

      expect(result.nodeMappings).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle canvas with only viewport configuration', () => {
      const canvasData: ParsedCanvas = {
        nodes: [],
        edges: [],
        config: {
          zoom: 2.0,
          viewX: -500,
          viewY: -300
        }
      };

      const result = canvasUploadService.prepareCanvasUpload('empty-canvas.canvas', canvasData);

      expect(result.nodeMappings).toHaveLength(0);
      expect(result.configuration).toEqual({
        zoom: 2.0,
        viewX: -500,
        viewY: -300
      });
    });

    it('should preserve visual accuracy within specification (NFR-031)', () => {
      const canvasData: ParsedCanvas = {
        nodes: [
          {
            id: 'precise-node',
            file: 'note.md',
            x: 123.456,
            y: 789.012,
            width: 400.789,
            height: 300.123,
            color: '3',
            hasFile: true,
            visualProperties: { x: 123.456, y: 789.012, width: 400.789, height: 300.123, color: '3' }
          }
        ],
        edges: [],
        config: {}
      };

      const result = canvasUploadService.prepareCanvasUpload('canvas.canvas', canvasData);

      // Verify coordinates are preserved with precision
      expect(result.nodeMappings[0].metadata.x).toBe(123.456);
      expect(result.nodeMappings[0].metadata.y).toBe(789.012);
      expect(result.nodeMappings[0].metadata.width).toBe(400.789);
      expect(result.nodeMappings[0].metadata.height).toBe(300.123);
    });

    it('should throw error for invalid canvas data', () => {
      const invalidCanvasData = {
        // Missing nodes and edges arrays
        config: { zoom: 1.0 }
      } as any;

      expect(() => {
        canvasUploadService.prepareCanvasUpload('invalid.canvas', invalidCanvasData);
      }).toThrow('Invalid canvas data');
    });
  });

  describe('uploadCanvas', () => {
    it('should return upload result with all components', async () => {
      const canvasData: ParsedCanvas = {
        nodes: [
          {
            id: 'node-1',
            file: 'note.md',
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            hasFile: true,
            visualProperties: { x: 0, y: 0, width: 400, height: 300 }
          },
          {
            id: 'node-2',
            file: 'note2.md',
            x: 500,
            y: 0,
            width: 400,
            height: 300,
            hasFile: true,
            visualProperties: { x: 500, y: 0, width: 400, height: 300 }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            fromNode: 'node-1',
            toNode: 'node-2'
          }
        ],
        config: {
          zoom: 1.0
        }
      };

      const result = await canvasUploadService.uploadCanvas(
        'space-123',
        'session-123',
        'canvas.canvas',
        canvasData
      );

      expect(result.canvasNodeId).toBeDefined();
      expect(result.mappingId).toBeDefined();
      expect(result.nodeMappingsCreated).toBe(2);
      expect(result.attributesCreated).toBe(1);
      expect(result.configuration).toEqual({ zoom: 1.0 });
      expect(result.edges).toHaveLength(1);
    });
  });
});
