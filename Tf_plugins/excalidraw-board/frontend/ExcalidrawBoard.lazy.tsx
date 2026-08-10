import { React, Notification } from '@hydrooj/ui-default';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';

interface ExcalidrawBoardProps {
  pid: string | number;
  domainId: string;
}

interface BoardVersion {
  name: string;
  size: number;
  lastModified?: Date;
}

const MAX_VERSIONS = 10;
const BOARD_API_KEY = '__excalidrawBoardAPI';

// 运行时动态注入 Excalidraw CSS（避免 esbuild 打包 CSS 时遇到 woff2 字体 loader 缺失；
// CSS/字体由插件路由 /excalidraw-asset/* 提供，不依赖 koa-static-cache 启动扫描）
function useExcalidrawCSS() {
  React.useEffect(() => {
    const id = 'excalidraw-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = '/excalidraw-asset/index.css';
    document.head.appendChild(link);
  }, []);
}

/** 从题目文件加载指定版本内容 */
async function loadBoardFile(pid: string | number, domainId: string, file?: string): Promise<string | null> {
  try {
    const q = new URLSearchParams({ pid: String(pid), domainId });
    if (file) q.set('file', file);
    const res = await fetch(`/excalidraw-board/load?${q.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content ?? null;
  } catch {
    return null;
  }
}

/** 列出该教师保存在题目文件中的画板版本 */
async function listBoardVersions(pid: string | number, domainId: string): Promise<BoardVersion[]> {
  try {
    const res = await fetch(`/excalidraw-board/load?pid=${encodeURIComponent(String(pid))}&domainId=${encodeURIComponent(domainId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.files || [];
  } catch {
    return [];
  }
}

function formatTime(name: string): string {
  const ts = name.split('-').pop()?.replace(/\..*$/, '');
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return name;
  const d = new Date(n);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function ExcalidrawBoard({ pid, domainId }: ExcalidrawBoardProps) {
  const KEY = `excalidraw-board-${pid}`;
  const [versions, setVersions] = React.useState<BoardVersion[] | null>(null); // null=加载中
  const [selected, setSelected] = React.useState<string>('');
  const [initialData, setInitialData] = React.useState<any>(null);
  const [ready, setReady] = React.useState(false);

  useExcalidrawCSS();
  React.useEffect(() => {
    // 字体自托管路径（CSS 相对 url 基于此解析；语言包已打包进 lazy 模块，无需网络）
    (window as any).EXCALIDRAW_ASSET_PATH = '/excalidraw-asset/';
  }, []);

  // 界面语言：跟随页面用户语言（zh → 简体中文，其他 → 英文）
  const langCode = React.useMemo(() => {
    const viewLang: string = (window as any).UserContext?.viewLang || navigator.language || '';
    return viewLang.startsWith('zh') ? 'zh-CN' : 'en';
  }, []);

  // 挂载：列出服务器版本 → 决定加载源
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listBoardVersions(pid, domainId);
      if (cancelled) return;
      if (list.length >= 1) {
        const latest = list[0].name; // 已按时间倒序
        setVersions(list);
        setSelected(latest);
        const content = await loadBoardFile(pid, domainId, latest);
        if (cancelled) return;
        if (content) {
          try { setInitialData(JSON.parse(content)); } catch { /* 解析失败走草稿 */ }
        }
      } else {
        // 无服务器版本 → localStorage 草稿
        try {
          const saved = localStorage.getItem(KEY);
          if (saved) setInitialData(JSON.parse(saved));
        } catch { /* ignore */ }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [pid, domainId, KEY]);

  // 暴露保存函数给浮层工具栏按钮
  React.useEffect(() => {
    (window as any).__excalidrawBoardSave = async () => {
      const api: any = (window as any)[BOARD_API_KEY];
      if (!api) {
        Notification.error('画板尚未就绪，请稍候再试');
        return;
      }
      try {
        const elements = api.getSceneElements();
        const appState = api.getAppState();
        const content = serializeAsJSON(elements, appState);
        const res = await fetch('/excalidraw-board/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid: String(pid), domainId, content }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          Notification.error(data?.error || '保存失败');
          return;
        }
        // 刷新版本列表
        const list = await listBoardVersions(pid, domainId);
        if (list.length) {
          setVersions(list);
          setSelected(list[0].name);
        }
        Notification.success('已保存到题目文件');
      } catch (e: any) {
        Notification.error(e?.message || '保存失败');
      }
    };
    return () => { delete (window as any).__excalidrawBoardSave; };
  }, [pid, domainId]);

  // 版本切换：加载所选版本
  const loadVersion = React.useCallback(async (name: string) => {
    const content = await loadBoardFile(pid, domainId, name);
    if (content) {
      try {
        setInitialData(JSON.parse(content));
        setSelected(name);
        // 用 updateScene 覆盖当前场景（若已就绪）
        const api: any = (window as any)[BOARD_API_KEY];
        if (api?.updateScene) api.updateScene({ elements: JSON.parse(content).elements, appState: JSON.parse(content).appState });
      } catch { /* ignore */ }
    }
  }, [pid, domainId]);

  const handleChange = React.useCallback((elements: any) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(elements));
    } catch {
      /* localStorage 满或不可用，忽略 */
    }
  }, [KEY]);

  if (!ready) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>画板加载中…</div>;
  }

  // 多版本：顶部版本选择条
  const showPicker = (versions?.length || 0) > 1;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showPicker && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: 13 }}>
          <span style={{ opacity: 0.7 }}>版本（最近 {MAX_VERSIONS} 个）：</span>
          <select
            value={selected}
            onChange={(e) => loadVersion(e.target.value)}
            style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #dee2e6' }}
          >
            {versions!.map((v) => (
              <option key={v.name} value={v.name}>{formatTime(v.name)}</option>
            ))}
          </select>
          <span style={{ opacity: 0.6 }}>共 {versions!.length} 版 · 选择后自动加载</span>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Excalidraw
          langCode={langCode}
          excalidrawAPI={(api: any) => { (window as any)[BOARD_API_KEY] = api; }}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              // 保存→导入→再编辑 完整闭环：允许保存文件(.excalidraw)、导入文件继续编辑、导出图片
              loadScene: true,
              saveToActiveFile: false,
              export: { saveFileToDisk: true },
            },
          }}
        />
      </div>
    </div>
  );
}
