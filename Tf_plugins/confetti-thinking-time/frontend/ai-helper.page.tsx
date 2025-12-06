import { addPage, NamedPage } from '@hydrooj/ui-default';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, InputNumber, message, Spin, Switch, Tabs, Tag, Tooltip, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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
  isAdmin?: boolean;
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
const { Title, Text } = Typography;

const ClassroomToolsFloating: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [form] = Form.useForm();
  const rollIntervalsRef = React.useRef<NodeJS.Timeout[]>([]);

  const clearRollingIntervals = () => {
    rollIntervalsRef.current.forEach(clearInterval);
    rollIntervalsRef.current = [];
  };

  const getRandomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const handleStart = async () => {
    try {
      const values = await form.validateFields();
      const { min, max, count } = values;
      setResults(Array.from({ length: count }, () => 0));
      setRolling(true);
      setLoading(false);

      clearRollingIntervals();
      for (let i = 0; i < count; i++) {
        const interval = setInterval(() => {
          setResults((prev) => {
            const next = [...prev];
            next[i] = getRandomNumber(min, max);
            return next;
          });
        }, 60);
        rollIntervalsRef.current.push(interval);
      }
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('[Classroom Tools] start failed', error);
      message.error(error?.message || '参数校验失败');
    }
  };

  const handleStop = async () => {
    if (!rolling) return;

    try {
      setLoading(true);
      clearRollingIntervals();

      const values = form.getFieldsValue();
      const resp = await fetch('/confetti-thinking-time/classroom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'random_number',
          min: values.min,
          max: values.max,
          count: values.count,
          allowDuplicate: values.allowDuplicate,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        throw new Error(data?.message || `HTTP ${resp.status}`);
      }

      const nums: number[] = data.data?.numbers || [];
      nums.forEach((num, idx) => {
        setTimeout(() => {
          setResults((prev) => {
            const next = [...prev];
            next[idx] = num;
            return next;
          });
        }, idx * 100);
      });
      message.success('生成完成');
    } catch (error: any) {
      console.error('[Classroom Tools] stop failed', error);
      message.error(error?.message || '生成失败，请稍后再试');
    } finally {
      setLoading(false);
      setRolling(false);
    }
  };

  const handleReset = () => {
    clearRollingIntervals();
    setRolling(false);
    setResults([]);
    form.resetFields();
  };

  React.useEffect(() => {
    return () => {
      clearRollingIntervals();
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <>
      <Tooltip title="课堂工具 - 随机数字">
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 156,
            width: 45,
            height: 45,
            borderRadius: '50%',
            border: 'none',
            background: '#f59e0b',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
            cursor: 'pointer',
            zIndex: 2000,
          }}
        >
          <ThunderboltOutlined style={{ fontSize: 20 }} />
        </button>
      </Tooltip>

      <Drawer
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Title level={5} style={{ margin: 0 }}>
              课堂工具（随机数字）
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              快速抽号/抽奖
            </Text>
          </div>
        }
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            min: 1,
            max: 50,
            count: 1,
            allowDuplicate: false,
          }}
        >
          <Form.Item label="最小值" name="min" rules={[{ required: true, message: '请输入最小值' }]}>
            <InputNumber style={{ width: '100%' }} min={-9999} max={999999} />
          </Form.Item>
          <Form.Item label="最大值" name="max" rules={[{ required: true, message: '请输入最大值' }]}>
            <InputNumber style={{ width: '100%' }} min={-9999} max={999999} />
          </Form.Item>
          <Form.Item label="数量" name="count" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={50} />
          </Form.Item>
          <Form.Item label="允许重复" name="allowDuplicate" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', gap: 8 }}>
          {!rolling ? (
            <Button type="primary" onClick={handleStart} disabled={loading} block>
              开始摇号
            </Button>
          ) : (
            <Button type="primary" danger onClick={handleStop} loading={loading} block>
              停止并生成
            </Button>
          )}
          <Button onClick={handleReset} disabled={loading || rolling} block>
            重置
          </Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>生成结果</div>
          {results.length === 0 ? (
            <Text type="secondary">点击开始摇号即可看到结果</Text>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
              {results.map((num, idx) => (
                <div
                  key={`${num}-${idx}`}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    padding: '12px 10px',
                    textAlign: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    background: rolling ? '#fff7ed' : '#fffbeb',
                    transition: 'transform 120ms ease, box-shadow 120ms ease, background 120ms ease',
                    boxShadow: rolling ? '0 4px 12px rgba(249, 115, 22, 0.15)' : '0 2px 6px rgba(0,0,0,0.06)',
                    transform: rolling ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

const AiHelperApp: React.FC = () => {
  const ui = useMemo(() => safeGetUiContext(), []);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hint' | 'debug' | 'optimize'>('hint');
  const [code, setCode] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiHelperResponse['data'] | null>(null);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  // 使用 ref 来直接更新 DOM，绕过 React 的批处理，实现真正的实时显示
  const analysisTextRef = useRef<HTMLDivElement>(null);
  const currentTextRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    // 打开时自动尝试抓一次代码，用户仍可手动修改
    const guessed = guessCurrentCode();
    if (guessed && !code) {
      setCode(guessed);
    }
  }, [open, code]);

  // 清理 WebSocket 连接
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
        setWs(null);
      }
    };
  }, [ws]);

  if (!ui) {
    return null;
  }

  const handleAsk = () => {
    if ((mode === 'debug' || mode === 'optimize') && !code?.trim()) {
      message.warning('调试/优化模式需要提供代码，请先填写或粘贴代码。');
      return;
    }

    // 如果已有连接，先关闭
    if (ws) {
      ws.close();
      setWs(null);
    }

    setLoading(true);
    setResult(null);
    currentTextRef.current = '';
    setAnalysisText('');
    if (analysisTextRef.current) {
      analysisTextRef.current.textContent = '';
    }
    setWsStatus('connecting');

    try {
      // 构建 WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsPrefix = (window as any).UiContext?.ws_prefix || '';
      const wsUrl = `${protocol}//${host}${wsPrefix}/ws/ai-helper/stream`;

      const websocket = new WebSocket(wsUrl);
      setWs(websocket);

      websocket.onopen = () => {
        setWsStatus('connected');

        // 发送请求
        const payload: AiHelperRequestPayload & { prompt?: string } = {
          problemId: ui.problemId || ui.problemNumId,
          code: code || undefined,
          mode,
          language: ui.codeLang,
          ...(prompt ? { prompt } : {}),
        };

        websocket.send(JSON.stringify(payload));
      };

      websocket.onmessage = (event: MessageEvent) => {
        // 处理心跳
        if (typeof event.data === 'string' && (event.data === 'ping' || event.data === 'pong')) {
          if (event.data === 'ping') {
            websocket.send('pong');
          }
          return;
        }

        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'ready':
              break;

            case 'start':
              currentTextRef.current = '';
              setAnalysisText('');
              // 立即清空 DOM
              if (analysisTextRef.current) {
                analysisTextRef.current.textContent = '';
              }
              message.info(data.message || 'AI 开始思考...');
              break;

            case 'delta': {
              // 实时追加内容 - 优先使用 accumulated（更准确）
              let newText = '';
              if (data.accumulated !== undefined) {
                newText = data.accumulated;
              } else if (data.content) {
                newText = currentTextRef.current + data.content;
              }

              if (newText && newText !== currentTextRef.current) {
                currentTextRef.current = newText;

                // 直接更新 DOM，绕过 React 批处理，实现真正的实时显示
                if (analysisTextRef.current) {
                  analysisTextRef.current.textContent = newText;
                  // 显示容器（如果之前是隐藏的）
                  const container = analysisTextRef.current.closest('div[style*="marginBottom: 12"]') as HTMLElement;
                  if (container) {
                    container.style.display = 'block';
                  }
                  // 自动滚动到底部
                  const drawerBody = analysisTextRef.current.closest('.ant-drawer-body') as HTMLElement;
                  if (drawerBody) {
                    requestAnimationFrame(() => {
                      drawerBody.scrollTop = drawerBody.scrollHeight;
                    });
                  }
                }

                // 使用 flushSync 强制同步更新 React state
                try {
                  flushSync(() => {
                    setAnalysisText(newText);
                  });
                } catch (e) {
                  setAnalysisText(newText);
                }
              }
              break;
            }

            case 'structured':
              // 收到结构化数据
              if (data.data) {
                setResult(data.data);
                if (data.data.analysis) {
                  setAnalysisText(data.data.analysis);
                }
              }
              break;

            case 'done':
              message.success(data.message || 'AI 回答完成');
              setLoading(false);
              break;

            case 'final':
              // 最终结果
              if (data.data) {
                setResult(data.data);
                if (data.data.analysis) {
                  setAnalysisText(data.data.analysis);
                }
              }
              setLoading(false);
              // 关闭连接
              if (websocket.readyState === WebSocket.OPEN) {
                websocket.close(1000, 'completed');
              }
              break;

            case 'error':
              message.error(data.message || 'AI 服务出错');
              setLoading(false);
              setWsStatus('disconnected');
              if (websocket.readyState === WebSocket.OPEN) {
                websocket.close();
              }
              break;

            default:
              break;
          }
        } catch (e) {
          console.error('[AI Helper] 解析消息失败:', e);
        }
      };

      websocket.onerror = () => {
        message.error('WebSocket 连接错误，请重试');
        setLoading(false);
        setWsStatus('disconnected');
      };

      websocket.onclose = (event) => {
        setWsStatus('disconnected');
        setWs(null);
        if (event.code !== 1000 && event.code !== 4000 && loading) {
          message.warning('连接意外断开，请重试');
          setLoading(false);
        }
      };
    } catch (e: any) {
      message.error('无法建立连接，请检查网络或稍后重试');
      setLoading(false);
      setWsStatus('disconnected');
    }
  };

  const problemTitle = ui.pdoc?.title || ui.problemId;

  return (
    <>
      <ClassroomToolsFloating isAdmin={!!ui?.isAdmin} />
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
          <RobotOutlined style={{ fontSize: 22 }} />
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                每次调用将消耗 <span style={{ fontWeight: 600, color: '#f97316' }}>100</span> 积分
              </div>
              <Button
                type="primary"
                onClick={handleAsk}
                loading={loading}
                disabled={wsStatus === 'connecting'}
              >
                {loading
                  ? (wsStatus === 'connected' ? 'AI 正在回答...' : '连接中...')
                  : '发送给 AI（流式）'}
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
              {loading && wsStatus === 'connecting' && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24, color: '#6b7280' }}>
                  <Spin />
                  <span style={{ marginLeft: 8 }}>正在连接 AI 服务...</span>
                </div>
              )}
              {loading && wsStatus === 'connected' && !analysisText && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24, color: '#6b7280' }}>
                  <Spin />
                  <span style={{ marginLeft: 8 }}>AI 正在思考中，请稍候...</span>
                </div>
              )}
              {/* 始终渲染文本容器，确保 ref 始终可用，这样可以直接更新 DOM */}
              <div style={{ marginBottom: 12, display: (analysisText || result || loading) ? 'block' : 'none' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>总体分析</div>
                <div
                  ref={analysisTextRef}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    minHeight: '1em',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                  }}
                >
                  {analysisText || result?.analysis || ''}
                </div>
              </div>
              {!loading && !result && !analysisText && (
                <div style={{ color: '#9ca3af' }}>
                  说明：本工具仅用于学习辅助，尽量避免直接给出完整答案，更适合用来查找错误、理解题意与优化代码。
                </div>
              )}
              {!loading && (analysisText || result) && (
                <div>
                  {result?.suggestions && result.suggestions.length > 0 && (
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
                  {result?.steps && result.steps.length > 0 && (
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
