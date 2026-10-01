import './ui/styles.css';
import { TreeEngineAdapter } from './adapters/tree-engine.adapter';
import { LocalSpecimenAdapter } from './adapters/local-specimen.adapter';
import { CounterfactualTree } from './core/models';
import { renderTreeApp } from './ui/app';

const treeAdapter = new TreeEngineAdapter();
const specimenAdapter = new LocalSpecimenAdapter();

const PRESETS = [
  '如果当初我留在了故乡小城',
  '如果当初我鼓起勇气向TA表白了心意',
  '如果当年我选择了读纯艺术专业',
  '如果当年我没有接受那家大厂的Offer'
];

// 历史树栈：栈底是最初那棵树，栈顶是当前树。
// “生长新树”入栈，“返回上一棵树”出栈，从而能真正回到之前的那棵树。
const treeStack: CounterfactualTree[] = [treeAdapter.createTree(PRESETS[0])];

// 每棵树各自维护一份“已展开节点”集合，键为树 ID。
// 切回某棵树时只恢复它自己的集合，避免不同树之间展开状态互相串扰。
const expandedByTree = new Map<string, Set<string>>();

let isCabinetOpen = false;

const rootEl = document.getElementById('app')!;

// 新树默认完全展开，便于一屏纵览整条平行人生谱系。
function defaultExpandedIds(tree: CounterfactualTree): Set<string> {
  return new Set(Object.keys(tree.nodes));
}

// 取当前树的展开集合；首次访问时物化为“全部展开”。
function ensureExpandedIds(tree: CounterfactualTree): Set<string> {
  let set = expandedByTree.get(tree.id);
  if (!set) {
    set = defaultExpandedIds(tree);
    expandedByTree.set(tree.id, set);
  }
  return set;
}

// 恢复某棵树的展开状态时做“安全归位”：
// 1) 剔除已不存在的陈旧节点引用（被修剪 / 结构已变化 / 来自别的树）；
// 2) 若连根节点都不在了，回退到只显示根的安全位置，避免错乱地暴露深层节点。
// 父链不完整的孤立展开记录由渲染层沿根向下遍历时自然过滤，不会错误显示。
function resolveExpandedIds(tree: CounterfactualTree): Set<string> {
  const stored = expandedByTree.get(tree.id);
  if (!stored) return defaultExpandedIds(tree);

  if (!tree.nodes[tree.rootId]) {
    return new Set<string>();
  }

  const valid = new Set<string>();
  stored.forEach(id => {
    if (tree.nodes[id]) valid.add(id);
  });
  return valid;
}

function refreshView() {
  const specimens = specimenAdapter.getAll();
  const tree = treeStack[treeStack.length - 1];
  // 展开状态以“恢复后”的安全集合为准并回写，
  // 后续用户的展开/收起、浇水操作都作用在这份干净的集合上。
  const safeExpanded = resolveExpandedIds(tree);
  expandedByTree.set(tree.id, safeExpanded);

  renderTreeApp(
    rootEl,
    tree,
    specimens,
    isCabinetOpen,
    PRESETS,
    safeExpanded,
    treeStack.length - 1,
    {
      onGrowNewTree: (assumption: string) => {
        treeStack.push(treeAdapter.createTree(assumption));
        refreshView();
      },
      onBackToPreviousTree: () => {
        if (treeStack.length > 1) {
          treeStack.pop();
          refreshView();
        }
      },
      onToggleNode: (nodeId: string) => {
        const set = ensureExpandedIds(tree);
        if (set.has(nodeId)) {
          set.delete(nodeId);
        } else {
          set.add(nodeId);
        }
        refreshView();
      },
      onWaterNode: (nodeId: string) => {
        treeAdapter.water(tree, nodeId);
        // 浇水可能催生奇遇新枝：若该父节点正处于展开态，
        // 让新枝自动纳入展开集合，保证回到视图时新节点可见。
        const set = ensureExpandedIds(tree);
        const watered = tree.nodes[nodeId];
        if (watered && set.has(nodeId)) {
          watered.childrenIds.forEach(childId => set.add(childId));
        }
        refreshView();
      },
      onPruneNode: (nodeId: string) => {
        treeAdapter.prune(tree, nodeId);
        refreshView();
      },
      onHarvestNode: (nodeId: string) => {
        const sp = treeAdapter.harvest(tree, nodeId);
        specimenAdapter.save(sp);
        alert(`已成功将节点【${sp.title}】收入平行人生标本馆！`);
        refreshView();
      },
      onDeleteSpecimen: (id: string) => {
        specimenAdapter.remove(id);
        refreshView();
      },
      onToggleCabinet: (open: boolean) => {
        isCabinetOpen = open;
        refreshView();
      }
    }
  );
}

// Initial render
refreshView();
