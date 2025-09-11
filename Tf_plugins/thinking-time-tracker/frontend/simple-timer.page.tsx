import { addPage, NamedPage, request } from '@hydrooj/ui-default';

// 简化版总时间追踪器
class SimpleTimeTracker {
  private pageStartTime: number = Date.now(); // 页面开始时间
  private isDestroyed: boolean = false;
  // 用于存储当前题目的计时状态
  private currentProblemId: number | null = null;

  constructor() {
    this.initForCurrentProblem();
    this.setupListeners();
  }

  // 初始化当前题目的计时
  private initForCurrentProblem() {
    this.currentProblemId = this.getCurrentProblemId();

    // 检查localStorage中是否有该题目的计时记录
    if (this.currentProblemId) {
      const savedTime = localStorage.getItem(`thinking-time-${this.currentProblemId}`);
      if (savedTime) {
        const parsed = JSON.parse(savedTime);
        // 恢复页面开始时间
        this.pageStartTime = parsed.pageStartTime || Date.now();
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
    this.pageStartTime = Date.now();

    // 清除localStorage中的记录
    if (this.currentProblemId) {
      localStorage.removeItem(`thinking-time-${this.currentProblemId}`);
    }
  }

  // 保存当前计时状态到localStorage
  private saveTimingState() {
    if (this.currentProblemId) {
      const totalTime = this.getTotalTime();
      if (totalTime > 0) {
        const stateData = {
          pageStartTime: this.pageStartTime,
          totalTime,
          lastSaved: Date.now(),
        };
        localStorage.setItem(`thinking-time-${this.currentProblemId}`, JSON.stringify(stateData));
      }
    }
  }

  private setupListeners() {
    // 定期保存状态
    const saveInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.saveTimingState();
      }
    }, 30000); // 每30秒保存一次

    // 页面卸载时清理
    this.addEventListenerSafe('beforeunload', () => {
      clearInterval(saveInterval);
      this.saveTimingState(); // 最后保存一次
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

  getTotalTime(): number {
    return Math.round((Date.now() - this.pageStartTime) / 1000);
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.saveTimingState(); // 最后保存一次状态

    // 清理所有事件监听器
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
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
  // const showSuccessNotification = (totalTime: number) => {
  //   const notification = document.createElement('div');
  //   const minutes = Math.floor(totalTime / 60);
  //   const seconds = totalTime % 60;
  //   const timeText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

  //   notification.style.cssText = `
  //     position: fixed; top: 20px; right: 20px;
  //     background: #4CAF50; color: white;
  //     padding: 12px 20px; border-radius: 6px;
  //     box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  //     z-index: 9999; font-size: 14px;
  //     font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  //     animation: slideIn 0.3s ease-out;
  //   `;

  //   notification.innerHTML = `
  //     <div style="font-weight: bold; margin-bottom: 4px;">⏱️ 思考时间已记录</div>
  //     <div>总时间: ${timeText}</div>
  //   `;

  //   // 添加CSS动画
  //   const style = document.createElement('style');
  //   style.textContent = `
  //     @keyframes slideIn {
  //       from { transform: translateX(100%); opacity: 0; }
  //       to { transform: translateX(0); opacity: 1; }
  //     }
  //   `;
  //   if (!document.querySelector('#thinking-time-styles')) {
  //     style.id = 'thinking-time-styles';
  //     document.head.appendChild(style);
  //   }

  //   document.body.appendChild(notification);

  //   setTimeout(() => {
  //     if (document.body.contains(notification)) {
  //       notification.style.animation = 'slideIn 0.3s ease-out reverse';
  //       setTimeout(() => {
  //         if (document.body.contains(notification)) {
  //           document.body.removeChild(notification);
  //         }
  //       }, 300);
  //     }
  //   }, 3000);
  // };

  // 发送时间数据到后端
  const sendTimeData = async (rid: string) => {
    try {
      const totalTime = tracker.getTotalTime();
      console.log('🕐 准备发送思考时间数据:', { rid, totalTime });

      const response = await request.post('/thinking-time', {
        thinkingTime: totalTime,
        rid,
      });

      console.log('📡 后端响应:', response);

      if (response.success) {
        console.log('✅ 思考时间记录成功');
        // showSuccessNotification(totalTime); // 已关闭用时弹窗
        return true;
      } else {
        throw new Error(response.message || '未知错误');
      }
    } catch (error) {
      console.warn('❌ 记录思考时间失败:', error);
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
        console.log('🎯 检测到代码提交:', { url, hasCode: !!data?.code, isPretest: !!data?.pretest });
        promise.then(async (response: any) => {
          console.log('📝 提交响应:', { rid: response?.rid, success: response?.success });
          if (response?.rid) {
            // 异步发送时间数据，不阻塞主流程
            setTimeout(() => {
              sendTimeData(response.rid);
            }, 100);
          }
        }).catch((error: any) => {
          console.warn('❌ 提交请求失败:', error);
        });
      } else {
        console.log('❌ 非代码提交请求:', { url, hasCode: !!data?.code, isPretest: !!data?.pretest });
      }

      return promise;
    };
  } else {
    console.warn('⚠️ 无法安装提交拦截器: request 对象不可用');
  }
}

// 使用更可靠的方式防止重复注册
const PLUGIN_ID = 'thinking-time-tracker-v1.0';
if (!(window as any)[PLUGIN_ID]) {
  // 注册到题目页面
  addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
    const tracker = new SimpleTimeTracker();

    // 直接初始化提交拦截器，request对象已经从模块导入可用
    setupSubmissionInterceptor(tracker);

    // 始终暴露全局对象，供其他插件使用（如confetti）
    (window as any).thinkingTimeTracker = {
      getTotalTime: () => tracker.getTotalTime(),
      resetTimer: () => tracker.resetTimer(),
    };

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      tracker.destroy();
    });
  }));

  // 标记已初始化，使用具体的插件ID避免冲突
  (window as any)[PLUGIN_ID] = true;
}
