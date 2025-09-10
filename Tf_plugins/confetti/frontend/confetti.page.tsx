import { addPage, NamedPage } from '@hydrooj/ui-default';
import confetti from 'canvas-confetti';

// Canvas confetti配置
const confettiConfig = {
  particleCount: 40,
  spread: 55,
  ticks: 300,
  zIndex: 2500,
  colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'],
};

// 音效配置
const audioConfig = {
  // 播放当前目录下的ding.mp3
  soundFiles: [
    '/ding.mp3',
  ],
  volume: 0.3, // 音量 (0-1)
  enableSound: true, // 是否启用音效
};

// WebSocket重连配置
const wsConfig = {
  maxReconnectAttempts: 5,
  reconnectInterval: 3000, // 3秒
  heartbeatInterval: 30000, // 30秒心跳
  heartbeatTimeout: 5000, // 5秒心跳超时
};

// 创建并预加载音频
const audioElements: HTMLAudioElement[] = [];
let audioPreloaded = false;

// WebSocket连接管理
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let heartbeatTimeoutTimer: number | null = null;
let isConnecting = false;

function preloadAudio() {
  if (audioPreloaded || !audioConfig.enableSound) return;

  audioConfig.soundFiles.forEach((soundFile, index) => {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = audioConfig.volume;
      audio.src = soundFile;
      audioElements[index] = audio;
    } catch (error) {
      // 静默处理错误
    }
  });

  audioPreloaded = true;
}

// 重新预加载音频（在需要时）
function reloadAudio() {
  if (!audioConfig.enableSound) return;

  audioElements.forEach((audio) => {
    if (audio) {
      try {
        audio.load(); // 重新加载音频
      } catch (error) {
        // 静默处理错误
      }
    }
  });
}

// 播放庆祝音效
function playCelebrationSound() {
  if (!audioConfig.enableSound || audioElements.length === 0) return;

  try {
    // 随机选择一个音效
    const randomIndex = Math.floor(Math.random() * audioElements.length);
    const audio = audioElements[randomIndex];

    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // 如果播放失败，尝试重新加载音频
        reloadAudio();
      });
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 清理定时器
function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
}

// 停止心跳
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
}

// 发送心跳
function sendHeartbeat() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: 'ping' }));

      // 设置心跳超时
      heartbeatTimeoutTimer = window.setTimeout(() => {
        if (ws) {
          ws.close();
        }
      }, wsConfig.heartbeatTimeout);
    } catch (error) {
      // 静默处理心跳发送失败
    }
  }
}

// 启动心跳
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(sendHeartbeat, wsConfig.heartbeatInterval);
}

// 获取当前题目ID
function getCurrentProblemId(): number | null {
  try {
    const UiContext = (window as any).UiContext;
    if (UiContext?.pdoc?.docId) {
      return UiContext.pdoc.docId;
    }
    const match = window.location.pathname.match(/\/p\/(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch (error) {
    console.warn('获取题目ID失败:', error);
    return null;
  }
}

// 获取思考时间数据
function getThinkingTimeData(): { totalTime: number } | null {
  try {
    // 优先从全局thinking-time-tracker对象获取实时数据
    const thinkingTimeTracker = (window as any).thinkingTimeTracker;

    if (thinkingTimeTracker && typeof thinkingTimeTracker.getTotalTime === 'function') {
      const totalTime = thinkingTimeTracker.getTotalTime();
      // 只有当全局对象返回有效时间时才使用
      if (totalTime > 0) {
        return {
          totalTime,
        };
      }
    }

    // 全局对象不可用或返回无效时间时，从localStorage获取数据作为fallback
    const problemId = getCurrentProblemId();
    if (!problemId) return null;

    const savedTime = localStorage.getItem(`thinking-time-${problemId}`);
    if (!savedTime) return null;

    const parsed = JSON.parse(savedTime);
    if (parsed.totalTime !== undefined && parsed.totalTime >= 0) {
      return {
        totalTime: parsed.totalTime,
      };
    }

    return null;
  } catch (error) {
    console.warn('Confetti: 获取思考时间数据失败:', error);
    return null;
  }
}

// 格式化时间显示
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分钟`;
}

// 创建庆祝图片样式
function createCelebrationStyles() {
  if (document.getElementById('confetti-celebration-styles')) return;

  const style = document.createElement('style');
  style.id = 'confetti-celebration-styles';
  style.textContent = `
    .confetti-celebration-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.4s ease-out;
    }

    .confetti-celebration-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(102, 126, 234, 0.2);
      animation: bounceIn 0.6s ease-out;
      max-width: 400px;
      max-height: 90vh;
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
    }

    .confetti-celebration-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
      pointer-events: none;
    }

    .confetti-celebration-image {
      width: 200px;
      height: 200px;
      object-fit: contain;
      margin-bottom: 20px;
      animation: pulse 1s ease-in-out infinite alternate;
    }

    .confetti-celebration-text {
      font-size: 28px;
      font-weight: bold;
      color: white;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }

    .confetti-celebration-subtext {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }

    .confetti-thinking-time-section {
      margin-top: 24px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      position: relative;
      z-index: 1;
    }

    .confetti-thinking-time-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .confetti-thinking-time-value {
      font-size: 24px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
      text-align: center;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }


    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3) translateY(-100px) rotate(-10deg); opacity: 0; }
      50% { transform: scale(1.08) translateY(-10px) rotate(2deg); }
      70% { transform: scale(0.98) translateY(0) rotate(-1deg); }
      100% { transform: scale(1) translateY(0) rotate(0deg); opacity: 1; }
    }

    @keyframes pulse {
      0% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.15) rotate(2deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    .confetti-celebration-overlay.fade-out {
      animation: fadeOut 0.3s ease-out;
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// 关闭庆祝图片
function closeCelebrationImage(overlay: HTMLElement) {
  overlay.classList.add('fade-out');
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 300);
}

// 显示庆祝图片
function showCelebrationImage(thinkingTimeData?: { totalTime: number } | null) {
  // 创建庆祝图片的HTML结构
  const overlay = document.createElement('div');
  overlay.className = 'confetti-celebration-overlay';

  const content = document.createElement('div');
  content.className = 'confetti-celebration-content';

  // 构建庆祝内容，包含思考时间信息
  let celebrationHTML = `
    <div style="font-size: 96px; margin-bottom: 16px; animation: pulse 2s ease-in-out infinite;">🎉</div>
    <div class="confetti-celebration-text">恭喜通过！</div>
    <div class="confetti-celebration-subtext">Accepted！继续加油！</div>
  `;

  // 如果有思考时间数据，添加到显示中
  if (thinkingTimeData && thinkingTimeData.totalTime > 0) {
    const timeText = formatTime(thinkingTimeData.totalTime);
    celebrationHTML += `
      <div class="confetti-thinking-time-section">
        <div class="confetti-thinking-time-label">
          <span>⏱️</span>
          <span>做题时间</span>
        </div>
        <div class="confetti-thinking-time-value">${timeText}</div>
      </div>
    `;
  }

  content.innerHTML = celebrationHTML;
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // 点击任意处关闭
  overlay.addEventListener('click', () => {
    closeCelebrationImage(overlay);
  });

  // 3秒后自动关闭
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      closeCelebrationImage(overlay);
    }
  }, 3000);
}

