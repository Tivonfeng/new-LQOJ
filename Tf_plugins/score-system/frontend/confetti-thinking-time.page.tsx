import { addPage, NamedPage, request } from '@hydrooj/ui-default';
import confetti from 'canvas-confetti';

// 常量定义
const CELEBRATION_COOLDOWN = 3000; // 3秒

// 类型定义
interface SubmissionResponse {
  rid?: string;
  success?: boolean;
}

// 思考时间追踪器
class ThinkingTimeTracker {
  private pageStartTime: number = Date.now();
  private isDestroyed: boolean = false;
  private lastSubmittedTime: number | null = null; // 保存最后提交的时间

  constructor() {
    this.setupListeners();
  }

  resetTimer() {
    this.pageStartTime = Date.now();
    this.lastSubmittedTime = null; // 清除已提交的时间
  }

  // 设置最后提交的思考时间
  setLastSubmittedTime() {
    this.lastSubmittedTime = this.getTotalTime();
    console.log('💾 保存提交时的思考时间:', this.lastSubmittedTime);
  }

  // 获取用于显示的思考时间（优先使用已提交的时间）
  getDisplayTime(): number {
    if (this.lastSubmittedTime !== null) {
      console.log('📖 使用已提交的时间:', this.lastSubmittedTime);
      return this.lastSubmittedTime;
    }
    return this.getTotalTime();
  }

  private setupListeners() {
    this.addEventListenerSafe('beforeunload', () => {
      this.destroy();
    });
  }

  private eventListeners: Array<{ element: Document | Window, event: string, handler: EventListener }> = [];

  private addEventListenerSafe(event: string, handler: EventListener, options?: any) {
    if (this.isDestroyed) return;

    document.addEventListener(event, handler, options);
    this.eventListeners.push({ element: document, event, handler });
  }

  getTotalTime(): number {
    return Math.round((Date.now() - this.pageStartTime) / 1000);
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    this.eventListeners.forEach(({ element, event, handler }) =>
      element.removeEventListener(event, handler),
    );
    this.eventListeners = [];
  }
}

// 彩带庆祝功能
class ConfettiCelebration {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private lastCelebrationTime: number = 0;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000; // 1 second
  private maxReconnectDelay: number = 30000; // 30 seconds
  private heartbeatInterval: number = 25000; // 25 seconds
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' = 'disconnected';

  constructor(private tracker: ThinkingTimeTracker) {
    this.initAudio();
    this.connectWebSocket();
    console.log('🎊 ConfettiCelebration初始化完成');
  }

