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
  answerCode?: string;
}

interface TaskProgress {
  status: TaskProgressStatus;
  lastCode?: string;
  updatedAt?: string;
  completedAt?: string;
  bestWorkId?: string;
}

interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  theme: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  minimap: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  renderLineHighlight: 'none' | 'gutter' | 'line' | 'all';
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
      return undefined;
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

// 清理不可见字符与统一换行，解决 Windows CRLF / BOM / 零宽字符导致的光标偏移问题
function sanitizeCode(s?: string | null): string {
  if (!s) return '';
  return String(s).replace(/\uFEFF/g, '').replace(/\u200B/g, '').replace(/\r\n/g, '\n');
}

// 检查 Skulpt 是否可用
function isSkulptAvailable(): boolean {
  // 首先检查全局加载状态
  if (typeof (window as any).checkSkulptLoaded === 'function') {
    if (!(window as any).checkSkulptLoaded()) {
      return false;
    }
  }

  // 然后检查 Sk 对象是否完整
  return !!(window as any).Sk &&
         typeof (window as any).Sk.configure === 'function' &&
         typeof (window as any).Sk.misceval === 'object' &&
         typeof (window as any).Sk.misceval.asyncToPromise === 'function';
}

// Skulpt 初始化和执行函数
function initSkulpt(canvasDiv: HTMLDivElement, onOutput: (text: string) => void) {
  console.log('[Skulpt] Initializing Skulpt with canvas div:', canvasDiv);
  console.log('[Skulpt] Sk available:', isSkulptAvailable());
  console.log('[Skulpt] Sk object:', (window as any).Sk);

  if (!isSkulptAvailable()) {
    throw new Error('Skulpt 库未正确加载，请刷新页面重试');
  }

  const skConfig: any = {
    output: onOutput,
    read: (x: string) => {
      if ((window as any).Sk.builtinFiles?.files[x]) {
        return (window as any).Sk.builtinFiles.files[x];
      }
      throw new Error(`File not found: '${x}'`);
    },
  };

  if ((window as any).Sk.python3) {
    skConfig.__future__ = (window as any).Sk.python3;
  }

  (window as any).Sk.configure(skConfig);
  (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
  (window as any).Sk.TurtleGraphics.target = canvasDiv.id; // 使用ID字符串
  console.log('[Skulpt] TurtleGraphics.target set:', (window as any).Sk.TurtleGraphics.target);
}

async function runPythonCode(code: string, onOutput: (text: string) => void) {
  console.log('[Skulpt] Running Python code, length:', code.length);

  if (!isSkulptAvailable()) {
    throw new Error('Skulpt 库不可用，请刷新页面重试');
  }

  (window as any).Sk.configure({ output: onOutput });

  await (window as any).Sk.misceval.asyncToPromise(() => {
    return (window as any).Sk.importMainWithBody('<stdin>', false, code, true);
  });
  console.log('[Skulpt] Code execution completed');
}

const TurtlePlayground: React.FC<TurtleData> = ({
  work,
  userWorks: _userWorks = [],
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

  // 自动保存的 localStorage key
  const AUTO_SAVE_KEY = 'turtle-editor-autosave-code';
  const AUTO_SAVE_TIMESTAMP_KEY = 'turtle-editor-autosave-timestamp';

  // 加载代码：优先级 work?.code > taskProgress?.lastCode > localStorage > DEFAULT_CODE
  const loadInitialCode = (): string => {
    // 如果有保存的作品或任务进度，优先使用
    if (work?.code) return work.code;
    if (taskProgress?.lastCode) return taskProgress.lastCode;
    // 否则尝试从 localStorage 恢复
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const timestamp = localStorage.getItem(AUTO_SAVE_TIMESTAMP_KEY);
        if (timestamp) {
          const savedTime = new Date(timestamp);
          const now = new Date();
          // 只恢复24小时内的自动保存
          if (now.getTime() - savedTime.getTime() < 24 * 60 * 60 * 1000) {
            return saved;
          }
        }
      }
    } catch (error) {
      console.error('[AutoSave] Failed to load from localStorage:', error);
    }
    return DEFAULT_CODE;
  };

  const initialCode = loadInitialCode();
  // 对初始内容进行 sanitize，避免不同平台换行或隐形字符带来差异
  const sanitizedInitialCode = sanitizeCode(initialCode);
  const [code, setCode] = useState(sanitizedInitialCode);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
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
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [skulptStatus, setSkulptStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const taskStatus = currentTaskProgress?.status || (task ? 'not_started' : null);
  const taskDescriptionHtml = useHydroMarkdown(task?.description);

  // 编辑器设置 - 从 localStorage 读取或使用默认值
  const getDefaultEditorSettings = (): EditorSettings => ({
    fontSize: 14,
    fontFamily: '"Fira Code", Consolas, monospace',
    theme: 'vs',
    tabSize: 4,
    wordWrap: 'on',
    lineNumbers: 'on',
    minimap: false,
    renderWhitespace: 'none',
    renderLineHighlight: 'line',
  });

  const loadEditorSettings = (): EditorSettings => {
    try {
      const saved = localStorage.getItem('turtle-editor-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...getDefaultEditorSettings(), ...parsed };
      }
    } catch (error) {
      console.error('[Editor Settings] Failed to load settings:', error);
    }
    return getDefaultEditorSettings();
  };

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(loadEditorSettings());

  const saveEditorSettings = useCallback((settings: EditorSettings) => {
    try {
      localStorage.setItem('turtle-editor-settings', JSON.stringify(settings));
      setEditorSettings(settings);
      // 应用设置到编辑器
      if (monacoEditorRef.current) {
        monacoEditorRef.current.updateOptions({
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          lineNumbers: settings.lineNumbers,
          minimap: { enabled: settings.minimap },
          renderWhitespace: settings.renderWhitespace,
          renderLineHighlight: settings.renderLineHighlight,
        });
        // 应用主题 - 需要等待 Monaco 加载完成
        loadMonaco().then(({ monaco: monacoInstance }) => {
          monacoInstance.editor.setTheme(settings.theme);
        }).catch((error) => {
          console.error('[Editor Settings] Failed to set theme:', error);
        });
      }
    } catch (error) {
      console.error('[Editor Settings] Failed to save settings:', error);
    }
  }, []);

  // 性能优化：控制台输出批量更新
  const consoleOutputBufferRef = useRef<string>('>>> 准备就绪\n');
  const consoleUpdateTimerRef = useRef<number | null>(null);
  const MAX_CONSOLE_LENGTH = 50000; // 限制控制台输出最大长度

  // 批量更新控制台输出，减少重渲染
  const appendConsoleOutput = useCallback((text: string) => {
    consoleOutputBufferRef.current += text;
    // 限制输出长度，防止内存泄漏
    if (consoleOutputBufferRef.current.length > MAX_CONSOLE_LENGTH) {
      const keepLength = MAX_CONSOLE_LENGTH * 0.7; // 保留70%
      consoleOutputBufferRef.current =
        `>>> [输出已截断，保留最近内容]\n${consoleOutputBufferRef.current.slice(-keepLength)}`;
    }

    // 使用防抖批量更新，每100ms更新一次
    if (consoleUpdateTimerRef.current !== null) {
      clearTimeout(consoleUpdateTimerRef.current);
    }
    consoleUpdateTimerRef.current = window.setTimeout(() => {
      setConsoleOutput(consoleOutputBufferRef.current);
      consoleUpdateTimerRef.current = null;
    }, 100);
  }, []);

  // 立即更新控制台（用于重要消息）
  const setConsoleOutputImmediate = useCallback((text: string) => {
    consoleOutputBufferRef.current = text;
    if (consoleUpdateTimerRef.current !== null) {
      clearTimeout(consoleUpdateTimerRef.current);
      consoleUpdateTimerRef.current = null;
    }
    setConsoleOutput(text);
  }, []);

  // 自动保存代码到 localStorage
  const lastSaveTimeRef = useRef<number>(0);
  const MIN_SAVE_INTERVAL = 5000; // 最小保存间隔：5秒

  const autoSaveCode = useCallback((codeToSave: string) => {
    // 在保存前 sanitize，确保存入的内容在各平台一致
    const sanitizedToSave = sanitizeCode(codeToSave);
    // 如果代码为空，不保存
    if (!sanitizedToSave || sanitizedToSave.trim() === '') {
      return;
    }

    // 清除之前的定时器
    if (autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 防抖保存：3秒后保存（增加防抖时间，减少提示频率）
    autoSaveTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      // 如果距离上次保存时间太短，不显示提示
      if (now - lastSaveTimeRef.current < MIN_SAVE_INTERVAL) {
        // 静默保存，不显示提示
        try {
          localStorage.setItem(AUTO_SAVE_KEY, sanitizedToSave);
          localStorage.setItem(AUTO_SAVE_TIMESTAMP_KEY, new Date().toISOString());
        } catch (error) {
          console.error('[AutoSave] Failed to save code:', error);
        }
        autoSaveTimerRef.current = null;
        return;
      }

      try {
        localStorage.setItem(AUTO_SAVE_KEY, sanitizedToSave);
        localStorage.setItem(AUTO_SAVE_TIMESTAMP_KEY, new Date().toISOString());
        lastSaveTimeRef.current = now;
        // 只在真正保存成功时显示提示，不显示"保存中"
        setAutoSaveStatus('saved');
        // 1.5秒后隐藏保存状态（缩短显示时间）
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 1500);
      } catch (error) {
        console.error('[AutoSave] Failed to save code:', error);
        setAutoSaveStatus(null);
      }
      autoSaveTimerRef.current = null;
    }, 3000); // 从1秒增加到3秒
  }, []);

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
        // 使用 sanitize 过的内容创建 model，避免平台差异（CRLF/BOM/零宽空格）
        const sanitizedForModel = sanitizeCode(code || sanitizedInitialCode);
        const model = monacoInstance.editor.createModel(sanitizedForModel, 'python');
        console.log('[Monaco] Model created');
        // Windows 平台调试输出尾部字符的编码，便于排查光标偏移问题
        try {
          if (typeof navigator !== 'undefined' && navigator.platform && navigator.platform.indexOf('Win') !== -1) {
            const tail = sanitizedForModel.slice(-10);
            console.log('[Monaco] tail chars', JSON.stringify(tail));
            console.log('[Monaco] tail char codes', Array.from(tail).map((c) => c.charCodeAt(0)));
          }
        } catch (e) {
          /* ignore debug errors */
        }

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

        // 创建Monaco editor - 使用保存的设置
        const savedSettings = (() => {
          try {
            const saved = localStorage.getItem('turtle-editor-settings');
            if (saved) {
              const parsed = JSON.parse(saved);
              return { ...getDefaultEditorSettings(), ...parsed };
            }
          } catch (error) {
            console.error('[Editor Settings] Failed to load settings:', error);
          }
          return getDefaultEditorSettings();
        })();
        const editor = monacoInstance.editor.create(editorRef.current, {
          model,
          theme: savedSettings.theme,
          fontSize: savedSettings.fontSize,
          fontFamily: savedSettings.fontFamily,
          lineNumbers: savedSettings.lineNumbers,
          minimap: { enabled: savedSettings.minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: savedSettings.wordWrap,
          tabSize: savedSettings.tabSize,
          // 启用代码补全相关功能
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          acceptSuggestionOnEnter: 'smart', // 改为 'smart'，只在有明确建议时接受，避免误触发
          tabCompletion: 'on',
          // 性能优化：减少不必要的计算
          renderWhitespace: savedSettings.renderWhitespace,
          renderLineHighlight: savedSettings.renderLineHighlight,
        });
        console.log('[Monaco] Editor created');

        monacoEditorRef.current = editor;
        // 同步设置状态
        setEditorSettings(savedSettings);

        // 监听代码变化 - 使用防抖减少更新频率和自动保存
        let codeUpdateTimer: number | null = null;
        editor.onDidChangeModelContent(() => {
          if (codeUpdateTimer !== null) {
            clearTimeout(codeUpdateTimer);
          }
          // 防抖：300ms 后才更新状态
          codeUpdateTimer = window.setTimeout(() => {
            const newCode = editor.getValue();
            setCode(newCode);
            // 自动保存到 localStorage
            autoSaveCode(newCode);
            codeUpdateTimer = null;
          }, 300);
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
    const initSkulptWithRetry = () => {
      console.log('[TurtlePlayground] useEffect - initializing');
      console.log('[TurtlePlayground] canvasRef.current:', canvasRef.current);
      console.log('[TurtlePlayground] Sk available:', isSkulptAvailable());
      console.log('[TurtlePlayground] Component mounted');

      if (!canvasRef.current) {
        console.error('[TurtlePlayground] Canvas ref not available');
        setSkulptStatus('failed');
        return;
      }

      if (!isSkulptAvailable()) {
        console.warn('[TurtlePlayground] Skulpt not ready, retrying in 500ms...');
        setSkulptStatus('loading');

        // 最多重试 20 次（10秒）
        let retryCount = 0;
        const retryInterval = setInterval(() => {
          retryCount++;
          console.log(`[TurtlePlayground] Retry ${retryCount}/20`);

          if (isSkulptAvailable()) {
            clearInterval(retryInterval);
            console.log('[TurtlePlayground] Skulpt ready, initializing...');
            setSkulptStatus('ready');
            try {
              initSkulpt(canvasRef.current!, (text: string) => {
                console.log('[Skulpt Output]', text);
                appendConsoleOutput(text);
              });
              console.log('[TurtlePlayground] Skulpt initialized successfully');
              appendConsoleOutput('>>> Skulpt 库已准备就绪\n');
            } catch (error) {
              console.error('[TurtlePlayground] Skulpt initialization failed:', error);
              setSkulptStatus('failed');
              appendConsoleOutput(`[错误] Skulpt 初始化失败: ${error.message}\n`);
            }
          } else if (retryCount >= 20) {
            clearInterval(retryInterval);
            console.error('[TurtlePlayground] Skulpt failed to load after 20 retries');
            setSkulptStatus('failed');
            appendConsoleOutput('[错误] Skulpt 库加载失败，请检查网络连接或刷新页面\n');
          }
        }, 500);
        return;
      }

      try {
        console.log('[TurtlePlayground] Calling initSkulpt');
        setSkulptStatus('ready');
        initSkulpt(canvasRef.current, (text: string) => {
          console.log('[Skulpt Output]', text);
          appendConsoleOutput(text);
        });
        console.log('[TurtlePlayground] Skulpt initialized successfully');
        appendConsoleOutput('>>> Skulpt 库已准备就绪\n');
      } catch (error) {
        console.error('[TurtlePlayground] Skulpt initialization failed:', error);
        setSkulptStatus('failed');
        appendConsoleOutput(`[错误] Skulpt 初始化失败: ${error.message}\n`);
      }
    };

    initSkulptWithRetry();
  }, []);

  // 运行代码
  const handleRun = useCallback(async () => {
    const canvasDiv = canvasRef.current;
    if (!canvasDiv) {
      appendConsoleOutput('[错误] 画布容器未找到\n');
      return;
    }

    setIsRunning(true);
    setConsoleOutputImmediate('>>> 正在运行...\n');
    consoleOutputBufferRef.current = '>>> 正在运行...\n';

    // 优化：使用 removeChild 代替 innerHTML，性能更好
    while (canvasDiv.firstChild) {
      canvasDiv.removeChild(canvasDiv.firstChild);
    }

    try {
      // 检查 Skulpt 是否可用
      if (!isSkulptAvailable()) {
        throw new Error('Skulpt 库不可用，请刷新页面重试');
      }

      console.log('[Run] Skulpt available for execution');

      // 重新初始化Skulpt和Turtle图形目标
      const runConfig: any = {
        output: (text: string) => {
          appendConsoleOutput(text);
        },
        read: (x: string) => {
          if ((window as any).Sk.builtinFiles?.files[x]) {
            return (window as any).Sk.builtinFiles.files[x];
          }
          throw new Error(`文件未找到: '${x}'`);
        },
      };

      if ((window as any).Sk.python3) {
        runConfig.__future__ = (window as any).Sk.python3;
      }

      (window as any).Sk.configure(runConfig);

      // 设置Turtle图形配置
      (window as any).Sk.TurtleGraphics = (window as any).Sk.TurtleGraphics || {};
      (window as any).Sk.TurtleGraphics.target = 'turtle-canvas';
      (window as any).Sk.TurtleGraphics.width = 500;
      (window as any).Sk.TurtleGraphics.height = 350;

      await runPythonCode(code, (text) => {
        appendConsoleOutput(text);
      });

      appendConsoleOutput('\n>>> 运行完成\n');
    } catch (err: any) {
      appendConsoleOutput(`\n❌ 错误: ${err.toString()}\n`);
    }

    setIsRunning(false);
  }, [code, appendConsoleOutput, setConsoleOutputImmediate]);

  // 清空画布
  const handleClear = useCallback(() => {
    if (!canvasRef.current) return;
    // 优化：使用 removeChild 代替 innerHTML
    const canvasDiv = canvasRef.current;
    while (canvasDiv.firstChild) {
      canvasDiv.removeChild(canvasDiv.firstChild);
    }
    setConsoleOutputImmediate('>>> 画布已清空\n');
    consoleOutputBufferRef.current = '>>> 画布已清空\n';
  }, [setConsoleOutputImmediate]);

  const handleSaveTaskProgress = useCallback(
    async (nextStatus: TaskProgressStatus = 'in_progress') => {
      if (!task || !taskId) return;
      if (!isLoggedIn) {
        appendConsoleOutput('\n⚠️ 登录后才能保存任务进度\n');
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
          code: sanitizeCode(code),
          }),
        });
        const result = await response.json();
        if (result.success) {
          setCurrentTaskProgress(result.progress);
          appendConsoleOutput(`\n>>> 任务进度已保存（${TASK_STATUS_LABELS[nextStatus]}）\n`);
        } else {
          appendConsoleOutput(`\n⚠️ 保存任务进度失败: ${result.message}\n`);
        }
      } catch (error) {
        appendConsoleOutput(
          `\n⚠️ 保存任务进度失败: ${error instanceof Error ? error.message : error}\n`,
        );
      }
    },
    [task, taskId, isLoggedIn, code, appendConsoleOutput],
  );

  // 保存作品
  const handleSave = useCallback(async () => {
    if (!isLoggedIn) {
      appendConsoleOutput('\n⚠️ 请先登录\n');
      setShowSaveDialog(false);
      return;
    }

    // 捕获画布截图（从div中找到canvas元素）
    // 如果有多个canvas，合并它们
    const canvasDiv = canvasRef.current;
    if (!canvasDiv) {
      appendConsoleOutput('\n⚠️ 画布容器未找到\n');
      return;
    }

    const allCanvases = canvasDiv.querySelectorAll('canvas');
    let imageUrl = '';

    if (allCanvases.length === 0) {
      appendConsoleOutput('\n⚠️ 未找到画布，请先运行代码\n');
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
      appendConsoleOutput('\n⚠️ 截图失败，将保存不带封面的作品\n');
    }

    const response = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        workId: currentWorkId,
        title: workTitle,
        code: sanitizeCode(code),
        description: '',
        isPublic: true,
        imageUrl,
        taskId,
      }),
    });

    const result = await response.json();
    if (result.success) {
      setCurrentWorkId(result.workId);
      appendConsoleOutput('\n✅ 作品保存成功！\n');
      setShowSaveDialog(false);
      if (task) {
        handleSaveTaskProgress('completed');
      }
    } else {
      appendConsoleOutput(`\n❌ 保存失败: ${result.message}\n`);
      setShowSaveDialog(false);
    }
  }, [isLoggedIn, code, workTitle, currentWorkId, task, taskId, handleSaveTaskProgress, appendConsoleOutput]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (consoleUpdateTimerRef.current !== null) {
        clearTimeout(consoleUpdateTimerRef.current);
      }
      if (autoSaveTimerRef.current !== null) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // 页面卸载前保存代码
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (monacoEditorRef.current) {
        const currentCode = monacoEditorRef.current.getValue();
        const sanitized = sanitizeCode(currentCode);
        if (sanitized && sanitized.trim() !== '') {
          try {
            localStorage.setItem(AUTO_SAVE_KEY, sanitized);
            localStorage.setItem(AUTO_SAVE_TIMESTAMP_KEY, new Date().toISOString());
          } catch (error) {
            console.error('[AutoSave] Failed to save on unload:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
                        <div className="auto-save-indicator">
                            {autoSaveStatus === 'saving' && (
                                <span className="auto-save-status saving">💾 保存中...</span>
                            )}
                            {autoSaveStatus === 'saved' && (
                                <span className="auto-save-status saved">✅ 已自动保存</span>
                            )}
                        </div>
                    </div>
                    <div className="console">
                        {/* Skulpt 状态提示 */}
                        {skulptStatus === 'loading' && (
                            <div style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '8px' }}>
                                🔄 正在加载 Python 运行时...
                            </div>
                        )}
                        {skulptStatus === 'failed' && (
                            <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '8px' }}>
                                ❌ Python 运行时加载失败，请刷新页面重试
                            </div>
                        )}
                        {skulptStatus === 'ready' && (
                            <div style={{ color: '#10b981', fontSize: '0.9rem', marginBottom: '8px' }}>
                                ✅ Python 运行时已就绪
                            </div>
                        )}
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
                                disabled={isRunning || skulptStatus !== 'ready'}
                            >
                                {isRunning ? '⏸ 运行中...' :
                                 skulptStatus === 'loading' ? '⏳ 加载中...' :
                                 skulptStatus === 'failed' ? '❌ 不可用' :
                                 '▶ 运行'}
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
                                    appendConsoleOutput('\n⚠️ 画布容器未找到\n');
                                    return;
                                  }

                                  // Skulpt可能创建多个canvas，找到所有的
                                  const allCanvases = canvasDiv.querySelectorAll('canvas');

                                  if (allCanvases.length === 0) {
                                    appendConsoleOutput('\n⚠️ 未找到画布，请先运行代码\n');
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

                                    appendConsoleOutput('\n✅ 图片下载成功！\n');
                                  } catch (error) {
                                    appendConsoleOutput(`\n❌ 下载失败: ${error}\n`);
                                  }
                                }}
                            >
                                📥 下载图片
                            </button>
                            <button
                                className="btn-settings"
                                onClick={() => {
                                  setShowSettingsDialog(true);
                                }}
                            >
                                ⚙️ 设置
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

            {/* 编辑器设置对话框 */}
            {showSettingsDialog && (
                <div className="modal-overlay" onClick={() => setShowSettingsDialog(false)}>
                    <div className="modal-content modal-settings" onClick={(e) => e.stopPropagation()}>
                        <h2>编辑器设置</h2>
                        <div className="settings-form">
                            <div className="setting-item">
                                <label htmlFor="fontSize">字体大小</label>
                                <input
                                    id="fontSize"
                                    type="number"
                                    min="10"
                                    max="30"
                                    value={editorSettings.fontSize}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        fontSize: Number.parseInt(e.target.value, 10) || 14,
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                />
                            </div>
                            <div className="setting-item">
                                <label htmlFor="fontFamily">字体家族</label>
                                <select
                                    id="fontFamily"
                                    value={editorSettings.fontFamily}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        fontFamily: e.target.value,
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="Consolas, &quot;Courier New&quot;, monospace">Consolas</option>
                                    <option value="&quot;Fira Code&quot;, Consolas, monospace">Fira Code</option>
                                    <option value="&quot;JetBrains Mono&quot;, Consolas, monospace">JetBrains Mono</option>
                                    <option value="&quot;Source Code Pro&quot;, Consolas, monospace">Source Code Pro</option>
                                    <option value="Monaco, Consolas, monospace">Monaco</option>
                                    <option value="&quot;Courier New&quot;, monospace">Courier New</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label htmlFor="theme">主题</label>
                                <select
                                    id="theme"
                                    value={editorSettings.theme}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        theme: e.target.value,
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="vs">浅色主题 (VS)</option>
                                    <option value="vs-dark">深色主题 (VS Dark)</option>
                                    <option value="hc-black">高对比度 (HC Black)</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label htmlFor="tabSize">Tab 大小</label>
                                <input
                                    id="tabSize"
                                    type="number"
                                    min="2"
                                    max="8"
                                    value={editorSettings.tabSize}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        tabSize: Number.parseInt(e.target.value, 10) || 4,
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                />
                            </div>
                            <div className="setting-item">
                                <label htmlFor="wordWrap">自动换行</label>
                                <select
                                    id="wordWrap"
                                    value={editorSettings.wordWrap}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        wordWrap: e.target.value as EditorSettings['wordWrap'],
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="on">开启</option>
                                    <option value="off">关闭</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label htmlFor="lineNumbers">行号显示</label>
                                <select
                                    id="lineNumbers"
                                    value={editorSettings.lineNumbers}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        lineNumbers: e.target.value as EditorSettings['lineNumbers'],
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="on">显示</option>
                                    <option value="off">隐藏</option>
                                    <option value="relative">相对行号</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label htmlFor="minimap">小地图</label>
                                <input
                                    id="minimap"
                                    type="checkbox"
                                    checked={editorSettings.minimap}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        minimap: e.target.checked,
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-checkbox"
                                />
                            </div>
                            <div className="setting-item">
                                <label htmlFor="renderWhitespace">显示空白字符</label>
                                <select
                                    id="renderWhitespace"
                                    value={editorSettings.renderWhitespace}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        renderWhitespace: e.target.value as EditorSettings['renderWhitespace'],
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="none">不显示</option>
                                    <option value="boundary">边界</option>
                                    <option value="selection">选中时</option>
                                    <option value="trailing">尾随空格</option>
                                    <option value="all">全部</option>
                                </select>
                            </div>
                            <div className="setting-item">
                                <label htmlFor="renderLineHighlight">行高亮</label>
                                <select
                                    id="renderLineHighlight"
                                    value={editorSettings.renderLineHighlight}
                                    onChange={(e) => {
                                      const newSettings = {
                                        ...editorSettings,
                                        renderLineHighlight: e.target.value as EditorSettings['renderLineHighlight'],
                                      };
                                      setEditorSettings(newSettings);
                                      saveEditorSettings(newSettings);
                                    }}
                                    className="modal-input"
                                >
                                    <option value="none">无</option>
                                    <option value="gutter">仅装订线</option>
                                    <option value="line">整行</option>
                                    <option value="all">全部</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                onClick={() => {
                                  const defaultSettings = getDefaultEditorSettings();
                                  setEditorSettings(defaultSettings);
                                  saveEditorSettings(defaultSettings);
                                }}
                                className="btn-reset"
                            >
                                重置为默认
                            </button>
                            <button onClick={() => setShowSettingsDialog(false)} className="btn-confirm">完成</button>
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
