import { test, expect } from '@playwright/test';
import { parseTransformCommand } from '../src/agent/client/parseTransformCommand';

const viewport = { x: 0, y: 0, w: 1200, h: 800 };

test.describe('parser: transform intent', () => {
  test('move blue rectangle', async () => {
    const p = parseTransformCommand('Move the blue rectangle to the center');
    expect(p.hasTransformIntent).toBeTruthy();
    expect(p.action).toBe('move');
    expect(p.shapeHint).toBe('rectangle');
    expect(p.colorHint).toBe('blue');
  });

  test('resize circle twice as big', async () => {
    const p = parseTransformCommand('Resize the circle to be twice as big');
    expect(p.hasTransformIntent).toBeTruthy();
    expect(p.action).toBe('resize');
    expect(p.shapeHint).toBe('circle');
  });

  test('rotate text 45 degrees', async () => {
    const p = parseTransformCommand('Rotate the text 45 degrees');
    expect(p.hasTransformIntent).toBeTruthy();
    expect(p.action).toBe('rotate');
    expect(p.shapeHint).toBe('text');
  });
});

test.describe('integration: /api/canvas-agent/transform', () => {
  test('move: chooses blue rectangle and returns move object', async ({ request, baseURL }) => {
    const shapes = [
      { id: 'a1', type: 'geo', geo: 'rectangle', color: 'blue', bounds: { x: 100, y: 100, w: 200, h: 120 } },
      { id: 'a2', type: 'geo', geo: 'ellipse', color: 'red', bounds: { x: 600, y: 120, w: 160, h: 160 } },
    ];
    const message = 'Move the blue rectangle to the center';
    const hints = parseTransformCommand(message);
    const res = await request.post(`${baseURL}/api/canvas-agent/transform`, {
      data: { message, viewport, hints: { action: hints.action, shape: hints.shapeHint, color: hints.colorHint }, shapes },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(['move', 'resize', 'rotate']).toContain(data.action);
    expect(['a1', 'a2']).toContain(data.shapeId);
    if (!process.env.OPENAI_API_KEY) {
      expect(data.action).toBe('move');
      expect(data.shapeId).toBe('a1');
      expect(data.move?.to).toBeTruthy();
      const { x, y } = data.move.to;
      // Expect roughly centered
      expect(x).toBeGreaterThanOrEqual(400);
      expect(x).toBeLessThanOrEqual(700);
      expect(y).toBeGreaterThanOrEqual(250);
      expect(y).toBeLessThanOrEqual(450);
    }
  });

  test('resize: doubles size when no key', async ({ request, baseURL }) => {
    const shapes = [
      { id: 'c1', type: 'geo', geo: 'ellipse', color: 'green', bounds: { x: 100, y: 100, w: 100, h: 100 } },
    ];
    const message = 'Resize the circle to be twice as big';
    const hints = parseTransformCommand(message);
    const res = await request.post(`${baseURL}/api/canvas-agent/transform`, {
      data: { message, viewport, hints: { action: hints.action, shape: hints.shapeHint, color: hints.colorHint }, shapes },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(['move', 'resize', 'rotate']).toContain(data.action);
    if (!process.env.OPENAI_API_KEY) {
      expect(data.action).toBe('resize');
      expect(data.shapeId).toBe('c1');
      expect(data.resize?.to).toEqual({ w: 200, h: 200 });
    }
  });

  test('rotate: default 45deg when no key', async ({ request, baseURL }) => {
    const shapes = [
      { id: 't1', type: 'text', text: 'Hello', bounds: { x: 100, y: 100, w: 300, h: 80 } },
    ];
    const message = 'Rotate the text 45 degrees';
    const hints = parseTransformCommand(message);
    const res = await request.post(`${baseURL}/api/canvas-agent/transform`, {
      data: { message, viewport, hints: { action: hints.action, shape: hints.shapeHint, color: hints.colorHint }, shapes },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(['move', 'resize', 'rotate']).toContain(data.action);
    if (!process.env.OPENAI_API_KEY) {
      expect(data.action).toBe('rotate');
      expect(data.shapeId).toBe('t1');
      expect(data.rotate?.by).toBe(45);
      expect(data.rotate?.unit).toBe('deg');
    }
  });
});


