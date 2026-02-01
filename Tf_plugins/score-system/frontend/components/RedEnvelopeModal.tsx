/**
 * 红包弹窗组件
 * 全局显示的红包领取弹窗
 * 支持 WebSocket 实时接收红包消息
 */
import './RedEnvelopeModal.css';

import { Button, Modal, Typography } from 'antd';
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

// 红包弹窗组件
const RedEnvelopeModal: React.FC<{
  visible: boolean;
  envelope: RedEnvelopeBrief | null;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
  claimResult: { success: boolean, amount?: number, error?: string } | null;
}> = ({ visible, envelope, onClose, onClaim, claiming, claimResult }) => {
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
            <Button
              type="primary"
              onClick={onClaim}
              loading={claiming}
              block
              size="large"
              className="red-envelope-claim-btn"
            >
              {claiming ? '领取中...' : '立即领取'}
            </Button>
          )}
          <Text type="secondary" className="red-envelope-countdown">
            {countdown > 0 ? `${countdown}秒后自动关闭` : '正在关闭...'}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

// 单例管理器
class RedEnvelopeModalManager {
  private static instance: RedEnvelopeModalManager;
  private root: ReturnType<typeof createRoot> | null = null;
  private container: HTMLDivElement | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private state = {
    visible: false,
    envelope: null as RedEnvelopeBrief | null,
    claiming: false,
    claimResult: null as { success: boolean, amount?: number, error?: string } | null,
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
    // 创建容器
    this.container = document.createElement('div');
    this.container.id = 'red-envelope-modal-container';
    this.container.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 9999;';
    document.body.appendChild(this.container);

    // 创建 React 根
    this.root = createRoot(this.container);

    // 渲染组件
    this.render();

    // 初始化 WebSocket 连接
    this.initWebSocket();
  }

  private updateState(newState: Partial<typeof this.state>) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  private render() {
    if (!this.root) return;

    this.root.render(
      <RedEnvelopeModal
        visible={this.state.visible}
        envelope={this.state.envelope}
        onClose={() => this.close()}
        onClaim={() => this.claim()}
        claiming={this.state.claiming}
        claimResult={this.state.claimResult}
      />,
    );
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
          // 收到新红包消息
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
   * 处理新红包消息
   */
  private handleNewRedEnvelope(envelope: RedEnvelopeBrief) {
    console.log('[RedEnvelopeModal] 收到新红包:', envelope.envelopeId);
    // 显示红包弹窗
    this.show(envelope);
  }

  /**
   * 处理红包被领取的消息
   */
  private handleEnvelopeClaimed(data: { envelopeId: string, remainingCount: number }) {
    console.log('[RedEnvelopeModal] 红包被领取:', data.envelopeId, '剩余:', data.remainingCount);

    // 如果当前显示的是同一个红包，更新剩余数量
    if (this.state.envelope?.envelopeId === data.envelopeId) {
      this.updateState({
        envelope: {
          ...this.state.envelope,
          remainingCount: data.remainingCount,
        },
      });
    }
  }

  /**
   * 显示红包弹窗
   */
  show(envelope: RedEnvelopeBrief) {
    console.log('[RedEnvelopeModal] 显示红包弹窗:', envelope.envelopeId);

    // 检查是否已经显示
    if (this.state.visible && this.state.envelope) {
      console.log('[RedEnvelopeModal] 已有红包弹窗显示，忽略新红包');
      return;
    }

    this.updateState({
      visible: true,
      envelope,
      claiming: false,
      claimResult: null,
    });
  }

  /**
   * 关闭弹窗
   */
  close() {
    console.log('[RedEnvelopeModal] 关闭红包弹窗');
    this.updateState({
      visible: false,
      envelope: null,
      claiming: false,
      claimResult: null,
    });
  }

  /**
   * 领取红包
   */
  private async claim() {
    if (!this.state.envelope || this.state.claiming) return;

    this.updateState({ claiming: true, claimResult: null });

    try {
      const response = await fetch(
        `/score/red-envelope/${this.state.envelope.envelopeId}/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
        },
      );

      const result = await response.json();

      if (result.success) {
        console.log('[RedEnvelopeModal] 领取成功:', result.amount);
        this.updateState({
          claiming: false,
          claimResult: { success: true, amount: result.amount },
        });
      } else {
        console.log('[RedEnvelopeModal] 领取失败:', result.error);
        this.updateState({
          claiming: false,
          claimResult: { success: false, error: result.error },
        });
      }
    } catch (error) {
      console.error('[RedEnvelopeModal] 领取失败:', error);
      this.updateState({
        claiming: false,
        claimResult: { success: false, error: '网络错误，请重试' },
      });
    }
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
function initGlobalListener() {
  // 监听自定义事件（兼容旧版）
  document.addEventListener('score:red-envelope', ((e: Event) => {
    const event = e as CustomEvent;
    const { envelope } = event.detail;
    if (envelope) {
      redEnvelopeModalManager.show(envelope);
    }
  }) as EventListener);
}

// 自动初始化
function autoInit() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalListener);
  } else {
    initGlobalListener();
  }
}

// 在模块加载完成后执行初始化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

// 导出 React 组件（用于手动控制）
export { RedEnvelopeModal };
