import { addPage, NamedPage } from '@hydrooj/ui-default';
import { CommentOutlined } from '@ant-design/icons';
import { Button, Drawer, Input, message, Spin, Tabs, Tag, Tooltip } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface AiHelperRequestPayload {
  problemId: string;
  code?: string;
  mode: 'hint' | 'debug' | 'optimize';
  language?: string;
}

interface AiHelperResponse {
  success: boolean;
  message?: string;
  data?: {
    analysis?: string;
    suggestions?: string[];
    steps?: string[];
  };
}

interface UiProblemDoc {
  docId: string;
  pid?: string;
  title: string;
  content?: any;
  config?: {
    type?: string;
    subType?: string;
    timeMin?: string;
    timeMax?: string;
    memoryMin?: string;
    memoryMax?: string;
  };
  tag?: string[];
}

interface AiHelperUiContext {
  problemId: string;
  problemNumId: string;
  codeLang?: string;
  codeTemplate?: string;
  pdoc: UiProblemDoc;
  domainId?: string;
}

function safeGetUiContext(): AiHelperUiContext | null {
  try {
    const ctx = (window as any).UiContext;
    if (!ctx || !ctx.problemId || !ctx.pdoc) return null;
    return ctx as AiHelperUiContext;
  } catch {
    return null;
  }
}

function guessCurrentCode(): string | undefined {
  // 1. 尝试从常见的代码编辑区域获取
  const codeTextarea = document.querySelector<HTMLTextAreaElement>('textarea[name="code"], textarea[name="source"]');
  if (codeTextarea && codeTextarea.value.trim()) {
    return codeTextarea.value;
  }
  // 2. 尝试从 Monaco 编辑器（如果存在）读取
  try {
    const monaco = (window as any).monaco;
    if (monaco && (window as any).editor) {
      const editor = (window as any).editor;
      const value = editor.getValue?.();
      if (value && typeof value === 'string' && value.trim()) return value;
    }
  } catch {
    // ignore
  }
  return undefined;
}

const { TextArea } = Input;

const AiHelperApp: React.FC = () => {
  const ui = useMemo(() => safeGetUiContext(), []);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hint' | 'debug' | 'optimize'>('hint');
  const [code, setCode] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiHelperResponse['data'] | null>(null);

  useEffect(() => {
    if (!open) return;
    // 打开时自动尝试抓一次代码，用户仍可手动修改
    const guessed = guessCurrentCode();
    if (guessed && !code) {
      setCode(guessed);
    }
  }, [open, code]);

  if (!ui) {
    return null;
  }

  const handleAsk = async () => {
    if (!code?.trim()) {
      message.warning('请先填写或粘贴代码，再使用 AI 辅助。');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload: AiHelperRequestPayload = {
        problemId: ui.problemId || ui.problemNumId,
        code,
        mode,
        language: ui.codeLang,
      };
      const resp = await fetch('/confetti-thinking-time/ai-helper/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          prompt: prompt || undefined,
        }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data: AiHelperResponse = await resp.json();
      if (!data.success) {
        message.error(data.message || 'AI 分析失败，请稍后重试。');
        return;
      }
      setResult(data.data || null);
    } catch (e: any) {
      console.error('[Confetti AI Helper] analyze failed', e);
      message.error('AI 服务暂不可用，请稍后重试或联系管理员。');
    } finally {
      setLoading(false);
    }
  };

  const problemTitle = ui.pdoc?.title || ui.problemId;

  return (
    <>
      {/* 悬浮球 */}
      <Tooltip title="AI 辅助解题（实验功能）">
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 96,
            width: 45,
            height: 45,
            borderRadius: '50%',
            border: 'none',
            background: '#4f46e5',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.35)',
            cursor: 'pointer',
            zIndex: 2000,
          }}
        >
          <CommentOutlined style={{ fontSize: 24 }} />
        </button>
      </Tooltip>

      {/* 右侧抽屉式 AI 面板 */}
      <Drawer
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>AI 辅助解题</span>
            <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              题目：{problemTitle}
            </span>
          </div>
        }
        placement="right"
        width={520}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
          <Tabs
            activeKey={mode}
            onChange={(key) => setMode(key as typeof mode)}
            items={[
              {
                key: 'hint',
                label: (
                  <>
                    <Tag color="blue" style={{ marginRight: 4 }}>
                      提示
                    </Tag>
                    解题思路
                  </>
                ),
              },
              {
                key: 'debug',
                label: (
                  <>
                    <Tag color="red" style={{ marginRight: 4 }}>
                      调试
                    </Tag>
                    帮我找错
                  </>
                ),
              },
              {
                key: 'optimize',
                label: (
                  <>
                    <Tag color="green" style={{ marginRight: 4 }}>
                      优化
                    </Tag>
                    复杂度 / 风格
                  </>
                ),
              },
            ]}
          />

          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>
              可选说明（例如：当前卡在哪个样例、希望侧重什么方面）
            </div>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="可选：向 AI 额外说明你的困惑，例如“样例 2 总是 WA”或“希望帮我分析时间复杂度”"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>
              学生代码（默认为当前编辑器中的代码，支持手动修改）
            </div>
            <TextArea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="在这里粘贴或编辑你的代码..."
              autoSize={{ minRows: 8, maxRows: 14 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                每次调用将消耗 <span style={{ fontWeight: 600, color: '#f97316' }}>100</span> 积分
              </div>
              <Button type="primary" onClick={handleAsk} loading={loading}>
                {loading ? 'AI 分析中...' : '发送给 AI'}
              </Button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 120, marginTop: 8 }}>
            <div
              style={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                padding: 12,
                height: '100%',
                overflow: 'auto',
                background: '#f9fafb',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24, color: '#6b7280' }}>
                  <Spin />
                  <span style={{ marginLeft: 8 }}>AI 正在思考中，请稍候...</span>
                </div>
              )}
              {!loading && !result && (
                <div style={{ color: '#9ca3af' }}>
                  说明：本工具仅用于学习辅助，尽量避免直接给出完整答案，更适合用来查找错误、理解题意与优化代码。
                </div>
              )}
              {!loading && result && (
                <div>
                  {result.analysis && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>总体分析</div>
                      <div>{result.analysis}</div>
                    </div>
                  )}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>建议与注意点</div>
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {result.suggestions.map((s, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.steps && result.steps.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>推荐解题步骤</div>
                      <ol style={{ paddingLeft: 18, margin: 0 }}>
                        {result.steps.map((s, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

// 注册到 Hydro 前端页面系统：绑定到 problem_detail 页面
addPage(
  new NamedPage(['problem_detail'], async () => {
    const mount = document.getElementById('confetti-ai-helper-root');
    if (!mount) return;
    const root = createRoot(mount);
    root.render(<AiHelperApp />);
  }),
);

export default AiHelperApp;
