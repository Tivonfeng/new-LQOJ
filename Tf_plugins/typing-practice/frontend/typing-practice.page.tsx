import './typing-practice.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 类型定义
interface TypingState {
  originalText: string;
  userInput: string;
  currentPosition: number;
  isActive: boolean;
  isCompleted: boolean;
  startTime: number;
  endTime: number;
  errors: number;
  keystrokeCount: number;
  correctKeystrokes: number;
  difficulty: string;
  textType: string;
}

interface TypingStats {
  wpm: number;
  accuracy: number;
  progress: number;
  elapsedTime: number;
}

interface TypingConfig {
  enableSoundEffects: boolean;
  minAccuracy: number;
  maxTextLength: number;
}

// 虚拟键盘相关类型定义
interface KeyboardKey {
  key: string;
  display: string;
  shiftDisplay?: string; // Shift组合时的显示
  finger: string;
  row: number;
  position: number;
  width?: number;
  type?: 'normal' | 'space' | 'enter' | 'shift' | 'tab' | 'backspace' | 'caps';
}

interface KeyboardState {
  activeKey: string;
  nextKey: string;
  pressedKeys: Set<string>;
  errorKeys: Set<string>;
  isShiftPressed: boolean; // 是否按住Shift
  showShiftLayer: boolean; // 是否显示Shift层
}

