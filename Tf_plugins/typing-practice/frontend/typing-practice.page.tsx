import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './typing-practice.css';

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

// UserData interface removed - not needed since user data is accessed via initialData.user

// 主要的打字练习React组件
const TypingPracticeApp: React.FC = () => {
  // 从全局数据获取初始状态
  const initialData = (window as any).TypingPracticeData || {};
  const config: TypingConfig = initialData.config || {
    enableSoundEffects: true,
    minAccuracy: 60,
    maxTextLength: 500
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
    textType: initialData.recommendedText?.type || 'english'
  });

  const [currentStats, setCurrentStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    progress: 0,
    elapsedTime: 0
  });

  const [showCustomTextModal, setShowCustomTextModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      elapsedTime
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
        setTypingState(prev => ({
          ...prev,
          userInput: prev.userInput.slice(0, -1),
          currentPosition: prev.currentPosition - 1
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
      const newPosition = typingState.currentPosition + 1;
      
      setTypingState(prev => ({
        ...prev,
        userInput: prev.userInput + inputChar,
        currentPosition: newPosition,
        errors: isCorrect ? prev.errors : prev.errors + 1,
        keystrokeCount: newKeystrokeCount,
        correctKeystrokes: isCorrect ? prev.correctKeystrokes + 1 : prev.correctKeystrokes
      }));

      // 播放音效
      playSound(isCorrect ? 'correct' : 'error');

      // 添加错误效果
      if (!isCorrect && textDisplayRef.current) {
        textDisplayRef.current.classList.add('error-flash');
        setTimeout(() => {
          if (textDisplayRef.current) {
            textDisplayRef.current.classList.remove('error-flash');
          }
        }, 200);
      }

      // 检查是否完成
      if (newPosition >= typingState.originalText.length) {
        setTimeout(() => handlePracticeComplete(), 100);
      }
    }
  }, [typingState, playSound]);

  // 开始打字练习
  const startTyping = useCallback(() => {
    setTypingState(prev => ({
      ...prev,
      isActive: true,
      isCompleted: false,
      startTime: Date.now(),
      userInput: '',
      currentPosition: 0,
      errors: 0,
      keystrokeCount: 0,
      correctKeystrokes: 0
    }));
    
    // 聚焦隐藏输入框以捕获键盘事件
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, []);

  // 重置打字练习
  const resetTyping = useCallback(() => {
    setTypingState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: false,
      startTime: 0,
      endTime: 0,
      userInput: '',
      currentPosition: 0,
      errors: 0,
      keystrokeCount: 0,
      correctKeystrokes: 0
    }));
    
    setCurrentStats({
      wpm: 0,
      accuracy: 100,
      progress: 0,
      elapsedTime: 0
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
    const finalStats = calculateStats();
    
    setTypingState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      endTime
    }));

    // 播放完成音效
    playSound('complete');

    // 构建结果数据
    const result = {
      wpm: finalStats.wpm,
      accuracy: finalStats.accuracy,
      errors: typingState.errors,
      timeSpent: (endTime - typingState.startTime) / 1000,
      textLength: typingState.originalText.length,
      difficulty: typingState.difficulty,
      textType: typingState.textType,
      completedWords: Math.floor(typingState.originalText.length / 5),
      keystrokeCount: typingState.keystrokeCount,
      correctKeystrokes: typingState.correctKeystrokes
    };

    // 提交结果到服务器
    try {
      setIsLoading(true);
      const response = await fetch('/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: typingState.originalText,
          userInput: typingState.userInput,
          result: result,
          screenInfo: {
            width: window.screen.width,
            height: window.screen.height
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 显示结果
        console.log('Practice completed successfully:', data.data);
      } else {
        console.error('Failed to submit result:', data.error);
      }
    } catch (error) {
      console.error('Error submitting practice result:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typingState, calculateStats, playSound]);

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
      const response = await fetch('/typing/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          difficulty: difficulty || typingState.difficulty,
          textType: textType || typingState.textType
        })
      });

      const data = await response.json();
      
      if (data.success && data.data.text) {
        setTypingState(prev => ({
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
          correctKeystrokes: 0
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
      setTypingState(prev => ({
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
        correctKeystrokes: 0
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
      {/* 顶部标题栏 */}
      <div className="section__header">
        <h1 className="section__title">
          <span className="typing-icon">⌨️</span>
          打字练习
        </h1>
        <div className="section__tools">
          <div className="user-score">
            <span className="icon">🏆</span>
            最佳: {initialData.userStats?.bestWPM || 0} WPM
          </div>
          <div className="user-level">
            <span className="icon">📊</span>
            等级: {initialData.userStats?.level || 1}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="typing-practice-main">
        <div className="typing-main-panel">
          {/* 配置面板 */}
          <div className="typing-config-panel">
            <div className="config-group">
              <label>难度</label>
              <select 
                className="form-control"
                value={typingState.difficulty}
                onChange={(e) => setTypingState(prev => ({...prev, difficulty: e.target.value}))}
              >
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
                <option value="expert">专家</option>
              </select>
            </div>
            <div className="config-group">
              <label>文本类型</label>
              <select
                className="form-control"
                value={typingState.textType}
                onChange={(e) => setTypingState(prev => ({...prev, textType: e.target.value}))}
              >
                <option value="english">英文</option>
                <option value="chinese">中文</option>
                <option value="code">代码</option>
              </select>
            </div>
            <div className="config-group">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCustomTextModal(true)}
              >
                自定义文本
              </button>
            </div>
            <div className="config-group">
              <button 
                className="btn btn-primary"
                onClick={() => generateNewText()}
                disabled={isLoading}
              >
                {isLoading ? '生成中...' : '生成新文本'}
              </button>
            </div>
          </div>

          {/* 打字文本显示区域 */}
          <div className="typing-text-container">
            <div className="text-info">
              <span><strong>长度:</strong> {typingState.originalText.length} 字符</span>
              <span><strong>难度:</strong> {typingState.difficulty}</span>
              <span><strong>类型:</strong> {typingState.textType}</span>
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
              opacity: 0
            }}
            autoComplete="off"
            spellCheck={false}
          />
          
          {/* 控制按钮 */}
          <div className="typing-controls">
            {!typingState.isActive && !typingState.isCompleted && (
              <button 
                onClick={startTyping}
                className="btn btn-success btn-lg"
              >
                ▶ 开始练习
              </button>
            )}
            {typingState.isActive && (
              <button 
                onClick={resetTyping}
                className="btn btn-outline-secondary"
              >
                ⏹ 重置练习
              </button>
            )}
            {typingState.isCompleted && (
              <>
                <button 
                  onClick={startNewPractice}
                  className="btn btn-success"
                >
                  🔄 重新练习
                </button>
                <button 
                  onClick={() => generateNewText()}
                  className="btn btn-outline-secondary"
                >
                  📄 新文本
                </button>
              </>
            )}
          </div>
          
          {/* 实时统计 */}
          <div className="typing-stats-display">
            <div className="stat-item">
              <div className="stat-value">{currentStats.wpm}</div>
              <div className="stat-label">WPM</div>
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

        {/* 侧边栏 */}
        <div className="typing-sidebar">
          {/* 个人统计 */}
          <div className="stats-card">
            <h3>个人统计</h3>
            <div className="stats-grid">
              <div className="stat-row">
                <span className="stat-name">最佳速度</span>
                <span className="stat-value">{initialData.userStats?.bestWPM || 0} WPM</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">平均速度</span>
                <span className="stat-value">{initialData.userStats?.averageWPM || 0} WPM</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">最佳准确率</span>
                <span className="stat-value">{initialData.userStats?.bestAccuracy || 0}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-name">练习次数</span>
                <span className="stat-value">{initialData.userStats?.totalPractices || 0}</span>
              </div>
            </div>
          </div>

          {/* 排行榜 */}
          {initialData.leaderboard && initialData.leaderboard.length > 0 && (
            <div className="leaderboard-card">
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
            <div className="achievements-card">
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

          {/* 提示 */}
          <div className="tips-card">
            <h3>练习提示</h3>
            <ul className="tips-list">
              <li>专注于准确度而不是速度</li>
              <li>使用正确的手指位置</li>
              <li>定期练习获得最佳效果</li>
              <li>适当休息避免疲劳</li>
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
  
  // 初始化React应用
  const mountPoint = document.getElementById('typing-practice-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<TypingPracticeApp />);
  }
}));