/**
 * 红包弹窗组件
 * 屏幕左上方显示红包图标，点击后直接领取并显示结果
 */
import './RedEnvelopeModal.css';

import { Button, Modal, Typography } from 'antd';
import confetti from 'canvas-confetti';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Text, Title } = Typography;

// 红包简要信息
interface RedEnvelopeBrief {
  envelopeId: string;
  senderName: string;
  senderDisplayName?: string;
  message: string;
  remainingCount: number;
  totalAmount: number;
}

// 红包弹窗组件 - 用于显示领取结果
const RedEnvelopeModal: React.FC<{
  visible: boolean;
  envelope: RedEnvelopeBrief | null;
  onClose: () => void;
  claiming: boolean;
  claimResult: { success: boolean, amount?: number, error?: string } | null;
}> = ({ visible, envelope, onClose, claimResult }) => {
  const [countdown, setCountdown] = useState(5);

  // 倒计时效果
  useEffect(() => {
    if (visible && envelope) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [visible, envelope]);

  // 自动关闭倒计时
  useEffect(() => {
    if (countdown === 0 && visible) {
      onClose();
    }
  }, [countdown, visible, onClose]);

  if (!envelope) return null;

  const displayName = envelope.senderDisplayName || envelope.senderName;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={360}
      className="red-envelope-modal"
    >
      <div className="red-envelope-modal-content">
        {/* 红包头部 */}
        <div className="red-envelope-header">
          <div className="red-envelope-icon">
            <span className="red-envelope-icon-text">🧧</span>
          </div>
          <Title level={4} className="red-envelope-title">
            收到一个红包
          </Title>
        </div>

        {/* 红包信息 */}
        <div className="red-envelope-info">
          <Text className="red-envelope-sender">
            来自: {displayName}
          </Text>
          <Text className="red-envelope-message">
            "{envelope.message}"
          </Text>
          <Text className="red-envelope-amount">
            总额: {envelope.totalAmount} 积分
          </Text>
          <Text className="red-envelope-count">
            剩余: {envelope.remainingCount} 个
          </Text>
        </div>

        {/* 领取结果 */}
        {claimResult && (
          <div className={`red-envelope-result ${claimResult.success ? 'success' : 'error'}`}>
            {claimResult.success ? (
              <>
                <Text strong className="result-text">
                  恭喜！获得 {claimResult.amount} 积分
                </Text>
              </>
            ) : (
              <Text type="danger" className="result-text">
                {claimResult.error || '领取失败'}
              </Text>
            )}
          </div>
        )}

        {/* 按钮区域 */}
        <div className="red-envelope-actions">
          {claimResult?.success ? (
            <Button
              type="primary"
              onClick={onClose}
              block
              size="large"
            >
              我知道了
            </Button>
          ) : (
            <Text type="secondary" className="red-envelope-countdown">
              {countdown > 0 ? `${countdown}秒后自动关闭` : '正在关闭...'}
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

// 音效管理器
class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    try {
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        console.warn('[RedEnvelope] 浏览器不支持 Web Audio API');
        return;
      }

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch('/ding.mp3');

      if (!response.ok) {
        throw new Error(`音频文件加载失败: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('[RedEnvelope] 音效加载成功');
    } catch (error) {
      console.warn('[RedEnvelope] 音效初始化失败:', error);
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  play() {
    if (this.audioContext && this.audioBuffer) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        console.log('[RedEnvelope] 播放提示音');
      } catch (error) {
        console.warn('[RedEnvelope] 播放音效失败:', error);
      }
    } else if (this.audioContext) {
      // 回退：使用振荡器播放简单提示音
      try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        setTimeout(() => {
          try {
            osc.stop();
            gain.disconnect();
          } catch (e) {}
        }, 200);
      } catch (e) {
        console.warn('[RedEnvelope] 播放回退音效失败:', e);
      }
    }
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}

// 彩带效果管理器
class ConfettiManager {
  private isDestroyed = false;

  triggerCelebration() {
    if (this.isDestroyed) return;

    console.log('[RedEnvelope] 触发彩带效果');
    try {
      const confettiConfig = {
        particleCount: 50,
        spread: 60,
        ticks: 200,
        zIndex: 10000,
        colors: ['#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7', '#ffa940', '#ffc53d'],
      };

      // 左侧发射
      confetti({
        ...confettiConfig,
        angle: 60,
        origin: { x: 0.1, y: 0.6 },
      });

      // 右侧发射
      confetti({
        ...confettiConfig,
        angle: 120,
        origin: { x: 0.9, y: 0.6 },
      });

      // 中间发射
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 70,
          ticks: 150,
          zIndex: 10000,
          colors: ['#ff4d4f', '#ff7875', '#ffa39e'],
          origin: { x: 0.5, y: 0.5 },
        });
      }, 100);

      console.log('[RedEnvelope] 彩带效果已触发');
    } catch (error) {
      console.error('[RedEnvelope] 彩带效果触发失败:', error);
    }
  }

  destroy() {
    this.isDestroyed = true;
  }
}

// 单例管理器
class RedEnvelopeModalManager {
  private static instance: RedEnvelopeModalManager;
  private root: ReturnType<typeof createRoot> | null = null;
  private container: HTMLDivElement | null = null;
  private iconContainer: HTMLDivElement | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pendingEnvelope: RedEnvelopeBrief | null = null;
  private claimResult: { success: boolean, amount?: number, error?: string } | null = null;
  private soundManager: SoundManager | null = null;
  private confettiManager: ConfettiManager | null = null;

  private state = {
    visible: false,
    envelope: null as RedEnvelopeBrief | null,
    claiming: false,
  };

  private constructor() {
    console.log('[RedEnvelopeModalManager] 构造函数开始执行');
    this.init();
    console.log('[RedEnvelopeModalManager] 构造函数执行完成');
  }

  static getInstance(): RedEnvelopeModalManager {
    console.log('[RedEnvelopeModalManager] getInstance 被调用');
    RedEnvelopeModalManager.instance ||= new RedEnvelopeModalManager();
    return RedEnvelopeModalManager.instance;
  }

  private init() {
    console.log('[RedEnvelopeModalManager] init() 开始执行');

    // 初始化音效和彩带
    this.soundManager = new SoundManager();
    this.confettiManager = new ConfettiManager();

    // 创建弹窗容器
    this.container = document.createElement('div');
    this.container.id = 'red-envelope-modal-container';
    this.container.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 9999;';
    document.body.appendChild(this.container);

    // 创建图标容器 - 在屏幕左上方
    this.iconContainer = document.createElement('div');
    this.iconContainer.id = 'red-envelope-icon-container';
    this.iconContainer.style.cssText = `
      position: fixed;
      top: 70px;
      left: 20px;
      z-index: 9998;
      display: none;
      cursor: pointer;
    `;
    document.body.appendChild(this.iconContainer);

    // 创建 React 根
    this.root = createRoot(this.container);

    // 渲染弹窗组件
    this.renderModal();

    // 渲染图标组件
    this.renderIcon();

    // 初始化 WebSocket 连接
    this.initWebSocket();
  }

  private renderModal() {
    if (!this.root) return;

    this.root.render(
      <RedEnvelopeModal
        visible={this.state.visible}
        envelope={this.state.envelope}
        onClose={() => this.close()}
        claiming={this.state.claiming}
        claimResult={this.claimResult}
      />,
    );
  }

  private renderIcon() {
    if (!this.iconContainer) return;

    // 清除之前的内容
    this.iconContainer.innerHTML = '';

    // 创建图标元素
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'red-envelope-icon-trigger';
    iconWrapper.innerHTML = `
      <div class="red-envelope-icon-wrapper">
        <span class="red-envelope-icon-emoji">🧧</span>
        <span class="red-envelope-icon-badge">!</span>
        <div class="red-envelope-icon-ripple"></div>
      </div>
      <div class="red-envelope-icon-hint">点击领取</div>
    `;

    // 点击事件 - 直接领取
    iconWrapper.addEventListener('click', () => this.handleIconClick());

    this.iconContainer.appendChild(iconWrapper);
  }

  /**
   * 处理图标点击 - 直接领取红包
   */
  private async handleIconClick() {
    console.log('[RedEnvelopeModal] handleIconClick 被调用');
    console.log('[RedEnvelopeModal] pendingEnvelope:', this.pendingEnvelope);
    console.log('[RedEnvelopeModal] claiming:', this.state.claiming);

    if (!this.pendingEnvelope) {
      console.log('[RedEnvelopeModal] 没有待领取的红包');
      return;
    }
    if (this.state.claiming) {
      console.log('[RedEnvelopeModal] 正在领取中，忽略点击');
      return;
    }

    const envelopeToClaim = this.pendingEnvelope;
    console.log('[RedEnvelopeModal] 用户点击图标，准备领取红包:', envelopeToClaim.envelopeId);

    // 显示领取中状态
    this.state.claiming = true;
    this.renderModal();

    // 隐藏图标
    this.hideIcon();

    try {
      const response = await fetch(
        `/score/red-envelope/${envelopeToClaim.envelopeId}/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
        },
      );

      const result = await response.json();
      console.log('[RedEnvelopeModal] 领取结果:', result);

      if (result.success) {
        console.log('[RedEnvelopeModal] 领取成功:', result.amount);
        this.claimResult = { success: true, amount: result.amount };
        this.state.envelope = envelopeToClaim;

        // 领取成功，播放音效和彩带效果
        this.soundManager?.play();
        this.confettiManager?.triggerCelebration();
      } else {
        console.log('[RedEnvelopeModal] 领取失败:', result.error);
        this.claimResult = { success: false, error: result.error };
        this.state.envelope = envelopeToClaim;
      }
    } catch (error) {
      console.error('[RedEnvelopeModal] 领取失败:', error);
      this.claimResult = { success: false, error: '网络错误，请重试' };
      this.state.envelope = envelopeToClaim;
    }

    // 显示结果弹窗
    this.state.claiming = false;
    this.state.visible = true;
    this.pendingEnvelope = null;
    this.renderModal();

    console.log('[RedEnvelopeModal] 弹窗已显示，visible:', this.state.visible);
  }

  /**
   * 显示图标
   */
  showIcon(envelope: RedEnvelopeBrief) {
    if (!this.iconContainer) {
      console.log('[RedEnvelopeModal] iconContainer 不存在');
      return;
    }

    console.log('[RedEnvelopeModal] 显示红包图标:', envelope.envelopeId);
    console.log('[RedEnvelopeModal] 图标容器:', this.iconContainer);
    this.pendingEnvelope = envelope;

    // 确保容器可见
    this.iconContainer.style.display = 'block';
    this.iconContainer.classList.add('show');

    console.log('[RedEnvelopeModal] 容器父节点:', this.iconContainer.parentNode);
    console.log('[RedEnvelopeModal] 容器可见性:', this.iconContainer.style.display);

    // 15秒后自动隐藏图标（如果用户还没点击）
    setTimeout(() => {
      if (this.pendingEnvelope === envelope) {
        console.log('[RedEnvelopeModal] 图标超时自动隐藏');
        this.hideIcon();
      }
    }, 15000);
  }

  /**
   * 隐藏图标
   */
  private hideIcon() {
    if (!this.iconContainer) return;
    this.iconContainer.style.display = 'none';
    this.iconContainer.classList.remove('show');
    this.pendingEnvelope = null;
  }

  /**
   * 初始化 WebSocket 连接
   */
  private initWebSocket() {
    // 获取 WebSocket URL
    const wsPrefix = (window as any).ws_prefix || (window as any).UiContext?.ws_prefix || '';
    let wsUrl = '';

    console.log('[RedEnvelopeModal] ========== 初始化 WebSocket ==========');
    console.log('[RedEnvelopeModal] window.ws_prefix:', (window as any).ws_prefix);
    console.log('[RedEnvelopeModal] window.UiContext:', (window as any).UiContext);
    console.log('[RedEnvelopeModal] 当前 URL:', window.location.href);
    console.log('[RedEnvelopeModal] 协议:', window.location.protocol);
    console.log('[RedEnvelopeModal] 主机:', window.location.host);

    if (wsPrefix && (wsPrefix.startsWith('ws://') || wsPrefix.startsWith('wss://'))) {
      wsUrl = `${wsPrefix}ws/red-envelope`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/red-envelope`;
    }

    console.log('[RedEnvelopeModal] 最终 WebSocket URL:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RedEnvelopeModal] ✅ WebSocket 连接成功');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        console.log('[RedEnvelopeModal] 收到原始消息:', event.data);
        console.log('[RedEnvelopeModal] WebSocket readyState:', this.ws?.readyState);

        // 检查是否是 JSON 格式
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // 非 JSON 格式（如 "ping"），跳过
          console.log('[RedEnvelopeModal] 收到非 JSON 消息，跳过');
          return;
        }

        console.log('[RedEnvelopeModal] 收到 WebSocket 消息类型:', data.type);

        if (data.type === 'new_red_envelope') {
          // 收到新红包消息 - 显示图标
          console.log('[RedEnvelopeModal] 收到新红包:', data.envelope?.envelopeId);
          this.handleNewRedEnvelope(data.envelope);
        } else if (data.type === 'envelope_claimed') {
          // 红包被领取，更新状态
          this.handleEnvelopeClaimed(data);
        } else if (data.type === 'pong') {
          // 心跳响应
          console.log('[RedEnvelopeModal] 心跳响应');
        } else if (data.type === 'connected') {
          // 连接成功消息
          console.log('[RedEnvelopeModal] ✅ WebSocket 已连接, clientId:', data.clientId);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[RedEnvelopeModal] ❌ WebSocket 连接关闭:', event.code, event.reason);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error: Event) => {
        console.error('[RedEnvelopeModal] ❌ WebSocket 错误:', error);
        console.error('[RedEnvelopeModal] 错误详情:', (error as any).message || 'unknown');
      };
    } catch (error) {
      console.error('[RedEnvelopeModal] 创建 WebSocket 连接失败:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[RedEnvelopeModal] WebSocket 重连次数超过限制，停止重连');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`[RedEnvelopeModal] 将在 ${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.initWebSocket();
      }
    }, delay);
  }

  /**
   * 处理新红包消息 - 显示图标
   */
  private handleNewRedEnvelope(envelope: RedEnvelopeBrief) {
    console.log('[RedEnvelopeModal] 收到新红包，显示图标:', envelope.envelopeId);
    // 显示图标在屏幕左上方
    this.showIcon(envelope);
  }

  /**
   * 处理红包被领取的消息
   */
  private handleEnvelopeClaimed(data: { envelopeId: string, remainingCount: number }) {
    console.log('[RedEnvelopeModal] 红包被领取:', data.envelopeId, '剩余:', data.remainingCount);

    // 如果当前有未领取的红包被领完了，更新图标显示
    if (this.pendingEnvelope?.envelopeId === data.envelopeId && data.remainingCount <= 0) {
      this.pendingEnvelope = {
        ...this.pendingEnvelope,
        remainingCount: data.remainingCount,
      };
    }
  }

  /**
   * 关闭弹窗
   */
  close() {
    console.log('[RedEnvelopeModal] 关闭红包弹窗');
    this.state = {
      visible: false,
      envelope: null,
      claiming: false,
    };
    this.claimResult = null;
    this.renderModal();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
    if (this.iconContainer && this.iconContainer.parentNode) {
      this.iconContainer.parentNode.removeChild(this.iconContainer);
      this.iconContainer = null;
    }
    // 清理音效和彩带管理器
    this.soundManager?.destroy();
    this.soundManager = null;
    this.confettiManager?.destroy();
    this.confettiManager = null;
    RedEnvelopeModalManager.instance = null as any;
  }
}

