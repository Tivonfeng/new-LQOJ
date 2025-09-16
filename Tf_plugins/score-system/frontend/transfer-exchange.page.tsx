/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 转账交易所React组件
const TransferExchangeApp: React.FC = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [, forceUpdate] = useState({});

  const recipientInputRef = useRef<HTMLInputElement>(null);
  const recipientSelectComponentRef = useRef<any>(null);

  // 转账配置 - 从全局变量获取或使用默认值
  const transferConfig = (window as any).transferConfig || {
    minAmount: 1,
    maxAmount: 1000,
    transferFee: 1,
    dailyLimit: 100,
  };

  // 加载最近转账用户列表
  useEffect(() => {
    try {
      const stored = localStorage.getItem('transferExchange_recentRecipients');
      if (stored) {
        const recipients = JSON.parse(stored);
        if (Array.isArray(recipients)) {
          setRecentRecipients(recipients.slice(0, 5)); // 只保留最多5个
        }
      }
    } catch (error) {
      console.warn('加载最近转账用户列表失败:', error);
    }
  }, []);

  // 添加用户到最近列表
  const addToRecentRecipients = useCallback((user: string) => {
    if (!user.trim()) return;

    setRecentRecipients((prev) => {
      // 移除重复项并添加到开头
      const filtered = prev.filter((u) => u !== user);
      const newList = [user, ...filtered].slice(0, 5); // 保持最多5个用户

      // 保存到localStorage
      try {
        localStorage.setItem('transferExchange_recentRecipients', JSON.stringify(newList));
      } catch (error) {
        console.warn('保存最近转账用户列表失败:', error);
      }

      return newList;
    });
  }, []);

  // 初始化UserSelectAutoComplete组件
  useEffect(() => {
    if (recipientInputRef.current) {
      try {
        const $input = $(recipientInputRef.current);
        recipientSelectComponentRef.current = (UserSelectAutoComplete as any).getOrConstruct($input, {
          multi: false,
          freeSolo: true,
          freeSoloConverter: (input: string) => input,
          onChange: (value: any) => {
            if (value && typeof value === 'object' && value.uname) {
              setRecipient(value.uname);
            } else if (typeof value === 'string') {
              setRecipient(value);
            } else if (value === null || value === undefined) {
              setRecipient('');
            }
          },
        });
      } catch (error) {
        console.error('Failed to initialize UserSelectAutoComplete:', error);
      }
    }

    // 清理函数
    return () => {
      if (recipientSelectComponentRef.current) {
        recipientSelectComponentRef.current.detach();
      }
    };
  }, []);

  // 快捷转账操作
  const handleQuickTransfer = useCallback((transferAmount: number, transferReason: string) => {
    // 清除之前的结果消息
    setResult(null);
    setAmount(transferAmount.toString());
    setReason(transferReason);

    // 如果收款人为空，聚焦到用户输入框
    if (!recipient.trim() && recipientInputRef.current) {
      recipientInputRef.current.focus();
    }
  }, [recipient]);

  // 处理收款人输入变化
  const handleRecipientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipient(e.target.value);
  }, []);

  // 快速选择最近转账用户
  const handleSelectRecentRecipient = useCallback((user: string) => {
    // 首先更新React状态，这将触发重新渲染
    setRecipient(user);

    // 使用setTimeout确保React状态更新和重新渲染完成
    setTimeout(() => {
      // 同步UserSelectAutoComplete组件状态
      if (recipientSelectComponentRef.current && recipientInputRef.current) {
        try {
          // 通过组件的value方法设置值
          const userObj = { uname: user, displayName: user };
          if (typeof recipientSelectComponentRef.current.value === 'function') {
            recipientSelectComponentRef.current.value(userObj);
          }
        } catch (error) {
          console.warn('设置用户选择组件失败:', error);
        }
      }

      // 确保所有输入框都显示正确的值
      if (recipientInputRef.current) {
        const parent = recipientInputRef.current.parentElement;
        if (parent && recipientInputRef.current.value === user) {
          // 强制React重新渲染
          forceUpdate({});

          // 更新所有可能的输入框
          const allInputs = parent.querySelectorAll('input');
          allInputs.forEach((input) => {
            if ((input as HTMLInputElement).value !== user) {
              (input as HTMLInputElement).value = user;
            }
          });
        }
      }
    }, 0);
  }, [forceUpdate]);

  // 计算总费用
  const getTotalCost = useCallback(() => {
    const transferAmount = Number.parseInt(amount) || 0;
    return transferAmount + transferConfig.transferFee;
  }, [amount]);

  // 提交转账
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的结果消息
    setResult(null);

    // 获取最终收款人
    let finalRecipient = recipient.trim();
    if (recipientSelectComponentRef.current && recipientSelectComponentRef.current.value) {
      try {
        const selectedUser = recipientSelectComponentRef.current.value();
        if (selectedUser && typeof selectedUser === 'object' && selectedUser.uname) {
          finalRecipient = selectedUser.uname;
        } else if (typeof selectedUser === 'string' && selectedUser.trim()) {
          finalRecipient = selectedUser.trim();
        }
      } catch (error) {
        console.warn('获取用户选择失败，使用输入框值:', error);
        // 如果获取选择失败，继续使用recipient状态值
      }
    }

    // 确保收款人不为空
    finalRecipient ||= recipient.trim();

    if (!finalRecipient || !amount.trim() || !reason.trim()) {
      setResult({ success: false, message: '请填写所有必填字段' });
      return;
    }

    const transferAmount = Number.parseInt(amount);
    if (Number.isNaN(transferAmount) || transferAmount < transferConfig.minAmount || transferAmount > transferConfig.maxAmount) {
      setResult({ success: false, message: `转账金额必须在${transferConfig.minAmount}到${transferConfig.maxAmount}之间` });
      return;
    }

    const totalCost = getTotalCost();
    const userBalance = (window as any).userBalance || 0;
    if (totalCost > userBalance) {
      setResult({ success: false, message: '余额不足（包含手续费）' });
      return;
    }

    // 确认转账
    // eslint-disable-next-line no-alert
    if (!confirm(`确认转账 ${transferAmount} 积分给 ${finalRecipient}？\n手续费：${transferConfig.transferFee} 积分\n总扣除：${totalCost} 积分`)) {
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/score/transfer/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: finalRecipient,
          amount: transferAmount,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? '转账成功' : '转账失败'),
      });

      if (data.success) {
        // 添加用户到最近转账列表
        addToRecentRecipients(finalRecipient);

        // 重置表单
        setAmount('');
        setReason('');

        // 3秒后刷新页面以更新余额和历史记录
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error('转账失败:', error);
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  }, [recipient, amount, reason, getTotalCost, addToRecentRecipients]);

  // 重置表单
  const handleReset = useCallback(() => {
    setRecipient('');
    setAmount('');
    setReason('');
    setResult(null);

    // 清理UserSelectAutoComplete
    if (recipientSelectComponentRef.current) {
      recipientSelectComponentRef.current.clear();
    }
  }, []);

  return (
    <div className="transfer-exchange-react-app">
      {/* 快捷转账区域 */}
      <div className="quick-transfer-section">
        <div className="quick-transfer-header">
          <h4>快捷转账</h4>
          <p className="quick-transfer-subtitle">先选择收款人，再选择转账金额</p>
        </div>

        <div className="quick-transfer-layout">
          {/* 左侧：收款人选择 */}
          <div className="quick-recipients-panel">
            <div className="panel-header">
              <div className="panel-header-content">
                <span className="panel-icon">👥</span>
                <div>
                  <div className="panel-title">最近转账用户</div>
                  <div className="panel-subtitle">从最近转账中快速选择</div>
                </div>
              </div>
              <div className="panel-badge">Step 1</div>
            </div>

            <div className="panel-content">
              {recentRecipients.length > 0 && (
                <div className="recent-recipients-quick">
                  <div className="recipients-grid">
                    {recentRecipients.map((user, index) => (
                      <button
                        key={`${user}-${index}`}
                        type="button"
                        className={`recipient-quick-btn ${recipient === user ? 'active' : ''}`}
                        onClick={() => handleSelectRecentRecipient(user)}
                        aria-label={`选择收款人: ${user}`}
                      >
                        <span className="recipient-icon">👤</span>
                        <span className="recipient-name">{user}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="manual-input-hint">
                <span className="hint-icon">💡</span>
                <span className="hint-text">也可在下方表单中手动输入收款人</span>
              </div>
            </div>
          </div>

          {/* 右侧：转账金额选择 */}
          <div className="quick-amounts-panel">
            <div className="panel-header">
              <div className="panel-header-content">
                <span className="panel-icon">💰</span>
                <div>
                  <div className="panel-title">转账金额</div>
                  <div className="panel-subtitle">选择常用转账金额</div>
                </div>
              </div>
              <div className="panel-badge">Step 2</div>
            </div>

            <div className="panel-content">
              <div className="amounts-grid">
                <div className="amounts-group small">
                  <div className="group-label">小额转账</div>
                  <div className="amounts-row">
                    <button
                      type="button"
                      className="quick-amount-btn small compact"
                      onClick={() => handleQuickTransfer(10, '小额转账')}
                    >
                      <span className="amount-icon">💵</span>
                      <span className="amount-value">10</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                    <button
                      type="button"
                      className="quick-amount-btn small compact"
                      onClick={() => handleQuickTransfer(20, '小额转账')}
                    >
                      <span className="amount-icon">💵</span>
                      <span className="amount-value">20</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                    <button
                      type="button"
                      className="quick-amount-btn small compact"
                      onClick={() => handleQuickTransfer(50, '小额转账')}
                    >
                      <span className="amount-icon">💵</span>
                      <span className="amount-value">50</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                  </div>
                </div>

                <div className="amounts-group medium">
                  <div className="group-label">中额转账</div>
                  <div className="amounts-row">
                    <button
                      type="button"
                      className="quick-amount-btn medium compact"
                      onClick={() => handleQuickTransfer(100, '中额转账')}
                    >
                      <span className="amount-icon">💶</span>
                      <span className="amount-value">100</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                    <button
                      type="button"
                      className="quick-amount-btn medium compact"
                      onClick={() => handleQuickTransfer(200, '中额转账')}
                    >
                      <span className="amount-icon">💶</span>
                      <span className="amount-value">200</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                    <button
                      type="button"
                      className="quick-amount-btn medium compact"
                      onClick={() => handleQuickTransfer(500, '中额转账')}
                    >
                      <span className="amount-icon">💶</span>
                      <span className="amount-value">500</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                  </div>
                </div>

                <div className="amounts-group large">
                  <div className="group-label">大额转账</div>
                  <div className="amounts-row">
                    <button
                      type="button"
                      className="quick-amount-btn large compact"
                      onClick={() => handleQuickTransfer(1000, '大额转账')}
                    >
                      <span className="amount-icon">💷</span>
                      <span className="amount-value">1000</span>
                      <span className="amount-unit">🏴</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="transfer-fee-info">
                <span className="fee-icon">ℹ️</span>
                <span className="fee-text">手续费：{transferConfig.transferFee} 🏴</span>
              </div>
            </div>
          </div>
        </div>

        {/* 手动转账表单 */}
        <div className="manual-transfer-section">
          <div className="section-header">
            <div className="section-header-content">
              <span className="section-icon">✏️</span>
              <div>
                <div className="section-title">手动转账</div>
                <div className="section-subtitle">自定义收款人、金额和备注</div>
              </div>
            </div>
            <div className="section-badge">Alternative</div>
          </div>

          <div className="section-content">
            <form onSubmit={handleSubmit} className="transfer-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    收款人用户名
                  </label>
                  <input
                    ref={recipientInputRef}
                    type="text"
                    name="recipient"
                    value={recipient}
                    onChange={handleRecipientChange}
                    className="form-input"
                    placeholder="搜索并选择收款人..."
                  />
                  <div className="form-hint">输入用户名进行搜索</div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">💰</span>
                    转账金额
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                    placeholder={`${transferConfig.minAmount}-${transferConfig.maxAmount}`}
                    min={transferConfig.minAmount}
                    max={transferConfig.maxAmount}
                    required
                  />
                  <div className="form-hint">
                    范围：{transferConfig.minAmount} - {transferConfig.maxAmount} 积分
                    {amount && ` | 总费用：${getTotalCost()} 积分`}
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <span className="label-icon">📝</span>
                  转账备注
                </label>
                <input
                  type="text"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input"
                  placeholder="请说明此次转账的用途..."
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  <span className="btn-icon">{isSubmitting ? '⏳' : '💸'}</span>
                  <span className="btn-text">{isSubmitting ? '转账中...' : '确认转账'}</span>
                </button>
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  <span className="btn-icon">🔄</span>
                  <span className="btn-text">重置</span>
                </button>
              </div>
            </form>

            {/* 结果显示 */}
            {result && (
              <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                {result.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['transfer_exchange'], async () => {
  console.log('Transfer Exchange React page script loaded');
  console.log('Available window properties:', Object.keys(window));
  console.log('UserBalance from window:', (window as any).userBalance);
  console.log('TransferConfig from window:', (window as any).transferConfig);

  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('transfer-exchange-react-app');
  console.log('Mount point found:', !!mountPoint);
  console.log('Mount point element:', mountPoint);

  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<TransferExchangeApp />);
      console.log('Transfer Exchange React app rendered successfully');

      // 通知应用已挂载成功
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('transferExchangeAppMounted'));
        console.log('transferExchangeAppMounted event dispatched');
      }, 100);
    } catch (error) {
      console.error('Failed to render React app:', error);
    }
  } else {
    console.error('Mount point not found: transfer-exchange-react-app');
  }
}));
