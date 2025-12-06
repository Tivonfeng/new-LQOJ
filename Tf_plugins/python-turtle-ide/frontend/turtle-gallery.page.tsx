/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  CheckCircleOutlined,
  CodeOutlined,
  CrownOutlined,
  DollarCircleOutlined,
  EyeOutlined,
  FlagOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  PictureOutlined,
  ReadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Empty, message, Modal, Space, Tabs, Tag } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface TurtleWork {
  id: string;
  title: string;
  imageUrl?: string;
  code?: string;
  likes: number;
  views: number;
  uid: number;
  createdAt?: string;
  updatedAt?: string;
}

interface UserDoc {
  _id: number;
  uname: string;
  [key: string]: any;
}

type TaskProgressStatus = 'not_started' | 'in_progress' | 'completed';

interface TurtleTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  answerCode?: string;
  isPublished: boolean;
}

interface TaskProgress {
  status: TaskProgressStatus;
  lastCode?: string;
  updatedAt?: string;
  completedAt?: string;
  bestWorkId?: string;
}

function useHydroMarkdown(text?: string) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!text) {
      setHtml('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, inline: false }),
        });
        const rendered = await resp.text();
        if (!cancelled) setHtml(rendered);
      } catch {
        if (!cancelled) setHtml(text);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return html;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    // 格式化日期时间，不包含秒数
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso || '';
  }
}