  private async initAudio() {
    try {
      // 检查浏览器支持
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        console.warn('浏览器不支持Web Audio API');
        return;
      }

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch('/ding.mp3');

      if (!response.ok) {
        throw new Error(`音频文件加载失败: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn('音频初始化失败:', error);
      // 清理失败的音频上下文
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  private playSound() {
    if (this.audioContext && this.audioBuffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } else if (this.audioContext) {
      // 回退：如果没有预加载音频，使用简单的振荡器发出短促提示音
      try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        setTimeout(() => {
          try {
            osc.stop();
            gain.disconnect();
          } catch (e) {}
        }, 180);
      } catch (e) {
        // 忽略播放错误
        console.warn('播放回退提示音失败:', e);
      }
    }
  }

  private getThinkingTimeData(): number | null {
    const displayTime = this.tracker.getDisplayTime();
    return displayTime > 0 ? displayTime : null;
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds > 0 ? `${remainingSeconds}秒` : '钟'}`;
    }
    return `${remainingSeconds}秒`;
  }

  // 获取庆祝显示信息
  // 使用 localStorage 追踪首次 AC，比查后端 API 更可靠（避免竞态条件）
  private getCelebrationInfo(
    awardInfo?: { isFirstAC?: boolean, awardedScore?: number },
    pid?: number,
  ): { isFirstAC: boolean, score: number } {
    // 优先使用后端 WebSocket 推送的真实数据（score-system 广播的 record/change）
    if (awardInfo && typeof awardInfo.isFirstAC === 'boolean') {
      return { isFirstAC: Boolean(awardInfo.isFirstAC), score: Number(awardInfo.awardedScore || 0) };
    }
    // 没有推送数据时，用 localStorage 判断是否首次 AC
    if (pid) {
      const key = 'ac_first_' + pid;
      const alreadyAC = localStorage.getItem(key);
      if (!alreadyAC) {
        localStorage.setItem(key, Date.now().toString());
        return { isFirstAC: true, score: 20 };
      }
    }
    // 已经做过的题
    return { isFirstAC: false, score: 0 };
  }

  private showCelebrationImage(
    thinkingTime: number | null,
    _pid?: number,
    _uid?: number,
    awardInfo?: { isFirstAC?: boolean, awardedScore?: number },
  ) {
    const scoreInfo = this.getCelebrationInfo(awardInfo, _pid);

    // 创建样式表 - 简洁版
    const style = document.createElement('style');
    style.textContent = `
      @keyframes simple-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes simple-scale {
        from { 
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to { 
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      @keyframes gentle-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);

    // 创建遮罩层 - 简洁
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 50000;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: simple-fade-in 0.3s ease-out;
    `;

    // 创建主弹窗 - 简洁优雅
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 380px;
      min-width: 320px;
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.2),
        0 8px 24px rgba(0, 0, 0, 0.12);
      animation: simple-scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    // 生成积分显示内容（使用真实的 first-AC/awardedScore 信息）
    const scoreContent = scoreInfo.isFirstAC && scoreInfo.score > 0
      ? `<div style="
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        ">🎁 首次通过奖励 +${scoreInfo.score} 分</div>`
      : scoreInfo.isFirstAC
        ? `<div style="
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.18);
          ">🎉 首次通过（无额外积分）</div>`
        : `<div style="
            background: linear-gradient(135deg, #6c757d, #adb5bd);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
          ">💡 重复通过</div>`;

    // 创建内容
    popup.innerHTML = `
      <div style="
        font-size: 64px;
        margin-bottom: 16px;
        animation: gentle-bounce 2s ease-in-out infinite;
      ">🎉</div>
      
      <div style="
        font-size: 28px;
        font-weight: 700;
        color: #2d3436;
        margin-bottom: 8px;
      ">恭喜通过！</div>
      
      <div style="
        font-size: 16px;
        color: #636e72;
        margin-bottom: 16px;
      ">题目已成功解决</div>
      
      ${scoreContent}
      
      ${thinkingTime ? `
        <div style="
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        ">
          <div style="
            color: #6c757d;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
          ">刷题时间</div>
          
          <div style="
            color: #495057;
            font-size: 28px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          ">${this.formatTime(thinkingTime)}</div>
          
        </div>
      ` : ''}
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.style.animation = 'simple-fade-in 0.3s ease-out reverse';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    };

    setTimeout(cleanup, 3000);
    overlay.addEventListener('click', cleanup);
  }

  private triggerConfetti() {
    console.log('🎊 开始触发彩带效果');
    try {
      // 使用原始confetti插件的配置参数，z-index高于弹窗背景，但低于弹窗内容
      const confettiConfig = {
        particleCount: 40,
        spread: 55,
        ticks: 300,
        zIndex: 60000, // 高于弹窗背景(50000)，但不会被模糊
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'],
      };

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

      console.log('🎊 彩带效果已触发');
    } catch (error) {
      console.error('🚫 彩带效果触发失败:', error);
    }
  }

  private connectWebSocket() {
    if (this.isDestroyed || this.connectionState === 'connecting') return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ WebSocket重连次数超过限制，停止重连');
      this.connectionState = 'failed';
      return;
    }

    const UiContext = (window as any).UiContext;
    if (!UiContext?.pretestConnUrl) {
      console.warn('WebSocket连接参数不可用，彩带庆祝功能可能无法正常工作');
      return;
    }

    this.connectionState = 'connecting';

    try {
      // 关闭之前的连接和定时器
      this.closeConnection();

      // 构建WebSocket URL，处理ws_prefix为空或无效的情况
      let wsUrl = '';
      if (UiContext.ws_prefix && UiContext.ws_prefix.startsWith('ws')) {
        wsUrl = UiContext.ws_prefix + UiContext.pretestConnUrl;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsPrefix = UiContext.ws_prefix || '';
        wsUrl = `${protocol}//${host}${wsPrefix}${UiContext.pretestConnUrl}`;
      }