// 键盘布局和手指映射
const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  // 第一行
  [
    { key: '`', display: '`', shiftDisplay: '~', finger: 'left-pinky', row: 0, position: 0 },
    { key: '1', display: '1', shiftDisplay: '!', finger: 'left-pinky', row: 0, position: 1 },
    { key: '2', display: '2', shiftDisplay: '@', finger: 'left-ring', row: 0, position: 2 },
    { key: '3', display: '3', shiftDisplay: '#', finger: 'left-middle', row: 0, position: 3 },
    { key: '4', display: '4', shiftDisplay: '$', finger: 'left-index', row: 0, position: 4 },
    { key: '5', display: '5', shiftDisplay: '%', finger: 'left-index', row: 0, position: 5 },
    { key: '6', display: '6', shiftDisplay: '^', finger: 'right-index', row: 0, position: 6 },
    { key: '7', display: '7', shiftDisplay: '&', finger: 'right-index', row: 0, position: 7 },
    { key: '8', display: '8', shiftDisplay: '*', finger: 'right-middle', row: 0, position: 8 },
    { key: '9', display: '9', shiftDisplay: '(', finger: 'right-ring', row: 0, position: 9 },
    { key: '0', display: '0', shiftDisplay: ')', finger: 'right-pinky', row: 0, position: 10 },
    { key: '-', display: '-', shiftDisplay: '_', finger: 'right-pinky', row: 0, position: 11 },
    { key: '=', display: '=', shiftDisplay: '+', finger: 'right-pinky', row: 0, position: 12 },
    { key: 'Backspace', display: 'Backspace', finger: 'right-pinky', row: 0, position: 13, type: 'backspace', width: 2 },
  ],
  // 第二行
  [
    { key: 'Tab', display: 'Tab', finger: 'left-pinky', row: 1, position: 0, type: 'tab', width: 1.5 },
    { key: 'q', display: 'q', shiftDisplay: 'Q', finger: 'left-pinky', row: 1, position: 1 },
    { key: 'w', display: 'w', shiftDisplay: 'W', finger: 'left-ring', row: 1, position: 2 },
    { key: 'e', display: 'e', shiftDisplay: 'E', finger: 'left-middle', row: 1, position: 3 },
    { key: 'r', display: 'r', shiftDisplay: 'R', finger: 'left-index', row: 1, position: 4 },
    { key: 't', display: 't', shiftDisplay: 'T', finger: 'left-index', row: 1, position: 5 },
    { key: 'y', display: 'y', shiftDisplay: 'Y', finger: 'right-index', row: 1, position: 6 },
    { key: 'u', display: 'u', shiftDisplay: 'U', finger: 'right-index', row: 1, position: 7 },
    { key: 'i', display: 'i', shiftDisplay: 'I', finger: 'right-middle', row: 1, position: 8 },
    { key: 'o', display: 'o', shiftDisplay: 'O', finger: 'right-ring', row: 1, position: 9 },
    { key: 'p', display: 'p', shiftDisplay: 'P', finger: 'right-pinky', row: 1, position: 10 },
    { key: '[', display: '[', shiftDisplay: '{', finger: 'right-pinky', row: 1, position: 11 },
    { key: ']', display: ']', shiftDisplay: '}', finger: 'right-pinky', row: 1, position: 12 },
    { key: '\\', display: '\\', shiftDisplay: '|', finger: 'right-pinky', row: 1, position: 13 },
  ],
  // 第三行
  [
    { key: 'CapsLock', display: 'Caps', finger: 'left-pinky', row: 2, position: 0, type: 'caps', width: 1.75 },
    { key: 'a', display: 'a', shiftDisplay: 'A', finger: 'left-pinky', row: 2, position: 1 },
    { key: 's', display: 's', shiftDisplay: 'S', finger: 'left-ring', row: 2, position: 2 },
    { key: 'd', display: 'd', shiftDisplay: 'D', finger: 'left-middle', row: 2, position: 3 },
    { key: 'f', display: 'f', shiftDisplay: 'F', finger: 'left-index', row: 2, position: 4 },
    { key: 'g', display: 'g', shiftDisplay: 'G', finger: 'left-index', row: 2, position: 5 },
    { key: 'h', display: 'h', shiftDisplay: 'H', finger: 'right-index', row: 2, position: 6 },
    { key: 'j', display: 'j', shiftDisplay: 'J', finger: 'right-index', row: 2, position: 7 },
    { key: 'k', display: 'k', shiftDisplay: 'K', finger: 'right-middle', row: 2, position: 8 },
    { key: 'l', display: 'l', shiftDisplay: 'L', finger: 'right-ring', row: 2, position: 9 },
    { key: ';', display: ';', shiftDisplay: ':', finger: 'right-pinky', row: 2, position: 10 },
    { key: "'", display: "'", shiftDisplay: '"', finger: 'right-pinky', row: 2, position: 11 },
    { key: 'Enter', display: 'Enter', finger: 'right-pinky', row: 2, position: 12, type: 'enter', width: 2.25 },
  ],
  // 第四行
  [
    { key: 'Shift', display: 'Shift', finger: 'left-pinky', row: 3, position: 0, type: 'shift', width: 2.25 },
    { key: 'z', display: 'z', shiftDisplay: 'Z', finger: 'left-pinky', row: 3, position: 1 },
    { key: 'x', display: 'x', shiftDisplay: 'X', finger: 'left-ring', row: 3, position: 2 },
    { key: 'c', display: 'c', shiftDisplay: 'C', finger: 'left-middle', row: 3, position: 3 },
    { key: 'v', display: 'v', shiftDisplay: 'V', finger: 'left-index', row: 3, position: 4 },
    { key: 'b', display: 'b', shiftDisplay: 'B', finger: 'left-index', row: 3, position: 5 },
    { key: 'n', display: 'n', shiftDisplay: 'N', finger: 'right-index', row: 3, position: 6 },
    { key: 'm', display: 'm', shiftDisplay: 'M', finger: 'right-index', row: 3, position: 7 },
    { key: ',', display: ',', shiftDisplay: '<', finger: 'right-middle', row: 3, position: 8 },
    { key: '.', display: '.', shiftDisplay: '>', finger: 'right-ring', row: 3, position: 9 },
    { key: '/', display: '/', shiftDisplay: '?', finger: 'right-pinky', row: 3, position: 10 },
    { key: 'Shift', display: 'Shift', finger: 'right-pinky', row: 3, position: 11, type: 'shift', width: 2.75 },
  ],
  // 第五行（空格键行）
  [
    { key: ' ', display: 'Space', finger: 'both-thumb', row: 4, position: 0, type: 'space', width: 6.25 },
  ],
];

