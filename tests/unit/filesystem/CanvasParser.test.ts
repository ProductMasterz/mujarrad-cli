import { CanvasParser } from '../../../src/filesystem/CanvasParser.js';

describe('CanvasParser', () => {
  describe('parse', () => {
    it('should parse canvas JSON structure', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note1.md', x: 100, y: 200, width: 400, height: 300, color: '1' }
        ],
        edges: []
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0].visualProperties).toEqual({
        x: 100,
        y: 200,
        width: 400,
        height: 300,
        color: '1'
      });
    });

    it('should parse multiple nodes with different properties', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note1.md', x: 0, y: 0, width: 200, height: 100 },
          { id: 'node2', file: 'note2.md', x: 300, y: 150, width: 250, height: 200, color: '3' },
          { id: 'node3', text: 'Text node', x: 600, y: 300, width: 300, height: 150, color: '5' }
        ],
        edges: []
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(3);
      expect(parsed.nodes[0].id).toBe('node1');
      expect(parsed.nodes[1].id).toBe('node2');
      expect(parsed.nodes[2].id).toBe('node3');
    });

    it('should parse edges along with nodes', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note1.md', x: 0, y: 0, width: 200, height: 100 }
        ],
        edges: [
          { id: 'edge1', fromNode: 'node1', toNode: 'node2', fromSide: 'right', toSide: 'left' }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toHaveLength(1);
    });

    it('should extract canvas config', () => {
      const canvasJSON = {
        zoom: 1.5,
        viewX: 100,
        viewY: 200,
        nodes: [],
        edges: []
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.config).toEqual({
        zoom: 1.5,
        viewX: 100,
        viewY: 200
      });
    });

    it('should handle empty canvas', () => {
      const canvasJSON = { nodes: [], edges: [] };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toEqual([]);
      expect(parsed.edges).toEqual([]);
    });

    it('should handle canvas without edges property', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note1.md', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toEqual([]);
    });
  });

  describe('extractConfig', () => {
    it('should extract canvas-wide config', () => {
      const canvasJSON = {
        zoom: 1.5,
        viewX: 100,
        viewY: 200,
        nodes: [],
        edges: []
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const config = parser.extractConfig();

      expect(config).toEqual({ zoom: 1.5, viewX: 100, viewY: 200 });
    });

    it('should handle missing config properties', () => {
      const canvasJSON = { nodes: [], edges: [] };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const config = parser.extractConfig();

      expect(config.zoom).toBeUndefined();
      expect(config.viewX).toBeUndefined();
      expect(config.viewY).toBeUndefined();
    });

    it('should handle partial config', () => {
      const canvasJSON = { zoom: 2.0, nodes: [], edges: [] };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const config = parser.extractConfig();

      expect(config.zoom).toBe(2.0);
      expect(config.viewX).toBeUndefined();
    });
  });

  describe('extractEdges', () => {
    it('should extract edges with visual properties', () => {
      const canvasJSON = {
        nodes: [],
        edges: [
          {
            id: 'edge1',
            fromNode: 'node1',
            toNode: 'node2',
            fromSide: 'right',
            toSide: 'left',
            color: '2'
          }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const edges = parser.extractEdges();

      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({
        fromNode: 'node1',
        toNode: 'node2',
        fromSide: 'right',
        toSide: 'left',
        color: '2'
      });
    });

    it('should extract multiple edges', () => {
      const canvasJSON = {
        nodes: [],
        edges: [
          { id: 'edge1', fromNode: 'node1', toNode: 'node2' },
          { id: 'edge2', fromNode: 'node2', toNode: 'node3', color: '4' },
          { id: 'edge3', fromNode: 'node1', toNode: 'node3', fromSide: 'bottom', toSide: 'top' }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const edges = parser.extractEdges();

      expect(edges).toHaveLength(3);
      expect(edges[0].id).toBe('edge1');
      expect(edges[1].color).toBe('4');
      expect(edges[2].fromSide).toBe('bottom');
    });

    it('should handle canvas without edges', () => {
      const canvasJSON = { nodes: [] };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const edges = parser.extractEdges();

      expect(edges).toEqual([]);
    });

    it('should handle edges with minimal properties', () => {
      const canvasJSON = {
        edges: [
          { id: 'edge1', fromNode: 'node1', toNode: 'node2' }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const edges = parser.extractEdges();

      expect(edges).toHaveLength(1);
      expect(edges[0].fromNode).toBe('node1');
      expect(edges[0].toNode).toBe('node2');
    });
  });

  describe('canvas nodes without file attributes', () => {
    it('should handle canvas nodes without file attributes', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', text: 'Canvas node without file', x: 100, y: 200, width: 300, height: 150 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0]).toMatchObject({
        text: 'Canvas node without file',
        hasFile: false
      });
      expect(parsed.nodes[0].file).toBeUndefined();
    });

    it('should mark nodes with file attribute as hasFile: true', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note.md', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes[0].hasFile).toBe(true);
      expect(parsed.nodes[0].file).toBe('note.md');
    });

    it('should handle mix of nodes with and without files', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note.md', x: 0, y: 0, width: 200, height: 100 },
          { id: 'node2', text: 'Text only', x: 300, y: 0, width: 200, height: 100 },
          { id: 'node3', file: 'another.md', x: 600, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes).toHaveLength(3);
      expect(parsed.nodes[0].hasFile).toBe(true);
      expect(parsed.nodes[1].hasFile).toBe(false);
      expect(parsed.nodes[2].hasFile).toBe(true);
    });
  });

  describe('findNestedCanvases', () => {
    it('should handle nested canvas references', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'another.canvas', type: 'file', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const nested = parser.findNestedCanvases();

      expect(nested).toContain('another.canvas');
    });

    it('should find multiple nested canvases', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'canvas1.canvas', x: 0, y: 0, width: 200, height: 100 },
          { id: 'node2', file: 'note.md', x: 300, y: 0, width: 200, height: 100 },
          { id: 'node3', file: 'canvas2.canvas', x: 600, y: 0, width: 200, height: 100 },
          { id: 'node4', text: 'Text node', x: 900, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const nested = parser.findNestedCanvases();

      expect(nested).toHaveLength(2);
      expect(nested).toContain('canvas1.canvas');
      expect(nested).toContain('canvas2.canvas');
      expect(nested).not.toContain('note.md');
    });

    it('should return empty array when no nested canvases', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note.md', x: 0, y: 0, width: 200, height: 100 },
          { id: 'node2', text: 'Text', x: 300, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const nested = parser.findNestedCanvases();

      expect(nested).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid JSON', () => {
      const parser = new CanvasParser('invalid json {');

      expect(() => parser.parse()).toThrow();
    });

    it('should throw error for non-object JSON', () => {
      const parser = new CanvasParser('["array"]');

      expect(() => parser.parse()).toThrow('Invalid canvas format');
    });

    it('should throw error for null JSON', () => {
      const parser = new CanvasParser('null');

      expect(() => parser.parse()).toThrow('Invalid canvas format');
    });

    it('should handle empty string', () => {
      const parser = new CanvasParser('');

      expect(() => parser.parse()).toThrow();
    });
  });

  describe('node type detection', () => {
    it('should detect file nodes', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', type: 'file', file: 'note.md', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes[0].type).toBe('file');
    });

    it('should detect text nodes', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', type: 'text', text: 'Some text', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes[0].type).toBe('text');
    });

    it('should handle nodes without explicit type', () => {
      const canvasJSON = {
        nodes: [
          { id: 'node1', file: 'note.md', x: 0, y: 0, width: 200, height: 100 }
        ]
      };
      const parser = new CanvasParser(JSON.stringify(canvasJSON));
      const parsed = parser.parse();

      expect(parsed.nodes[0]).toBeDefined();
    });
  });
});
