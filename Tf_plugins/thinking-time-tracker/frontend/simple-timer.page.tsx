import { addPage, NamedPage, request } from '@hydrooj/ui-default';

// 简化版活跃时间追踪器
class SimpleTimeTracker {
  private pageStartTime: number = Date.now(); // 页面开始时间
  private currentSessionStart: number = Date.now(); // 当前活跃会话开始时间
  private totalActiveTime: number = 0; // 累计活跃时间
  private isActive: boolean = true;
  private lastInteractionTime: number = Date.now();
  private inactivityTimer: number | null = null;
  private checkInterval: number | null = null;
  private isDestroyed: boolean = false;
  // 用于存储当前题目的计时状态
  private currentProblemId: number | null = null;

  private readonly INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5分钟
  private readonly CHECK_INTERVAL = 10 * 1000; // 10秒检查一次

  constructor() {
    this.initForCurrentProblem();
    this.setupListeners();
    this.startInactivityCheck();
  }

  // 初始化当前题目的计时
  private initForCurrentProblem() {
    this.currentProblemId = this.getCurrentProblemId();

    // 检查localStorage中是否有该题目的计时记录
    if (this.currentProblemId) {
      const savedTime = localStorage.getItem(`thinking-time-${this.currentProblemId}`);
      if (savedTime) {
        const parsed = JSON.parse(savedTime);
        this.totalActiveTime = parsed.totalActiveTime || 0;
        console.log(`📖 恢复题目 ${this.currentProblemId} 的计时记录: ${this.totalActiveTime}秒`);
      }
    }
  }

  // 获取当前题目ID
  private getCurrentProblemId(): number | null {
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

  // 重置当前题目的计时（AC时调用）
  resetTimer() {
    console.log('🎉 AC成功！重置计时器');
    this.totalActiveTime = 0;
    this.currentSessionStart = Date.now();
    this.isActive = true;
    this.lastInteractionTime = Date.now();

    // 清除localStorage中的记录
    if (this.currentProblemId) {
      localStorage.removeItem(`thinking-time-${this.currentProblemId}`);
    }
  }

  // 保存当前计时状态到localStorage
  private saveTimingState() {
    if (this.currentProblemId && this.totalActiveTime > 0) {
      const stateData = {
        totalActiveTime: this.getActiveTime(),
        lastSaved: Date.now(),
      };
      localStorage.setItem(`thinking-time-${this.currentProblemId}`, JSON.stringify(stateData));
    }
  }

  private setupListeners() {
    // 页面可见性变化
    this.addEventListenerSafe('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking('页面隐藏');
      } else {
        this.resumeTracking('页面显示');
      }
    });

    // 用户交互事件 - 使用节流
    const interactionEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const throttledHandler = this.throttle(() => this.onUserInteraction(), 1000);

    interactionEvents.forEach((event) => {
      this.addEventListenerSafe(event, throttledHandler, { passive: true });
    });

    // 页面卸载时清理
    this.addEventListenerSafe('beforeunload', () => {
      this.destroy();
    });
  }

  private eventListeners: Array<{ element: Document | Window, event: string, handler: EventListener }> = [];

  private addEventListenerSafe(event: string, handler: EventListener, options?: any) {
    if (this.isDestroyed) return;

    const element = (event === 'visibilitychange' || event === 'beforeunload') ? document : document;
    element.addEventListener(event, handler, options);

    // 记录监听器用于清理
    this.eventListeners.push({ element, event, handler });
  }

  private startInactivityCheck() {
    if (this.checkInterval) return;

    this.checkInterval = window.setInterval(() => {
      if (this.isDestroyed) return;

      const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
      if (this.isActive && timeSinceLastInteraction > this.INACTIVITY_THRESHOLD) {
        this.pauseTracking('长时间无交互');
      }
    }, this.CHECK_INTERVAL);
  }

  private onUserInteraction() {
    if (this.isDestroyed) return;

    this.lastInteractionTime = Date.now();

    // 如果当前不活跃且页面可见，则恢复追踪
    if (!this.isActive && !document.hidden) {
      this.resumeTracking('用户交互');
    }
  }

  private pauseTracking(reason: string) {
    if (!this.isActive || this.isDestroyed) return;

    // 累加当前会话的活跃时间
    if (this.currentSessionStart) {
      const sessionTime = Date.now() - this.currentSessionStart;
      this.totalActiveTime += sessionTime;
    }

    this.isActive = false;

    // 保存当前状态到localStorage
    this.saveTimingState();

    console.debug(`⏸️ 暂停时间追踪: ${reason}`);
  }

  private resumeTracking(reason: string) {
    if (this.isActive || this.isDestroyed || document.hidden) return;

    this.currentSessionStart = Date.now();
    this.isActive = true;
    this.lastInteractionTime = Date.now();

    console.debug(`▶️ 恢复时间追踪: ${reason}`);
  }

  getActiveTime(): number {
    if (this.isDestroyed) return Math.round(this.totalActiveTime / 1000);

    let activeTime = this.totalActiveTime;

    // 如果当前处于活跃状态，加上当前会话时间
    if (this.isActive && this.currentSessionStart) {
      const currentSessionTime = Date.now() - this.currentSessionStart;
      activeTime += currentSessionTime;
    }

    return Math.round(activeTime / 1000);
  }

  getTotalTime(): number {
    if (this.isDestroyed) {
      // 返回页面存在的总时间
      const totalPageTime = this.totalActiveTime > 0 ? Date.now() - this.pageStartTime : 0;
      return Math.round(totalPageTime / 1000);
    }
    return Math.round((Date.now() - this.pageStartTime) / 1000);
  }

  getEfficiency(): number {
    const total = this.getTotalTime();
    const active = this.getActiveTime();
    return total > 0 ? Math.round((active / total) * 100) / 100 : 0;
  }

  getStats() {
    return {
      activeTime: this.getActiveTime(),
      totalTime: this.getTotalTime(),
      efficiency: this.getEfficiency(),
      isActive: this.isActive,
      timeSinceLastInteraction: Math.round((Date.now() - this.lastInteractionTime) / 1000),
    };
  }

  private throttle<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: number | null = null;
    let lastArgs: Parameters<T> | null = null;

    return ((...args: Parameters<T>) => {
      lastArgs = args;
      timeout ||= window.setTimeout(() => {
        if (lastArgs && !this.isDestroyed) {
          func(...lastArgs);
        }
        timeout = null;
      }, wait);
    }) as T;
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.pauseTracking('页面卸载');

    // 清理定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // 清理所有事件监听器
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    console.debug('🧹 时间追踪器已清理');
  }
}

