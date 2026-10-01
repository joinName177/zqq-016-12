import { CounterfactualTree, LifeSpecimen, LifeNode } from '../core/models';

export interface TreeUIHandlers {
  onGrowNewTree: (assumption: string) => void;
  onWaterNode: (nodeId: string) => void;
  onPruneNode: (nodeId: string) => void;
  onHarvestNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  onBackToPreviousTree: () => void;
  onDeleteSpecimen: (id: string) => void;
  onToggleCabinet: (open: boolean) => void;
}

export function renderTreeApp(
  container: HTMLElement,
  tree: CounterfactualTree,
  specimens: LifeSpecimen[],
  isCabinetOpen: boolean,
  presets: string[],
  expandedIds: Set<string>,
  historyDepth: number,
  handlers: TreeUIHandlers
) {
  const esc = (s: string) =>
    s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

  // Organize nodes by layer index (0 to 4)
  const layers: LifeNode[][] = [[], [], [], [], []];
  const layerTotal: number[] = [0, 0, 0, 0, 0];
  Object.values(tree.nodes).forEach(n => {
    if (layers[n.layerIndex]) layerTotal[n.layerIndex] += 1;
  });

  // 可见性：自根向下沿“已展开”的祖先链推导。
  // expandedIds 只可能令“父链完整且全部展开”的节点显现，
  // 因此陈旧/孤立的展开记录不会错误地暴露深层节点。
  const visibleIds = new Set<string>();
  const walkVisible = (id: string) => {
    const node = tree.nodes[id];
    if (!node) return;
    visibleIds.add(id);
    if (expandedIds.has(id)) {
      node.childrenIds.forEach(walkVisible);
    }
  };
  walkVisible(tree.rootId);

  Object.values(tree.nodes).forEach(n => {
    if (layers[n.layerIndex] && visibleIds.has(n.id)) {
      layers[n.layerIndex].push(n);
    }
  });

  const countSubtree = (id: string): number => {
    const node = tree.nodes[id];
    if (!node) return 0;
    return node.childrenIds.reduce((sum, childId) => sum + 1 + countSubtree(childId), 0);
  };

  const eraTitles = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];

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
        <div class="header-actions">
          <button class="back-tree-btn" id="btnBackTree" ${historyDepth > 0 ? '' : 'disabled'}
            title="${historyDepth > 0 ? '回到上一棵反事实树，并恢复它各自的展开状态' : '当前已是最初的那棵树'}">
            ↩️ 返回上一棵树${historyDepth > 0 ? ` (${historyDepth})` : ''}
          </button>
          <button class="cabinet-btn" id="btnOpenCabinet">
            🗄️ 平行人生标本馆 (${specimens.length})
          </button>
        </div>
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

        <div class="generations-track">
          ${layers
            .map(
              (layerNodes, idx) => `
            <div class="generation-column">
              <div class="column-header">
                ${eraTitles[idx]}
                ${layerTotal[idx] > layers[idx].length ? `<span class="layer-collapsed-hint">（已收起 ${layerTotal[idx] - layers[idx].length}）</span>` : ''}
              </div>
              ${layerNodes.length === 0
                ? `<div class="layer-empty">此处的分支已被收起或尚未展开<br/>展开上游节点即可重新显现</div>`
                : ''}
              ${layerNodes
                .map(
                  node => {
                    const isExpanded = expandedIds.has(node.id);
                    const childCount = node.childrenIds.length;
                    const hiddenDescendants = !isExpanded ? countSubtree(node.id) : 0;
                    return `
                <div class="node-card ${node.isPruned ? 'pruned' : ''}"
                     style="--cat-color: ${node.color};"
                     data-id="${node.id}">
                  <div class="node-card-head">
                    <span class="node-category-tag">${esc(node.categoryName)}</span>
                    ${childCount > 0 ? `
                      <button class="btn-toggle" data-toggleid="${node.id}" title="${isExpanded ? '收起此走向的下游分支' : '展开此走向的下游分支'}">
                        ${isExpanded ? '▼ 收起' : '▶ 展开'}
                        ${hiddenDescendants > 0 ? `<span class="hidden-count">·${hiddenDescendants}个节点</span>` : ''}
                      </button>` : '<span class="leaf-hint">🍃 末端</span>'}
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
                  }
                )
                .join('')}
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
  container.querySelector('#btnBackTree')?.addEventListener('click', () => {
    if (historyDepth > 0) handlers.onBackToPreviousTree();
  });
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

  // Expand / collapse toggle on nodes
  container.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggleid');
      if (id) handlers.onToggleNode(id);
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