// AC成功时的完整庆祝效果
function showCelebration() {
  // 获取思考时间数据（在AC重置之前获取）
  const thinkingTimeData = getThinkingTimeData();

  // AC成功后重置前端计时器，为下次做题准备
  const thinkingTimeTracker = (window as any).thinkingTimeTracker;
  if (thinkingTimeTracker && typeof thinkingTimeTracker.resetTimer === 'function') {
    // 重置前端计时器，开始新的计时周期
    thinkingTimeTracker.resetTimer();
  } else {
    // 如果全局对象不可用，手动清除localStorage，防止下次打开题目时恢复旧数据
    const problemId = getCurrentProblemId();
    if (problemId) {
      localStorage.removeItem(`thinking-time-${problemId}`);
    }
  }

  // 重新加载音频（防止长时间空闲后音频资源被释放）
  reloadAudio();

  // 播放庆祝音效
  playCelebrationSound();

  // 显示confetti效果
  // 左侧发射
  confetti({
    ...confettiConfig,
    angle: 60,
    origin: { x: 0 },
  });

  // 右侧发射
  confetti({
    ...confettiConfig,
    angle: 120,
    origin: { x: 1 },
  });

  // 延迟显示庆祝图片，让confetti先出现，并传递思考时间数据
  showCelebrationImage(thinkingTimeData);
}

// 连接WebSocket
function connectWebSocket() {
  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    const UiContext = (window as any).UiContext;
    if (!UiContext?.ws_prefix || !UiContext?.pretestConnUrl) {
      return;
    }

    isConnecting = true;
    ws = new WebSocket(UiContext.ws_prefix + UiContext.pretestConnUrl);

    ws.onopen = () => {
      isConnecting = false;
      reconnectAttempts = 0;
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        // 处理非JSON消息（如心跳的"ping"/"pong"）
        if (typeof event.data === 'string' && (event.data === 'ping' || event.data === 'pong')) {
          if (heartbeatTimeoutTimer) {
            clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = null;
          }
          return;
        }

        const msg = JSON.parse(event.data);

        // 处理心跳响应（JSON格式）
        if (msg.type === 'pong') {
          if (heartbeatTimeoutTimer) {
            clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = null;
          }
          return;
        }

        // 处理AC状态
        if (msg.rdoc?.status === 1 && msg.rdoc?.contest !== '000000000000000000000000') {
          showCelebration();
        }
      } catch (error) {
        console.error('Confetti: Error parsing message:', error, 'Raw data:', event.data);
      }
    };

    ws.onclose = () => {
      isConnecting = false;
      stopHeartbeat();

      // 尝试重连
      if (reconnectAttempts < wsConfig.maxReconnectAttempts) {
        reconnectAttempts++;
        reconnectTimer = window.setTimeout(() => {
          connectWebSocket();
        }, wsConfig.reconnectInterval);
      }
    };

    ws.onerror = () => {
      isConnecting = false;
    };
  } catch (error) {
    console.warn('Confetti: Failed to create WebSocket connection', error);
    isConnecting = false;
  }
}

// 断开WebSocket连接
function disconnectWebSocket() {
  clearTimers();
  stopHeartbeat();

  if (ws) {
    ws.close();
    ws = null;
  }
}

// 页面可见性变化处理
function handleVisibilityChange() {
  if (document.hidden) {
    // 页面隐藏时暂停心跳
    stopHeartbeat();
  } else {
    // 页面显示时恢复心跳和检查连接
    if (ws && ws.readyState === WebSocket.OPEN) {
      startHeartbeat();
    } else {
      connectWebSocket();
    }
  }
}

// 注册到指定页面
addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  // 创建样式
  createCelebrationStyles();

  // 预加载音频
  preloadAudio();

  // 连接WebSocket
  connectWebSocket();

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', () => {
    disconnectWebSocket();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // 定期检查连接状态（作为备用机制）
  const connectionCheckInterval = setInterval(() => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
  }, 60000); // 每分钟检查一次

  // 页面卸载时清理定时器
  window.addEventListener('beforeunload', () => {
    clearInterval(connectionCheckInterval);
  });
}));
