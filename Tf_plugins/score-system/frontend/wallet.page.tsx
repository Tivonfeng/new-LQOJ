/* eslint-disable react-refresh/only-export-components */
import './wallet.page.css';

import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ReloadOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { WalletFloatingBall } from './components/WalletFloatingBall';
import {
  Button,
  Card,
  Dropdown,
  Input,
  List,
  MenuProps,
  Pagination,
  Space,
  Tag,
  Typography,
} from 'antd';
import $ from 'jquery';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 我的钱包React组件
const WalletApp: React.FC = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [, forceUpdate] = useState({});
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [recordsUdocs, setRecordsUdocs] = useState<Record<string, any>>({});
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const recordsPageSize = 10;

  const recipientInputRef = useRef<HTMLInputElement>(null);
  const recipientSelectComponentRef = useRef<any>(null);
  const currentUserId = (window as any).currentUserId;

  // 转账配置 - 从全局变量获取或使用默认值
  const transferConfig = (window as any).transferConfig || {
    minAmount: 1,
    maxAmount: 1000,
    transferFee: 1,
    dailyLimit: 100,
  };
  const balance = (window as any).userBalance ?? 0;

  const quickAmountGroups = useMemo(
    () => [
      {
        key: 'small',
        label: '小额转账',
        tone: 'positive',
        reason: '小额转账',
        amounts: [10, 20, 50],
      },
      {
        key: 'medium',
        label: '中额转账',
        tone: 'warning',
        reason: '中额转账',
        amounts: [100, 200, 500],
      },
      {
        key: 'large',
        label: '大额转账',
        tone: 'danger',
        reason: '大额转账',
        amounts: [1000],
      },
    ],
    [],
  );

  const reasonOptions = useMemo(
    () => ({
      positive: [
        '活动奖励',
        '任务奖励',
        '协作支持',
        '学习互助',
      ],
      neutral: [
        '日常转账',
        '补偿/报销',
        '分摊费用',
      ],
    }),
    [],
  );

  // 快速金额选择（下拉）
  const handleQuickTransfer = useCallback((transferAmount: number, transferReason: string) => {
    setResult(null);
    setAmount(transferAmount.toString());
    setReason(transferReason);

    if (!recipient.trim() && recipientInputRef.current) {
      recipientInputRef.current.focus();
    }
  }, [recipient]);

  const quickAmountMenuItems: MenuProps['items'] = useMemo(
    () => quickAmountGroups.map((group) => ({
      key: `${group.key}-group`,
      label: <Text strong className={`menu-label tone-${group.tone}`}>{group.label}</Text>,
      type: 'group' as const,
      children: group.amounts.map((value) => ({
        key: `${group.key}-${value}`,
        label: (
          <Space>
            <ThunderboltOutlined />
            <span>{value} 积分</span>
          </Space>
        ),
        onClick: () => handleQuickTransfer(value, group.reason),
      })),
    })),
    [handleQuickTransfer, quickAmountGroups],
  );

  // 快速备注选择
  const handleQuickReason = useCallback((reasonText: string) => {
    setReason(reasonText);
    setResult(null);
  }, []);

  const reasonMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'positive-group',
        label: <Text strong style={{ color: '#10b981' }}>奖励/感谢</Text>,
        type: 'group' as const,
        children: reasonOptions.positive.map((text) => ({
          key: `positive-${text}`,
          label: text,
          onClick: () => handleQuickReason(text),
        })),
      },
      {
        key: 'neutral-group',
        label: <Text strong style={{ color: '#6b7280' }}>日常/补偿</Text>,
        type: 'group' as const,
        children: reasonOptions.neutral.map((text) => ({
          key: `neutral-${text}`,
          label: text,
          onClick: () => handleQuickReason(text),
        })),
      },
    ],
    [handleQuickReason, reasonOptions],
  );

  // 加载最近转账用户列表
  useEffect(() => {
    try {
      const stored = localStorage.getItem('wallet_recentRecipients');
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
        localStorage.setItem('wallet_recentRecipients', JSON.stringify(newList));
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
    const transferAmount = Number.parseInt(amount, 10) || 0;
    return transferAmount + transferConfig.transferFee;
  }, [amount, transferConfig.transferFee]);

  // 存储所有记录（用于分页）
  const [allMyRecords, setAllMyRecords] = useState<any[]>([]);
  const [allRecordsUdocs, setAllRecordsUdocs] = useState<Record<string, any>>({});

  // 获取与用户相关的积分记录（获取所有记录）
  const fetchAllMyRecords = useCallback(async () => {
    if (!currentUserId) return;

    setRecordsLoading(true);
    try {
      // 获取用户的积分记录
      const scoreRecordsUrl = (window as any).scoreRecordsUrl || '/score/records';
      const transferHistoryUrl = (window as any).transferHistoryUrl || '/score/transfer/history';

      // 获取所有积分记录（使用较大的limit）
      const scoreParams = new URLSearchParams({
        page: String(1),
        limit: String(1000), // 获取足够多的记录
      });
      const scoreResponse = await fetch(`${scoreRecordsUrl}?${scoreParams.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      // 获取所有转账记录（使用较大的limit）
      const transferParams = new URLSearchParams({
        page: String(1),
        limit: String(1000), // 获取足够多的记录
      });
      const transferResponse = await fetch(`${transferHistoryUrl}?${transferParams.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      const allRecords: any[] = [];
      const allUdocs: Record<string, any> = {};

      // 处理积分记录
      if (scoreResponse.ok) {
        const contentType = scoreResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const scoreResult = await scoreResponse.json();
          if (scoreResult.success && scoreResult.records) {
            // 只保留当前用户的记录
            const userRecords = scoreResult.records.filter((r: any) => r.uid === currentUserId);
            userRecords.forEach((record: any) => {
              allRecords.push({
                ...record,
                type: 'score',
                displayScore: record.score > 0 ? `+${record.score}` : String(record.score),
              });
            });
            if (scoreResult.udocs) {
              Object.assign(allUdocs, scoreResult.udocs);
            }
          }
        }
      }

      // 处理转账记录 - 需要获取所有页
      if (transferResponse.ok) {
        const contentType = transferResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const transferResult = await transferResponse.json();
          if (transferResult.success && transferResult.transfers) {
            transferResult.transfers.forEach((transfer: any) => {
              const isFromMe = transfer.fromUid === currentUserId;
              const isToMe = transfer.toUid === currentUserId;
              if (isFromMe || isToMe) {
                allRecords.push({
                  ...transfer,
                  type: 'transfer',
                  uid: isFromMe ? transfer.toUid : transfer.fromUid,
                  score: isFromMe ? -transfer.amount : transfer.amount,
                  displayScore: isFromMe ? `-${transfer.amount}` : `+${transfer.amount}`,
                  reason: transfer.reason || (isFromMe ? `转账给 ${transfer.toUid}` : `收到来自 ${transfer.fromUid} 的转账`),
                  createdAt: transfer.completedAt || transfer.createdAt,
                  category: 'transfer',
                });
              }
            });
            if (transferResult.udocs) {
              Object.assign(allUdocs, transferResult.udocs);
            }
          }
        }
      }

      // 按时间排序（最新的在前）
      allRecords.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      setAllMyRecords(allRecords);
      setAllRecordsUdocs(allUdocs);
    } catch (error) {
      console.error('获取积分记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  }, [currentUserId]);

  // 根据当前页获取分页数据
  const fetchMyRecords = useCallback((page: number) => {
    const startIndex = (page - 1) * recordsPageSize;
    const endIndex = startIndex + recordsPageSize;
    const paginatedRecords = allMyRecords.slice(startIndex, endIndex);

    setMyRecords(paginatedRecords);
    setRecordsUdocs(allRecordsUdocs);
    setRecordsTotal(allMyRecords.length);
    setRecordsPage(page);
  }, [allMyRecords, allRecordsUdocs, recordsPageSize]);

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

    const transferAmount = Number.parseInt(amount, 10);
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

        // 刷新积分记录
        if (currentUserId) {
          fetchAllMyRecords();
        }

        // 3秒后刷新页面以更新余额
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
  }, [recipient, amount, reason, getTotalCost, addToRecentRecipients, currentUserId, fetchMyRecords]);

  // 返回积分大厅
  const handleGoToHall = useCallback(() => {
    const url = (window as any).scoreHallUrl || '/score/hall';
    window.location.href = url;
  }, []);

  // 初始化时加载所有记录
  useEffect(() => {
    if (currentUserId) {
      fetchAllMyRecords();
    }
  }, [currentUserId, fetchAllMyRecords]);

  // 当所有记录加载完成后，显示第一页
  useEffect(() => {
    if (allMyRecords.length > 0) {
      fetchMyRecords(1);
    }
  }, [allMyRecords, fetchMyRecords]);

  // 处理分页变化
  const handleRecordsPageChange = useCallback((page: number) => {
    fetchMyRecords(page);
  }, [fetchMyRecords]);

  return (
    <div className="wallet-container">
      {/* 个人钱包悬浮球 */}
      {(() => {
        const currentUserId = String((window as any).currentUserId || '');
        const udocs = (window as any).walletData?.udocs || {};
        const currentUser = udocs[currentUserId];
        const isLoggedIn = !!(window as any).currentUserId;
        return (
          <WalletFloatingBall
            currentCoins={balance}
            userInfo={{
              uid: currentUserId,
              avatarUrl: currentUser?.avatarUrl,
              uname: currentUser?.uname,
              displayName: currentUser?.displayName,
            }}
            walletUrl={(window as any).transferUrl || '/score/transfer'}
            isLoggedIn={isLoggedIn}
          />
        );
      })()}
      <Card className="wallet-hero-card" bordered={false}>
        <div className="wallet-hero-content">
          <div className="wallet-hero-text">
            <Title level={2} className="wallet-hero-title">我的钱包</Title>
            <Text className="wallet-hero-subtitle">沿用积分管理的卡片与表单视觉，快速完成转账</Text>
            <div className="wallet-hero-tags">
              <Tag color="blue">单次 {transferConfig.minAmount}-{transferConfig.maxAmount} 积分</Tag>
              <Tag color="purple">手续费 {transferConfig.transferFee} 积分</Tag>
              <Tag color="gold">每日限额 {transferConfig.dailyLimit} 笔</Tag>
            </div>
          </div>
          <div className="wallet-hero-actions">
            <div className="wallet-balance-box">
              <Text type="secondary">当前余额</Text>
              <div className="wallet-balance-value">
                <DollarOutlined />
                <span>{balance}</span>
              </div>
            </div>
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              className="wallet-hero-action-btn"
              onClick={handleGoToHall}
            >
              返回积分大厅
            </Button>
          </div>
        </div>
      </Card>

      <div className="wallet-grid">
        <div className="main-column">
          <Card
            className="section-card wallet-manual-card"
            title={(
              <Space>
                <EditOutlined />
                <span>手动转账</span>
              </Space>
            )}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
              选择收款人并完成转账
            </Text>
            <form onSubmit={handleSubmit} className="wallet-form-modern">
              <div className="form-grid two-rows">
                <div className="form-group">
                  <label className="form-label">
                    <UserOutlined />
                    <span>收款人用户名</span>
                  </label>
                  <input
                    ref={recipientInputRef}
                    type="text"
                    name="recipient"
                    value={recipient}
                    onChange={handleRecipientChange}
                    className="ant-input ant-input-lg"
                    placeholder="搜索并选择收款人..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    输入用户名进行搜索
                  </Text>
                </div>
                <div className="form-group recent-users-column">
                  <label className="form-label">
                    <UserOutlined />
                    <span>最近转账的用户</span>
                  </label>
                  {recentRecipients.length > 0 ? (
                    <div className="recent-users-inline">
                      <Space wrap size={[8, 8]}>
                        {recentRecipients.map((user, index) => (
                          <Button
                            key={`${user}-${index}`}
                            type={recipient === user ? 'primary' : 'default'}
                            icon={<UserOutlined />}
                            size="small"
                            className={`user-quick-btn-inline ${recipient === user ? 'active' : ''}`}
                            onClick={() => handleSelectRecentRecipient(user)}
                          >
                            {user}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      暂无最近记录
                    </Text>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <DollarOutlined />
                    <span>转账金额</span>
                  </label>
                  <Input.Group compact style={{ display: 'flex' }}>
                    <Input
                      type="number"
                      name="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`${transferConfig.minAmount}-${transferConfig.maxAmount}`}
                      min={transferConfig.minAmount}
                      max={transferConfig.maxAmount}
                      required
                      size="large"
                      style={{ flex: 1 }}
                    />
                    <Dropdown
                      menu={{ items: quickAmountMenuItems }}
                      placement="bottomRight"
                      trigger={['click']}
                    >
                      <Button
                        type="default"
                        icon={<ThunderboltOutlined />}
                        size="large"
                        className="amount-dropdown-btn"
                      >
                        快捷选择
                      </Button>
                    </Dropdown>
                  </Input.Group>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    范围：{transferConfig.minAmount}-{transferConfig.maxAmount}，当前预计总扣除 {getTotalCost()} 积分
                  </Text>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <EditOutlined />
                    <span>转账备注</span>
                  </label>
                  <Input.Group compact style={{ display: 'flex' }}>
                    <Input
                      type="text"
                      name="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="请说明此次转账的用途..."
                      required
                      size="large"
                      style={{ flex: 1 }}
                    />
                    <Dropdown
                      menu={{ items: reasonMenuItems }}
                      placement="bottomRight"
                      trigger={['click']}
                    >
                      <Button
                        type="default"
                        icon={<ThunderboltOutlined />}
                        size="large"
                        className="reason-dropdown-btn"
                      >
                        快捷备注
                      </Button>
                    </Dropdown>
                  </Input.Group>
                </div>
              </div>

              <div className="form-actions">
                <Button
                  type="primary"
                  icon={isSubmitting ? <ReloadOutlined spin /> : <SwapOutlined />}
                  htmlType="submit"
                  size="large"
                  loading={isSubmitting}
                  className="wallet-submit-btn"
                >
                  {isSubmitting ? '转账中...' : '确认转账'}
                </Button>
              </div>
            </form>

            {/* 结果显示 */}
            {result && (
              <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                {result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                <span>{result.message}</span>
              </div>
            )}
          </Card>
        </div>

        <div className="sidebar-column">
          <Card
            className="section-card wallet-records-card"
            title={(
              <Space>
                <ThunderboltOutlined />
                <span>我的积分记录</span>
              </Space>
            )}
          >
            {recordsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <ReloadOutlined spin style={{ fontSize: 24, color: '#22c55e' }} />
                <div style={{ marginTop: 8, color: '#6b7280' }}>加载中...</div>
              </div>
            ) : myRecords.length > 0 ? (
              <>
                <List
                  dataSource={myRecords}
                  renderItem={(record) => {
                    const user = recordsUdocs[String(record.uid)] || {};
                    const userName = user.uname || user.displayName || String(record.uid);
                    const isPositive = record.score > 0;
                    const isTransfer = record.type === 'transfer';

                    return (
                      <List.Item className="wallet-record-item">
                        <div className="wallet-record-content">
                          <div className="wallet-record-header">
                            <Space>
                              <Tag color={isPositive ? 'green' : 'red'} className="wallet-record-score">
                                {record.displayScore}
                              </Tag>
                              <Text strong style={{ fontSize: 13 }}>
                                {isTransfer ? (record.score > 0 ? '收到转账' : '转账支出') : record.reason || '积分变动'}
                              </Text>
                            </Space>
                          </div>
                          <div className="wallet-record-meta">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {isTransfer && record.uid !== currentUserId ? (
                                <span>与 {userName}</span>
                              ) : (
                                <span>{record.category || '其他'}</span>
                              )}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.createdAt}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
                {recordsTotal > recordsPageSize && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Pagination
                      current={recordsPage}
                      total={recordsTotal}
                      pageSize={recordsPageSize}
                      onChange={handleRecordsPageChange}
                      size="small"
                      showSizeChanger={false}
                      showQuickJumper={false}
                      showTotal={(total) => `共 ${total} 条`}
                    />
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                <Text type="secondary">暂无积分记录</Text>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['wallet'], async () => {
  // 初始化React应用
  const mountPoint = document.getElementById('wallet-react-app');

  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<WalletApp />);
      console.log('Wallet React app rendered successfully');
    } catch (error) {
      console.error('Failed to render React app:', error);
    }
  } else {
    console.error('Mount point not found: wallet-react-app');
  }
}));
