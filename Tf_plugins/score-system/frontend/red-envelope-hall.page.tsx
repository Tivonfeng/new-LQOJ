/* eslint-disable react-refresh/only-export-components */
import './red-envelope-hall.page.css';

// 导入红包弹窗模块（用于 WebSocket 实时推送）
import './components/RedEnvelopeModal';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  BellOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Text } = Typography;
const { Option } = Select;

// 红包详情接口
interface RedEnvelopeDetail {
  envelopeId: string;
  senderUid: number;
  senderName: string;
  senderDisplayName?: string;
  totalAmount: number;
  totalCount: number;
  remainingAmount: number;
  remainingCount: number;
  message: string;
  type: 'random' | 'average';
  createdAt: string;
  expiredAt: string;
  status: 'active' | 'completed' | 'expired';
  claims: Array<{
    claimerUid: number;
    claimerName: string;
    claimerDisplayName?: string;
    amount: number;
    createdAt: string;
  }>;
  isExpired: boolean;
  canClaim: boolean;
  userHasClaimed: boolean;
  userClaimAmount?: number;
}

// 统计信息接口
interface RedEnvelopeStats {
  totalSent: number;
  totalAmount: number;
  totalClaims: number;
  totalClaimed: number;
}

// 红包大厅数据
interface RedEnvelopeHallData {
  stats: RedEnvelopeStats;
  envelopes: RedEnvelopeDetail[];
  total: number;
  currentUserId?: number;
  currentUserScore?: number;
  isLoggedIn: boolean;
}

// 格式化时间
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// 获取状态标签
function getStatusTag(status: string, isExpired: boolean) {
  if (isExpired || status === 'expired') {
    return <Tag className="status-tag expired">已过期</Tag>;
  }
  if (status === 'completed') {
    return <Tag className="status-tag completed">已领完</Tag>;
  }
  return <Tag className="status-tag active">领取中</Tag>;
}