      console.log(`🔗 正在连接WebSocket (尝试 ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}):`, wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket连接成功，开始监听AC消息');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0; // 重置重连计数
        this.startHeartbeat(); // 开始心跳检测
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          // 处理心跳消息
          if (typeof event.data === 'string' && (event.data === 'ping' || event.data === 'pong')) {
            if (event.data === 'ping') {
              // 收到ping，回复pong
              this.ws?.send('pong');
            }
            return;
          }

          const msg = JSON.parse(event.data);
          console.log('🔍 收到WebSocket消息:', msg);

          // 检测AC状态：status为1且不是pretest
          if (msg.rdoc?.status === 1 && msg.rdoc?.contest !== '000000000000000000000000') {
            console.log('🎯 检测到AC消息！');
            const now = Date.now();
            if (now - this.lastCelebrationTime > CELEBRATION_COOLDOWN) {
              this.lastCelebrationTime = now;

              const thinkingTime = this.getThinkingTimeData();
              const pid = msg.rdoc?.pid;
              const uid = msg.rdoc?.uid;
              console.log('⏱️ 获取到思考时间:', thinkingTime);
              console.log('📝 题目ID:', pid, '用户ID:', uid);

              setTimeout(() => {
                console.log('🎉 开始执行庆祝动画');
                this.playSound();
                this.triggerConfetti();
                this.showCelebrationImage(thinkingTime, pid, uid, msg.rdoc?.scoreAwardInfo);

                this.tracker.resetTimer();
              }, 100);
            } else {
              console.log('⏰ 庆祝冷却中，跳过此次庆祝');
            }
          }
        } catch (error) {
          console.warn('WebSocket消息处理失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`Connection closed, ${event.code} ${event.reason}`);
        this.connectionState = 'disconnected';
        this.ws = null;
        this.stopHeartbeat();

        // 根据关闭代码决定是否重连
        if (!this.isDestroyed && this.shouldReconnect(event.code)) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        this.connectionState = 'disconnected';
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      this.connectionState = 'disconnected';
      if (!this.isDestroyed) {
        this.scheduleReconnect();
      }
    }
  }

  private shouldReconnect(closeCode: number): boolean {
    // 某些关闭代码不应该重连
    const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
    return !noReconnectCodes.includes(closeCode);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;

    this.reconnectAttempts++;

    // 指数退避算法：delay = min(baseDelay * 2^attempts, maxDelay) + jitter
    const exponentialDelay = Math.min(
      this.baseReconnectDelay * 2 ** (this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );

    // 添加随机抖动，避免多个客户端同时重连
    const jitter = Math.random() * 1000;
    const delay = exponentialDelay + jitter;

    console.warn(`⏰ WebSocket将在 ${Math.round(delay / 1000)} 秒后重连 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        this.startHeartbeat(); // 递归调用以继续心跳
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private closeConnection() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.connectionState = 'disconnected';

    // 清理所有定时器和连接
    this.closeConnection();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 清理音频资源
    this.audioContext?.close();
    this.audioContext = null;
    this.audioBuffer = null;
  }
}

// 提交拦截器
function setupSubmissionInterceptor(tracker: ThinkingTimeTracker) {
  const isCodeSubmission = (url: string, data: any): boolean => {
    const UiContext = (window as any).UiContext;
    return url === UiContext?.postSubmitUrl && data?.code && !data?.pretest;
  };

  const sendTimeData = async (rid: string) => {
    try {
      const totalTime = tracker.getTotalTime();
      console.log('🕐 准备发送思考时间数据:', { rid, totalTime });

      // 在发送前保存提交时的时间
      tracker.setLastSubmittedTime();

      const response = await request.post('/thinking-time', {
        thinkingTime: totalTime,
        rid,
      });

      console.log('📡 后端响应:', response);

      if (response.success) {
        console.log('✅ 思考时间记录成功');
        return true;
      } else {
        throw new Error(response.message || '未知错误');
      }
    } catch (error) {
      console.warn('❌ 记录思考时间失败:', error);
      return false;
    }
  };

  if (typeof request === 'object' && request.post) {
    const originalPost = request.post;

    request.post = function (url: string, data: any, options?: any) {
      const promise = originalPost.call(this, url, data, options);

      if (isCodeSubmission(url, data)) {
        console.log('🎯 检测到代码提交:', { url, hasCode: !!data?.code, isPretest: !!data?.pretest });
        promise.then(async (response: SubmissionResponse) => {
          console.log('📝 提交响应:', { rid: response?.rid, success: response?.success });
          if (response?.rid) {
            setTimeout(() => {
              sendTimeData(response.rid!);
            }, 100);
          }
        }).catch((error: any) => {
          console.warn('❌ 提交请求失败:', error);
        });
      }

      return promise;
    };
  } else {
    console.warn('⚠️ 无法安装提交拦截器: request 对象不可用');
  }
}

addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  const tracker = new ThinkingTimeTracker();
  // 初始化彩带庆祝功能，传递tracker引用
  const celebration = new ConfettiCelebration(tracker);

  setupSubmissionInterceptor(tracker);

  window.addEventListener('beforeunload', () => {
    tracker.destroy();
    celebration.destroy();
  });
}));