function TaskDescription({ text }: { text?: string }) {
  const html = useHydroMarkdown(text);
  return (
    <div
      style={{ flex: 1, color: '#4b5563' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface WorkGridProps {
  works: TurtleWork[];
  udocs: Record<string | number, UserDoc>;
  isOwn?: boolean;
  onDeleted?: (id: string) => void;
  onCoined?: (id: string) => void;
  currentUserId?: number | null;
}

function WorkGrid(props: WorkGridProps) {
  const { works, udocs, isOwn, onDeleted, currentUserId, onCoined } = props;
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingWork, setViewingWork] = useState<TurtleWork | null>(null);
  const [workCode, setWorkCode] = useState<string>('');
  const [loadingWork, setLoadingWork] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 运行代码的函数
  const runCode = async () => {
    if (!workCode || !canvasRef.current) return;

    setIsRunning(true);
    const canvasDiv = canvasRef.current;

    // 清空画布
    canvasDiv.innerHTML = '';

    try {
      // 确保 Skulpt 已加载
      if (!(window as any).Sk) {
        message.error('Skulpt 库未加载，请刷新页面重试');
        return;
      }

      // 获取画布尺寸
      const rect = canvasDiv.getBoundingClientRect();
      const canvasWidth = Math.floor(rect.width - 20); // 减去 padding
      const canvasHeight = Math.floor(rect.height - 20);

      // 配置 Skulpt
      const runConfig: any = {
        output: (text: string) => {
          console.log('[Skulpt Output]', text);
        },
        read: (x: string) => {
          if ((window as any).Sk.builtinFiles?.files[x]) {
            return (window as any).Sk.builtinFiles.files[x];
          }
          throw new Error(`文件未找到: '${x}'`);
        },
      };
      runConfig.__future__ = (window as any).Sk.python3;
      (window as any).Sk.configure(runConfig);

      // 设置 Turtle 图形配置
      (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
      (window as any).Sk.TurtleGraphics.target = `turtle-canvas-${viewingWork?.id || 'view'}`;
      (window as any).Sk.TurtleGraphics.width = canvasWidth;
      (window as any).Sk.TurtleGraphics.height = canvasHeight;

      // 设置 canvas div 的 ID
      canvasDiv.id = (window as any).Sk.TurtleGraphics.target;

      // 使用 MutationObserver 监听 canvas 创建，立即设置样式避免偏移
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'CANVAS') {
              const htmlCanvas = node as HTMLCanvasElement;
              // 立即设置样式，防止后续偏移
              htmlCanvas.style.position = 'absolute';
              htmlCanvas.style.top = '0';
              htmlCanvas.style.left = '0';
              htmlCanvas.style.width = '100%';
              htmlCanvas.style.height = '100%';
              htmlCanvas.style.margin = '0';
              htmlCanvas.style.padding = '0';
              htmlCanvas.style.display = 'block';
            }
          });
        });
      });

      observer.observe(canvasDiv, { childList: true, subtree: true });

      // 运行代码
      await (window as any).Sk.misceval.asyncToPromise(() => {
        return (window as any).Sk.importMainWithBody('<stdin>', false, workCode, true);
      });

      // 绘制完成后，确保所有 canvas 的样式固定，防止偏移
      // 使用多个 requestAnimationFrame 确保在 Skulpt 完成所有操作后再设置
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const canvases = canvasDiv.querySelectorAll('canvas');
          canvases.forEach((canvas) => {
            const htmlCanvas = canvas as HTMLCanvasElement;
            // 确保样式固定，防止偏移
            htmlCanvas.style.position = 'absolute';
            htmlCanvas.style.top = '0';
            htmlCanvas.style.left = '0';
            htmlCanvas.style.width = '100%';
            htmlCanvas.style.height = '100%';
            htmlCanvas.style.margin = '0';
            htmlCanvas.style.padding = '0';
            htmlCanvas.style.display = 'block';
          });
          observer.disconnect();
        });
      });
    } catch (error: any) {
      console.error('运行代码失败:', error);
      message.error(`运行失败: ${error.message || error.toString()}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 当弹窗关闭时，清空画布
  useEffect(() => {
    if (!viewModalVisible && canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
  }, [viewModalVisible]);

  const handleView = async (work: TurtleWork) => {
    setViewingWork(work);
    setViewModalVisible(true);
    setLoadingWork(true);

    try {
      // 获取作品详情（包含代码），请求JSON格式
      const resp = await fetch(`/turtle/work/${work.id}`, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setWorkCode(data.work?.code || '');
      } else {
        message.error('获取作品详情失败');
        setWorkCode(work.code || '');
      }
    } catch (error) {
      console.error('Failed to load work:', error);
      setWorkCode(work.code || '');
    } finally {
      setLoadingWork(false);
    }
  };

  const handleCoin = async (work: TurtleWork) => {
    try {
      const resp = await fetch(`/turtle/work/${work.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'coin', workId: work.id }),
      });
      const data = await resp.json();
      if (data.success) {
        onCoined?.(work.id);
        message.success(data.message || '投币成功！作品主人已获得1积分');
      } else {
        message.error(data.message || '投币失败');
      }
    } catch {
      message.error('投币请求失败');
    }
  };
  const handleDelete = async (work: TurtleWork) => {
    if (!onDeleted) return;
    Modal.confirm({
      title: '确认删除作品？',
      content: `确定要删除作品「${work.title}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const resp = await fetch(`/turtle/work/${work.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', workId: work.id }),
          });
          const data = await resp.json();
          if (data.success) {
            onDeleted(work.id);
            message.success('删除成功');
          } else {
            message.error(data.message || '删除失败');
          }
        } catch (e) {
          message.error('删除请求失败');
        }
      },
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 12,
        alignItems: 'start',
      }}
    >
      {works.map((work) => {
        const author = udocs[work.uid] || udocs[String(work.uid)];
        return (
          <Card
            key={work.id}
            hoverable
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            styles={{
              body: {
                padding: '12px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            cover={
              work.imageUrl ? (
                <div
                  style={{
                    width: '100%',
                    paddingTop: '62%',
                    backgroundImage: `url(${work.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    paddingTop: '62%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f3f4f6',
                  }}
                >
                  <PictureOutlined style={{ fontSize: 28, color: '#9ca3af' }} />
                </div>
              )
            }
          >
            <Card.Meta
              title={
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    width: '100%',
                  }}
                  title={work.title}
                >
                  {work.title}
                </div>
              }
              description={
                <div>
                  {!isOwn && author && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      作者：{author.uname}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#6b7280',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarCircleOutlined />
                      {work.likes}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <EyeOutlined />
                      {work.views}
                    </span>
                  </div>
                  {work.updatedAt && (
                    <div style={{ marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
                      更新时间：{formatDateTime(work.updatedAt)}
                    </div>
                  )}
                </div>
              }
            />
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                gap: 6,
                justifyContent: 'flex-end',
                flexWrap: isOwn ? 'nowrap' : 'wrap',
              }}
            >
              <Button
                size="small"
                onClick={() => handleView(work)}
              >
                查看
              </Button>
              {!isOwn && (
                <Button
                  size="small"
                  icon={<DollarCircleOutlined />}
                  disabled={!currentUserId || currentUserId === work.uid}
                  onClick={() => handleCoin(work)}
                >
                  投币
                </Button>
              )}
              {isOwn && (
                <>
                  <Button
                    size="small"
                    onClick={() => {
                      const url = new URL('/turtle/playground', window.location.origin);
                      url.searchParams.set('workId', work.id);
                      window.location.href = url.toString();
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleDelete(work)}
                  >
                    删除
                  </Button>
                </>
              )}
            </div>
          </Card>
        );
      })}
      <Modal
        title={viewingWork?.title || '查看作品'}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingWork(null);
          setWorkCode('');
          setIsRunning(false);
          if (canvasRef.current) {
            canvasRef.current.innerHTML = '';
          }
        }}
        footer={[
          <Button
            key="run"
            type="primary"
            loading={isRunning}
            onClick={runCode}
            disabled={!workCode}
          >
            {isRunning ? '运行中...' : '运行代码'}
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setViewingWork(null);
              setWorkCode('');
              setIsRunning(false);
              if (canvasRef.current) {
                canvasRef.current.innerHTML = '';
              }
            }}
          >
            关闭
          </Button>,
        ]}
        width={1000}
        styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
      >
        {loadingWork ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : (
          <div>
            {/* 画布区域 */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>运行效果：</h4>
              <div
                ref={canvasRef}
                id={`turtle-canvas-${viewingWork?.id || 'view'}`}
                style={{
                  width: '100%',
                  height: '400px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              />
            </div>

            {/* 代码区域 - 只有作者才能看到代码 */}
            {workCode && (isOwn || (currentUserId && viewingWork && currentUserId === viewingWork.uid)) && (
              <div>
                <h4 style={{ marginBottom: 8 }}>代码：</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    overflow: 'auto',
                    fontSize: 13,
                    lineHeight: 1.5,
                    maxHeight: '200px',
                  }}
                >
                  <code>{workCode}</code>
                </pre>
              </div>
            )}
            {workCode && !(isOwn || (currentUserId && viewingWork && currentUserId === viewingWork.uid)) && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: 14 }}>
                🔒 代码已隐藏，仅作者可见
              </div>
            )}
            {!workCode && !loadingWork && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无代码内容
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
// 排行榜组件
interface RankingListProps {
  works: TurtleWork[];
  udocs: Record<string | number, UserDoc>;
  currentUserId?: number | null;
  onCoined?: (id: string) => void;
}

function RankingList(props: RankingListProps) {
  const { works, udocs, currentUserId, onCoined } = props;
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingWork, setViewingWork] = useState<TurtleWork | null>(null);
  const [workCode, setWorkCode] = useState<string>('');
  const [loadingWork, setLoadingWork] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 复用 WorkGrid 中的 runCode 逻辑
  const runCode = async () => {
    if (!workCode || !canvasRef.current) return;
    setIsRunning(true);
    const canvasDiv = canvasRef.current;
    canvasDiv.innerHTML = '';
    try {
      if (!(window as any).Sk) {
        message.error('Skulpt 库未加载，请刷新页面重试');
        return;
      }
      const rect = canvasDiv.getBoundingClientRect();
      const canvasWidth = Math.floor(rect.width - 20);
      const canvasHeight = Math.floor(rect.height - 20);
      const runConfig: any = {
        output: (text: string) => {
          console.log('[Skulpt Output]', text);
        },
        read: (x: string) => {
          if ((window as any).Sk.builtinFiles?.files[x]) {
            return (window as any).Sk.builtinFiles.files[x];
          }
          throw new Error(`文件未找到: '${x}'`);
        },
      };
      runConfig.__future__ = (window as any).Sk.python3;
      (window as any).Sk.configure(runConfig);
      (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
      (window as any).Sk.TurtleGraphics.target = `turtle-canvas-${viewingWork?.id || 'view'}`;
      (window as any).Sk.TurtleGraphics.width = canvasWidth;
      (window as any).Sk.TurtleGraphics.height = canvasHeight;
      canvasDiv.id = (window as any).Sk.TurtleGraphics.target;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'CANVAS') {
              const htmlCanvas = node as HTMLCanvasElement;
              htmlCanvas.style.position = 'absolute';
              htmlCanvas.style.top = '0';
              htmlCanvas.style.left = '0';
              htmlCanvas.style.width = '100%';
              htmlCanvas.style.height = '100%';
              htmlCanvas.style.margin = '0';
              htmlCanvas.style.padding = '0';
              htmlCanvas.style.display = 'block';
            }
          });
        });
      });
      observer.observe(canvasDiv, { childList: true, subtree: true });
      await (window as any).Sk.misceval.asyncToPromise(() => {
        return (window as any).Sk.importMainWithBody('<stdin>', false, workCode, true);
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const canvases = canvasDiv.querySelectorAll('canvas');
          canvases.forEach((canvas) => {
            const htmlCanvas = canvas as HTMLCanvasElement;
            htmlCanvas.style.position = 'absolute';
            htmlCanvas.style.top = '0';
            htmlCanvas.style.left = '0';
            htmlCanvas.style.width = '100%';
            htmlCanvas.style.height = '100%';
            htmlCanvas.style.margin = '0';
            htmlCanvas.style.padding = '0';
            htmlCanvas.style.display = 'block';
          });
          observer.disconnect();
        });
      });
    } catch (error: any) {
      console.error('运行代码失败:', error);
      message.error(`运行失败: ${error.message || error.toString()}`);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (!viewModalVisible && canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
  }, [viewModalVisible]);

  const handleView = async (work: TurtleWork) => {
    setViewingWork(work);
    setViewModalVisible(true);
    setLoadingWork(true);
    try {
      const resp = await fetch(`/turtle/work/${work.id}`, {
        headers: { Accept: 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        setWorkCode(data.work?.code || '');
      } else {
        message.error('获取作品详情失败');
        setWorkCode(work.code || '');
      }
    } catch (error) {
      console.error('Failed to load work:', error);
      setWorkCode(work.code || '');
    } finally {
      setLoadingWork(false);
    }
  };

  const handleCoin = async (work: TurtleWork) => {
    try {
      const resp = await fetch(`/turtle/work/${work.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'coin', workId: work.id }),
      });
      const data = await resp.json();
      if (data.success) {
        onCoined?.(work.id);
        message.success(data.message || '投币成功！作品主人已获得1积分');
      } else {
        message.error(data.message || '投币失败');
      }
    } catch {
      message.error('投币请求失败');
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {works.map((work, index) => {
          const author = udocs[work.uid] || udocs[String(work.uid)];
          const rank = index + 1;
          const isTopThree = rank <= 3;
          const medalColors = ['#facc15', '#c0c0c0', '#cd7f32'];
          const medalColor = medalColors[rank - 1] || '#e5e7eb';

          return (
            <Card
              key={work.id}
              hoverable
              style={{
                border: isTopThree ? `2px solid ${medalColor}` : '1px solid #e5e7eb',
                background: isTopThree
                  ? `linear-gradient(135deg, ${medalColor}22 0%, ${medalColor}08 100%)`
                  : 'white',
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* 排名 */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isTopThree
                      ? `linear-gradient(135deg, ${medalColor} 0%, ${medalColor}cc 100%)`
                      : '#f3f4f6',
                    fontSize: isTopThree ? 24 : 18,
                    fontWeight: 700,
                    color: isTopThree ? '#fff' : '#6b7280',
                    flexShrink: 0,
                  }}
                >
                  {isTopThree ? <CrownOutlined style={{ fontSize: 24 }} /> : rank}
                </div>

                {/* 作品封面 */}
                <div
                  style={{
                    width: 120,
                    height: 80,
                    borderRadius: 8,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#f3f4f6',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleView(work)}
                >
                  {work.imageUrl ? (
                    <img
                      src={work.imageUrl}
                      alt={work.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PictureOutlined style={{ fontSize: 32, color: '#9ca3af' }} />
                    </div>
                  )}
                </div>

                {/* 作品信息 */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      maxWidth: '100%',
                      width: '100%',
                    }}
                    title={work.title}
                    onClick={() => handleView(work)}
                  >
                    {work.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      marginBottom: 8,
                    }}
                  >
                    {author ? `作者：${author.uname}` : `用户 ${work.uid}`}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarCircleOutlined />
                      {work.likes} 投币
                    </span>
                    <span style={{ fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <EyeOutlined />
                      {work.views} 浏览
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <Button size="small" onClick={() => handleView(work)}>
                    查看
                  </Button>
                  {currentUserId && currentUserId !== work.uid && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<DollarCircleOutlined />}
                      onClick={() => handleCoin(work)}
                    >
                      投币
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 查看作品弹窗 */}
      <Modal
        title={viewingWork?.title || '查看作品'}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingWork(null);
          setWorkCode('');
          setIsRunning(false);
          if (canvasRef.current) {
            canvasRef.current.innerHTML = '';
          }
        }}
        footer={[
          <Button
            key="run"
            type="primary"
            loading={isRunning}
            onClick={runCode}
            disabled={!workCode}
          >
            {isRunning ? '运行中...' : '运行代码'}
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setViewingWork(null);
              setWorkCode('');
              setIsRunning(false);
              if (canvasRef.current) {
                canvasRef.current.innerHTML = '';
              }
            }}
          >
            关闭
          </Button>,
        ]}
        width={1000}
        styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
      >
        {loadingWork ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
        ) : (
          <div>
            {/* 画布区域 */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>运行效果：</h4>
              <div
                ref={canvasRef}
                id={`turtle-canvas-${viewingWork?.id || 'view'}`}
                style={{
                  width: '100%',
                  height: '400px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              />
            </div>

            {/* 代码区域 - 只有作者才能看到代码 */}
            {workCode && currentUserId && viewingWork && currentUserId === viewingWork.uid && (
              <div>
                <h4 style={{ marginBottom: 8 }}>代码：</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    overflow: 'auto',
                    fontSize: 13,
                    lineHeight: 1.5,
                    maxHeight: '200px',
                  }}
                >
                  <code>{workCode}</code>
                </pre>
              </div>
            )}
            {workCode && (!currentUserId || !viewingWork || currentUserId !== viewingWork.uid) && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: 14 }}>
                🔒 代码已隐藏，仅作者可见
              </div>
            )}
            {!workCode && !loadingWork && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无代码内容
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
interface TaskCourseTabProps {
  tasks: TurtleTask[];
  progressMap: Record<string, TaskProgress>;
  isLoggedIn: boolean;
}

const TASK_STATUS_META: Record<TaskProgressStatus, { label: string, color: string, icon: React.ReactNode }> = {
  not_started: { label: '未开始', color: 'default', icon: <FlagOutlined /> },
  in_progress: { label: '进行中', color: 'blue', icon: <CodeOutlined /> },
  completed: { label: '已完成', color: 'green', icon: <CheckCircleOutlined /> },
};

const difficultyLabel = (difficulty: TurtleTask['difficulty']) => {
  if (difficulty === 'beginner') return '入门';
  if (difficulty === 'intermediate') return '进阶';
  return '挑战';
};

const TaskCourseTab: React.FC<TaskCourseTabProps> = ({ tasks, progressMap = {}, isLoggedIn }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="管理员尚未发布任务，敬请期待～"
      />
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {tasks.map((task) => {
        const progress = progressMap[task.id];
        const status = progress?.status || 'not_started';
        const statusMeta = TASK_STATUS_META[status];
        const primaryText = status === 'completed' ? '复习任务' : progress ? '继续任务' : '开始学习';

        return (
          <Card
            key={task.id}
            cover={
              <div
                style={{
                  width: '100%',
                  paddingTop: '56%',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: 13,
                }}
              >
                运行代码即可看到最终效果
              </div>
            }
            styles={{ body: { minHeight: 220, display: 'flex', flexDirection: 'column' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Tag color={statusMeta.color} icon={statusMeta.icon}>
                {statusMeta.label}
              </Tag>
              <Tag color={task.difficulty === 'beginner' ? 'blue' : task.difficulty === 'intermediate' ? 'orange' : 'red'}>
                {difficultyLabel(task.difficulty)}
              </Tag>
            </div>
            <h3 style={{ marginBottom: 8 }}>{task.title}</h3>
            <TaskDescription text={task.description} />
            {task.tags && task.tags.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {task.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}
            {!isLoggedIn && (
              <Alert
                style={{ marginBottom: 12 }}
                type="info"
                message="登录后可保存任务进度"
                showIcon
              />
            )}
            <Button
              type="primary"
              block
              onClick={() => {
                window.location.href = `/turtle/playground?taskId=${task.id}`;
              }}
            >
              {primaryText}
            </Button>
          </Card>
        );
      })}
    </div>
  );
};

interface GalleryData {
  works: TurtleWork[];
  popularWorks: TurtleWork[];
  myWorks: TurtleWork[];
  tasks: TurtleTask[];
  taskProgress: Record<string, TaskProgress>;
  udocs: Record<string | number, UserDoc>;
  isLoggedIn: boolean;
  isAdmin: boolean;
  currentUserId: number | null;
  page: number;
  total: number;
  totalPages: number;
}

type AllSortKey = 'latest' | 'likes' | 'views';

const TurtleGallery: React.FC<GalleryData> = ({
  works,
  popularWorks,
  myWorks,
  tasks,
  taskProgress,
  udocs,
  isLoggedIn,
  isAdmin,
  currentUserId,
  page,
  total,
  totalPages,
}) => {
  const [allWorks, setAllWorks] = useState<TurtleWork[]>(works);
  const [popularWorksList, setPopularWorksList] = useState<TurtleWork[]>(popularWorks);
  const [ownWorks, setOwnWorks] = useState<TurtleWork[]>(myWorks);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('tab') || 'all';
    } catch {
      return 'all';
    }
  });

  const [allSort, setAllSort] = useState<AllSortKey>('latest');

  const sortedAllWorks = useMemo(() => {
    const list = [...allWorks];
    if (allSort === 'likes') {
      list.sort((a, b) => b.likes - a.likes || (b.views ?? 0) - (a.views ?? 0));
    } else if (allSort === 'views') {
      list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.likes - a.likes);
    } else {
      list.sort((a, b) => {
        const at = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bt = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bt - at;
      });
    }
    return list;
  }, [allWorks, allSort]);

  const tabsItems = useMemo(() => {
    const items = [
      {
        key: 'all',
        label: (
          <>
            <GlobalOutlined style={{ marginRight: 4 }} />
            全部作品
            {total > 0 && (
              <Tag style={{ marginLeft: 8 }} color="default">
                {total}
              </Tag>
            )}
          </>
        ),
        children:
          sortedAllWorks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前还没有公开作品，快来成为第一个分享作品的人吧～"
            />
          ) : (
            <>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>排序：</span>
                <Space size={4}>
                  <Button
                    size="small"
                    type={allSort === 'latest' ? 'primary' : 'default'}
                    onClick={() => setAllSort('latest')}
                  >
                    最新更新
                  </Button>
                  <Button
                    size="small"
                    type={allSort === 'likes' ? 'primary' : 'default'}
                    onClick={() => setAllSort('likes')}
                  >
                    投币最多
                  </Button>
                  <Button
                    size="small"
                    type={allSort === 'views' ? 'primary' : 'default'}
                    onClick={() => setAllSort('views')}
                  >
                    浏览最多
                  </Button>
                </Space>
              </div>
              <WorkGrid
                works={sortedAllWorks}
                udocs={udocs}
                currentUserId={currentUserId}
                onCoined={(id) => {
                  setAllWorks((list) =>
                    list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                  );
                  setPopularWorksList((list) =>
                    list
                      .map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w))
                      .sort((a, b) => b.likes - a.likes),
                  );
                  setOwnWorks((list) =>
                    list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                  );
                }}
              />
            </>
          ),
      },
      {
        key: 'popular',
        label: (
          <>
            <TrophyOutlined style={{ marginRight: 4 }} />
            投币榜
            {popularWorksList.length > 0 && (
              <Tag style={{ marginLeft: 8 }} color="gold">
                TOP {popularWorksList.length}
              </Tag>
            )}
          </>
        ),
        children:
          popularWorksList.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前还没有作品获得投币，快来成为第一个获得投币的作品吧～"
            />
          ) : (
            <RankingList
              works={popularWorksList}
              udocs={udocs}
              currentUserId={currentUserId}
              onCoined={(id) => {
                setPopularWorksList((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)).sort((a, b) => b.likes - a.likes),
                );
                setAllWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
                setOwnWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
              }}
            />
          ),
      },
      {
        key: 'course',
        label: (
          <>
            <ReadOutlined style={{ marginRight: 4 }} />
            课程任务
          </>
        ),
        children: (
          <TaskCourseTab
            tasks={tasks}
            progressMap={taskProgress || {}}
            isLoggedIn={isLoggedIn}
          />
        ),
      },
    ];

    if (isLoggedIn) {
      items.push({
        key: 'my',
        label: (
          <>
            <FolderOpenOutlined style={{ marginRight: 4 }} />
            我的作品
            {ownWorks.length > 0 && (
              <Tag style={{ marginLeft: 8 }} color="blue">
                {ownWorks.length}
              </Tag>
            )}
          </>
        ),
        children:
          ownWorks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="你还没有创作任何作品，点击右上角「新建作品」来开始吧～"
            />
          ) : (
            <WorkGrid
              works={ownWorks}
              udocs={udocs}
              isOwn
              onDeleted={(id) => {
                setOwnWorks((list) => list.filter((w) => w.id !== id));
                setAllWorks((list) => list.filter((w) => w.id !== id));
              }}
              onCoined={(id) => {
                setOwnWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
                setAllWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
                setPopularWorksList((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)).sort((a, b) => b.likes - a.likes),
                );
              }}
            />
          ),
      });
    }

    return items;
  }, [
    isLoggedIn,
    ownWorks,
    allWorks,
    popularWorksList,
    total,
    udocs,
    currentUserId,
    tasks,
    taskProgress,
    allSort,
    sortedAllWorks,
  ]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // ignore
      }
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            <CodeOutlined style={{ marginRight: 8 }} />
            Python Turtle 作品社区
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            创作、分享、浏览同学们的海龟绘图作品。
          </p>
        </div>
        {isLoggedIn && (
          <Space>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                window.location.href = '/turtle/playground';
              }}
            >
              新建作品
            </Button>
            <Button
              size="large"
              onClick={() => {
                Modal.info({
                  title: 'Python Turtle 常用指令速查',
                  width: 720,
                  content: (
                    <div style={{ maxHeight: 480, overflow: 'auto', paddingTop: 8 }}>
                      <p style={{ marginBottom: 8, color: '#4b5563' }}>
                        下面是常用的 Turtle 指令，直接在编辑器中输入使用：
                      </p>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={{ borderBottom: '1px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' }}>
                              指令
                            </th>
                            <th style={{ borderBottom: '1px solid #e5e7eb', padding: '4px 8px', textAlign: 'left' }}>
                              说明
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.forward(100)</td>
                            <td style={{ padding: '4px 8px' }}>向前移动 100 像素</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.backward(100)</td>
                            <td style={{ padding: '4px 8px' }}>向后移动 100 像素</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.left(90)</td>
                            <td style={{ padding: '4px 8px' }}>左转 90 度</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.right(90)</td>
                            <td style={{ padding: '4px 8px' }}>右转 90 度</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.circle(50)</td>
                            <td style={{ padding: '4px 8px' }}>画半径为 50 的圆</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.penup()</td>
                            <td style={{ padding: '4px 8px' }}>抬笔（移动但不画线）</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.pendown()</td>
                            <td style={{ padding: '4px 8px' }}>落笔（开始画线）</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.goto(x, y)</td>
                            <td style={{ padding: '4px 8px' }}>移动到坐标 (x, y)</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.color('red')</td>
                            <td style={{ padding: '4px 8px' }}>设置画笔颜色为红色</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.pensize(3)</td>
                            <td style={{ padding: '4px 8px' }}>设置画笔粗细为 3 像素</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>t.speed(0~10)</td>
                            <td style={{ padding: '4px 8px' }}>设置绘制速度，0 为最快</td>
                          </tr>
                        </tbody>
                      </table>
                      <p style={{ marginTop: 12, color: '#6b7280' }}>更多指令可以在课堂上按需补充给学生。</p>
                    </div>
                  ),
                  okText: '我知道了',
                });
              }}
            >
              Turtle 指令速查
            </Button>
            {isAdmin && (
              <Button
                size="large"
                onClick={() => {
                  window.location.href = '/turtle/course-admin';
                }}
              >
                任务管理
              </Button>
            )}
          </Space>
        )}
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabsItems}
        />
      </Card>

      {totalPages > 1 && (
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              size="small"
              type={p === page ? 'primary' : 'default'}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('page', String(p));
                window.location.href = url.toString();
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

// 注册页面
addPage(
  new NamedPage(['turtle_gallery'], async () => {
    const mountPoint = document.getElementById('turtle-gallery-app');
    const dataElement = document.getElementById('turtle-gallery-data');
    if (!mountPoint || !dataElement) return;
    try {
      const data: GalleryData = JSON.parse(dataElement.textContent || '{}');
      const root = createRoot(mountPoint);
      root.render(<TurtleGallery {...data} />);
    } catch (e) {
      console.error('[TurtleGallery] Failed to init React page', e);
    }
  }),
);
