/**
 * ReelMind virtual focus system.
 *
 * The TV app's focus navigation is pure TypeScript: a tiny 2D grid walker.
 * Each screen registers Focusable nodes with a {row, col}; D-pad input moves
 * focus to the nearest node in that direction (same lane preferred), ENTER
 * selects the focused node, touch/tap also focuses+selects. No third-party
 * TV focus library in the loop — behavior is deterministic and readable.
 *
 * FocusScope: the app keeps the whole screen stack mounted (so chat threads
 * survive a quiz round-trip); a FocusScope gates which screen's nodes
 * actually participate in the focus grid (only the visible one).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { focusStyles } from '../theme/tv';

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Key = Direction | 'enter' | 'back';

interface FocusNode {
  id: string;
  row: number;
  col: number;
  select?: () => void;
  onFocus?: () => void;
}

type Listener = () => void;

class FocusManager {
  private nodes = new Map<string, FocusNode>();
  private order: string[] = [];
  private listeners = new Set<Listener>();
  focusedId: string | null = null;

  register(node: FocusNode) {
    if (!this.nodes.has(node.id)) this.order.push(node.id);
    this.nodes.set(node.id, node);
    if (this.focusedId === null || !this.nodes.has(this.focusedId)) {
      this.focus(this.order[0] ?? null, false);
    }
  }

  unregister(id: string) {
    this.nodes.delete(id);
    this.order = this.order.filter((x) => x !== id);
    if (this.focusedId === id) {
      this.focus(this.order[0] ?? null, false);
    }
  }

  focus(id: string | null, notify = true) {
    const prev = this.focusedId;
    this.focusedId = id;
    if (id) this.nodes.get(id)?.onFocus?.();
    if (prev !== id && notify) this.emit();
  }

  move(dir: Direction) {
    const cur = this.current();
    if (!cur) {
      this.focus(this.order[0] ?? null);
      return;
    }
    const candidates = this.order
      .map((id) => this.nodes.get(id)!)
      .filter((n) => n.id !== cur.id);
    if (candidates.length === 0) return;

    const vertical = dir === 'up' || dir === 'down';
    const scored = candidates
      .map((n) => {
        const laneMatch = vertical ? n.col === cur.col : n.row === cur.row;
        const primary = vertical ? Math.abs(n.row - cur.row) : Math.abs(n.col - cur.col);
        const secondary = vertical ? Math.abs(n.col - cur.col) : Math.abs(n.row - cur.row);
        const wrongWay =
          (dir === 'up' && n.row >= cur.row) ||
          (dir === 'down' && n.row <= cur.row) ||
          (dir === 'left' && n.col >= cur.col) ||
          (dir === 'right' && n.col <= cur.col);
        return {
          n,
          score: primary * 10 + (laneMatch ? 0 : 50 + secondary * 5) + (wrongWay ? 200 : 0),
        };
      })
      .sort((a, b) => a.score - b.score || this.order.indexOf(a.n.id) - this.order.indexOf(b.n.id));
    this.focus(scored[0].n.id);
  }

  select() {
    this.current()?.select?.();
  }

  current(): FocusNode | undefined {
    return this.focusedId ? this.nodes.get(this.focusedId) : undefined;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

const manager = new FocusManager();

interface FocusContextValue {
  manager: FocusManager;
  focusedId: string | null;
  focus: (id: string) => void;
}

const FocusContext = createContext<FocusContextValue>({
  manager,
  focusedId: null,
  focus: () => {},
});

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focusedId, setFocusedId] = useState<string | null>(manager.focusedId);
  useEffect(() => manager.subscribe(() => setFocusedId(manager.focusedId)), []);
  const focus = useCallback((id: string) => manager.focus(id), []);
  const value = useMemo(() => ({ manager, focusedId, focus }), [focusedId]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusSystem() {
  return useContext(FocusContext);
}

export function useFocusContext() {
  return useContext(FocusContext);
}

const ScopeContext = createContext<boolean>(true);

/** Gates focus registration for a (possibly hidden) screen subtree. */
export function FocusScope({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <ScopeContext.Provider value={active}>{children}</ScopeContext.Provider>;
}

interface FocusableProps extends Omit<ViewProps, 'children'> {
  id: string;
  row: number;
  col: number;
  onEnter?: () => void;
  focusStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode | ((state: { focused: boolean }) => React.ReactNode);
}

/**
 * A TV-focusable element. Registers itself in the focus grid when its
 * FocusScope is active; focused state renders the accent ring; ENTER or tap
 * fires onEnter.
 */
export function Focusable({
  id,
  row,
  col,
  onEnter,
  focusStyle,
  children,
  style,
  ...rest
}: FocusableProps) {
  const { manager, focusedId, focus } = useFocusContext();
  const active = useContext(ScopeContext);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    if (!active) return;
    manager.register({
      id,
      row,
      col,
      select: () => onEnterRef.current?.(),
    });
    return () => manager.unregister(id);
    // Re-register on row/col change; id changes are treated as new nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, row, col, active]);

  const focused = active && focusedId === id;
  return (
    <View
      {...rest}
      onStartShouldSetResponder={() => true}
      onResponderGrant={() => focus(id)}
      onResponderRelease={() => {
        if (!focused) return;
        onEnterRef.current?.();
      }}
      style={[focusStyles.unfocused, style, focused && focusStyles.focused, focused && focusStyle]}
    >
      {typeof children === 'function' ? children({ focused }) : children}
    </View>
  );
}
