import { CounterfactualTree, LifeNode } from './models';

/**
 * 展开状态是「按树隔离」的：每棵树只记录属于自己的 expandedIds。
 * 切回某棵树时，必须用该树当前的节点集合校验后再恢复，
 * 缺失的旧节点一律剔除；锚点全丢时退回到安全位置（根 + 第一层）。
 */

/** 一个节点可以被「展开」的前提：它真实存在且仍带着子枝。 */
function isExpandable(tree: CounterfactualTree, id: string): boolean {
  const node: LifeNode | undefined = tree.nodes[id];
  return !!node && node.childrenIds.some(childId => !!tree.nodes[childId]);
}

/** 新树的默认视图：所有分叉节点全部展开。 */
export function defaultExpandedIds(tree: CounterfactualTree): Set<string> {
  const expanded = new Set<string>();
  Object.values(tree.nodes).forEach(node => {
    if (node.childrenIds.some(childId => !!tree.nodes[childId])) {
      expanded.add(node.id);
    }
  });
  return expanded;
}

/**
 * 恢复某棵树的展开节点。
 * - 只保留当前树中仍然存在、且仍有子节点的 id；
 * - 根节点是永远的安全锚点，始终展开；
 * - 若保存的展开节点在本树中已全部失效（例如旧树的 id 被错误带入、
 *   或对应枝桠已消失），则退回到安全位置：根节点及其第一层子枝。
 */
export function resolveExpandedIds(tree: CounterfactualTree, savedIds?: Iterable<string>): Set<string> {
  const candidates = savedIds ? Array.from(new Set(Array.from(savedIds))) : [];
  const valid = candidates.filter(id => isExpandable(tree, id));

  const fallbackToSafePosition = () => {
    const safe = new Set<string>();
    if (isExpandable(tree, tree.rootId)) {
      safe.add(tree.rootId);
      tree.nodes[tree.rootId].childrenIds.forEach(childId => {
        if (isExpandable(tree, childId)) safe.add(childId);
      });
    }
    return safe;
  };

  if (candidates.length > 0 && valid.length === 0) {
    // 保存的展开节点一个都对不上：状态已错乱，回到安全位置。
    return fallbackToSafePosition();
  }

  const expanded = new Set<string>(valid);
  if (isExpandable(tree, tree.rootId)) {
    // 根节点始终展开，避免折叠后整棵树无任何内容可见。
    expanded.add(tree.rootId);
  }
  if (expanded.size === 0) {
    return fallbackToSafePosition();
  }
  return expanded;
}

/**
 * 根据展开状态计算当前可见的节点：
 * 从根出发，仅当父节点处于展开态时才向下进入其子枝。
 */
export function visibleNodeIds(tree: CounterfactualTree, expandedIds: Set<string>): Set<string> {
  const visible = new Set<string>();
  if (!tree.nodes[tree.rootId]) return visible;

  const walk = (node: LifeNode) => {
    visible.add(node.id);
    if (expandedIds.has(node.id)) {
      node.childrenIds.forEach(childId => {
        const child = tree.nodes[childId];
        if (child) walk(child);
      });
    }
  };

  walk(tree.nodes[tree.rootId]);
  return visible;
}
