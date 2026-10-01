import './ui/styles.css';
import { TreeEngineAdapter } from './adapters/tree-engine.adapter';
import { LocalSpecimenAdapter } from './adapters/local-specimen.adapter';
import { CounterfactualTree } from './core/models';
import { defaultExpandedIds, resolveExpandedIds } from './core/expand-state';
import { renderTreeApp } from './ui/app';

const treeAdapter = new TreeEngineAdapter();
const specimenAdapter = new LocalSpecimenAdapter();

const PRESETS = [
  '如果当初我留在了故乡小城',
  '如果当初我鼓起勇气向TA表白了心意',
  '如果当年我选择了读纯艺术专业',
  '如果当年我没有接受那家大厂的Offer'
];

// 每棵树一个独立会话：树体与它自己的展开节点集合绑定，互不串用。
interface TreeSession {
  tree: CounterfactualTree;
  expandedIds: Set<string>;
}

const initialTree = treeAdapter.createTree(PRESETS[0]);
let sessions: TreeSession[] = [{ tree: initialTree, expandedIds: defaultExpandedIds(initialTree) }];
let currentIndex = 0;
let isCabinetOpen = false;

const rootEl = document.getElementById('app')!;

function currentSession(): TreeSession {
  return sessions[currentIndex];
}

function refreshView() {
  const { tree, expandedIds: rawExpandedIds } = currentSession();
  // 恢复对应树的展开节点；旧节点已缺失时剔除或整体回到安全位置。
  const expandedIds = resolveExpandedIds(tree, rawExpandedIds);
  currentSession().expandedIds = expandedIds;

  const specimens = specimenAdapter.getAll();
  const history = sessions.map(s => ({
    id: s.tree.id,
    assumption: s.tree.assumption,
    createdAt: s.tree.createdAt
  }));

  renderTreeApp(
    rootEl,
    tree,
    specimens,
    isCabinetOpen,
    PRESETS,
    expandedIds,
    history,
    currentIndex,
    {
      onGrowNewTree: (assumption: string) => {
        // 生长出新树：丢弃当前位置之后的前进历史，新树使用默认展开。
        const newTree = treeAdapter.createTree(assumption);
        sessions = sessions.slice(0, currentIndex + 1);
        sessions.push({ tree: newTree, expandedIds: defaultExpandedIds(newTree) });
        currentIndex = sessions.length - 1;
        refreshView();
      },
      onWaterNode: (nodeId: string) => {
        const session = currentSession();
        const childIdsBefore = session.tree.nodes[nodeId]?.childrenIds.length ?? 0;
        session.tree = treeAdapter.water(session.tree, nodeId);

        const childIdsAfter = session.tree.nodes[nodeId]?.childrenIds.length ?? 0;
        if (childIdsAfter > childIdsBefore) {
          // 浇水催生奇遇新枝时自动展开父节点，保证新枝立即可见。
          session.expandedIds.add(nodeId);
        }
        refreshView();
      },
      onPruneNode: (nodeId: string) => {
        const session = currentSession();
        session.tree = treeAdapter.prune(session.tree, nodeId);
        refreshView();
      },
      onHarvestNode: (nodeId: string) => {
        const { tree: currentTree } = currentSession();
        const sp = treeAdapter.harvest(currentTree, nodeId);
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
      },
      onToggleExpand: (nodeId: string) => {
        const session = currentSession();
        const next = new Set(session.expandedIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        session.expandedIds = next;
        refreshView();
      },
      onSwitchTree: (index: number) => {
        if (index < 0 || index >= sessions.length || index === currentIndex) return;
        // 仅切换到目标树自己的会话；其展开状态在 refreshView 中按该树校验恢复。
        currentIndex = index;
        refreshView();
      }
    }
  );
}

// Initial render
refreshView();