// 红包大厅 React 组件
const RedEnvelopeHallApp: React.FC = () => {
  // 从全局变量获取数据
  const hallData: RedEnvelopeHallData = (window as any).redEnvelopeHallData || {
    stats: {
      totalSent: 0,
      totalAmount: 0,
      totalClaims: 0,
      totalClaimed: 0,
    },
    envelopes: [],
    total: 0,
    isLoggedIn: false,
  };

  // 发红包表单状态
  const [form] = Form.useForm();
  const [totalAmount, setTotalAmount] = useState(100);
  const [totalCount, setTotalCount] = useState(10);
  const [messageText, setMessageText] = useState('');
  const [envelopeType, setEnvelopeType] = useState<'random' | 'average'>('random');
  const [sending, setSending] = useState(false);

  // 红包列表状态
  const [envelopes, setEnvelopes] = useState<RedEnvelopeDetail[]>(hallData.envelopes);
  const [total, setTotal] = useState(hallData.total);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // 我的记录状态
  const [mySent, setMySent] = useState<RedEnvelopeDetail[]>([]);
  const [myClaimed, setMyClaimed] = useState<RedEnvelopeClaimRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 计算平均金额
  const averageAmount = totalCount > 0 ? Math.floor(totalAmount / totalCount) : 0;

  // 获取红包列表
  const fetchEnvelopes = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/score/red-envelope/list?page=${page}&limit=20`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      const result = await response.json();
      if (result.success) {
        setEnvelopes(result.envelopes);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('获取红包列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取我的记录
  const fetchMyRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      // 获取我发送的红包
      const sentResponse = await fetch('/score/red-envelope/my/sent?page=1&limit=10', {
        method: 'GET',
        credentials: 'same-origin',
      });
      const sentResult = await sentResponse.json();
      if (sentResult.success) {
        setMySent(sentResult.envelopes || []);
      }

      // 获取我领取的红包
      const claimedResponse = await fetch('/score/red-envelope/my/claimed?page=1&limit=10', {
        method: 'GET',
        credentials: 'same-origin',
      });
      const claimedResult = await claimedResponse.json();
      if (claimedResult.success) {
        setMyClaimed(claimedResult.claims || []);
      }
    } catch (error) {
      console.error('获取我的记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  // 切换标签页时加载数据
  useEffect(() => {
    if (activeTab === 'list') {
      fetchEnvelopes(1);
    } else if (activeTab === 'my') {
      fetchMyRecords();
    }
  }, [activeTab, fetchEnvelopes, fetchMyRecords]);

  // 初始化 WebSocket 监听
  useEffect(() => {
    // 红包弹窗组件已在导入时自动初始化

    // 监听红包事件
    const handleRedEnvelope = (e: CustomEvent) => {
      const { envelope } = e.detail;
      if (envelope) {
        console.log('[RedEnvelopeHall] 收到红包事件:', envelope);
        // 刷新列表
        fetchEnvelopes(1);
      }
    };

    document.addEventListener('score:red-envelope', handleRedEnvelope as EventListener);

    return () => {
      document.removeEventListener('score:red-envelope', handleRedEnvelope as EventListener);
    };
  }, [fetchEnvelopes]);

  // 发送红包
  const handleSend = async (values: any) => {
    if (!hallData.isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    if (values.totalAmount > (hallData.currentUserScore || 0)) {
      message.error('积分不足');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/score/red-envelope/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          totalAmount: values.totalAmount,
          totalCount: values.totalCount,
          message: values.message,
          type: values.type,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('红包已发出！');
        form.resetFields();
        setTotalAmount(100);
        setTotalCount(10);
        setMessageText('');
        // 刷新列表
        fetchEnvelopes(1);
      } else {
        message.error(result.error || '发送失败');
      }
    } catch (error) {
      message.error('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  // 领取红包
  const handleClaim = async (envelope: RedEnvelopeDetail) => {
    if (!hallData.isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    try {
      const response = await fetch(`/score/red-envelope/${envelope.envelopeId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });

      const result = await response.json();
      if (result.success) {
        message.success(`恭喜！获得 ${result.amount} 积分`);
        // 刷新列表
        fetchEnvelopes(1);
      } else {
        message.error(result.error || '领取失败');
      }
    } catch (error) {
      message.error('网络错误，请重试');
    }
  };

  // 红包列表项渲染
  const renderEnvelopeItem = (envelope: RedEnvelopeDetail) => {
    const progressPercent = ((envelope.totalCount - envelope.remainingCount) / envelope.totalCount) * 100;
    const senderName = envelope.senderDisplayName || envelope.senderName;
    const typeText = envelope.type === 'random' ? '随机' : '平均';

    return (
            <div className="red-envelope-item" key={envelope.envelopeId}>
                <div className="red-envelope-item-header">
                    <div className="red-envelope-item-info">
                        <div className="red-envelope-item-sender">
                            <UserOutlined /> {senderName}
                        </div>
                        <div className="red-envelope-item-message">
                            "{envelope.message}"
                        </div>
                    </div>
                    <div className="red-envelope-item-amount">
                        <div className="amount-value">{envelope.totalAmount}</div>
                        <div className="amount-label">积分 / {envelope.totalCount}个</div>
                    </div>
                </div>

                <div className="red-envelope-item-footer">
                    <div className="red-envelope-item-progress">
                        <div className="progress-text">
                            已领取 {envelope.totalCount - envelope.remainingCount}/{envelope.totalCount} ({typeText})
                        </div>
                        <Progress
                            percent={Math.round(progressPercent)}
                            showInfo={false}
                            strokeColor={{
                              '0%': '#ff4d4f',
                              '100%': '#ff7875',
                            }}
                        />
                    </div>
                    <div className="red-envelope-item-status">
                        {envelope.canClaim && !envelope.userHasClaimed ? (
                            <Button
                                type="primary"
                                size="small"
                                onClick={() => handleClaim(envelope)}
                            >
                                领取
                            </Button>
                        ) : (
                          getStatusTag(envelope.status, envelope.isExpired)
                        )}
                    </div>
                </div>

                {envelope.claims.length > 0 && (
                    <div className="red-envelope-item-claims">
                        <div className="claims-header">领取记录</div>
                        <div className="claims-list">
                            {envelope.claims.slice(0, 10).map((claim, index) => (
                                <div className="claim-item" key={index}>
                                    <span className="claimer-name">
                                        {claim.claimerDisplayName || claim.claimerName}
                                    </span>
                                    <span className="claim-amount">
                                        +{claim.amount}
                                    </span>
                                </div>
                            ))}
                            {envelope.claims.length > 10 && (
                                <span className="claim-more">...</span>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    {formatTime(envelope.createdAt)}
                </div>
            </div>
    );
  };

  return (
        <div className="red-envelope-hall-container">
            {/* 统计卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card className="red-envelope-stat-card" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">发出红包</div>}
                            value={hallData.stats.totalSent}
                            valueStyle={{ color: '#fff' }}
                            prefix={<PaperClipOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="red-envelope-stat-card secondary" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">发出积分</div>}
                            value={hallData.stats.totalAmount}
                            valueStyle={{ color: '#fff' }}
                            prefix={<SendOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="red-envelope-stat-card tertiary" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">被领取次数</div>}
                            value={hallData.stats.totalClaims}
                            valueStyle={{ color: '#fff' }}
                            prefix={<BellOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="red-envelope-stat-card" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">被领取积分</div>}
                            value={hallData.stats.totalClaimed}
                            valueStyle={{ color: '#fff' }}
                            prefix={<HistoryOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 发红包区域 */}
            {hallData.isLoggedIn && (
                <Card
                    title={
                        <Space>
                            <SendOutlined />
                            <span>发红包</span>
                        </Space>
                    }
                    className="red-envelope-create-card"
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSend}
                        className="red-envelope-form"
                    >
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="totalAmount"
                                    label="总金额"
                                    rules={[
                                      { required: true, message: '请输入总金额' },
                                      { type: 'number', min: 1, max: 100000, message: '金额必须在1-100000之间' },
                                    ]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        placeholder="请输入总金额"
                                        min={1}
                                        max={100000}
                                        value={totalAmount}
                                        onChange={(value) => setTotalAmount(value || 0)}
                                        addonAfter="积分"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    name="totalCount"
                                    label="红包数量"
                                    rules={[
                                      { required: true, message: '请输入红包数量' },
                                      { type: 'number', min: 1, max: 100, message: '数量必须在1-100之间' },
                                    ]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        placeholder="请输入红包数量"
                                        min={1}
                                        max={100}
                                        value={totalCount}
                                        onChange={(value) => setTotalCount(value || 0)}
                                        addonAfter="个"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="message"
                            label="祝福语"
                            initialValue=""
                        >
                            <Input
                                placeholder="恭喜发财，大吉大利！"
                                maxLength={50}
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            name="type"
                            label="分配方式"
                            initialValue="random"
                        >
                            <Select
                                value={envelopeType}
                                onChange={setEnvelopeType}
                                className="red-envelope-type-selector"
                            >
                                <Option value="random">
                                    <span style={{ fontWeight: 500 }}>🎲 随机分配</span>
                                    <br />
                                    <span style={{ fontSize: 12, color: '#999' }}>手气最佳</span>
                                </Option>
                                <Option value="average">
                                    <span style={{ fontWeight: 500 }}>⚖️ 平均分配</span>
                                    <br />
                                    <span style={{ fontSize: 12, color: '#999' }}>每人一份</span>
                                </Option>
                            </Select>
                        </Form.Item>

                        {/* 预览信息 */}
                        <div className="red-envelope-preview">
                            <div className="preview-row">
                                <span className="preview-label">总金额</span>
                                <span className="preview-value">{totalAmount} 积分</span>
                            </div>
                            <div className="preview-row">
                                <span className="preview-label">红包数量</span>
                                <span className="preview-value">{totalCount} 个</span>
                            </div>
                            <div className="preview-row">
                                <span className="preview-label">分配方式</span>
                                <span className="preview-value">
                                    {envelopeType === 'random' ? '随机分配' : '平均分配'}
                                </span>
                            </div>
                            {envelopeType === 'average' && (
                                <div className="preview-row">
                                    <span className="preview-label">预计每份</span>
                                    <span className="preview-value preview-total">
                                        ≈{averageAmount} 积分
                                    </span>
                                </div>
                            )}
                        </div>

                        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={sending}
                                icon={<SendOutlined />}
                                style={{
                                  background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                                  border: 'none',
                                }}
                            >
                                塞钱进红包
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}

            {/* 红包列表 */}
            <Card
                title={
                    <Space>
                        <HistoryOutlined />
                        <span>红包大厅</span>
                        <Text type="secondary">(共 {total} 个)</Text>
                    </Space>
                }
                className="red-envelope-list-card"
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="red-envelope-tabs"
                    items={[
                      {
                        key: 'list',
                        label: '最新红包',
                        children: (
                                <List
                                    dataSource={envelopes}
                                    renderItem={renderEnvelopeItem}
                                    loading={loading}
                                    locale={{
                                      emptyText: (
                                            <div className="red-envelope-empty">
                                                <div className="empty-icon">🧧</div>
                                                <div className="empty-text">暂无红包</div>
                                            </div>
                                      ),
                                    }}
                                />
                        ),
                      },
                      {
                        key: 'my',
                        label: '我的记录',
                        children: (
                                <Tabs
                                    items={[
                                      {
                                        key: 'sent',
                                        label: '我发出的',
                                        children: (
                                                <List
                                                    dataSource={mySent}
                                                    renderItem={renderEnvelopeItem}
                                                    loading={recordsLoading}
                                                    locale={{
                                                      emptyText: (
                                                            <div className="red-envelope-empty">
                                                                <div className="empty-icon">📤</div>
                                                                <div className="empty-text">还没有发出过红包</div>
                                                            </div>
                                                      ),
                                                    }}
                                                />
                                        ),
                                      },
                                      {
                                        key: 'claimed',
                                        label: '我领取的',
                                        children: (
                                                <List
                                                    dataSource={myClaimed}
                                                    renderItem={(item) => (
                                                        <List.Item>
                                                            <List.Item.Meta
                                                                title={
                                                                    <span>
                                                                        来自 {item.envelopeId}
                                                                    </span>
                                                                }
                                                                description={formatTime(item.createdAt)}
                                                            />
                                                            <Text type="danger" strong>
                                                                +{item.amount} 积分
                                                            </Text>
                                                        </List.Item>
                                                    )}
                                                    loading={recordsLoading}
                                                    locale={{
                                                      emptyText: (
                                                            <div className="red-envelope-empty">
                                                                <div className="empty-icon">📥</div>
                                                                <div className="empty-text">还没有领取过红包</div>
                                                            </div>
                                                      ),
                                                    }}
                                                />
                                        ),
                                      },
                                    ]}
                                />
                        ),
                      },
                    ]}
                />
            </Card>
        </div>
  );
};

// 红包领取记录接口
interface RedEnvelopeClaimRecord {
  envelopeId: string;
  claimerUid: number;
  claimerName: string;
  claimerDisplayName?: string;
  amount: number;
  createdAt: string;
  domainId: string;
}

// 注册页面组件
addPage(new NamedPage(['red_envelope_hall'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('red-envelope-hall-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<RedEnvelopeHallApp />);
    } catch (error) {
      console.error('渲染红包大厅失败:', error);
    }
  }
}));
