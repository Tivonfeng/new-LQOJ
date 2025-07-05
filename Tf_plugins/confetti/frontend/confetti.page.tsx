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
        console.log('Confetti: Heartbeat timeout, closing connection');
        if (ws) {
          ws.close();
        }
      }, wsConfig.heartbeatTimeout);
    } catch (error) {
      console.log('Confetti: Failed to send heartbeat');
    }
  }
}

// 启动心跳
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(sendHeartbeat, wsConfig.heartbeatInterval);
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
      animation: fadeIn 0.3s ease-in;
    }

    .confetti-celebration-content {
      background: white;
      border-radius: 20px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      animation: bounceIn 0.5s ease-out;
      max-width: 90vw;
      max-height: 90vh;
    }

    .confetti-celebration-image {
      width: 200px;
      height: 200px;
      object-fit: contain;
      margin-bottom: 20px;
      animation: pulse 1s ease-in-out infinite alternate;
    }

    .confetti-celebration-text {
      font-size: 24px;
      font-weight: bold;
      color: #2ecc71;
      margin-bottom: 10px;
    }

    .confetti-celebration-subtext {
      font-size: 16px;
      color: #7f8c8d;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3) translateY(-50px); opacity: 0; }
      50% { transform: scale(1.05) translateY(-10px); }
      70% { transform: scale(0.95) translateY(0); }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }

    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.1); }
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
function showCelebrationImage() {
  // 创建庆祝图片的HTML结构
  const overlay = document.createElement('div');
  overlay.className = 'confetti-celebration-overlay';

  const content = document.createElement('div');
  content.className = 'confetti-celebration-content';

  // 使用emoji作为庆祝图标
  const celebrationHTML = `
    <div style="font-size: 120px; margin-bottom: 20px;">🎉</div>
    <div class="confetti-celebration-text">恭喜通过！</div>
    <div class="confetti-celebration-subtext">Accepted！继续加油！</div>
  `;

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

  // 延迟显示庆祝图片，让confetti先出现
  showCelebrationImage();
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
    console.log('Confetti: Connecting to WebSocket...');

    ws = new WebSocket(UiContext.ws_prefix + UiContext.pretestConnUrl);

    ws.onopen = () => {
      console.log('Confetti: WebSocket connected');
      isConnecting = false;
      reconnectAttempts = 0;
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // 处理心跳响应
        if (msg.type === 'pong') {
          if (heartbeatTimeoutTimer) {
            clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = null;
          }
          return;
        }

        // 处理AC状态
        if (msg.rdoc?.status === 1) {
          console.log('Confetti: AC detected, showing celebration');
          showCelebration();
        }
      } catch (error) {
        // 静默处理错误
      }
    };

    ws.onclose = (event) => {
      console.log('Confetti: WebSocket closed', event.code, event.reason);
      isConnecting = false;
      stopHeartbeat();

      // 尝试重连
      if (reconnectAttempts < wsConfig.maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Confetti: Attempting to reconnect... (${reconnectAttempts}/${wsConfig.maxReconnectAttempts})`);

        reconnectTimer = window.setTimeout(() => {
          connectWebSocket();
        }, wsConfig.reconnectInterval);
      } else {
        console.log('Confetti: Max reconnect attempts reached');
      }
    };

    ws.onerror = (error) => {
      console.log('Confetti: WebSocket error', error);
      isConnecting = false;
    };
  } catch (error) {
    console.log('Confetti: Failed to create WebSocket connection', error);
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
