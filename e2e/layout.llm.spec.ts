import { test, expect } from '@playwright/test';
import { parseLayoutCommand } from '../src/agent/client/parseLayoutCommand';

const viewport = { x: 0, y: 0, w: 1200, h: 800 };

test.describe('parser: layout intent', () => {
  test('horizontal row evenly', async () => {
    const p = parseLayoutCommand('Arrange these shapes in a horizontal row, space them evenly');
    expect(p.hasLayoutIntent).toBeTruthy();
    expect(p.axis).toBe('row');
    expect(p.distribute).toBe('even');
  });

  test('vertical stack with gap 24', async () => {
    const p = parseLayoutCommand('Stack the selected vertically with a gap of 24');
    expect(p.hasLayoutIntent).toBeTruthy();
    expect(p.axis).toBe('column');
    expect(p.gapPx).toBe(24);
    expect(p.target).toBe('selection');
  });
});

test.describe('integration: /api/canvas-agent/layout', () => {
  test('row: distribute evenly across current span when no key', async ({ request, baseURL }) => {
    const shapes = [
      { id: 's1', type: 'geo', bounds: { x: 100, y: 200, w: 100, h: 80 } },
      { id: 's2', type: 'geo', bounds: { x: 360, y: 220, w: 120, h: 80 } },
      { id: 's3', type: 'geo', bounds: { x: 700, y: 210, w: 80, h: 80 } },
    ];
    const message = 'Arrange these in a horizontal row and space them evenly';
    const hints = parseLayoutCommand(message);
    const res = await request.post(`${baseURL}/api/canvas-agent/layout`, {
      data: { message, viewport, hints, shapes },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.moves)).toBeTruthy();
    if (!process.env.OPENAI_API_KEY) {
      expect(data.moves.length).toBe(3);
      // Verify equal gaps
      const xs = data.moves.map((m: any) => m.to.x);
      expect(xs[1] - xs[0]).toBeGreaterThan(0);
      expect(xs[2] - xs[1]).toBe(xs[1] - xs[0]);
    }
  });

  test('column: fixed gap 30 when no key', async ({ request, baseURL }) => {
    const shapes = [
      { id: 'a', type: 'geo', bounds: { x: 400, y: 200, w: 100, h: 80 } },
      { id: 'b', type: 'geo', bounds: { x: 420, y: 300, w: 100, h: 80 } },
      { id: 'c', type: 'geo', bounds: { x: 440, y: 420, w: 100, h: 80 } },
    ];
    const message = 'Stack vertically with spacing 30';
    const hints = parseLayoutCommand(message);
    const res = await request.post(`${baseURL}/api/canvas-agent/layout`, {
      data: { message, viewport, hints, shapes },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.moves)).toBeTruthy();
    if (!process.env.OPENAI_API_KEY) {
      expect(data.moves.length).toBe(3);
      const ys = data.moves.map((m: any) => m.to.y);
      expect(Math.abs((ys[1] - ys[0]) - 110)).toBeLessThanOrEqual(2); // h(80) + gap(30)
      expect(Math.abs((ys[2] - ys[1]) - 110)).toBeLessThanOrEqual(2);
    }
  });
});


