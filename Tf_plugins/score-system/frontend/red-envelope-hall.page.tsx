/* eslint-disable react-refresh/only-export-components */
import './red-envelope-hall.page.css';
// 导入红包弹窗模块（用于 WebSocket 实时推送）
import './components/RedEnvelopeModal';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AimOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  DollarOutlined,
  FireOutlined,
  GiftOutlined,
  HistoryOutlined,
  InboxOutlined,
  MailOutlined,
  MessageOutlined,
  RedEnvelopeOutlined,
  SendOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Pagination,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import confetti from 'canvas-confetti';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

// 格式化相对时间
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN');
  } catch {
    return isoString;
  }
}

// 找到最佳手气
function findBestClaimer(claims: Array<{
  claimerUid: number;
  claimerName: string;
  claimerDisplayName?: string;
  amount: number;
  createdAt: string;
}>) {
  if (!claims || claims.length === 0) return null;
  return claims.reduce((best, current) => (current.amount > best.amount ? current : best), claims[0]);
}

// 获取状态配置
function getStatusConfig(envelope: RedEnvelopeDetail) {
  if (envelope.isExpired || envelope.status === 'expired') {
    return { color: 'default', text: '已过期', icon: <ClockCircleOutlined /> };
  }
  if (envelope.userHasClaimed) {
    return { color: 'blue', text: '已领取', icon: <CheckCircleOutlined /> };
  }
  if (envelope.remainingCount === 0) {
    return { color: 'green', text: '已领完', icon: <GiftOutlined /> };
  }
  if (envelope.canClaim) {
    return { color: 'red', text: '可领取', icon: <FireOutlined /> };
  }
  return { color: 'default', text: '待领取', icon: <MailOutlined /> };
}

// 计算领取进度颜色
function getProgressColor(percent: number): string {
  if (percent >= 80) return '#52c41a';
  if (percent >= 50) return '#faad14';
  return '#ff4d4f';
}

// 获取状态样式类名
function getStatusClassName(envelope: RedEnvelopeDetail): string {
  if (envelope.canClaim && !envelope.userHasClaimed) return 'claimable';
  if (envelope.userHasClaimed) return 'claimed';
  if (envelope.isExpired || envelope.status === 'expired') return 'expired';
  if (envelope.remainingCount === 0) return 'completed';
  return '';
}

