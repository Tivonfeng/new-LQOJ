/* eslint-disable react-refresh/only-export-components */
import './score-hall.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  GiftOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { WalletFloatingBall } from './components/WalletFloatingBall';
import {
  Button,
  Card,
  Col,
  Collapse,
  Input,
  List,
  Pagination,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

interface ScoreHallData {
  userScore: {
    totalScore: number;
    acCount: number;
  };
  currentCoins: number;
  userRank: number | string;
  recentRecords: Array<{
    uid: string;
    score: number;
    reason: string;
    createdAt: string;
    pid: number;
    category?: string;
    title?: string;
  }>;
  topUsers: Array<{
    uid: string;
    totalScore: number;
    acCount: number;
  }>;
  rankingTotal?: number;
  todayTotalScore: number;
  todayActiveUsers: number;
  canManage: boolean;
  isLoggedIn: boolean;
  hasCheckedInToday: boolean;
  nextReward: number;
  gameRemainingPlays: {
    dice: number;
    rps: number;
  };
  maxDailyPlays: number;
  udocs: Record<string, any>;
}

// 积分大厅React组件
const ScoreHallApp: React.FC = () => {
  // 从全局变量获取数据
  const hallData: ScoreHallData = (window as any).scoreHallData || {
    userScore: { totalScore: 0, acCount: 0 },
    currentCoins: 0,
    userRank: '-',
    recentRecords: [],
    topUsers: [],
    rankingTotal: 0,
    todayTotalScore: 0,
    todayActiveUsers: 0,
    canManage: false,
    isLoggedIn: false,
    hasCheckedInToday: false,
    nextReward: 10,
    gameRemainingPlays: { dice: 0, rps: 0 },
    maxDailyPlays: 10,
    udocs: {},
  };

  const [hasCheckedIn, setHasCheckedIn] = useState(hallData.hasCheckedInToday);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(hallData.currentCoins);
  // 分页相关状态 - 积分记录
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize] = useState(10);
  const [allRecords, setAllRecords] = useState(hallData.recentRecords);
  const [totalRecords, setTotalRecords] = useState(hallData.recentRecords.length);
  const [recordsUdocs, setRecordsUdocs] = useState(hallData.udocs);
  // 分类筛选状态
  const [selectedCategory, setSelectedCategory] = useState<string>('AC题目');
  // 分页相关状态 - 排行榜
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingPageSize] = useState(10);
  const [allTopUsers, setAllTopUsers] = useState(hallData.topUsers);
  const [rankingUdocs, setRankingUdocs] = useState(hallData.udocs);
  const [rankingSearch, setRankingSearch] = useState('');
  const [totalRankingUsers, setTotalRankingUsers] = useState(hallData.rankingTotal ?? hallData.topUsers.length);

  const ruleItems = [
    { title: 'AC题目', desc: '首次 AC 奖励 20 分，重复 AC 不加分' },
    { title: '每日签到', desc: '连续签到递增奖励，周/双周额外奖励' },
    { title: '证书', desc: '积分 = 证书权重 × 10，删除证书反向扣除' },
    { title: '打字挑战', desc: '进度 / 等级 / 超越奖励发放对应积分' },
    { title: '作品投币', desc: '投币者扣除积分，作者获得同等积分' },
    { title: 'AI 辅助', desc: '按使用次数扣除设定的积分' },
    { title: '积分转账', desc: '收款加分，付款扣除转账额及手续费' },
    { title: '掷骰子 / 剪刀石头布', desc: '下注消耗积分，胜利获得奖励' },
    { title: '管理员操作', desc: '手动增减积分（橙色标记）' },
  ];

  // 快速签到
  const handleQuickCheckin = useCallback(async () => {
    if (checkingIn || hasCheckedIn) return;

    setCheckingIn(true);
    try {
      const response = await fetch('/score/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'checkin' }),
      });

      const data = await response.json();
      if (data.success) {
        setHasCheckedIn(true);
        setCurrentCoins((prev) => prev + hallData.nextReward);
        // 显示成功消息
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // 显示错误消息
      }
    } catch (error) {
      // 处理错误
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, hasCheckedIn, hallData.nextReward]);

  const checkInUrl = (window as any).checkInUrl || '/score/checkin';
  const diceGameUrl = (window as any).diceGameUrl || '/score/dice';
  const rpsGameUrl = (window as any).rpsGameUrl || '/score/rps';
  const transferUrl = (window as any).transferUrl || '/score/transfer';
  const scoreManageUrl = (window as any).scoreManageUrl || '/score/manage';
  const scoreRecordsUrl = (window as any).scoreRecordsUrl || '/score/records';
  const scoreRankingUrl = (window as any).scoreRankingUrl || '/score/ranking';

  // 获取分页积分记录
  const fetchRecords = useCallback(async (page: number, category?: string) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(recordsPageSize),
      });
      if (category && category !== '全部') {
        params.set('category', category);
      }

      const response = await fetch(`${scoreRecordsUrl}?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.success && result.records) {
          setAllRecords(result.records);
          setTotalRecords(result.total || result.records.length || 0);
          setRecordsUdocs(result.udocs || {});
          setRecordsPage(page);
        }
      }
    } catch (err) {
      // Failed to fetch records
    }
  }, [scoreRecordsUrl, recordsPageSize]);

  // 获取分页排行榜数据
  const fetchRanking = useCallback(async (page: number, searchKeyword: string = '') => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(rankingPageSize),
      });
      if (searchKeyword.trim()) {
        params.set('search', searchKeyword.trim());
      }

      const response = await fetch(`${scoreRankingUrl}?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.success && result.users) {
          setAllTopUsers(result.users);
          setRankingUdocs(result.udocs || {});
          setTotalRankingUsers(result.total || result.users.length || 0);
          setRankingPage(page);
        }
      }
    } catch (err) {
      // Failed to fetch ranking
    }
  }, [scoreRankingUrl, rankingPageSize]);

  // 当筛选分类变化时，如果当前页数超过筛选后的总页数，重置到第一页
  React.useEffect(() => {
    // 切换标签时，回到第1页并重新请求
    setRecordsPage(1);
    fetchRecords(1, selectedCategory);
  }, [selectedCategory, fetchRecords]);

  // 初始化记录数据
  React.useEffect(() => {
    fetchRecords(1, selectedCategory);
    fetchRanking(1);
  }, []);

  return (
    <div className="score-hall-container">
      {/* 个人钱包悬浮球 */}
      {hallData.isLoggedIn && (() => {
        const currentUserId = String((window as any).currentUserId || '');
        const currentUser = hallData.udocs[currentUserId];
        return (
          <WalletFloatingBall
            currentCoins={currentCoins}
            userInfo={{
              uid: currentUserId,
              avatarUrl: currentUser?.avatarUrl,
              uname: currentUser?.uname,
              displayName: currentUser?.displayName,
            }}
            walletUrl={transferUrl}
            isLoggedIn={hallData.isLoggedIn}
          />
        );
      })()}
      {/* Hero Section */}
      <Card className="hero-card" bordered={false}>
        <div className="hero-content-wrapper">
          <div className="hero-main-content">
            <div className="hero-text-section">
              <Title level={2} className="hero-title">
                积分大厅
              </Title>
              <Text className="hero-subtitle">将你的成就转化为奖励</Text>
            </div>
            <div className="hero-stats-section">
              <div className="hero-stat-item">
                <div className="hero-stat-icon">
                  <UserOutlined />
                </div>
                <div className="hero-stat-content">
                  <div className="hero-stat-value">{hallData.todayActiveUsers}</div>
                  <div className="hero-stat-label">今日活跃</div>
                </div>
              </div>
            </div>
          </div>
          {hallData.isLoggedIn && hallData.canManage && (
            <div className="hero-actions-section">
              <Button
                type="default"
                icon={<SettingOutlined />}
                href={scoreManageUrl}
                className="hero-action-btn"
              >
                积分管理
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 积分规则说明（可折叠） */}
      <Collapse
        className="content-card rules-card"
        defaultActiveKey={[]}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'rules',
            label: '积分规则说明',
            children: (
              <div className="rules-grid">
                {ruleItems.map((item) => (
                  <div className="rule-item" key={item.title}>
                    <div className="rule-item-header">
                      <span className="rule-dot" />
                      <span className="rule-title">{item.title}</span>
                    </div>
                    <div className="rule-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {/* Games Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Daily Check-in Card */}
        <Col xs={24} lg={8}>
          <Card className="game-card checkin-card" bordered={false}>
            <div className="game-card-content">
              <div className="game-card-header">
                <div className="game-icon-wrapper checkin-icon">
                  <CalendarOutlined style={{ fontSize: 40, color: '#fff' }} />
                </div>
                <div className="game-card-title-section">
                  <Title level={4} className="game-card-title">每日签到</Title>
                  <Text className="game-card-subtitle">每日奖励</Text>
                </div>
              </div>
              <div className="game-card-body">
                <div className="game-card-info">
                  <div className="game-info-item">
                    <DollarOutlined className="game-info-icon" />
                    <Text className="game-info-text">每日可获得最多 30 积分</Text>
                  </div>
                </div>
                <div className="game-card-features">
                  <Tag className="game-feature-tag">每日连击奖励</Tag>
                  <Tag className="game-feature-tag">每日重置</Tag>
                </div>
              </div>
              <div className="game-card-footer">
                {hasCheckedIn ? (
                  <>
                    <Tag icon={<CheckCircleOutlined />} className="game-status-tag success">
                      今日已签到
                    </Tag>
                    <Button
                      type="default"
                      icon={<AppstoreOutlined />}
                      href={checkInUrl}
                      className="game-action-btn"
                      block
                    >
                      查看详情
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="primary"
                      icon={<GiftOutlined />}
                      onClick={handleQuickCheckin}
                      loading={checkingIn}
                      className="game-action-btn checkin-btn"
                      block
                      size="large"
                    >
                      立即签到 +{hallData.nextReward}
                    </Button>
                    <Button
                      type="default"
                      icon={<AppstoreOutlined />}
                      href={checkInUrl}
                      className="game-action-btn secondary"
                      block
                    >
                      查看详情
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </Col>

        {/* Dice Game Card */}
        <Col xs={24} lg={8}>
          <Card className="game-card dice-card" bordered={false}>
            <div className="game-card-content">
              <div className="game-card-header">
                <div className="game-icon-wrapper dice-icon">
                  <AppstoreOutlined style={{ fontSize: 40, color: '#fff' }} />
                </div>
                <div className="game-card-title-section">
                  <Title level={4} className="game-card-title">骰子游戏</Title>
                  <Text className="game-card-subtitle">测试你的运气</Text>
                </div>
              </div>
              <div className="game-card-body">
                <div className="game-card-info">
                  <div className="game-info-item">
                    <Text className="game-info-label">游戏模式</Text>
                    <Text className="game-info-value">猜大小</Text>
                  </div>
                  <div className="game-info-item">
                    <Text className="game-info-label">胜率</Text>
                    <Text className="game-info-value">50%</Text>
                  </div>
                </div>
                <div className="game-card-features">
                  <Tag className="game-feature-tag">双倍或归零</Tag>
                  <Tag className="game-feature-tag">即时结果</Tag>
                </div>
                {hallData.isLoggedIn && (
                  <div className="game-card-remaining">
                    <Text className="game-remaining-text">
                      剩余: {hallData.gameRemainingPlays.dice}/{hallData.maxDailyPlays}
                    </Text>
                  </div>
                )}
              </div>
              <div className="game-card-footer">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  href={diceGameUrl}
                  className="game-action-btn dice-btn"
                  block
                  size="large"
                >
                  开始游戏
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* RPS Game Card */}
        <Col xs={24} lg={8}>
          <Card className="game-card rps-card" bordered={false}>
            <div className="game-card-content">
              <div className="game-card-header">
                <div className="game-icon-wrapper rps-icon">
                  <RocketOutlined style={{ fontSize: 40, color: '#fff' }} />
                </div>
                <div className="game-card-title-section">
                  <Title level={4} className="game-card-title">剪刀石头布</Title>
                  <Text className="game-card-subtitle">挑战AI</Text>
                </div>
              </div>
              <div className="game-card-body">
                <div className="game-card-info">
                  <div className="game-info-item">
                    <Text className="game-info-label">游戏模式</Text>
                    <Text className="game-info-value">竞技场</Text>
                  </div>
                  <div className="game-info-item">
                    <Text className="game-info-label">类型</Text>
                    <Text className="game-info-value">快速策略</Text>
                  </div>
                </div>
                <div className="game-card-features">
                  <Tag className="game-feature-tag">2倍奖励</Tag>
                  <Tag className="game-feature-tag">连击奖励</Tag>
                </div>
                {hallData.isLoggedIn && (
                  <div className="game-card-remaining">
                    <Text className="game-remaining-text">
                      剩余: {hallData.gameRemainingPlays.rps}/{hallData.maxDailyPlays}
                    </Text>
                  </div>
                )}
              </div>
              <div className="game-card-footer">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  href={rpsGameUrl}
                  className="game-action-btn rps-btn"
                  block
                  size="large"
                >
                  开始对战
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Content Grid */}
      <Row gutter={[16, 16]}>
        {/* Recent Records */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <AppstoreOutlined />
                  <span>最近积分记录</span>
                </Space>
                <Space wrap size={[4, 4]}>
                  {['全部', 'AC题目', '游戏娱乐', '打字挑战', '作品互动', 'AI辅助', '积分转账', '每日签到', '证书奖励', '管理员操作'].map((category) => (
                    <Tag
                      key={category}
                      color={selectedCategory === category ? 'blue' : 'default'}
                      style={{
                        cursor: 'pointer',
                        margin: 0,
                        padding: '2px 8px',
                        fontSize: 12,
                      }}
                      onClick={() => {
                        setSelectedCategory(category);
                        setRecordsPage(1); // 重置到第一页
                      }}
                    >
                      {category}
                    </Tag>
                  ))}
                </Space>
              </div>
            }
            className="content-card"
          >
            {(() => {
              // 根据选中的分类筛选记录
              return allRecords.length > 0 ? (
                <>
                  <List
                    dataSource={allRecords}
                  renderItem={(record) => {
                    const user = recordsUdocs[record.uid];
                    const isCurrentUser = hallData.isLoggedIn && record.uid === (window as any).currentUserId;
                    return (
                    <List.Item
                      className={`record-item ${record.score > 0 ? 'positive' : 'negative'} ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <List.Item.Meta
                        avatar={
                          user?.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user?.uname || user?.displayName || `User ${record.uid}`}
                              className="record-avatar"
                              onError={(e) => {
                                // 如果头像加载失败，隐藏图片
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`record-badge ${record.score > 0 ? 'badge-positive' : 'badge-negative'}`}>
                              {record.score > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                            </div>
                          )
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <Text strong>
                                {user?.uname || `User ${record.uid}`}
                                {user?.displayName && (
                                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                    ({user.displayName})
                                  </Text>
                                )}
                              </Text>
                            </Space>
                            <div className="record-score-inline">
                              <Text
                                strong
                                style={{
                                  fontSize: 18,
                                  color: record.score > 0 ? '#10b981' : '#ef4444',
                                }}
                              >
                                {record.score > 0 ? '+' : ''}{record.score}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                pts
                              </Text>
                            </div>
                          </div>
                        }
                        description={
                          <Space wrap>
                            <Tag color="default" style={{ fontSize: 11 }}>
                              {record.reason || '积分调整'}
                            </Tag>
                            <Tag
                              color={record.pid === 0 || record.category === '管理员操作' ? 'orange' : 'blue'}
                              style={{ fontSize: 11 }}
                            >
                              {record.pid === 0 || record.category === '管理员操作'
                                ? '管理员操作'
                                : record.category || record.title || `Problem ${record.pid}`}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.createdAt}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                    );
                  }}
                />
                {totalRecords > recordsPageSize && (
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Pagination
                      current={recordsPage}
                      total={totalRecords}
                      pageSize={recordsPageSize}
                      onChange={(page) => {
                        setRecordsPage(page);
                        fetchRecords(page, selectedCategory);
                      }}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total) => `共 ${total} 条记录`}
                      size="small"
                    />
                  </div>
                )}
                </>
              ) : (
                <div className="empty-state">
                  <Text type="secondary">
                    {selectedCategory === '全部' ? '暂无记录' : `暂无${selectedCategory}相关记录`}
                  </Text>
                </div>
              );
            })()}
          </Card>
        </Col>

        {/* Leaderboard */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Space>
                  <TrophyOutlined />
                  <span>排行榜</span>
                </Space>
                <Input
                  allowClear
                  size="small"
                  placeholder="搜索用户"
                  className="leaderboard-search-input"
                  style={{
                    width: 180,
                    height: 32,
                    paddingInline: 10,
                  }}
                  value={rankingSearch}
                  onChange={(e) => {
                    const keyword = e.target.value;
                    setRankingSearch(keyword);
                    setRankingPage(1);
                    fetchRanking(1, keyword);
                  }}
                  onPressEnter={() => fetchRanking(1, rankingSearch)}
                />
              </div>
            }
            className="content-card"
          >
            {allTopUsers && allTopUsers.length > 0 ? (
              <>
                <List
                  dataSource={allTopUsers}
                  renderItem={(user, index) => {
                    // 确保 uid 类型匹配（可能是 number 或 string）
                    const uidKey = String(user.uid);
                    const userDoc = rankingUdocs[uidKey] || rankingUdocs[user.uid];
                    const isCurrentUser = hallData.isLoggedIn && user.uid === (window as any).currentUserId;
                    const rank = (rankingPage - 1) * rankingPageSize + index + 1;
                    const getRankIcon = (rankNum: number) => {
                      if (rankNum === 1) return <TrophyOutlined style={{ color: '#FFD700' }} />;
                      if (rankNum === 2) return <TrophyOutlined style={{ color: '#C0C0C0' }} />;
                      if (rankNum === 3) return <TrophyOutlined style={{ color: '#CD7F32' }} />;
                      return rankNum;
                    };
                    return (
                      <List.Item
                        className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
                      >
                        <List.Item.Meta
                          avatar={
                            <>
                              <div className={`rank-badge rank-${rank <= 3 ? rank : 'other'}`}>
                                {getRankIcon(rank)}
                              </div>
                              {userDoc?.avatarUrl ? (
                                <img
                                  src={userDoc.avatarUrl}
                                  alt={userDoc?.uname || userDoc?.displayName || `User ${user.uid}`}
                                  onError={(e) => {
                                    // 如果头像加载失败，隐藏图片
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                            </>
                          }
                          title={
                            <Text strong>
                              {userDoc?.uname || `User ${user.uid}`}
                              {userDoc?.displayName && (
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  ({userDoc.displayName})
                                </Text>
                              )}
                            </Text>
                          }
                          description={
                            userDoc?.bio ? (
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                }}
                                title={userDoc.bio}
                              >
                                {userDoc.bio.replace(/[#*`_~[\]()]/g, '').trim()}
                              </Text>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                                暂无简介
                              </Text>
                            )
                          }
                        />
                        <div className="player-score">
                          <Text strong style={{ fontSize: 16, color: '#10b981' }}>
                            {user.totalScore}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            pts
                          </Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
                {totalRankingUsers > rankingPageSize && (
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Pagination
                      current={rankingPage}
                      total={totalRankingUsers}
                      pageSize={rankingPageSize}
                      onChange={(page) => {
                        setRankingPage(page);
                        fetchRanking(page, rankingSearch);
                      }}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total) => `共 ${total} 人`}
                      size="small"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Text type="secondary">暂无排名</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['score_hall'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('score-hall-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<ScoreHallApp />);
    } catch (error) {
      // Failed to render React app
    }
  }
}));
