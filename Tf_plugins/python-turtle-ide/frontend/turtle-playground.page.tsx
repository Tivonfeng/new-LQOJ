/* eslint-disable react-refresh/only-export-components */
import './turtle-playground.page.css';

import { addPage, loadMonaco, NamedPage } from '@hydrooj/ui-default';
import type * as monaco from 'monaco-editor';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface TurtleData {
  work: any | null;
  userWorks: any[];
  isLoggedIn: boolean;
  currentUserId: number | null;
  currentUserName: string | null;
  task: TurtleTask | null;
  taskProgress: TaskProgress | null;
}

type TaskProgressStatus = 'not_started' | 'in_progress' | 'completed';

interface TurtleTask {
  id?: string;
  title: string;
  description: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  starterCode?: string;
  hint?: string;
}

interface TaskProgress {
  status: TaskProgressStatus;
  lastCode?: string;
  updatedAt?: string;
  completedAt?: string;
  bestWorkId?: string;
}

const TASK_STATUS_LABELS: Record<TaskProgressStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
};

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

const DEFAULT_CODE = '';

// Skulpt 初始化和执行函数
function initSkulpt(canvasDiv: HTMLDivElement, onOutput: (text: string) => void) {
  console.log('[Skulpt] Initializing Skulpt with canvas div:', canvasDiv);
  console.log('[Skulpt] Sk available:', !!(window as any).Sk);
  console.log('[Skulpt] Sk.builtinFiles available:', !!(window as any).Sk?.builtinFiles);

  const skConfig: any = {
    output: onOutput,
    read: (x: string) => {
      if ((window as any).Sk.builtinFiles?.files[x]) {
        return (window as any).Sk.builtinFiles.files[x];
      }
      throw new Error(`File not found: '${x}'`);
    },
  };
  skConfig.__future__ = (window as any).Sk.python3;
  (window as any).Sk.configure(skConfig);
  (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
  (window as any).Sk.TurtleGraphics.target = canvasDiv.id; // 使用ID字符串
  console.log('[Skulpt] TurtleGraphics.target set:', (window as any).Sk.TurtleGraphics.target);
}

async function runPythonCode(code: string, onOutput: (text: string) => void) {
  console.log('[Skulpt] Running Python code, length:', code.length);
  (window as any).Sk.configure({ output: onOutput });

  await (window as any).Sk.misceval.asyncToPromise(() => {
    return (window as any).Sk.importMainWithBody('<stdin>', false, code, true);
  });
  console.log('[Skulpt] Code execution completed');
}

const TurtlePlayground: React.FC<TurtleData> = ({
  work,
  userWorks = [],
  isLoggedIn,
  currentUserName,
  task,
  taskProgress,
}) => {
  // 生成默认标题：学生姓名+日期
  const generateDefaultTitle = () => {
    if (!currentUserName) return '未命名';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return `${currentUserName}-${dateStr}`;
  };

  const taskId = task?.id || null;
  const initialCode = work?.code || taskProgress?.lastCode || task?.starterCode || DEFAULT_CODE;
  const [code, setCode] = useState(initialCode);
  const [consoleOutput, setConsoleOutput] = useState('>>> 准备就绪\n');
  const [isRunning, setIsRunning] = useState(false);
  const [currentWorkId, setCurrentWorkId] = useState(work?._id || null);
  const [workTitle, setWorkTitle] = useState(
    work?.title || (task ? `${task.title}-${generateDefaultTitle()}` : generateDefaultTitle()),
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentTaskProgress, setCurrentTaskProgress] = useState<TaskProgress | null>(
    taskProgress || (task ? { status: 'not_started' } : null),
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const taskStatus = currentTaskProgress?.status || (task ? 'not_started' : null);
  const taskDescriptionHtml = useHydroMarkdown(task?.description);
  const taskHintHtml = useHydroMarkdown(task?.hint);

  const describeTaskStatus = (status: TaskProgressStatus | null) => {
    if (!status) return '';
    return TASK_STATUS_LABELS[status];
  };

  const describeDifficulty = (difficulty?: TurtleTask['difficulty']) => {
    if (difficulty === 'beginner') return '入门';
    if (difficulty === 'intermediate') return '进阶';
    if (difficulty === 'advanced') return '挑战';
    return '未知';
  };

  // 初始化 Monaco Editor
  useEffect(() => {
    const initMonaco = async () => {
      if (!editorRef.current) return;

      try {
        console.log('[Monaco] Starting initialization...');
        // 使用从@hydrooj/ui-default导出的loadMonaco
        const { monaco: monacoInstance } = await loadMonaco();
        console.log('[Monaco] Monaco loaded successfully');

        // 创建Monaco model
        const model = monacoInstance.editor.createModel(code, 'python');
        console.log('[Monaco] Model created');

        // 注册Python代码补全
        // Note: insertText 中的 ${} 是 Monaco snippet 占位符语法，不是模板字符串
        monacoInstance.languages.registerCompletionItemProvider('python', {
          provideCompletionItems: (textModel, position) => {
            // 获取当前单词的range
            const word = textModel.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions: monaco.languages.CompletionItem[] = [
              // Turtle 基础命令
              {
                label: 'forward',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'forward(${1:100})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '向前移动指定距离',
                range,
              },
              {
                label: 'backward',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'backward(${1:100})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '向后移动指定距离',
                range,
              },
              {
                label: 'left',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'left(${1:90})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '向左转指定角度',
                range,
              },
              {
                label: 'right',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'right(${1:90})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '向右转指定角度',
                range,
              },
              {
                label: 'circle',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'circle(${1:100})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '绘制圆形',
                range,
              },
              {
                label: 'penup',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                insertText: 'penup()',
                documentation: '抬起画笔',
                range,
              },
              {
                label: 'pendown',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                insertText: 'pendown()',
                documentation: '放下画笔',
                range,
              },
              {
                label: 'goto',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'goto(${1:0}, ${2:0})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '移动到指定坐标',
                range,
              },
              {
                label: 'color',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'color(\'${1:red}\')',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '设置画笔颜色',
                range,
              },
              {
                label: 'pensize',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'pensize(${1:3})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '设置画笔粗细',
                range,
              },
              {
                label: 'speed',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'speed(${1:5})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '设置绘制速度 (0-10)',
                range,
              },
              // Python 基础
              {
                label: 'for',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                // eslint-disable-next-line
                insertText: 'for ${1:i} in range(${2:10}):\n    ${3:pass}',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'for 循环',
                range,
              },
              {
                label: 'if',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                // eslint-disable-next-line
                insertText: 'if ${1:condition}:\n    ${2:pass}',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'if 条件语句',
                range,
              },
              {
                label: 'range',
                kind: monacoInstance.languages.CompletionItemKind.Function,
                // eslint-disable-next-line
                insertText: 'range(${1:10})',
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: '生成数字序列',
                range,
              },
            ];
            return { suggestions };
          },
        });

        // 创建Monaco editor
        const editor = monacoInstance.editor.create(editorRef.current, {
          model,
          theme: 'vs',
          fontSize: 14,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 4,
          // 启用代码补全相关功能
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
        });
        console.log('[Monaco] Editor created');

        monacoEditorRef.current = editor;

        // 监听代码变化
        editor.onDidChangeModelContent(() => {
          setCode(editor.getValue());
        });

        console.log('[Monaco] Editor initialized successfully');
      } catch (error) {
        console.error('[Monaco] Failed to initialize:', error);
      }
    };

    initMonaco();

    // 清理函数
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []);

  // 初始化 Skulpt
  useEffect(() => {
    console.log('[TurtlePlayground] useEffect - initializing');
    console.log('[TurtlePlayground] canvasRef.current:', canvasRef.current);
    console.log('[TurtlePlayground] Sk available:', !!(window as any).Sk);
    console.log('[TurtlePlayground] Component mounted');

    if (canvasRef.current && (window as any).Sk) {
      console.log('[TurtlePlayground] Calling initSkulpt');
      initSkulpt(canvasRef.current, (text: string) => {
        console.log('[Skulpt Output]', text);
        setConsoleOutput((prev) => prev + text);
      });
    } else {
      console.error('[TurtlePlayground] Cannot initialize: canvas or Sk missing');
    }
  }, []);

  // 运行代码
  const handleRun = useCallback(async () => {
    const canvasDiv = canvasRef.current;
    if (!canvasDiv) {
      setConsoleOutput((prev) => `${prev}[错误] 画布容器未找到\n`);
      return;
    }

    setIsRunning(true);
    setConsoleOutput('>>> 正在运行...\n');

    // 清空div内容（Skulpt会在里面创建canvas）
    canvasDiv.innerHTML = '';

    try {
      // 重新初始化Skulpt和Turtle图形目标
      if ((window as any).Sk) {
        // 重要：Skulpt的Turtle需要特定的配置方式
        const runConfig: any = {
          output: (text: string) => {
            setConsoleOutput((prev) => prev + text);
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

        // 设置Turtle图形配置
        (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
        (window as any).Sk.TurtleGraphics.target = 'turtle-canvas';
        (window as any).Sk.TurtleGraphics.width = 500;
        (window as any).Sk.TurtleGraphics.height = 350;
      }

      await runPythonCode(code, (text) => {
        setConsoleOutput((prev) => prev + text);
      });

      setConsoleOutput((prev) => `${prev}\n>>> 运行完成\n`);
    } catch (err: any) {
      setConsoleOutput((prev) => `${prev}\n❌ 错误: ${err.toString()}\n`);
    }

    setIsRunning(false);
  }, [code]);

  // 清空画布
  const handleClear = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.innerHTML = '';
    setConsoleOutput('>>> 画布已清空\n');
  }, []);

  const handleSaveTaskProgress = useCallback(
    async (nextStatus: TaskProgressStatus = 'in_progress') => {
      if (!task || !taskId) return;
      if (!isLoggedIn) {
        setConsoleOutput((prev) => `${prev}\n⚠️ 登录后才能保存任务进度\n`);
        return;
      }

      try {
        const response = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'taskProgress',
            taskId,
            status: nextStatus,
            code,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setCurrentTaskProgress(result.progress);
          setConsoleOutput((prev) => `${prev}\n>>> 任务进度已保存（${TASK_STATUS_LABELS[nextStatus]}）\n`);
        } else {
          setConsoleOutput((prev) => `${prev}\n⚠️ 保存任务进度失败: ${result.message}\n`);
        }
      } catch (error) {
        setConsoleOutput(
          (prev) => `${prev}\n⚠️ 保存任务进度失败: ${error instanceof Error ? error.message : error}\n`,
        );
      }
    },
    [task, taskId, isLoggedIn, code],
  );

  // 保存作品
  const handleSave = useCallback(async () => {
    if (!isLoggedIn) {
      setConsoleOutput((prev) => `${prev}\n⚠️ 请先登录\n`);
      setShowSaveDialog(false);
      return;
    }

    // 捕获画布截图（从div中找到canvas元素）
    // 如果有多个canvas，合并它们
    const canvasDiv = canvasRef.current;
    if (!canvasDiv) {
      setConsoleOutput((prev) => `${prev}\n⚠️ 画布容器未找到\n`);
      return;
    }

    const allCanvases = canvasDiv.querySelectorAll('canvas');
    let imageUrl = '';

    if (allCanvases.length === 0) {
      setConsoleOutput((prev) => `${prev}\n⚠️ 未找到画布，请先运行代码\n`);
      return;
    }

    try {
      if (allCanvases.length > 1) {
        // 如果有多个canvas，合并它们
        const firstCanvas = allCanvases[0] as HTMLCanvasElement;
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = firstCanvas.width;
        mergedCanvas.height = firstCanvas.height;
        const mergedCtx = mergedCanvas.getContext('2d')!;

        // 白色背景
        mergedCtx.fillStyle = 'white';
        mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

        // 绘制所有canvas层
        allCanvases.forEach((canvas) => {
          mergedCtx.drawImage(canvas as HTMLCanvasElement, 0, 0);
        });

        imageUrl = mergedCanvas.toDataURL('image/png');
      } else {
        // 只有一个canvas，直接使用
        const canvas = allCanvases[0] as HTMLCanvasElement;
        imageUrl = canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.error('[Save] Failed to capture canvas:', error);
      setConsoleOutput((prev) => `${prev}\n⚠️ 截图失败，将保存不带封面的作品\n`);
    }

    const response = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        workId: currentWorkId,
        title: workTitle,
        code,
        description: '',
        isPublic: true,
        imageUrl,
        taskId,
      }),
    });

    const result = await response.json();
    if (result.success) {
      setCurrentWorkId(result.workId);
      setConsoleOutput((prev) => `${prev}\n✅ 作品保存成功！\n`);
      setShowSaveDialog(false);
      if (task) {
        handleSaveTaskProgress('completed');
      }
    } else {
      setConsoleOutput((prev) => `${prev}\n❌ 保存失败: ${result.message}\n`);
      setShowSaveDialog(false);
    }
  }, [isLoggedIn, code, workTitle, currentWorkId, task, taskId, handleSaveTaskProgress]);

  useEffect(() => {
    console.log('[TurtlePlayground] Component rendered');
    console.log('[TurtlePlayground] User works:', userWorks?.length);
  }, [userWorks]);

  return (
        <>
            {task && (
                <div className="task-panel">
                    <div className="task-panel-header">
                        <span className={`task-status ${taskStatus || 'not_started'}`}>
                            {describeTaskStatus(taskStatus)}
                        </span>
                        <span className="task-tag">{describeDifficulty(task.difficulty)}</span>
                    </div>
                    <h2>{task.title}</h2>
                    {task.tags && task.tags.length > 0 && (
                        <div className="task-tags">
                            {task.tags.map((tag) => (
                                <span key={tag} className="task-tag">{tag}</span>
                            ))}
                        </div>
                    )}
                    <div
                        style={{ marginBottom: 8 }}
                        dangerouslySetInnerHTML={{ __html: taskDescriptionHtml }}
                    />
                    {task.hint && (
                        <details style={{ marginBottom: 12 }}>
                            <summary style={{ cursor: 'pointer', color: 'var(--primary-dark)' }}>查看任务提示</summary>
                            <div
                                style={{ marginTop: 8 }}
                                dangerouslySetInnerHTML={{ __html: taskHintHtml }}
                            />
                        </details>
                    )}
                    <div className="task-panel-actions">
                        {isLoggedIn ? (
                            <>
                                <button
                                    className="btn-task-save"
                                    onClick={() => handleSaveTaskProgress('in_progress')}
                                >
                                    保存任务进度
                                </button>
                                <button
                                    className="btn-task-complete"
                                    onClick={() => handleSaveTaskProgress('completed')}
                                >
                                    标记完成
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn-task-save"
                                onClick={() => {
                                  window.location.href = '/login';
                                }}
                            >
                                登录后保存进度
                            </button>
                        )}
                        <button
                            className="btn-task-back"
                            onClick={() => {
                              window.location.href = '/turtle/gallery?tab=course';
                            }}
                        >
                            返回课程
                        </button>
                    </div>
                </div>
            )}
            {/* 主内容区 */}
            <div className="main-content">
                {/* 编辑器区域 */}
                <div className="editor-section">
                    <div className="code-editor">
                        <div ref={editorRef} className="monaco-editor-container" />
                    </div>
                    <div className="console">
                        {consoleOutput}
                    </div>
                </div>

                {/* 画布区域 */}
                <div className="canvas-section">
                    {/* 画布工具栏 */}
                    <div className="canvas-header">
                        <div className="canvas-toolbar">
                            <button
                                className="btn-run"
                                onClick={() => {
                                  console.log('[Button] Run button clicked!');
                                  handleRun();
                                }}
                                disabled={isRunning}
                            >
                                {isRunning ? '⏸ 运行中...' : '▶ 运行'}
                            </button>
                            <button
                                className="btn-clear"
                                onClick={() => {
                                  console.log('[Button] Clear button clicked!');
                                  handleClear();
                                }}
                            >
                                🗑 清空
                            </button>
                            {isLoggedIn && (
                                <button
                                    className="btn-save"
                                    onClick={() => {
                                      console.log('[Button] Save button clicked!');
                                      setShowSaveDialog(true);
                                    }}
                                >
                                    💾 保存
                                </button>
                            )}
                            <button
                                className="btn-download"
                                onClick={() => {
                                  const canvasDiv = canvasRef.current;
                                  if (!canvasDiv) {
                                    setConsoleOutput((prev) => `${prev}\n⚠️ 画布容器未找到\n`);
                                    return;
                                  }

                                  // Skulpt可能创建多个canvas，找到所有的
                                  const allCanvases = canvasDiv.querySelectorAll('canvas');

                                  if (allCanvases.length === 0) {
                                    setConsoleOutput((prev) => `${prev}\n⚠️ 未找到画布，请先运行代码\n`);
                                    return;
                                  }

                                  try {
                                    // 如果有多个canvas，需要合并它们
                                    if (allCanvases.length > 1) {
                                      // 创建一个新的canvas来合并所有层
                                      const mergedCanvas = document.createElement('canvas');
                                      const firstCanvas = allCanvases[0] as HTMLCanvasElement;
                                      mergedCanvas.width = firstCanvas.width;
                                      mergedCanvas.height = firstCanvas.height;
                                      const mergedCtx = mergedCanvas.getContext('2d')!;

                                      // 白色背景
                                      mergedCtx.fillStyle = 'white';
                                      mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

                                      // 绘制所有canvas层
                                      allCanvases.forEach((canvas) => {
                                        mergedCtx.drawImage(canvas as HTMLCanvasElement, 0, 0);
                                      });

                                      // 下载合并后的图像
                                      const link = document.createElement('a');
                                      link.download = `海龟绘图-${Date.now()}.png`;
                                      link.href = mergedCanvas.toDataURL('image/png');
                                      link.click();
                                    } else {
                                      // 只有一个canvas，直接下载
                                      const canvas = allCanvases[0] as HTMLCanvasElement;
                                      const link = document.createElement('a');
                                      link.download = `海龟绘图-${Date.now()}.png`;
                                      link.href = canvas.toDataURL('image/png');
                                      link.click();
                                    }

                                    setConsoleOutput((prev) => `${prev}\n✅ 图片下载成功！\n`);
                                  } catch (error) {
                                    setConsoleOutput((prev) => `${prev}\n❌ 下载失败: ${error}\n`);
                                  }
                                }}
                            >
                                📥 下载图片
                            </button>
                            <button
                                className="btn-back-gallery"
                                onClick={() => {
                                  window.location.href = '/turtle/gallery';
                                }}
                            >
                                🏠 返回社区
                            </button>
                        </div>
                    </div>
                    <div
                        ref={canvasRef}
                        id="turtle-canvas"
                    />
                </div>
            </div>

            {/* 保存对话框 */}
            {showSaveDialog && (
                <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>保存作品</h2>
                        <input
                            type="text"
                            value={workTitle}
                            onChange={(e) => setWorkTitle(e.target.value)}
                            placeholder="作品标题"
                            className="modal-input"
                        />
                        <div className="modal-actions">
                            <button onClick={handleSave} className="btn-confirm">保存</button>
                            <button onClick={() => setShowSaveDialog(false)} className="btn-cancel">取消</button>
                        </div>
                    </div>
                </div>
            )}
        </>
  );
};

