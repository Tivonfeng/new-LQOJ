import { addPage, NamedPage } from '@hydrooj/ui-default';
import $ from 'jquery';

// 解题时间记录器类
class ProblemSolveTimer {
  private startTime: number | null = null;
  private timerElement: JQuery | null = null;
  private intervalId: number | null = null;
  private sessionKey: string = '';
  private isCompleted: boolean = false;
  private problemId: string = '';
  private inactivityTimeout: number | null = null;
  private lastActivityTime: number = Date.now();

  constructor() {
    // 从URL获取题目ID
    this.problemId = this.getProblemId();
    this.sessionKey = `problem_solve_timer_${this.problemId}`;
    this.loadSavedTime();
  }

  // 从URL获取题目ID
  private getProblemId(): string {
    const pathParts = window.location.pathname.split('/');
    // 假设URL格式为 /p/problemId 或 /contest/contestId/p/problemId
    const pIndex = pathParts.indexOf('p');
    if (pIndex !== -1 && pathParts[pIndex + 1]) {
      return pathParts[pIndex + 1];
    }
    // 也支持直接的题目页面 /problem/problemId
    const problemIndex = pathParts.indexOf('problem');
    if (problemIndex !== -1 && pathParts[problemIndex + 1]) {
      return pathParts[problemIndex + 1];
    }
    return '';
  }

  // 创建嵌入到工具栏的计时器UI
  createTimerUI(): JQuery {
    const timerHtml = `
      <div class="scratchpad__toolbar__item scratchpad__timer" id="problem-solve-timer">
        <span class="timer-icon">⏱️</span>
        <span class="time-text">00:00:00</span>
      </div>
    `;

    this.timerElement = $(timerHtml);
    this.setupDoubleClickReset();
    return this.timerElement;
  }

  // 开始计时
  start(): void {
    // 如果已经完成，不再计时
    if (this.isCompleted) return;

    // 只有在scratchpad模式下才开始计时
    if (!this.checkScratchpadMode()) return;

    this.startTime ||= Date.now();

    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = window.setInterval(() => {
      // 检查是否还在scratchpad模式
      if (!this.checkScratchpadMode()) {
        this.pause();
        return;
      }

      // 检查题目切换
      this.checkProblemSwitch();

      this.updateDisplay();
    }, 1000);

    this.saveToStorage();
  }

