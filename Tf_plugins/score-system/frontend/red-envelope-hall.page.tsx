/* eslint-disable react-refresh/only-export-components */
import './red-envelope-hall.page.css';
// 导入红包弹窗模块（用于 WebSocket 实时推送）
import './components/RedEnvelopeModal';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  BellOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  PaperClipOutlined,
  RedEnvelopeOutlined,
  SendOutlined,
  UserOutlined,
  WalletOutlined,
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
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
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
  const [sendModalVisible, setSendModalVisible] = useState(false);

  // 红包列表状态
  const [envelopes, setEnvelopes] = useState<RedEnvelopeDetail[]>(hallData.envelopes);
  const [total, setTotal] = useState(hallData.total);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // 发红包弹窗状态 - 已移除未使用的状态
  // const [createModalVisible, setCreateModalVisible] = useState(false);

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
    const isExpired = envelope.isExpired || envelope.status === 'expired';

    return (
            <div className="red-envelope-item" key={envelope.envelopeId}>
                {/* 左侧：发送者和祝福语 */}
                <div className="red-envelope-item-left">
                    <div className="red-envelope-avatar">
                        <span>{senderName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="red-envelope-item-info">
                        <div className="red-envelope-sender">{senderName}</div>
                        <div className="red-envelope-blessing">{envelope.message}</div>
                    </div>
                </div>

                {/* 中间：金额 */}
                <div className="red-envelope-item-center">
                    <div className="red-envelope-amount">
                        <span className="amount-value">{envelope.totalAmount}</span>
                        <span className="amount-unit">积分</span>
                    </div>
                    <div className="red-envelope-progress">
                        <Progress
                            percent={Math.round(progressPercent)}
                            size="small"
                            strokeColor="#ff4d4f"
                            trailColor="#fff1f0"
                            showInfo={false}
                        />
                        <span className="progress-text">
                            {envelope.totalCount - envelope.remainingCount}/{envelope.totalCount}
                        </span>
                    </div>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="red-envelope-item-right">
                    {envelope.canClaim && !envelope.userHasClaimed ? (
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => handleClaim(envelope)}
                            className="red-envelope-claim-btn"
                        >
                            抢红包
                        </Button>
                    ) : (
                        <Tag className={`red-envelope-status ${isExpired ? 'expired' : envelope.remainingCount === 0 ? 'completed' : 'pending'}`}>
                            {isExpired ? '已过期' : envelope.remainingCount === 0 ? '已领完' : envelope.userHasClaimed ? '已领取' : '待领取'}
                        </Tag>
                    )}
                    <div className="red-envelope-time">{formatTime(envelope.createdAt)}</div>
                </div>

                {/* 领取者头像 */}
                {envelope.claims.length > 0 && (
                    <div className="red-envelope-claimers">
                        <CheckCircleOutlined className="check-icon" />
                        {envelope.claims.slice(0, 3).map((claim, index) => (
                            <div key={index} className="claimer-avatar" data-tooltip={claim.claimerDisplayName || claim.claimerName}>
                                {claim.claimerName?.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {envelope.claims.length > 3 && (
                            <span className="more-claimers">+{envelope.claims.length - 3}</span>
                        )}
                    </div>
                )}
            </div>
    );
  };

  // 骨架屏列表项
  const renderSkeletonItem = () => (
    <div className="red-envelope-item">
      <div className="red-envelope-item-left">
        <Skeleton.Avatar active size={52} shape="circle" />
        <div className="red-envelope-item-info">
          <Skeleton.Input active style={{ width: 100 }} size="small" />
          <Skeleton.Input active style={{ width: 180 }} size="small" />
        </div>
      </div>
      <div className="red-envelope-item-center">
        <Skeleton.Input active style={{ width: 80 }} size="small" />
      </div>
      <div className="red-envelope-item-right">
        <Skeleton.Button active style={{ width: 80, height: 36 }} shape="round" />
      </div>
    </div>
  );

  // 骨架屏数据
  const skeletonData = Array.from({ length: 5 }, () => 0);

  // 自定义加载状态
  const renderLoading = loading ? (
    <List
      dataSource={skeletonData}
      renderItem={() => renderSkeletonItem()}
      className="red-envelope-list"
    />
  ) : null;

  return (
        <div className="red-envelope-hall-container">
            {/* Hero Section */}
            <Card className="hero-card" bodyStyle={{ padding: '32px 24px', position: 'relative', zIndex: 1 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Space direction="vertical" size="small">
                    <Typography.Title level={1} className="hero-title"> 发红包（beta版）
                    </Typography.Title>
                    <Text className="hero-subtitle">
                      发送红包，与大家分享好运
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <Button
                      type="default"
                      icon={<ArrowLeftOutlined />}
                      href={(window as any).scoreHallUrl || '/score/hall'}
                      className="hero-back-button"
                    >
                      返回积分大厅
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* 统计卡片 - 骰子游戏风格 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card className="stat-card-hover red-envelope-stat-card quaternary" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">当前积分</div>}
                            value={hallData.currentUserScore}
                            prefix={<WalletOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card-hover red-envelope-stat-card" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">发出红包</div>}
                            value={hallData.stats.totalSent}
                            prefix={<PaperClipOutlined style={{ color: '#ff4d4f' }} />}
                            valueStyle={{ color: '#ff4d4f', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card-hover red-envelope-stat-card secondary" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">发出积分</div>}
                            value={hallData.stats.totalAmount}
                            prefix={<SendOutlined style={{ color: '#fa8c16' }} />}
                            valueStyle={{ color: '#fa8c16', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card className="stat-card-hover red-envelope-stat-card tertiary" bordered={false}>
                        <Statistic
                            title={<div className="red-envelope-stat-label">被领取</div>}
                            value={hallData.stats.totalClaims}
                            prefix={<BellOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 发红包按钮 */}
            {hallData.isLoggedIn && (
                <div className="send-envelope-button-container">
                    <Button
                        type="primary"
                        size="large"
                        icon={<RedEnvelopeOutlined />}
                        onClick={() => setSendModalVisible(true)}
                        className="send-envelope-float-btn"
                    >
                        发红包
                    </Button>
                </div>
            )}

            {/* 发红包弹窗 */}
            <Modal
                title={
                    <Space>
                        <RedEnvelopeOutlined style={{ color: '#ff4d4f' }} />
                        <span>发红包</span>
                    </Space>
                }
                open={sendModalVisible}
                onCancel={() => {
                  setSendModalVisible(false);
                  form.resetFields();
                  setTotalAmount(100);
                  setTotalCount(10);
                  setMessageText('');
                }}
                footer={null}
                width={480}
                className="red-envelope-send-modal"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSend}
                    className="red-envelope-form"
                >
                    <Row gutter={16}>
                        <Col span={12}>
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
                        <Col span={12}>
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
                        >
                            <Option value="random">🎲 随机分配（手气最佳）</Option>
                            <Option value="average">⚖️ 平均分配（每人一份）</Option>
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

                    <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                              setSendModalVisible(false);
                              form.resetFields();
                              setTotalAmount(100);
                              setTotalCount(10);
                              setMessageText('');
                            }}>
                                取消
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={sending}
                                icon={<SendOutlined />}
                                className="red-envelope-submit-btn"
                            >
                                塞钱进红包
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 红包列表 */}
            <Card
                title={
                    <Space>
                        <RedEnvelopeOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
                        <span style={{ fontSize: '20px', fontWeight: 600 }}>红包大厅</span>
                        <Tag color="red" style={{ fontSize: '14px', padding: '4px 12px' }}>
                            共 {total} 个
                        </Tag>
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
                        label: (
                            <Space>
                                <GiftOutlined />
                                最新红包
                            </Space>
                        ),
                        children: (
                                <>
                                  {renderLoading}
                                  {!loading && (
                                    <List
                                      dataSource={envelopes}
                                      renderItem={renderEnvelopeItem}
                                      className="red-envelope-list"
                                      locale={{
                                        emptyText: (
                                          <div className="red-envelope-empty">
                                            <RedEnvelopeOutlined className="red-envelope-empty-icon" />
                                            <div className="red-envelope-empty-text">暂无红包</div>
                                            <Text type="secondary">快来发个红包吧！</Text>
                                          </div>
                                        ),
                                      }}
                                    />
                                  )}
                                </>
                        ),
                      },
                      {
                        key: 'my',
                        label: (
                            <Space>
                                <UserOutlined />
                                我的记录
                            </Space>
                        ),
                        children: (
                                <Tabs
                                    className="my-record-tabs"
                                    items={[
                                      {
                                        key: 'sent',
                                        label: (
                                            <Space>
                                                <SendOutlined />
                                                我发出的 ({mySent.length})
                                            </Space>
                                        ),
                                        children: (
                                                <List
                                                    dataSource={mySent}
                                                    renderItem={renderEnvelopeItem}
                                                    loading={recordsLoading}
                                                    className="red-envelope-list"
                                                    locale={{
                                                      emptyText: (
                                                            <div className="red-envelope-empty">
                                                                <SendOutlined className="red-envelope-empty-icon" />
                                                                <div className="red-envelope-empty-text">还没有发出过红包</div>
                                                                <Text type="secondary">快来分享好运吧！</Text>
                                                            </div>
                                                      ),
                                                    }}
                                                />
                                        ),
                                      },
                                      {
                                        key: 'claimed',
                                        label: (
                                            <Space>
                                                <GiftOutlined />
                                                我领取的 ({myClaimed.length})
                                            </Space>
                                        ),
                                        children: (
                                                <List
                                                    dataSource={myClaimed}
                                                    renderItem={(item) => (
                                                        <List.Item className="claim-list-item">
                                                            <div className="claim-record-info">
                                                                <div className="claim-record-avatar">
                                                                    {item.claimerName?.charAt(0).toUpperCase() || '?'}
                                                                </div>
                                                                <div>
                                                                    <div className="claim-record-name">
                                                                        来自 {item.claimerDisplayName || item.claimerName}
                                                                    </div>
                                                                    <div className="claim-record-time">
                                                                        {formatTime(item.createdAt)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Text type="success" strong className="claim-record-amount">
                                                                +{item.amount} 积分
                                                            </Text>
                                                        </List.Item>
                                                    )}
                                                    loading={recordsLoading}
                                                    className="red-envelope-list"
                                                    locale={{
                                                      emptyText: (
                                                            <div className="red-envelope-empty">
                                                                <GiftOutlined className="red-envelope-empty-icon" />
                                                                <div className="red-envelope-empty-text">还没有领取过红包</div>
                                                                <Text type="secondary">关注红包大厅，抢红包啦！</Text>
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