// 注册页面
addPage(
  new NamedPage(['turtle_playground'], async () => {
    console.log('[Turtle Playground] React page script loaded');
    console.log('[Turtle Playground] Document ready state:', document.readyState);

    // 等待 DOM 完全加载
    if (document.readyState === 'loading') {
      console.log('[Turtle Playground] Waiting for DOMContentLoaded');
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }

    console.log('[Turtle Playground] DOM ready');

    // 检查Skulpt是否加载
    console.log('[Turtle Playground] Skulpt (Sk) loaded:', !!(window as any).Sk);
    console.log('[Turtle Playground] Skulpt.builtinFiles loaded:', !!(window as any).Sk?.builtinFiles);
    console.log('[Turtle Playground] Skulpt.TurtleGraphics loaded:', !!(window as any).Sk?.TurtleGraphics);

    // 获取挂载点和数据
    const mountPoint = document.getElementById('turtle-playground-app');
    const dataElement = document.getElementById('turtle-data');

    console.log('[Turtle Playground] Mount point found:', !!mountPoint);
    console.log('[Turtle Playground] Mount point element:', mountPoint);
    console.log('[Turtle Playground] Data element found:', !!dataElement);

    if (mountPoint && dataElement) {
      try {
        const data: TurtleData = JSON.parse(dataElement.textContent || '{}');
        console.log('[Turtle Playground] Data loaded:', data);
        console.log('[Turtle Playground] User works count:', data.userWorks?.length);

        const root = createRoot(mountPoint);
        root.render(<TurtlePlayground {...data} />);
        console.log('[Turtle Playground] React app rendered successfully');
      } catch (error) {
        console.error('[Turtle Playground] Failed to render React app:', error);
      }
    } else {
      console.error('[Turtle Playground] Mount point or data element not found');
      console.error('[Turtle Playground] Available elements:', {
        body: document.body,
        allDivs: document.querySelectorAll('div'),
      });
    }
  }),
);