  // 暂停计时
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.saveToStorage();
  }

  // 检查是否在scratchpad模式
  private checkScratchpadMode(): boolean {
    // 1. 检查是否存在scratchpad相关元素
    if ($('#scratchpad').length > 0 || $('.scratchpad-container').length > 0) {
      return true;
    }

    // 2. 检查是否存在monaco编辑器
    if ($('.ScratchpadMonacoEditor').length > 0) {
      return true;
    }

    // 3. 检查是否存在scratchpad工具栏
    if ($('.scratchpad__toolbar').length > 0) {
      return true;
    }

    // 4. 检查body是否有scratchpad相关类名
    if ($('body').hasClass('scratchpad-mode') || $('body').hasClass('scratchpad-active')) {
      return true;
    }

    return false;
  }

  // 停止计时并保存记录
  complete(): void {
    if (this.isCompleted || !this.startTime) return;

    this.isCompleted = true;
    const solveTime = Date.now() - this.startTime;

    // 停止计时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 更新UI状态
    this.timerElement?.addClass('completed');

    // 显示完成通知
    this.showNotification(`解题完成！用时：${this.formatTime(solveTime)}`, 'success');

    // 清除本地存储
    this.clearStorage();
  }

  // 更新显示
  private updateDisplay(): void {
    if (!this.startTime || this.isCompleted) return;

    const currentTime = Date.now() - this.startTime;
    const timeString = this.formatTime(currentTime);
    this.timerElement?.find('.time-text').text(timeString);
  }

  // 格式化时间显示
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 保存到本地存储
  private saveToStorage(): void {
    if (this.isCompleted) return;

    const data = {
      startTime: this.startTime,
      isCompleted: this.isCompleted,
    };
    localStorage.setItem(this.sessionKey, JSON.stringify(data));
  }

  // 从本地存储加载
  private loadSavedTime(): void {
    try {
      const saved = localStorage.getItem(this.sessionKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.startTime = data.startTime;
        this.isCompleted = data.isCompleted || false;
      }
    } catch {
      // 忽略加载错误
    }
  }

  // 清除存储
  private clearStorage(): void {
    localStorage.removeItem(this.sessionKey);
  }

  // 显示通知
  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = $(`
      <div class="timer-notification ${type}">
        ${message}
      </div>
    `);

    $('body').append(notification);

    setTimeout(() => {
      notification.fadeOut(() => notification.remove());
    }, 3000);
  }

  // 初始化
  init(): void {
    this.updateDisplay();

    // 插入到工具栏中
    this.insertIntoToolbar();

    // 设置活动监听器
    this.setupActivityMonitor();

    if (!this.isCompleted) {
      this.start();
      this.setupACListener();
    } else {
      this.timerElement?.addClass('completed');
    }
  }

  // 插入到scratchpad工具栏中
  private insertIntoToolbar(): void {
    const toolbar = $('.scratchpad__toolbar');
    if (toolbar.length > 0) {
      // 直接添加到工具栏最右边
      toolbar.append(this.timerElement);
    }
  }

  // 设置AC监听器 (已禁用后端交互)
  private setupACListener(): void {
    // 暂时禁用WebSocket连接
    // 可以手动调用 this.complete() 来测试完成状态
    console.log('AC监听器已禁用 - 后端交互已暂停');
  }

  // 设置双击重置功能
  private setupDoubleClickReset(): void {
    if (!this.timerElement) return;

    this.timerElement.on('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.isCompleted) return; // 已完成的不允许重置

      this.showConfirmDialog('确定要重置计时器吗？当前计时将被清零。', () => {
        this.reset();
      });
    });
  }

  // 重置计时器
  private reset(): void {
    // 停止当前计时
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 重置状态
    this.startTime = null;
    this.isCompleted = false;
    this.lastActivityTime = Date.now();

    // 清除存储
    this.clearStorage();

    // 更新UI显示
    this.timerElement?.removeClass('completed');
    this.timerElement?.find('.time-text').text('00:00:00');

    // 重新开始计时
    this.start();

    console.log('计时器已重置');
  }

  // 显示自定义确认对话框
  private showConfirmDialog(message: string, onConfirm: () => void): void {
    const dialog = $(`
      <div class="timer-confirm-dialog">
        <div class="timer-confirm-content">
          <p>${message}</p>
          <div class="timer-confirm-buttons">
            <button class="timer-confirm-cancel">取消</button>
            <button class="timer-confirm-ok">确定</button>
          </div>
        </div>
      </div>
    `);

    $('body').append(dialog);

    dialog.find('.timer-confirm-ok').on('click', () => {
      onConfirm();
      dialog.remove();
    });

    dialog.find('.timer-confirm-cancel').on('click', () => {
      dialog.remove();
    });

    dialog.on('click', (e) => {
      if (e.target === dialog[0]) {
        dialog.remove();
      }
    });
  }

  // 设置活动监听器（用于检测长时间未活动）
  private setupActivityMonitor(): void {
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // 监听各种活动事件
    $(document).on('mousemove keypress click scroll', updateActivity);

    // 启动未活动检查
    this.startInactivityCheck();
  }

  // 启动未活动检查
  private startInactivityCheck(): void {
    const checkInterval = 5 * 60 * 1000; // 每5分钟检查一次
    const inactivityThreshold = 30 * 60 * 1000; // 30分钟未活动阈值

    this.inactivityTimeout = window.setInterval(() => {
      if (this.isCompleted) return;

      const inactiveTime = Date.now() - this.lastActivityTime;
      if (inactiveTime >= inactivityThreshold) {
        this.handleInactivity();
      }
    }, checkInterval);
  }

  // 处理长时间未活动
  private handleInactivity(): void {
    if (this.isCompleted) return;

    const inactiveMinutes = Math.floor((Date.now() - this.lastActivityTime) / 60000);
    this.showConfirmDialog(
      `您已经${inactiveMinutes}分钟未活动，是否要重置计时器？`,
      () => {
        this.reset();
      },
    );
  }

  // 检查题目是否已切换
  private checkProblemSwitch(): void {
    const currentProblemId = this.getProblemId();
    if (currentProblemId !== this.problemId && this.problemId !== '') {
      console.log(`检测到题目切换：${this.problemId} -> ${currentProblemId}`);
      this.clearOldProblemData();
      this.problemId = currentProblemId;
      this.sessionKey = `problem_solve_timer_${this.problemId}`;
      this.reset();
    }
  }

  // 清除旧题目数据
  private clearOldProblemData(): void {
    const oldSessionKey = `problem_solve_timer_${this.problemId}`;
    localStorage.removeItem(oldSessionKey);
    localStorage.removeItem(`${oldSessionKey}_position`);
  }

  // 销毁定时器
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.inactivityTimeout) {
      clearInterval(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }

    // 清理活动监听器
    $(document).off('mousemove keypress click scroll');

    this.saveToStorage();
  }
}

