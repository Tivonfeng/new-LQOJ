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
  WalletOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Input,
  List,
  Pagination,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useState } from 'react';
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
  const [, setTotalRecords] = useState(hallData.recentRecords.length);
  const [recordsUdocs, setRecordsUdocs] = useState(hallData.udocs);
  // 分类筛选状态
  const [selectedCategory, setSelectedCategory] = useState<string>('AC题目');
  // 分页相关状态 - 排行榜
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingPageSize] = useState(10);
  const [allTopUsers, setAllTopUsers] = useState(hallData.topUsers);
  const [rankingUdocs, setRankingUdocs] = useState(hallData.udocs);
  const [rankingSearch, setRankingSearch] = useState('');

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
  const userScoreUrl = (window as any).userScoreUrl || '/score/me';
  const transferUrl = (window as any).transferUrl || '/score/transfer';
  const scoreManageUrl = (window as any).scoreManageUrl || '/score/manage';
  const scoreRecordsUrl = (window as any).scoreRecordsUrl || '/score/records';
  const scoreRankingUrl = (window as any).scoreRankingUrl || '/score/ranking';

  // 获取分页积分记录
  const fetchRecords = useCallback(async (page: number) => {
    try {
      const response = await fetch(`${scoreRecordsUrl}?page=${page}&limit=${recordsPageSize}`, {
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
          setTotalRecords(result.total || 0);
          setRecordsUdocs(result.udocs || {});
          setRecordsPage(page);
        }
      }
    } catch (err) {
      // Failed to fetch records
    }
  }, [scoreRecordsUrl, recordsPageSize]);

  // 获取分页排行榜数据
  const fetchRanking = useCallback(async (page: number) => {
    try {
      const response = await fetch(`${scoreRankingUrl}?page=${page}&limit=${rankingPageSize}`, {
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
          setRankingPage(page);
        }
      }
    } catch (err) {
      // Failed to fetch ranking
    }
  }, [scoreRankingUrl, rankingPageSize]);

  // 当筛选分类变化时，如果当前页数超过筛选后的总页数，重置到第一页
  React.useEffect(() => {
    const filteredRecords = selectedCategory === '全部'
      ? allRecords
      : allRecords.filter((record) => record.category === selectedCategory);
    const maxPage = Math.ceil(filteredRecords.length / recordsPageSize);
    if (recordsPage > maxPage && maxPage > 0) {
      setRecordsPage(1);
    }
  }, [selectedCategory, allRecords, recordsPageSize]);

  // 初始化记录数据
  React.useEffect(() => {
    if (hallData.recentRecords.length > 0 && hallData.recentRecords.length >= recordsPageSize) {
      // 如果初始记录数达到分页大小，可能需要获取更多数据
      fetchRecords(1);
    }
    if (hallData.topUsers.length > 0 && hallData.topUsers.length >= rankingPageSize) {
      // 如果初始排行榜数据达到分页大小，可能需要获取更多数据
      fetchRanking(1);
    }
  }, []);

  return (
    <div className="score-hall-container">
      {/* Hero Section */}
      <Card className="hero-card" bordered={false}>
        <Row justify="space-between" align="middle" wrap>
          <Col xs={24} sm={24} md={14}>
            <Space direction="vertical" size="small">
              <Title level={2} className="hero-title">
                积分大厅
              </Title>
              <Text className="hero-subtitle">将你的成就转化为奖励</Text>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={10}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Statistic
                    title="今日活跃"
                    value={hallData.todayActiveUsers}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#fff', fontSize: '20px' }}
                  />
                </Col>
                {hallData.isLoggedIn && (
                  <Col span={12}>
                    <Statistic
                      title="我的余额"
                      value={currentCoins}
                      prefix={<WalletOutlined />}
                      suffix={<DollarOutlined />}
                      valueStyle={{ color: '#fff', fontSize: '20px' }}
                    />
                  </Col>
                )}
              </Row>
              {hallData.isLoggedIn && (
                <Space wrap>
                  <Button
                    type="default"
                    icon={<AppstoreOutlined />}
                    href={userScoreUrl}
                    className="hero-action-btn"
                  >
                    积分记录
                  </Button>
                  <Button
                    type="default"
                    icon={<DollarOutlined />}
                    href={transferUrl}
                    className="hero-action-btn"
                  >
                    积分交易所
                  </Button>
                  {hallData.canManage && (
                    <Button
                      type="default"
                      icon={<SettingOutlined />}
                      href={scoreManageUrl}
                      className="hero-action-btn"
                    >
                      积分管理
                    </Button>
                  )}
                </Space>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

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
              const filteredRecords = selectedCategory === '全部'
                ? allRecords
                : allRecords.filter((record) => record.category === selectedCategory);

              // 分页处理
              const startIndex = (recordsPage - 1) * recordsPageSize;
              const endIndex = startIndex + recordsPageSize;
              const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

              return filteredRecords.length > 0 ? (
                <>
                  <List
                    dataSource={paginatedRecords}
                  renderItem={(record) => {
                    const user = recordsUdocs[record.uid];
                    const isCurrentUser = hallData.isLoggedIn && record.uid === (window as any).currentUserId;
                    return (
                    <List.Item
                      className={`record-item ${record.score > 0 ? 'positive' : 'negative'} ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <List.Item.Meta
                        avatar={
                          <div className={`record-badge ${record.score > 0 ? 'badge-positive' : 'badge-negative'}`}>
                            {record.score > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                          </div>
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
                {filteredRecords.length > recordsPageSize && (
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Pagination
                      current={recordsPage}
                      total={filteredRecords.length}
                      pageSize={recordsPageSize}
                      onChange={(page) => {
                        setRecordsPage(page);
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
                    setRankingSearch(e.target.value);
                    setRankingPage(1);
                  }}
                />
              </div>
            }
            className="content-card"
          >
            {allTopUsers && allTopUsers.length > 0 ? (
              <>
                {(() => {
                  const keyword = rankingSearch.trim().toLowerCase();
                  const filteredTopUsers = keyword
                    ? allTopUsers.filter((user) => {
                      const uidKey = String(user.uid);
                      const userDoc = rankingUdocs[uidKey] || rankingUdocs[user.uid];
                      const uname = (userDoc?.uname || '').toLowerCase();
                      const displayName = (userDoc?.displayName || '').toLowerCase();
                      const uidStr = String(user.uid);
                      return (
                        uname.includes(keyword)
                        || displayName.includes(keyword)
                        || uidStr.includes(keyword)
                      );
                    })
                    : allTopUsers;

                  const startIndex = (rankingPage - 1) * rankingPageSize;
                  const endIndex = startIndex + rankingPageSize;
                  const pageUsers = filteredTopUsers.slice(startIndex, endIndex);

                  const showPagination = filteredTopUsers.length > rankingPageSize;

                  return (
                    <>
                      <List
                        dataSource={pageUsers}
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
                      {showPagination && (
                        <div style={{ marginTop: 16, textAlign: 'right' }}>
                          <Pagination
                            current={rankingPage}
                            total={filteredTopUsers.length}
                            pageSize={rankingPageSize}
                            onChange={(page) => {
                              setRankingPage(page);
                              if (!keyword) {
                                fetchRanking(page);
                              }
                            }}
                            showSizeChanger={false}
                            showQuickJumper
                            showTotal={(total) => `共 ${total} 人`}
                            size="small"
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
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
