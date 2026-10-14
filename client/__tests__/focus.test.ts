/**
 * Unit tests for the virtual focus grid (lib/focus.tsx).
 *
 * The focus manager is a module singleton, so each test registers only its
 * own node ids and unregisters them afterwards — the manager ends every test
 * exactly as empty as it started (unregistering the focused node re-focuses
 * order[0], which is null once all nodes are gone).
 */
import { focusManager } from '../lib/focus';

const m = focusManager;

const ids: string[] = [];
function reg(
  id: string,
  row: number,
  col: number,
  extra: { select?: () => void; onFocus?: () => void } = {},
) {
  m.register({ id, row, col, ...extra });
  ids.push(id);
}

afterEach(() => {
  [...ids].reverse().forEach((id) => m.unregister(id));
  ids.length = 0;
});

describe('focus grid', () => {
  it('focuses the first registered node', () => {
    reg('a', 0, 0);
    expect(m.current()?.id).toBe('a');
  });

  it('keeps focus when other nodes register', () => {
    reg('a', 0, 0);
    reg('b', 0, 1);
    expect(m.current()?.id).toBe('a');
  });

  it('re-focuses the first node when the focused one unregisters', () => {
    reg('a', 0, 0);
    reg('b', 0, 1);
    m.focus('b');
    m.unregister('b');
    expect(m.current()?.id).toBe('a');
  });

  it('moves right along the same row, nearest first', () => {
    reg('a', 0, 0);
    reg('b', 0, 1);
    reg('c', 0, 3);
    m.focus('a');
    m.move('right');
    expect(m.current()?.id).toBe('b');
    m.move('right');
    expect(m.current()?.id).toBe('c');
  });

  it('prefers the same lane over a closer other-lane node', () => {
    reg('a', 0, 0);
    reg('near-off-lane', 1, 1);
    reg('far-same-lane', 0, 5);
    m.focus('a');
    m.move('right');
    expect(m.current()?.id).toBe('far-same-lane');
  });

  it('moves down within the same column', () => {
    reg('a', 0, 0);
    reg('b', 1, 0);
    reg('c', 2, 0);
    m.focus('a');
    m.move('down');
    expect(m.current()?.id).toBe('b');
    m.move('down');
    expect(m.current()?.id).toBe('c');
  });

  it('moving up from the top row wraps to the nearest node below (same lane wins ties)', () => {
    reg('a', 0, 0);
    reg('b', 0, 1);
    reg('c', 1, 0);
    m.focus('a');
    m.move('up');
    // Everything is "the wrong way" from the top row; same-lane node c
    // beats same-row b on the lane bonus.
    expect(m.current()?.id).toBe('c');
  });

  it('does nothing when there are no other nodes', () => {
    reg('only', 0, 0);
    m.move('left');
    expect(m.current()?.id).toBe('only');
  });

  it('select() invokes the focused node select callback (ENTER)', () => {
    let selected = 0;
    reg('a', 0, 0, { select: () => selected++ });
    m.select();
    expect(selected).toBe(1);
    reg('b', 0, 1, { select: () => (selected += 10) });
    m.focus('b');
    m.select();
    expect(selected).toBe(11);
  });

  it('notifies subscribers exactly on focus change', () => {
    reg('a', 0, 0);
    reg('b', 0, 1);
    let emits = 0;
    const unsub = m.subscribe(() => emits++);
    m.focus('a'); // no change → no emit
    expect(emits).toBe(0);
    m.focus('b');
    expect(emits).toBe(1);
    unsub();
    m.focus('a');
    expect(emits).toBe(1);
  });

  it('fires onFocus on focus-in: registration auto-focus counts, re-focusing fires again', () => {
    let aFocus = 0;
    let bFocus = 0;
    reg('a', 0, 0, { onFocus: () => aFocus++ });
    expect(aFocus).toBe(1); // first registration auto-focuses
    reg('b', 0, 1, { onFocus: () => bFocus++ });
    expect(bFocus).toBe(0); // focus stays on a
    m.focus('b');
    m.focus('b');
    // Current implementation calls onFocus on every focus() invocation,
    // including re-focusing an already-focused id (no-op for rendering,
    // focusedId is unchanged so subscribers are not re-emitted).
    expect([aFocus, bFocus]).toEqual([1, 2]);
  });
});
