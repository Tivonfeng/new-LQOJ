import { $, addPage, NamedPage, load, Notification, React } from '@hydrooj/ui-default';
import { createRoot } from 'react-dom/client';
import { SaveOutlined, SketchOutlined } from '@ant-design/icons';

const PERMISSION_EDIT_PROBLEM = 8; // PERM.PERM_EDIT_PROBLEM（位值）

/** 判断当前用户是否为该题作者或拥有编辑权限 */
function isTeacher(): boolean {
  const UiContext: any = (window as any).UiContext;
  const UserContext: any = (window as any).UserContext;
  const pdoc = UiContext?.pdoc;
  if (!pdoc || !UserContext) return false;
  if (pdoc.owner === UserContext._id) return true;
  // perm 是位掩码
  const perm = BigInt(UserContext.perm || 0);
  return (perm & BigInt(PERMISSION_EDIT_PROBLEM)) !== BigInt(0);
}

/** 注入右下角悬浮「画板」按钮（仅教师可见），位于课堂工具按钮上方 */
function injectBoardButton(pid: string | number, onOpen: () => void) {
  if ($('.excalidraw-board-trigger').length) return;
  const $btn = $(
    `<button type="button" class="excalidraw-board-trigger" title="画板 · 第 ${pid} 题" style="position:fixed;right:24px;bottom:213px;width:45px;height:45px;border-radius:50%;border:none;background:#4690d0;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(15,23,42,.25);cursor:pointer;z-index:2000;font-size:20px"></button>`,
  );
  $btn.on('click', (e) => {
    e.preventDefault();
    onOpen();
  });
  $('body').append($btn);
  // antd 图标（React 渲染进按钮，不影响 jQuery click 绑定）
  createRoot($btn[0]).render(React.createElement(SketchOutlined, { style: { fontSize: 20 } }));
}

/** 打开全屏浮层，懒加载 ExcalidrawBoard */
async function openBoardOverlay(pid: string | number, domainId: string) {
  // 已打开则不重复
  if ($('#excalidraw-board-overlay').length) return;

  const overlay = document.createElement('div');
  overlay.id = 'excalidraw-board-overlay';
  overlay.className = 'excalidraw-board-overlay';
  overlay.innerHTML = `
    <div class="excalidraw-board-toolbar">
      <span class="excalidraw-board-title">画板 · 第 ${pid} 题</span>
      <div class="excalidraw-board-actions">
        <button class="excalidraw-board-btn excalidraw-board-save" title="保存到题目文件">存</button>
        <button class="excalidraw-board-btn excalidraw-board-fullscreen" title="全屏">⛶</button>
        <button class="excalidraw-board-btn excalidraw-board-close" title="关闭">✕</button>
      </div>
    </div>
    <div class="excalidraw-board-container" id="excalidraw-board-root"></div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const $overlay = $(overlay);
  const close = () => {
    document.body.style.overflow = '';
    overlay.remove();
  };
  $overlay.find('.excalidraw-board-close').on('click', close);
  $overlay.find('.excalidraw-board-fullscreen').on('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else overlay.requestFullscreen?.();
  });
  // 保存到题目文件（调用 lazy 模块暴露的保存函数）
  $overlay.find('.excalidraw-board-save').on('click', () => {
    const save = (window as any).__excalidrawBoardSave;
    if (typeof save !== 'function') {
      Notification.error('画板尚未就绪，请稍候再试');
      return;
    }
    save();
  });
  // 保存按钮图标（antd SaveOutlined）
  const saveBtn = $overlay.find('.excalidraw-board-save')[0];
  if (saveBtn) createRoot(saveBtn).render(React.createElement(SaveOutlined, { style: { fontSize: 16 } }));
  // ESC 关闭
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !document.fullscreenElement) {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);

  // 懒加载 ExcalidrawBoard lazy 模块（按需拉 ~2MB）
  const container = overlay.querySelector('#excalidraw-board-root');
  try {
    const mod = await load('ExcalidrawBoard');
    const ExcalidrawBoard = (mod as any).default;
    if (!ExcalidrawBoard) throw new Error('ExcalidrawBoard 模块导出缺失');
    // 必须用 createElement 以组件方式渲染（直接调用函数组件会导致 hooks 上下文错误）
    createRoot(container!).render(React.createElement(ExcalidrawBoard, { pid, domainId }));
  } catch (e: any) {
    // 渲染失败：显示错误详情（便于诊断），不关闭浮层
    const errBox = document.createElement('div');
    errBox.style.cssText = 'padding:2em;font:13px/1.6 monospace;color:#c62828;white-space:pre-wrap';
    errBox.textContent = `画板加载失败: ${e?.stack || e?.message || String(e)}`;
    container?.appendChild(errBox);
    console.error('[excalidraw-board]', e);
  }
}

function initProblemPage() {
  const UiContext: any = (window as any).UiContext;
  const pdoc = UiContext?.pdoc;
  if (!pdoc) return;
  if (!isTeacher()) return; // 仅教师可见
  const pid = pdoc.pid || pdoc.docId;
  if (!pid) return;
  const domainId = UiContext.domainId || '';

  injectBoardButton(pid, () => openBoardOverlay(pid, domainId));
}

addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  initProblemPage();
  // pjax 换题后重挂
  $(document).on('vjContentNew', initProblemPage);
}));

// 浮层样式（注入 head，避免单独 css 文件）
const style = document.createElement('style');
style.textContent = `
.excalidraw-board-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  background: #fff;
}
.excalidraw-board-toolbar {
  flex: none; display: flex; align-items: center; justify-content: space-between;
  padding: .5em 1em; background: #f8f9fa; border-bottom: 1px solid #e9ecef;
  font-size: .9em;
}
.excalidraw-board-title { font-weight: 600; color: #343a40; }
.excalidraw-board-actions { display: flex; gap: .4em; }
.excalidraw-board-btn {
  border: 1px solid #dee2e6; border-radius: 6px; background: #fff;
  width: 2em; height: 2em; cursor: pointer; font-size: 1em; line-height: 1;
  transition: all .15s;
}
.excalidraw-board-btn:hover { border-color: #4690d0; color: #4690d0; }
.excalidraw-board-close:hover { border-color: #c62828; color: #c62828; }
.excalidraw-board-container { flex: 1; min-height: 0; overflow: hidden; }
.excalidraw-board-overlay:fullscreen { background: #fff; }
`;
document.head.appendChild(style);
