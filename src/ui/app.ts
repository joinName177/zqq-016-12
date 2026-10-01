import { CounterfactualTree, LifeSpecimen, LifeNode } from '../core/models';
import { visibleNodeIds } from '../core/expand-state';

export interface TreeHistoryEntry {
  id: string;
  assumption: string;
  createdAt: string;
}

export interface TreeUIHandlers {
  onGrowNewTree: (assumption: string) => void;
  onWaterNode: (nodeId: string) => void;
  onPruneNode: (nodeId: string) => void;
  onHarvestNode: (nodeId: string) => void;
  onDeleteSpecimen: (id: string) => void;
  onToggleCabinet: (open: boolean) => void;
  onToggleExpand: (nodeId: string) => void;
  onSwitchTree: (index: number) => void;
}

export function renderTreeApp(
  container: HTMLElement,
  tree: CounterfactualTree,
  specimens: LifeSpecimen[],
  isCabinetOpen: boolean,
  presets: string[],
  expandedIds: Set<string>,
  history: TreeHistoryEntry[],
  currentIndex: number,
  handlers: TreeUIHandlers
) {
  const esc = (s: string) =>
    s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

  // Only nodes reachable from the root through expanded branches are rendered.
  const visibleIds = visibleNodeIds(tree, expandedIds);

  // Organize nodes by layer index (0 to 4)
  const layers: LifeNode[][] = [[], [], [], [], []];
  Object.values(tree.nodes).forEach(n => {
    if (layers[n.layerIndex] && visibleIds.has(n.id)) {
      layers[n.layerIndex].push(n);
    }
  });

  const eraTitles = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];

  const renderNode = (node: LifeNode) => {
    // 根节点是永久安全锚点（始终展开），不提供折叠入口。
    const canCollapse =
      node.id !== tree.rootId && node.childrenIds.some(childId => !!tree.nodes[childId]);
    const isExpanded = expandedIds.has(node.id);
    return `
      <div class="node-card ${node.isPruned ? 'pruned' : ''}"
           style="--cat-color: ${node.color};"
           data-id="${node.id}">
        <div class="node-head">
          ${
            canCollapse
              ? `<button class="btn-toggle-expand" data-expand-id="${node.id}" title="${isExpanded ? '收起此枝桠' : '展开此枝桠'}">${isExpanded ? '▾' : '▸'}</button>`
              : '<span class="btn-toggle-spacer"></span>'
          }
          <span class="node-category-tag">${esc(node.categoryName)}</span>
        </div>
        <div class="node-title">${esc(node.title)}</div>
        <div class="node-desc">${esc(node.scenarioDescription)}</div>
        <div class="node-quote">${esc(node.specimenQuote)}</div>

        <div class="vitality-bar-bg">
          <div class="vitality-bar-fill" style="width: ${node.vitality}%;"></div>
        </div>

        <div class="node-actions">
          <button class="btn-action btn-water" data-id="${node.id}" title="注入生命力" ${node.isPruned ? 'disabled' : ''}>
            💧 浇水 (${node.waterCount})
          </button>
          <button class="btn-action btn-prune" data-id="${node.id}" title="剪除此分支">
            ✂️ 修剪
          </button>
          <button class="btn-action btn-harvest" data-id="${node.id}" title="收录进标本馆">
            📌 采集标本
          </button>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="tree-app">
      <header class="app-header">
        <div class="brand">
          <div class="tree-icon">🌿</div>
          <div>
            <h1>反事实平行人生树 · 平行人生标本集</h1>
            <p>COUNTERFACTUAL LIFE TREE &amp; PARALLEL SPECIMENS · v1.0.0</p>
          </div>
        </div>
        <button class="cabinet-btn" id="btnOpenCabinet">
          🗄️ 平行人生标本馆 (${specimens.length})
        </button>
      </header>

      <!-- Assumption Generator Hub -->
      <section class="generator-hub">
        <div class="assumption-input-wrap">
          <input type="text" class="assumption-input" id="assumptionInput" value="${esc(tree.assumption)}" placeholder="输入一个'如果当初……'的假设，观察平行人生分支生长" />
          <button class="btn-grow" id="btnGrowTree">生长反事实树 🌱</button>
        </div>
        <div class="preset-list">
          <span style="color:var(--text-muted);">经典假设母题：</span>
          ${presets.map(p => `<button class="btn-preset" data-preset="${esc(p)}">${esc(p)}</button>`).join('')}
        </div>
      </section>

      <!-- Main Tree Container -->
      <main class="tree-container">
        <div class="tree-header">
          <h2>🌳 当前反事实时空谱系：${esc(tree.assumption)}</h2>
          <span style="font-size:12px;color:var(--text-muted);">
            提示：点击【💧浇水】注入可能性能量，点击【✂️修剪】减除不想要的走向，点击【📌采集】定格标本
          </span>
        </div>

        <!-- Tree history navigation: each tree keeps its own expansion state -->
        <nav class="tree-history-bar">
          <div class="history-nav-controls">
            <button class="btn-history-nav" id="btnPrevTree" ${currentIndex <= 0 ? 'disabled' : ''}>‹ 上一棵树</button>
            <span class="history-position">第 ${currentIndex + 1} / ${history.length} 棵 · 时空谱系 ${esc(tree.createdAt)}</span>
            <button class="btn-history-nav" id="btnNextTree" ${currentIndex >= history.length - 1 ? 'disabled' : ''}>下一棵树 ›</button>
          </div>
          <div class="history-chips">
            ${history
              .map(
                (entry, idx) => `
              <button class="history-chip ${idx === currentIndex ? 'active' : ''}" data-history-index="${idx}" title="${esc(entry.assumption)}">
                <span class="chip-index">${idx + 1}</span>
                <span class="chip-label">${esc(entry.assumption)}</span>
              </button>
            `
              )
              .join('')}
          </div>
        </nav>

        <div class="generations-track">
          ${layers
            .map(
              (layerNodes, idx) => `
            <div class="generation-column">
              <div class="column-header">${eraTitles[idx]}</div>
              ${layerNodes.length > 0 ? layerNodes.map(renderNode).join('') : '<div class="column-empty">此层枝桠已收起</div>'}
            </div>
          `
            )
            .join('')}
        </div>
      </main>

      <!-- Specimen Cabinet Modal -->
      ${
        isCabinetOpen
          ? `
        <div class="modal-overlay" id="cabinetOverlay">
          <div class="modal-content">
            <div class="cabinet-header">
              <h2>🗄️ 平行人生植物学标本集 (Herbarium of What-Ifs)</h2>
              <button class="btn-action" id="btnCloseCabinet" style="font-size:16px;">✕ 关闭</button>
            </div>

            ${
              specimens.length === 0
                ? `
              <div style="text-align:center;padding:40px;color:var(--text-muted);">
                🌱 标本柜暂空。请在反事实树上点击节点的【📌 采集标本】按钮，将某段平行人生命运封存入馆。
              </div>
            `
                : `
              <div class="specimens-grid">
                ${specimens
                  .map(
                    s => `
                  <div class="specimen-card">
                    <span class="specimen-tag">标本领域 · ${esc(s.butterflyTag)}</span>
                    <div class="specimen-title">${esc(s.title)}</div>
                    <div class="specimen-quote">${esc(s.quote)}</div>
                    <div class="specimen-path">
                      <strong>演化因果链：</strong><br />
                      ${s.pathWay.map(p => `↳ ${esc(p)}`).join('<br />')}
                    </div>
                    <div class="specimen-footer">
                      <span>采集时空：${s.harvestedAt}</span>
                      <button class="btn-del-specimen" data-delid="${s.id}">移出标本集</button>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div style="text-align:right;margin-top:24px;">
                <button class="cabinet-btn" onclick="window.print()">🖨️ 导出 / 打印标本图册</button>
              </div>
            `
            }
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Attach event listeners
  container.querySelector('#btnOpenCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(true));
  container.querySelector('#btnCloseCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(false));
  container.querySelector('#cabinetOverlay')?.addEventListener('click', e => {
    if (e.target === container.querySelector('#cabinetOverlay')) {
      handlers.onToggleCabinet(false);
    }
  });

  const inputEl = container.querySelector('#assumptionInput') as HTMLInputElement;
  const triggerGrow = () => {
    const val = inputEl.value.trim();
    if (val) handlers.onGrowNewTree(val);
  };

  container.querySelector('#btnGrowTree')?.addEventListener('click', triggerGrow);
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerGrow();
  });

  container.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      if (preset) {
        inputEl.value = preset;
        handlers.onGrowNewTree(preset);
      }
    });
  });

  // Tree history navigation
  container.querySelector('#btnPrevTree')?.addEventListener('click', () => {
    if (currentIndex > 0) handlers.onSwitchTree(currentIndex - 1);
  });
  container.querySelector('#btnNextTree')?.addEventListener('click', () => {
    if (currentIndex < history.length - 1) handlers.onSwitchTree(currentIndex + 1);
  });
  container.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = Number(chip.getAttribute('data-history-index'));
      if (Number.isInteger(idx) && idx !== currentIndex) handlers.onSwitchTree(idx);
    });
  });

  // Expand / collapse branch nodes
  container.querySelectorAll('.btn-toggle-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-expand-id');
      if (id) handlers.onToggleExpand(id);
    });
  });

  // Action buttons on nodes
  container.querySelectorAll('.btn-water').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onWaterNode(id);
    });
  });

  container.querySelectorAll('.btn-prune').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onPruneNode(id);
    });
  });

  container.querySelectorAll('.btn-harvest').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onHarvestNode(id);
    });
  });

  container.querySelectorAll('.btn-del-specimen').forEach(btn => {
    btn.addEventListener('click', () => {
      const delId = btn.getAttribute('data-delid');
      if (delId) handlers.onDeleteSpecimen(delId);
    });
  });
}