// 创建样式
function createTimerStyles(): void {
  if (document.getElementById('problem-solve-timer-styles')) return;

  const style = document.createElement('style');
  style.id = 'problem-solve-timer-styles';
  style.textContent = `
    /* 解题时间记录器样式 - 工具栏样式 */
    .scratchpad__timer {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: rgba(33, 150, 243, 0.1);
      border-radius: 4px;
      border: 1px solid rgba(33, 150, 243, 0.3);
      font-size: 12px;
      user-select: none;
    }

    .scratchpad__timer.completed {
      background: rgba(76, 175, 80, 0.1);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .scratchpad__timer .timer-icon {
      font-size: 14px;
    }

    .scratchpad__timer .time-text {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 12px;
      font-weight: bold;
      color: #2196F3;
    }

    .scratchpad__timer.completed .time-text {
      color: #4CAF50;
    }

    .timer-notification {
      position: fixed;
      top: 50px;
      right: 20px;
      z-index: 10001;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      animation: slideInRight 0.3s ease;
    }

    .timer-notification.success {
      background: #4CAF50;
    }

    .timer-notification.error {
      background: #f44336;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* 暗色主题适配 */
    .theme--dark .scratchpad__timer {
      background: rgba(100, 181, 246, 0.15);
      border-color: rgba(100, 181, 246, 0.3);
    }

    .theme--dark .scratchpad__timer.completed {
      background: rgba(76, 175, 80, 0.15);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .theme--dark .scratchpad__timer .time-text {
      color: #64B5F6;
    }

    /* 自定义确认对话框样式 */
    .timer-confirm-dialog {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    }

    .timer-confirm-content {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 90%;
      text-align: center;
    }

    .timer-confirm-content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #333;
    }

    .timer-confirm-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .timer-confirm-buttons button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .timer-confirm-cancel {
      background: #f5f5f5;
      color: #666;
    }

    .timer-confirm-cancel:hover {
      background: #e0e0e0;
    }

    .timer-confirm-ok {
      background: #2196F3;
      color: white;
    }

    .timer-confirm-ok:hover {
      background: #1976D2;
    }

    /* 暗色主题下的确认对话框 */
    .theme--dark .timer-confirm-content {
      background: #2d2d2d;
      border: 1px solid #444;
    }

    .theme--dark .timer-confirm-content p {
      color: #e0e0e0;
    }

    .theme--dark .timer-confirm-cancel {
      background: #444;
      color: #e0e0e0;
    }

    .theme--dark .timer-confirm-cancel:hover {
      background: #555;
    }
  `;
  document.head.appendChild(style);
}

// 主要功能实现
let timerInstance: ProblemSolveTimer | null = null;

function createTimer(): void {
  if (timerInstance || $('#problem-solve-timer').length > 0) return;

  console.log('创建解题时间记录器...');

  timerInstance = new ProblemSolveTimer();
  timerInstance.createTimerUI();
  timerInstance.init();

  console.log('解题时间记录器已创建并添加到工具栏');
}

function checkScratchpadMode(): boolean {
  // 检查是否在scratchpad模式
  // 1. 检查是否存在scratchpad相关元素
  if ($('#scratchpad').length > 0 || $('.scratchpad-container').length > 0) {
    return true;
  }

  // 2. 检查是否存在monaco编辑器
  if ($('.ScratchpadMonacoEditor').length > 0) {
    return true;
  }

  // 3. 检查是否存在scratchpad工具栏
  if ($('.scratchpad__toolbar').length > 0) {
    return true;
  }

  // 4. 检查body是否有scratchpad相关类名
  if ($('body').hasClass('scratchpad-mode') || $('body').hasClass('scratchpad-active')) {
    return true;
  }

  console.log('不在scratchpad模式');
  return false;
}

function initProblemSolveTimer(): void {
  console.log('初始化解题时间记录系统...');

  // 创建样式
  createTimerStyles();

  // 监听进入scratchpad模式
  $(document).on('click', '[name="problem-sidebar__open-scratchpad"]', () => {
    console.log('检测到进入scratchpad模式');
    setTimeout(() => {
      const inScratchpadMode = checkScratchpadMode();
      console.log('scratchpad模式检测结果:', inScratchpadMode);
      if (inScratchpadMode) {
        console.log('创建计时器');
        createTimer();
      } else {
        console.log('未检测到scratchpad模式，不创建计时器');
      }
    }, 1500); // 等待scratchpad界面和工具栏加载完成
  });

  // 监听退出scratchpad模式
  $(document).on('click', '[name="problem-sidebar__quit-scratchpad"]', () => {
    console.log('检测到退出scratchpad模式');
    if (timerInstance) {
      timerInstance.destroy();
      timerInstance = null;
      $('#problem-solve-timer').remove();
    }
  });

  // 完全禁用页面加载时的自动检测和创建
  // 只有在用户主动点击进入scratchpad时才创建计时器
}

// 页面卸载时保存状态
window.addEventListener('beforeunload', () => {
  if (timerInstance) {
    timerInstance.destroy();
  }
});

// 注册到problem相关页面
addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  initProblemSolveTimer();
}));