// 提交拦截器
function setupSubmissionInterceptor(tracker: SimpleTimeTracker) {
  // 检查是否为代码提交
  const isCodeSubmission = (url: string, data: any): boolean => {
    try {
      const UiContext = (window as any).UiContext;
      return url === UiContext?.postSubmitUrl
        && data?.code
        && !data?.pretest;
    } catch (error) {
      return false;
    }
  };

  // 显示成功通知
  const showSuccessNotification = (activeTime: number, efficiency: number) => {
    const notification = document.createElement('div');
    const minutes = Math.floor(activeTime / 60);
    const seconds = activeTime % 60;
    const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    const efficiencyText = `(效率${Math.round(efficiency * 100)}%)`;

    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; 
      background: #4CAF50; color: white; 
      padding: 12px 20px; border-radius: 6px; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 9999; font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">⏱️ 思考时间已记录</div>
      <div>活跃时间: ${timeText} ${efficiencyText}</div>
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    if (!document.querySelector('#thinking-time-styles')) {
      style.id = 'thinking-time-styles';
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  };

  // 发送时间数据到后端
  const sendTimeData = async (rid: string) => {
    try {
      const stats = tracker.getStats();

      const response = await request.post('/thinking-time', {
        thinkingTime: stats.activeTime,
        rid,
      });

      if (response.success) {
        console.log(`✅ ${response.message}`);
        showSuccessNotification(stats.activeTime, stats.efficiency);
        return true;
      } else {
        throw new Error(response.message || '未知错误');
      }
    } catch (error) {
      console.warn('记录思考时间失败:', error);
      return false;
    }
  };

  // 拦截请求 - 直接使用导入的request对象
  if (typeof request === 'object' && request.post) {
    const originalPost = request.post;

    request.post = function (url: string, data: any, options?: any) {
      const promise = originalPost.call(this, url, data, options);

      // 检查是否是代码提交
      if (isCodeSubmission(url, data)) {
        promise.then(async (response: any) => {
          if (response?.rid) {
            // 异步发送时间数据，不阻塞主流程
            setTimeout(() => {
              sendTimeData(response.rid);
            }, 100);
          } else {
            console.warn('无法记录时间: 缺少提交记录ID', { rid: response?.rid });
          }
        }).catch((error: any) => {
          console.warn('提交请求失败:', error);
        });
      }

      return promise;
    };

    console.log('✅ 提交拦截器已安装');
  } else {
    console.warn('⚠️ 无法安装提交拦截器: request 对象不可用');
  }
}

// 使用更可靠的方式防止重复注册
const PLUGIN_ID = 'thinking-time-tracker-v1.0';
if (!(window as any)[PLUGIN_ID]) {
  // 注册到题目页面
  addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
    console.log('⏱️ 思考时间追踪器已启动');

    const tracker = new SimpleTimeTracker();

    // 直接初始化提交拦截器，request对象已经从模块导入可用
    setupSubmissionInterceptor(tracker);

    // 调试接口
    const isDebug = localStorage.getItem('thinking-time-debug') === 'true';
    if (isDebug) {
      (window as any).thinkingTimeTracker = {
        getActiveTime: () => tracker.getActiveTime(),
        getTotalTime: () => tracker.getTotalTime(),
        getStats: () => tracker.getStats(),
        destroy: () => tracker.destroy(),
      };
      console.log('🔧 调试模式已启用');
      console.log('💡 可用命令: window.thinkingTimeTracker.getStats()');
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      tracker.destroy();
    });
  }));

  // 标记已初始化，使用具体的插件ID避免冲突
  (window as any)[PLUGIN_ID] = true;
  console.log(`🔧 ${PLUGIN_ID} 插件注册完成`);
}