// 红包列表项组件 - 紧凑版
const CompactEnvelopeItem: React.FC<{
  envelope: RedEnvelopeDetail;
  onClaim: (envelope: RedEnvelopeDetail) => void;
}> = ({ envelope, onClaim }) => {
  const [hovered, setHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const progressPercent = ((envelope.totalCount - envelope.remainingCount) / envelope.totalCount) * 100;
  const senderName = envelope.senderDisplayName || envelope.senderName;
  const bestClaimer = findBestClaimer(envelope.claims);
  const statusConfig = getStatusConfig(envelope);
  const claimedAmount = envelope.totalAmount - envelope.remainingAmount;
  const statusClassName = getStatusClassName(envelope);

  // 处理抢按钮点击
  const handleClaimClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClaim(envelope);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cardHeight = 480; // 估算卡片最大高度
    const cardWidth = 380;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // 弹窗固定显示在左侧，避开 compact-claimers-preview 容器
    const leftMargin = 50;
    let x = leftMargin;
    let y = rect.top + rect.height / 2;

    // 边界检测：确保不超出视口
    const verticalPadding = 16;
    if (y - cardHeight / 2 < verticalPadding) {
      y = cardHeight / 2 + verticalPadding;
    } else if (y + cardHeight / 2 > viewportHeight - verticalPadding) {
      y = viewportHeight - cardHeight / 2 - verticalPadding;
    }

    // 确保不超出视口右边缘
    if (x + cardWidth > viewportWidth - verticalPadding) {
      x = viewportWidth - cardWidth - verticalPadding;
    }

    setHoverPosition({ x, y });
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
      <div
        className={`compact-envelope-item ${statusClassName}`}
      >
      {/* 左侧：祝福语和发送者 */}
      <div className="compact-item-left">
        <div className="compact-avatar envelope-icon">
          <RedEnvelopeOutlined />
        </div>
        <div className="compact-sender-info">
          {/* 祝福语 - 突出显示 */}
          <div className="compact-blessing-message">
            <span className="blessing-icon"><MessageOutlined /></span>
            <span className="blessing-text">{envelope.message.slice(0, 20)}{envelope.message.length > 20 ? '...' : ''}</span>
          </div>
          <div className="compact-sender-name">
            <span className="sender-label">发起人</span>
            <span className="sender-name-text">{senderName}</span>
          </div>
        </div>
      </div>

      {/* 中间：进度与状态 */}
      <div className="compact-item-center">
        <div className="compact-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, #ff4d4f 0%, ${getProgressColor(progressPercent)} 100%)`,
              }}
            />
          </div>
          <div className="progress-info">
            <span className="progress-count">
              {envelope.totalCount - envelope.remainingCount}/{envelope.totalCount}
            </span>
            <span className="progress-amount">
              剩余积分 {envelope.remainingAmount}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧：操作与时间 */}
      <div className="compact-item-right">
        <div className="compact-amount">
          <span className="amount-value">{envelope.totalAmount}</span>
          <span className="amount-unit">积分</span>
        </div>
        <div className="compact-action">
          {envelope.canClaim && !envelope.userHasClaimed ? (
            <Button
              type="primary"
              size="small"
              htmlType="button"
              onClick={handleClaimClick}
              className="compact-claim-btn"
              icon={<ThunderboltOutlined />}
            >
              抢
            </Button>
          ) : (
            <Tag
              className={`compact-status-tag ${statusConfig.color}`}
              icon={statusConfig.color === 'red' ? <FireOutlined /> : <CheckCircleOutlined />}
            >
              {statusConfig.text}
            </Tag>
          )}
        </div>
        <div className="compact-time">{formatRelativeTime(envelope.createdAt)}</div>
      </div>

      {/* 领取者预览 - 鼠标悬停时显示详情 */}
      <div
        className="compact-claimers-preview"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {envelope.claims.length > 0 && (
          <>
            <div className="claimer-avatars">
              {envelope.claims.slice(0, 3).map((claim, index) => (
                <div
                  key={index}
                  className={`claimer-avatar-small ${bestClaimer && claim.claimerUid === bestClaimer.claimerUid ? 'best-claimer' : ''}`}
                  data-tooltip={`${claim.claimerDisplayName || claim.claimerName}: +${claim.amount}`}
                >
                  {claim.claimerName?.charAt(0).toUpperCase()}
                  {bestClaimer && claim.claimerUid === bestClaimer.claimerUid && (
                    <CrownOutlined className="best-claimer-icon" />
                  )}
                </div>
              ))}
              {envelope.claims.length > 3 && (
                <span className="more-claimers">+{envelope.claims.length - 3}</span>
              )}
            </div>
            {bestClaimer && (
              <div className="best-claimer-preview">
                <TrophyOutlined style={{ color: '#faad14' }} /> {bestClaimer.amount}max
              </div>
            )}
          </>
        )}
      </div>

      {/* 悬浮详情卡片 - 使用 Portal 渲染到 body 下，避免父元素 transform 影响 */}
      {hovered && createPortal(
        <div
          className="envelope-hover-card"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
          }}
        >
          <div className="hover-card-header">
            <div className="hover-card-avatar">
              <span>{senderName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hover-card-sender">
              <span className="sender-name">{senderName}</span>
              <span className="send-time">{formatRelativeTime(envelope.createdAt)}</span>
            </div>
            <Tag
              color={
                statusConfig.color === 'red' ? 'red'
                  : statusConfig.color === 'green' ? 'green'
                    : statusConfig.color === 'blue' ? 'blue'
                      : 'default'
              }
            >
              {statusConfig.text}
            </Tag>
          </div>

          <div className="hover-card-blessing">
            <span className="quote">"</span>
            <span className="blessing-text">{envelope.message}</span>
            <span className="quote">"</span>
          </div>

          <div className="hover-card-stats">
            <div className="stat-item">
              <span className="stat-icon"><DollarOutlined /></span>
              <span className="stat-value">{envelope.totalAmount}</span>
              <span className="stat-label">总积分</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><InboxOutlined /></span>
              <span className="stat-value">{envelope.totalCount}</span>
              <span className="stat-label">红包数</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><AimOutlined /></span>
              <span className="stat-value">{envelope.remainingAmount}</span>
              <span className="stat-label">剩余积分</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><HistoryOutlined /></span>
              <span className="stat-value">{envelope.remainingCount}</span>
              <span className="stat-label">剩余</span>
            </div>
          </div>

          <div className="hover-card-progress">
            <Progress
              percent={Math.round(progressPercent)}
              strokeColor={getProgressColor(progressPercent)}
              trailColor="#f0f0f0"
              size="small"
              format={(_percent) => (
                <span className="progress-format">
                  {envelope.totalCount - envelope.remainingCount}/{envelope.totalCount} 人已抢
                </span>
              )}
            />
          </div>

          {envelope.claims.length > 0 && (
            <div className="hover-card-claims">
              <div className="claims-header">
                <UserOutlined />
                <span>领取详情 ({envelope.claims.length}人)</span>
                <span className="claims-total">共抢 {claimedAmount} 积分</span>
              </div>
              <div className="claims-list">
                {bestClaimer && (
                  <div className="claim-item best-claim-item">
                    <div className="claim-rank"><TrophyOutlined /></div>
                    <div className="claim-avatar best-avatar">
                      <span>{bestClaimer.claimerName?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="claim-info">
                      <span className="claim-name">
                        {bestClaimer.claimerDisplayName || bestClaimer.claimerName}
                      </span>
                      <span className="claim-time">
                        {formatRelativeTime(bestClaimer.createdAt)}
                      </span>
                    </div>
                    <div className="claim-amount best-amount">
                      +{bestClaimer.amount}
                    </div>
                  </div>
                )}
                {envelope.claims
                  .filter((c) => !bestClaimer || c.claimerUid !== bestClaimer.claimerUid)
                  .slice(0, 4)
                  .map((claim, index) => (
                    <div key={claim.claimerUid} className="claim-item">
                      <div className="claim-rank">#{index + 2}</div>
                      <div className="claim-avatar">
                        <span>{claim.claimerName?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="claim-info">
                        <span className="claim-name">
                          {claim.claimerDisplayName || claim.claimerName}
                        </span>
                        <span className="claim-time">
                          {formatRelativeTime(claim.createdAt)}
                        </span>
                      </div>
                      <div className="claim-amount">+{claim.amount}</div>
                    </div>
                  ))}
                {envelope.claims.length > 5 && (
                  <div className="claims-more">
                    还有 {envelope.claims.length - 5} 人领取...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="hover-card-footer">
            <div className="footer-info">
              {envelope.userHasClaimed ? `您已领取 +${envelope.userClaimAmount} 积分` : statusConfig.text}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 发红包弹窗状态 - 已移除未使用的状态
  // const [createModalVisible, setCreateModalVisible] = useState(false);

  // 我的记录状态
  const [mySent, setMySent] = useState<RedEnvelopeDetail[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 领取弹窗状态
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimEnvelope, setClaimEnvelope] = useState<RedEnvelopeDetail | null>(null);
  const [claimResult, setClaimResult] = useState<{ success: boolean, amount?: number, error?: string } | null>(null);

  // 计算平均金额
  const averageAmount = totalCount > 0 ? Math.floor(totalAmount / totalCount) : 0;

  // 祝福语快捷选项
  const blessingMessages = [
    '抢到红包的都是绿旗编程最靓的仔！',
    '我来看看怎么个事儿～',
    '绿旗编程发红包啦，手慢无！',
    '这道题选我！不对，是红包选我！',
    '哥们儿祝你代码全AC，红包全中！',
    '来了老弟！哥们儿给你发福利啦！',
    '奥利给！哥们儿的红包冲就完事儿！',
    '恭喜发财，大吉大利！',
    '新年快乐，万事如意！',
    '学业进步，前程似锦！',
    '身体健康，阖家欢乐！',
    '心想事成，好运连连！',
    '财源滚滚，福气满满！',
    '节日快乐，开心每一天！',
    '加油！你是最棒的！',
  ];

  // 祝福语下拉菜单项
  const blessingMenuItems: MenuProps['items'] = blessingMessages.map((msg) => ({
    key: msg,
    label: msg,
    onClick: () => {
      setMessageText(msg);
      form.setFieldsValue({ message: msg });
    },
  }));

  // 获取红包列表
  const fetchEnvelopes = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/score/red-envelope/list?page=${page}&limit=${PAGE_SIZE}`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      const result = await response.json();
      if (result.success) {
        // 过滤掉已领完和已过期的红包（仅用于"最新红包"标签页）
        const filteredEnvelopes = result.envelopes.filter((envelope: RedEnvelopeDetail) =>
          envelope.remainingCount > 0 && !envelope.isExpired && envelope.status !== 'expired',
        );
        // 使用过滤后的数量作为分页总数
        const filteredTotal = filteredEnvelopes.length;
        // 使用 requestAnimationFrame 确保在下一个渲染周期更新状态
        requestAnimationFrame(() => {
          setEnvelopes(filteredEnvelopes);
          setTotal(filteredTotal);
          setCurrentPage(page);
        });
      }
    } catch (error) {
      console.error('获取红包列表失败:', error);
    } finally {
      requestAnimationFrame(() => {
        setLoading(false);
      });
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

  // 阻止意外的页面刷新
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // 不需要阻止，只是用于调试
      console.log('[RedEnvelopeHall] beforeunload 被触发');
    };

    const handlePageHide = () => {
      console.log('[RedEnvelopeHall] pagehide 被触发');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

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
        setSendModalVisible(false);
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

  // 播放领取成功的音效
  const playClaimSound = () => {
    try {
      const audio = new Audio('/ding.mp3');
      audio.play().catch(() => {
        // 如果音频播放失败，使用简单的提示音
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        setTimeout(() => {
          osc.stop();
          gain.disconnect();
        }, 200);
      });
    } catch {
      console.log('[RedEnvelopeHall] 音频播放失败');
    }
  };

  // 触发领取成功的彩带效果
  const triggerClaimConfetti = () => {
    try {
      const confettiConfig = {
        particleCount: 50,
        spread: 60,
        ticks: 200,
        zIndex: 10000,
        colors: ['#ff4d4f', '#ff7875', '#ffa39e', '#ffa940', '#ffc53d'],
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
    } catch (error) {
      console.error('[RedEnvelopeHall] 彩带效果触发失败:', error);
    }
  };

  // 领取红包
  const handleClaim = React.useCallback(async (envelope: RedEnvelopeDetail) => {
    if (!hallData.isLoggedIn) {
      message.warning('请先登录');
      return;
    }

    setClaimEnvelope(envelope);

    try {
      // 使用 abort controller 来避免可能的超时问题
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/score/red-envelope/${envelope.envelopeId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 确保响应是 JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器响应格式错误');
      }

      const result = await response.json();
      if (result.success) {
        // 领取成功，播放音效和彩带效果
        playClaimSound();
        triggerClaimConfetti();

        setClaimResult({ success: true, amount: result.amount });
        setClaimModalVisible(true);

        // 只更新本地状态，不重新获取整个列表，保持当前页面位置
        setEnvelopes((prevEnvelopes) =>
          prevEnvelopes.map((e) => {
            if (e.envelopeId === envelope.envelopeId) {
              return {
                ...e,
                userHasClaimed: true,
                userClaimAmount: result.amount,
                canClaim: false,
                remainingCount: result.remainingCount ?? e.remainingCount - 1,
                remainingAmount: result.remainingAmount ?? e.remainingAmount - result.amount,
                claims: [
                  ...(e.claims || []),
                  {
                    claimerUid: hallData.currentUserId || 0,
                    claimerName: '',
                    amount: result.amount,
                    createdAt: new Date().toISOString(),
                  },
                ],
              };
            }
            return e;
          }),
        );
      } else {
        setClaimResult({ success: false, error: result.error || '领取失败' });
        setClaimModalVisible(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setClaimResult({ success: false, error: '请求超时，请重试' });
      } else {
        setClaimResult({ success: false, error: '网络错误，请重试' });
      }
      setClaimModalVisible(true);
      console.error('领取红包失败:', error);
    }
  }, [hallData.isLoggedIn, hallData.currentUserId]);

  // 关闭领取弹窗
  const closeClaimModal = () => {
    setClaimModalVisible(false);
    setClaimEnvelope(null);
    setClaimResult(null);
  };

  // 骨架屏列表项 - 紧凑版
  const renderSkeletonItem = () => (
    <div className="compact-envelope-item skeleton">
      <div className="compact-item-left">
        <Skeleton.Avatar active size={40} shape="circle" />
        <div className="compact-sender-info">
          <Skeleton.Input active style={{ width: 80 }} size="small" />
          <Skeleton.Input active style={{ width: 120 }} size="small" />
        </div>
      </div>
      <div className="compact-item-center">
        <Skeleton.Input active style={{ width: '100%' }} size="small" />
      </div>
      <div className="compact-item-right">
        <Skeleton.Input active style={{ width: 60 }} size="small" />
        <Skeleton.Button active style={{ width: 50 }} shape="round" />
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
      className="compact-envelope-list"
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

            {/* 发红包按钮 */}
            {hallData.isLoggedIn && (
                <div className="send-envelope-main-button" style={{ marginTop: 24 }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<RedEnvelopeOutlined />}
                        onClick={() => setSendModalVisible(true)}
                        className="send-envelope-main-btn"
                        style={{
                          height: 60,
                          fontSize: 20,
                          fontWeight: 600,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                          boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)',
                        }}
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
                                  { type: 'number', min: 10, max: 100000, message: '金额必须在10-100000之间' },
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="请输入总金额"
                                    min={10}
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
                        <Input.Group compact style={{ display: 'flex' }}>
                            <Input
                                placeholder="恭喜发财，大吉大利！"
                                maxLength={50}
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <Dropdown
                                menu={{ items: blessingMenuItems }}
                                placement="bottomRight"
                                trigger={['click']}
                            >
                                <Button
                                    type="default"
                                    icon={<ThunderboltOutlined />}
                                    className="blessing-quick-select-btn"
                                >
                                    快捷选择
                                </Button>
                            </Dropdown>
                        </Input.Group>
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

            {/* 领取红包弹窗 */}
            <Modal
                title={
                    <Space>
                        <RedEnvelopeOutlined style={{ color: '#ff4d4f' }} />
                        <span>领取结果</span>
                    </Space>
                }
                open={claimModalVisible}
                onCancel={closeClaimModal}
                footer={null}
                width={400}
                className="red-envelope-claim-modal"
            >
                {claimEnvelope && (
                    <div className="claim-result-content">
                        <div className="claim-result-icon">
                            {claimResult?.success ? (
                                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                            ) : (
                                <RedEnvelopeOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
                            )}
                        </div>
                        <div className="claim-result-message">
                            {claimResult?.success ? (
                                <>
                                    <Typography.Title level={4}>恭喜！</Typography.Title>
                                    <Typography.Text>来自: {claimEnvelope.senderDisplayName || claimEnvelope.senderName}</Typography.Text>
                                    <Typography.Text>"{claimEnvelope.message}"</Typography.Text>
                                    <Typography.Title level={3} style={{ color: '#52c41a', marginTop: 16 }}>
                                        +{claimResult.amount} 积分
                                    </Typography.Title>
                                </>
                            ) : (
                                <>
                                    <Typography.Title level={4}>领取失败</Typography.Title>
                                    <Typography.Text type="danger">{claimResult?.error || '未知错误'}</Typography.Text>
                                </>
                            )}
                        </div>
                        <div style={{ marginTop: 24, textAlign: 'right' }}>
                            <Button type="primary" onClick={closeClaimModal}>
                                我知道了
                            </Button>
                        </div>
                    </div>
                )}
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
                              <>
                                <List
                                  dataSource={envelopes}
                                  renderItem={(envelope: RedEnvelopeDetail) => (
                                    <CompactEnvelopeItem
                                      envelope={envelope}
                                      onClaim={handleClaim}
                                    />
                                  )}
                                  className="compact-envelope-list"
                                  locale={{
                                    emptyText: (
                                      <div className="red-envelope-empty">
                                        <RedEnvelopeOutlined className="red-envelope-empty-icon blinking" />
                                        <div className="red-envelope-empty-text">暂无红包</div>
                                        <Text type="secondary">快来发个红包吧！</Text>
                                        {hallData.isLoggedIn && (
                                          <div className="red-envelope-empty-hint">
                                            <span className="red-envelope-empty-hint-text">点击右上角发红包</span>
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  }}
                                />
                                {total > PAGE_SIZE && (
                                  <div className="pagination-container">
                                    <Pagination
                                      current={currentPage}
                                      pageSize={PAGE_SIZE}
                                      total={total}
                                      onChange={(page) => fetchEnvelopes(page)}
                                      showSizeChanger={false}
                                      showTotal={(count) => `共 ${count} 个红包`}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ),
                      },
                      {
                        key: 'my',
                        label: (
                            <Space>
                                <SendOutlined />
                                我发出的 ({mySent.length})
                            </Space>
                        ),
                        children: (
                                <List
                                    dataSource={mySent}
                                    renderItem={(envelope: RedEnvelopeDetail) => (
                                        <CompactEnvelopeItem
                                            envelope={envelope}
                                            onClaim={handleClaim}
                                        />
                                    )}
                                    loading={recordsLoading}
                                    className="compact-envelope-list"
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
                    ]}
                />
            </Card>
        </div>
  );
};

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