// 虚拟键盘组件
interface VirtualKeyboardProps {
  keyboardState: KeyboardState;
  isActive: boolean;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ keyboardState, isActive }) => {
  // 获取按键显示文本
  const getKeyDisplay = useCallback((key: KeyboardKey) => {
    if (keyboardState.showShiftLayer && key.shiftDisplay) {
      return key.shiftDisplay;
    }
    return key.display;
  }, [keyboardState.showShiftLayer]);

  // 获取按键的CSS类名
  const getKeyClassName = useCallback((key: KeyboardKey) => {
    let className = `key key-${key.finger}`;

    if (key.type) {
      className += ` key-${key.type}`;
    }

    // 按键宽度
    if (key.width) {
      className += ` key-width-${key.width}`;
    }

    // Shift键高亮
    if (key.type === 'shift' && keyboardState.isShiftPressed) {
      className += ' key-shift-active';
    }

    // 当前要按的键
    if (isActive && keyboardState.activeKey === key.key) {
      className += ' key-active';
    }

    // 下一个要按的键
    if (isActive && keyboardState.nextKey === key.key) {
      className += ' key-next';
    }

    // 当前按下的键
    if (keyboardState.pressedKeys.has(key.key)) {
      className += ' key-pressed';
    }

    // 错误的键
    if (keyboardState.errorKeys.has(key.key)) {
      className += ' key-error';
    }

    return className;
  }, [keyboardState, isActive]);

  return (
    <div className="virtual-keyboard">
      <div className="keyboard-layout">
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key, keyIndex) => (
              <div
                key={`${rowIndex}-${keyIndex}`}
                className={getKeyClassName(key)}
                data-key={key.key}
                data-finger={key.finger}
                style={{
                  '--key-width': key.width || 1,
                } as React.CSSProperties}
              >
                <span className="key-display">{getKeyDisplay(key)}</span>
                {key.shiftDisplay && !keyboardState.showShiftLayer && (
                  <span className="key-shift-hint">{key.shiftDisplay}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="keyboard-footer">
        <div className="finger-guide">
          <div className="guide-item">
            <div className="hand-illustration">
              <div className="hand left-hand">
                <div className="finger left-pinky">小</div>
                <div className="finger left-ring">无</div>
                <div className="finger left-middle">中</div>
                <div className="finger left-index">食</div>
                <div className="thumb left-thumb">拇</div>
              </div>
              <div className="hand right-hand">
                <div className="thumb right-thumb">拇</div>
                <div className="finger right-index">食</div>
                <div className="finger right-middle">中</div>
                <div className="finger right-ring">无</div>
                <div className="finger right-pinky">小</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 主要的打字练习React组件
const TypingPracticeApp: React.FC = () => {
  // 从全局数据获取初始状态
  const initialData = (window as any).TypingPracticeData || {};
  const config: TypingConfig = initialData.config || {
    enableSoundEffects: true,
    minAccuracy: 60,
    maxTextLength: 500,
  };
  // User data is available in initialData.user if needed

  // 状态管理
  const [typingState, setTypingState] = useState<TypingState>({
    originalText: (initialData.recommendedText?.text || 'Start typing to begin your practice session.').replace(/\r?\n/g, ' '),
    userInput: '',
    currentPosition: 0,
    isActive: false,
    isCompleted: false,
    startTime: 0,
    endTime: 0,
    errors: 0,
    keystrokeCount: 0,
    correctKeystrokes: 0,
    difficulty: initialData.recommendedText?.difficulty || 'beginner',
    textType: initialData.recommendedText?.type || 'english',
  });

  const [currentStats, setCurrentStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    progress: 0,
    elapsedTime: 0,
  });

  const [showCustomTextModal, setShowCustomTextModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 键盘状态管理
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    activeKey: '',
    nextKey: '',
    pressedKeys: new Set(),
    errorKeys: new Set(),
    isShiftPressed: false,
    showShiftLayer: false,
  });

  // 获取当前需要按的键
  const getCurrentKey = useCallback(() => {
    if (!typingState.isActive || typingState.currentPosition >= typingState.originalText.length) {
      return '';
    }
    return typingState.originalText[typingState.currentPosition] || '';
  }, [typingState.isActive, typingState.currentPosition, typingState.originalText]);

  // 获取下一个要按的键
  const getNextKey = useCallback(() => {
    if (!typingState.isActive || typingState.currentPosition + 1 >= typingState.originalText.length) {
      return '';
    }
    return typingState.originalText[typingState.currentPosition + 1] || '';
  }, [typingState.isActive, typingState.currentPosition, typingState.originalText]);

  // 根据字符查找对应的键盘按键
  const findKeyByChar = useCallback((char: string): KeyboardKey | null => {
    for (const row of KEYBOARD_LAYOUT) {
      for (const key of row) {
        if (key.key === char || key.key.toLowerCase() === char.toLowerCase()) {
          return key;
        }
      }
    }
    return null;
  }, []);

  // 更新键盘状态
  useEffect(() => {
    const currentKey = getCurrentKey();
    const nextKey = getNextKey();

    setKeyboardState((prev) => ({
      ...prev,
      activeKey: currentKey,
      nextKey,
    }));
  }, [getCurrentKey, getNextKey]);

  // Refs
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 实时计算统计数据
  const calculateStats = useCallback((): TypingStats => {
    const now = Date.now();
    const elapsedTime = typingState.startTime ? (now - typingState.startTime) / 1000 : 0;
    const elapsedMinutes = elapsedTime / 60;

    // 计算WPM (假设平均单词长度为5个字符)
    const wordsTyped = typingState.userInput.length / 5;
    const wpm = elapsedMinutes > 0 ? Math.round(wordsTyped / elapsedMinutes) : 0;

    // 计算准确率
    let correctChars = 0;
    for (let i = 0; i < typingState.userInput.length; i++) {
      if (typingState.userInput[i] === typingState.originalText[i]) {
        correctChars++;
      }
    }
    const accuracy = typingState.userInput.length > 0
      ? Math.round((correctChars / typingState.userInput.length) * 100)
      : 100;

    // 计算进度
    const progress = typingState.originalText.length > 0
      ? Math.round((typingState.userInput.length / typingState.originalText.length) * 100)
      : 0;

    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      progress: Math.max(0, Math.min(100, progress)),
      elapsedTime,
    };
  }, [typingState]);

  // 音效播放
  const playSound = useCallback((type: 'correct' | 'error' | 'complete') => {
    if (!config.enableSoundEffects || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 根据类型设置不同频率
    switch (type) {
      case 'correct':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        break;
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [config.enableSoundEffects]);

  // 初始化音频上下文
  useEffect(() => {
    if (config.enableSoundEffects) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [config.enableSoundEffects]);

  // 渲染可打字的文本
  const renderTypingText = useCallback(() => {
    if (!textDisplayRef.current) return null;

    const { originalText, currentPosition, userInput } = typingState;
    // 调试：打印原始文本内容
    console.log('Original text:', JSON.stringify(originalText));
    const chars = originalText.split('');

    textDisplayRef.current.innerHTML = chars.map((char, index) => {
      let className = 'char';

      // 只有在练习开始后才应用状态样式
      if (typingState.isActive || typingState.isCompleted) {
        if (index < userInput.length) {
          // 已输入的字符
          if (userInput[index] === char) {
            className += ' correct';
          } else {
            className += ' incorrect';
          }
        } else if (index === currentPosition && typingState.isActive) {
          // 当前位置（仅在练习中显示）
          className += ' current';
        } else {
          // 等待输入的字符
          className += ' waiting';
        }
      } else {
        // 练习开始前，所有字符都是等待状态 - 确保没有特殊样式
        className = 'char waiting';
      }

      const displayChar = char === ' ' ? '&nbsp;' : char === '\n' ? ' ' : char;
      return `<span class="${className}">${displayChar}</span>`;
    }).join('');

    return null;
  }, [typingState]);

  // 更新字符状态函数已合并到renderTypingText中

  // 处理键盘输入
  const handleKeyInput = useCallback((e: KeyboardEvent) => {
    if (!typingState.isActive || typingState.isCompleted) return;

    // 更新键盘视觉反馈
    const pressedKey = e.key;
    setKeyboardState((prev) => ({
      ...prev,
      pressedKeys: new Set([...prev.pressedKeys, pressedKey]),
    }));

    // 清除按下状态
    setTimeout(() => {
      setKeyboardState((prev) => ({
        ...prev,
        pressedKeys: new Set([...prev.pressedKeys].filter((k) => k !== pressedKey)),
      }));
    }, 100);

    // 处理ESC键暂停
    if (e.key === 'Escape') {
      e.preventDefault();
      resetTyping();
      return;
    }

    const currentChar = typingState.originalText[typingState.currentPosition];

    // 处理退格键
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (typingState.currentPosition > 0) {
        setTypingState((prev) => ({
          ...prev,
          userInput: prev.userInput.slice(0, -1),
          currentPosition: prev.currentPosition - 1,
        }));
      }
      return;
    }

    // 处理Enter和Tab键
    let inputChar = e.key;
    if (e.key === 'Enter') inputChar = '\n';
    if (e.key === 'Tab') {
      e.preventDefault();
      inputChar = '\t';
    }

    // 只处理可打印字符和特殊字符
    if (inputChar.length === 1 || ['Enter', 'Tab'].includes(e.key)) {
      e.preventDefault();

      const isCorrect = inputChar === currentChar;
      const newKeystrokeCount = typingState.keystrokeCount + 1;
      const newCorrectKeystrokes = isCorrect ? typingState.correctKeystrokes + 1 : typingState.correctKeystrokes;
      const newErrors = isCorrect ? typingState.errors : typingState.errors + 1;
      const newPosition = typingState.currentPosition + 1;

      setTypingState((prev) => ({
        ...prev,
        userInput: prev.userInput + inputChar,
        currentPosition: newPosition,
        errors: newErrors,
        keystrokeCount: newKeystrokeCount,
        correctKeystrokes: newCorrectKeystrokes,
      }));

      // 播放音效
      playSound(isCorrect ? 'correct' : 'error');

      // 添加错误效果和键盘错误状态
      if (!isCorrect) {
        if (textDisplayRef.current) {
          textDisplayRef.current.classList.add('error-flash');
          setTimeout(() => {
            if (textDisplayRef.current) {
              textDisplayRef.current.classList.remove('error-flash');
            }
          }, 200);
        }

        // 添加键盘错误状态
        setKeyboardState((prev) => ({
          ...prev,
          errorKeys: new Set([...prev.errorKeys, pressedKey]),
        }));

        // 清除错误状态
        setTimeout(() => {
          setKeyboardState((prev) => ({
            ...prev,
            errorKeys: new Set([...prev.errorKeys].filter((k) => k !== pressedKey)),
          }));
        }, 1000);
      }

      // 检查是否完成
      if (newPosition >= typingState.originalText.length) {
        setTimeout(() => handlePracticeComplete(), 100);
      }
    }
  }, [typingState, playSound]);

  // 开始打字练习
  const startTyping = useCallback(() => {
    setTypingState((prev) => ({
      ...prev,
      isActive: true,
      isCompleted: false,
      startTime: Date.now(),
      userInput: '',
      currentPosition: 0,
      errors: 0,
      keystrokeCount: 0,
      correctKeystrokes: 0,
    }));

    // 聚焦隐藏输入框以捕获键盘事件
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, []);

  // 重置打字练习
  const resetTyping = useCallback(() => {
    setTypingState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: false,
      startTime: 0,
      endTime: 0,
      userInput: '',
      currentPosition: 0,
      errors: 0,
      keystrokeCount: 0,
      correctKeystrokes: 0,
    }));

    setCurrentStats({
      wpm: 0,
      accuracy: 100,
      progress: 0,
      elapsedTime: 0,
    });

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 状态重置后会自动触发渲染
  }, []);

  // 完成练习
  const handlePracticeComplete = useCallback(async () => {
    const endTime = Date.now();

    // 使用当前状态计算最终统计（确保数据一致性）
    const timeSpent = (endTime - typingState.startTime) / 1000;
    const elapsedMinutes = timeSpent / 60;

    // 重新计算最终的WPM和准确率
    const wordsTyped = typingState.userInput.length / 5;
    const finalWPM = elapsedMinutes > 0 ? Math.round(wordsTyped / elapsedMinutes) : 0;

    let correctChars = 0;
    for (let i = 0; i < typingState.userInput.length; i++) {
      if (typingState.userInput[i] === typingState.originalText[i]) {
        correctChars++;
      }
    }
    const finalAccuracy = typingState.userInput.length > 0
      ? Math.round((correctChars / typingState.userInput.length) * 100)
      : 100;

    setTypingState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      endTime,
    }));

    // 播放完成音效
    playSound('complete');

    // 构建结果数据 - 使用重新计算的统计确保准确性
    const result = {
      wpm: Math.max(0, finalWPM),
      accuracy: Math.max(0, Math.min(100, finalAccuracy)),
      errors: typingState.errors,
      timeSpent,
      textLength: typingState.originalText.length,
      difficulty: typingState.difficulty,
      textType: typingState.textType,
      completedWords: Math.floor(typingState.originalText.length / 5),
      keystrokeCount: typingState.keystrokeCount,
      correctKeystrokes: typingState.correctKeystrokes,
    };

    // 添加调试日志
    console.log('Practice completed with result:', result);
    console.log('Typing state at completion:', {
      originalText: `${typingState.originalText.substring(0, 50)}...`,
      userInput: typingState.userInput,
      startTime: typingState.startTime,
      endTime,
      errors: typingState.errors,
      keystrokeCount: typingState.keystrokeCount,
      correctKeystrokes: typingState.correctKeystrokes,
    });

    // 提交结果到服务器
    try {
      setIsLoading(true);

      const payload = {
        originalText: typingState.originalText,
        userInput: typingState.userInput,
        result,
        screenInfo: {
          width: window.screen.width,
          height: window.screen.height,
        },
      };

      console.log('Sending payload to server:', payload);

      // 使用正确的API端点 - 根据HydroOJ路由系统，直接提交到当前路由
      const apiUrl = window.location.pathname; // 直接提交到 /typing
      console.log('Using API endpoint:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          originalText: typingState.originalText,
          userInput: typingState.userInput,
          result: JSON.stringify(result),
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // 检查响应是否成功
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 尝试解析JSON响应
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const responseText = await response.text();
        console.error('JSON parse error:', jsonError);
        console.error('Response text:', responseText);
        throw new Error('服务器返回的不是有效的JSON格式');
      }

      if (data.success) {
        console.log('Practice completed successfully:', data.data);

        // 显示完成统计
        alert(`练习完成！\nWPM: ${result.wpm}\n准确率: ${result.accuracy}%\n用时: ${Math.round(result.timeSpent)}秒\n错误数: ${result.errors}`);
      } else {
        console.error('Failed to submit result:', data.error);
        alert(`提交结果失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error submitting practice result:', error);
      alert(`提交结果时发生错误: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [typingState, playSound]); // 移除了calculateStats依赖，因为我们不再使用它

  // 初始化新练习
  const startNewPractice = useCallback(() => {
    resetTyping();
    setTimeout(() => {
      startTyping();
    }, 100);
  }, [resetTyping, startTyping]);

  // 生成新文本
  const generateNewText = useCallback(async (difficulty?: string, textType?: string) => {
    try {
      setIsLoading(true);
      // 使用正确的API端点路径
      const textApiUrl = `${window.location.pathname}/text`;
      console.log('Using text API endpoint:', textApiUrl);

      const response = await fetch(textApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          difficulty: difficulty || typingState.difficulty,
          textType: textType || typingState.textType,
        }),
      });

      // 检查响应是否成功
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate text error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 尝试解析JSON响应
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const responseText = await response.text();
        console.error('JSON parse error in generateNewText:', jsonError);
        console.error('Response text:', responseText);
        throw new Error('服务器返回的不是有效的JSON格式');
      }

      if (data.success && data.data.text) {
        setTypingState((prev) => ({
          ...prev,
          originalText: data.data.text.replace(/\r?\n/g, ' '),
          difficulty: data.data.difficulty || prev.difficulty,
          textType: data.data.textType || prev.textType,
          userInput: '',
          currentPosition: 0,
          isActive: false,
          isCompleted: false,
          startTime: 0,
          endTime: 0,
          errors: 0,
          keystrokeCount: 0,
          correctKeystrokes: 0,
        }));
      }
    } catch (error) {
      console.error('Error generating new text:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typingState.difficulty, typingState.textType]);

  // 处理自定义文本
  const handleCustomText = useCallback(() => {
    if (customText.trim() && customText.length <= config.maxTextLength) {
      setTypingState((prev) => ({
        ...prev,
        originalText: customText.trim().replace(/\r?\n/g, ' '),
        userInput: '',
        currentPosition: 0,
        isActive: false,
        isCompleted: false,
        startTime: 0,
        endTime: 0,
        errors: 0,
        keystrokeCount: 0,
        correctKeystrokes: 0,
      }));

      setShowCustomTextModal(false);
      setCustomText('');
    }
  }, [customText, config.maxTextLength]);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取难度的显示名称
  const getDisplayDifficulty = useCallback((difficulty: string): string => {
    const difficultyNames = {
      beginner: '初级',
      intermediate: '中级',
      advanced: '高级',
      expert: '专家',
    };
    return difficultyNames[difficulty] || difficulty;
  }, []);

  // 获取文本类型的显示名称
  const getDisplayTextType = useCallback((textType: string): string => {
    const typeNames = {
      basic_keys: '基础键位',
      programming_words: '编程词汇',
      english: '英文文章',
      chinese: '中文文章',
      programming: '编程代码',
      mixed: '混合内容',
      custom: '自定义文本',
    };
    return typeNames[textType] || textType;
  }, []);

  // 更新统计数据并更新字符状态
  useEffect(() => {
    renderTypingText();
    if (typingState.isActive && !typingState.isCompleted) {
      const updateStats = () => {
        setCurrentStats(calculateStats());
      };

      timerRef.current = window.setInterval(updateStats, 100);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [typingState.isActive, typingState.isCompleted, typingState.currentPosition, typingState.userInput, calculateStats, renderTypingText]);

  // 绑定键盘事件监听器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (typingState.isActive) {
        handleKeyInput(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [typingState.isActive, handleKeyInput]);

  // 文本变化时的渲染已在主要useEffect中处理

  // 组件挂载时初始化
  useEffect(() => {
    // 聚焦隐藏输入框
    setTimeout(() => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 100);

    // 通知应用已挂载
    document.dispatchEvent(new CustomEvent('typingPracticeAppMounted'));
  }, []);

  // 组件挂载时的全局事件监听
  useEffect(() => {
    // 全局快捷键
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 快捷键支持
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r': // Ctrl+R / Cmd+R - 重新开始
            e.preventDefault();
            startNewPractice();
            break;
          case 'n': // Ctrl+N / Cmd+N - 新文本
            e.preventDefault();
            generateNewText();
            break;
          case 't': // Ctrl+T / Cmd+T - 自定义文本
            e.preventDefault();
            setShowCustomTextModal(true);
            break;
        }
      }

      // ESC键关闭模态框
      if (e.key === 'Escape' && !typingState.isActive) {
        setShowCustomTextModal(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [startNewPractice, generateNewText, typingState.isActive]);

  // 主渲染React组件 - 完整的打字练习界面
  return (
    <div className="typing-practice-container">
      {/* 主要内容区域 */}
      <div className="typing-practice-main">
        <div className="typing-main-panel">

          {/* 打字文本显示区域 */}
          <div className="typing-text-container">
            <div className="text-info">
              <span><strong>长度:</strong> {typingState.originalText.length} 字符</span>
              <span><strong>难度:</strong> {getDisplayDifficulty(typingState.difficulty)}</span>
              <span><strong>类型:</strong> {getDisplayTextType(typingState.textType)}</span>
            </div>
            <div
              ref={textDisplayRef}
              className="typing-text"
              id="typing-text"
            >
              {/* 文本内容通过renderTypingText()函数动态设置到innerHTML */}
            </div>
          </div>

          {/* 隐藏的输入框用于捕获键盘事件 */}
          <input
            ref={hiddenInputRef}
            type="text"
            id="typing-input"
            className="hidden-input"
            style={{
              position: 'absolute',
              left: '-9999px',
              opacity: 0,
            }}
            autoComplete="off"
            spellCheck={false}
          />

          {/* 虚拟键盘 - 移到打字区域下方 */}
          <VirtualKeyboard
            keyboardState={keyboardState}
            isActive={typingState.isActive}
          />
        </div>

        {/* 侧边栏 - 精简显示 */}
        <div className="typing-sidebar">
          {/* 实时统计 - 顶部显示，突出重要数据 */}
          <div className="sidebar-card stats-display-card">
            <h3>📊 实时数据</h3>
            <div className="typing-stats-display">
              <div className="stat-item">
                <div className="stat-value">{currentStats.wpm}</div>
                <div className="stat-label">速度 (WPM)</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{currentStats.accuracy}%</div>
                <div className="stat-label">准确率</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{formatTime(currentStats.elapsedTime)}</div>
                <div className="stat-label">用时</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{currentStats.progress}%</div>
                <div className="stat-label">进度</div>
              </div>
            </div>
          </div>

          {/* 快速设置 - 简化操作 */}
          <div className="sidebar-card settings-card">
            <h3>⚙️ 快速设置</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>难度</label>
                <select
                  className="form-control"
                  value={typingState.difficulty}
                  onChange={(e) => setTypingState((prev) => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                  <option value="expert">专家</option>
                </select>
              </div>
              <div className="setting-item">
                <label>类型</label>
                <select
                  className="form-control"
                  value={typingState.textType}
                  onChange={(e) => setTypingState((prev) => ({ ...prev, textType: e.target.value }))}
                >
                  <option value="basic_keys">基础键位</option>
                  <option value="programming_words">编程词汇</option>
                  <option value="english">英文文章</option>
                  <option value="chinese">中文文章</option>
                  <option value="programming">编程代码</option>
                </select>
              </div>
              <div className="setting-item">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => generateNewText()}
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ 生成中' : '🔄 换文本'}
                </button>
              </div>
              <div className="setting-item">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCustomTextModal(true)}
                >
                  📝 自定义
                </button>
              </div>
            </div>

            {/* 练习控制按钮 */}
            <div className="practice-controls">
              {!typingState.isActive && !typingState.isCompleted && (
                <button
                  onClick={startTyping}
                  className="btn btn-success btn-block"
                >
                  🚀 开始练习
                </button>
              )}
              {typingState.isActive && (
                <button
                  onClick={resetTyping}
                  className="btn btn-outline-secondary btn-block"
                >
                  🔄 重新开始
                </button>
              )}
              {typingState.isCompleted && (
                <div className="completed-controls">
                  <button
                    onClick={startNewPractice}
                    className="btn btn-success btn-sm"
                  >
                    ↻ 再练一遍
                  </button>
                  <button
                    onClick={() => generateNewText()}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    📑 新文本
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 个人记录 - 简化展示 */}
          <div className="sidebar-card stats-card">
            <h3>🏆 个人记录</h3>
            <div className="stats-grid">
              <div className="stat-row">
                <span className="stat-name">最佳</span>
                <span className="stat-value">{initialData.userStats?.bestWPM || 0} WPM</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">准确率</span>
                <span className="stat-value">{initialData.userStats?.bestAccuracy || 0}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">练习</span>
                <span className="stat-value">{initialData.userStats?.totalPractices || 0}次</span>
              </div>
            </div>
          </div>

          {/* 排行榜 */}
          {initialData.leaderboard && initialData.leaderboard.length > 0 && (
            <div className="sidebar-card leaderboard-card">
              <h3>排行榜</h3>
              <div className="leaderboard-list">
                {initialData.leaderboard.slice(0, 5).map((entry: any, index: number) => (
                  <div
                    key={index}
                    className={`leaderboard-item ${entry.uid === initialData.user?.id ? 'current-user' : ''}`}
                  >
                    <span className="rank">{index + 1}</span>
                    <div className="player-info">
                      <div className="username">{entry.username || 'Anonymous'}</div>
                      <div className="player-stats">{entry.bestWPM || 0} WPM</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 成就 */}
          {initialData.userStats?.achievements && initialData.userStats.achievements.length > 0 && (
            <div className="sidebar-card achievements-card">
              <h3>最近成就</h3>
              <div className="achievements-list">
                {initialData.userStats.achievements.slice(-3).map((achievement: string, index: number) => (
                  <div key={index} className="achievement-item">
                    <span className="achievement-icon">🏆</span>
                    <span className="achievement-name">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 练习要点 - 简化提示 */}
          <div className="sidebar-card tips-card">
            <h3>💡 练习要点</h3>
            <ul className="tips-list">
              <li>跟随键盘色彩指导</li>
              <li>准确度优于速度</li>
              <li>保持练习节奏</li>
            </ul>
          </div>
        </div>

      </div>

      {/* 模态框 */}
      {showCustomTextModal && (
        <div className="modal-overlay" onClick={() => setShowCustomTextModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>自定义文本</h3>
              <button className="modal-close" onClick={() => setShowCustomTextModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="在这里输入你的自定义文本..."
                rows={6}
                maxLength={config.maxTextLength}
              />
              <div className="text-info">
                <small>
                  文本长度: {customText.length} / {config.maxTextLength}
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={handleCustomText}
                disabled={!customText.trim() || customText.length > config.maxTextLength}
              >
                使用此文本
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCustomTextModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['typing_practice'], () => {
  console.log('Typing Practice page loaded');
  console.log('Initial data available:', (window as any).TypingPracticeData);

  // 初始化React应用
  const mountPoint = document.getElementById('typing-practice-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<TypingPracticeApp />);
  } else {
    console.error('Mount point not found: typing-practice-app-mount-point');
  }
}));