// 将 redEnvelopeModalManager 挂载到全局（使用 getInstance 获取单例）
console.log('[RedEnvelopeModal] 模块开始加载，准备创建 redEnvelopeModalManager');
const redEnvelopeModalManager = RedEnvelopeModalManager.getInstance();
console.log('[RedEnvelopeModal] redEnvelopeModalManager 已创建:', !!redEnvelopeModalManager);
if (typeof window !== 'undefined') {
  (window as any).redEnvelopeModalManager = redEnvelopeModalManager;
}

// 初始化全局监听器
function initGlobalListener(manager: RedEnvelopeModalManager) {
  // 监听自定义事件（兼容旧版）
  document.addEventListener('score:red-envelope', ((e: Event) => {
    const event = e as CustomEvent;
    const { envelope } = event.detail;
    if (envelope) {
      manager.showIcon(envelope);
    }
  }) as EventListener);
}

// 自动初始化
function autoInit(manager: RedEnvelopeModalManager) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGlobalListener(manager));
  } else {
    initGlobalListener(manager);
  }
}

// 在模块加载完成后执行初始化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoInit(redEnvelopeModalManager));
  } else {
    autoInit(redEnvelopeModalManager);
  }
}

// 导出 React 组件（用于手动控制）
export { RedEnvelopeModal };
