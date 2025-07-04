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
  // 可以配置多个音效文件，插件会随机选择一个播放
  soundFiles: [
    '/static/sounds/success1.mp3',
    '/static/sounds/success2.mp3',
    '/static/sounds/celebration.mp3',
  ],
  volume: 0.3, // 音量 (0-1)
  enableSound: true, // 是否启用音效
};

// 创建并预加载音频
const audioElements: HTMLAudioElement[] = [];
let audioPreloaded = false;

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
        // 静默处理播放失败
      });
    }
  } catch (error) {
    // 静默处理错误
  }
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

// 注册到指定页面
addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  // 创建样式
  createCelebrationStyles();

  // 预加载音频
  preloadAudio();

  // 设置WebSocket监听
  try {
    const UiContext = (window as any).UiContext;
    if (!UiContext?.ws_prefix || !UiContext?.pretestConnUrl) {
      return;
    }

    const ws = new WebSocket(UiContext.ws_prefix + UiContext.pretestConnUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.rdoc?.status === 1) {
          showCelebration();
        }
      } catch (error) {
        // 静默处理错误
      }
    };

    ws.onerror = () => {
      // 静默处理错误
    };
  } catch (error) {
    // 静默处理错误
  }
}));
