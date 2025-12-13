/* eslint-disable react-refresh/only-export-components */
import './typing-hall.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowRightOutlined,
  GiftOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Collapse, Input, List, Pagination, Row, Space, Tag, Typography } from 'antd';
import { Chart, registerables } from 'chart.js';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TypingStatsFloatingBall } from './components/TypingStatsFloatingBall';

const { Title, Text } = Typography;

/**
 * 计算相对时间显示
 * 24小时内显示相对时间（如"2小时前"），超过24小时显示格式化时间
 */
function formatRelativeTime(isoString: string, formattedTime?: string): string {
  try {
    const recordTime = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - recordTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // 如果超过24小时，返回格式化时间
    if (diffHours >= 24) {
      return formattedTime || recordTime.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // 计算相对时间
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) {
        return '刚刚';
      }
      return `${diffMinutes}分钟前`;
    } else {
      const hours = Math.floor(diffHours);
      return `${hours}小时前`;
    }
  } catch (error) {
    // 如果解析失败，返回格式化时间或原始字符串
    return formattedTime || isoString;
  }
}

// 注册 Chart.js 组件
Chart.register(...registerables);

// 类型定义
interface UserDoc {
  uname: string;
  displayName: string;
  avatarUrl: string;
}

interface UserStats {
  uid: number;
  maxWpm: number;
  avgWpm: number;
  totalRecords: number;
  improvement?: number;
}

interface UserSpeedPoint {
  uid: number;
  avgWpm: number;
  maxWpm: number;
}

interface RecentRecord {
  uid: number;
  wpm: number;
  createdAt: string;
}

interface TrendData {
  week: string;
  avgWpm: number;
}

interface LadderRange {
  label: string;
  icon: string;
  range: string;
  min: number;
  max: number;
  color: string;
  borderColor: string;
}

// 天梯等级定义 - 每30WPM一个档次，最高200+
const LADDER_RANGES: LadderRange[] = [
  {
    label: '终极之神',
    icon: '👑',
    range: '200+',
    min: 200,
    max: Infinity,
    color: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  {
    label: '键速狂魔',
    icon: '💻',
    range: '170-200',
    min: 170,
    max: 200,
    color: 'rgba(219, 39, 119, 0.15)',
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  {
    label: '键速王者',
    icon: '⚔️',
    range: '140-170',
    min: 140,
    max: 170,
    color: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  {
    label: '键速狂人',
    icon: '🔥',
    range: '110-140',
    min: 110,
    max: 140,
    color: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  {
    label: '键速闪电',
    icon: '⚡',
    range: '80-110',
    min: 80,
    max: 110,
    color: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  {
    label: '键速高手',
    icon: '⭐',
    range: '50-80',
    min: 50,
    max: 80,
    color: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  {
    label: '打字小匠',
    icon: '✨',
    range: '20-50',
    min: 20,
    max: 50,
    color: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    label: '打字萌新',
    icon: '🌱',
    range: '0-20',
    min: 0,
    max: 20,
    color: 'rgba(156, 163, 175, 0.15)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
];

// 天梯图组件
interface SpeedLadderProps {
  userSpeedPoints: UserSpeedPoint[];
  udocs: Record<number, UserDoc>;
  currentUserId?: number;
}

const SpeedLadder: React.FC<SpeedLadderProps> = ({ userSpeedPoints, udocs, currentUserId }) => {
  const [speedType, setSpeedType] = useState<'avg' | 'max'>('max');

  const ladderData = useMemo(() => {
    return LADDER_RANGES.map((range) => {
      const usersInRange = userSpeedPoints.filter((p) => {
        const wpm = speedType === 'avg' ? p.avgWpm : p.maxWpm;
        return wpm >= range.min && wpm < range.max;
      });

      const actualMax =
        usersInRange.length === 0
          ? range.max === Infinity
            ? range.min + 20
            : range.max
          : Math.max(...usersInRange.map((p) => (speedType === 'avg' ? p.avgWpm : p.maxWpm)));

      return {
        range,
        users: usersInRange,
        actualMax: range.max === Infinity ? actualMax : range.max,
      };
    });
  }, [userSpeedPoints, speedType]);

  const calculatePosition = (wpm: number, min: number, max: number): number => {
    if (max === min) return 50;
    const percentage = ((wpm - min) / (max - min)) * 100;
    return Math.max(5, Math.min(95, percentage));
  };

  return (
    <div className="ladder-section">
      <div className="section-header">
        <h3>速度天梯分布</h3>
        <div className="ladder-controls">
          <div className="ladder-tabs">
            <button
              className={`ladder-tab-btn ${speedType === 'avg' ? 'active' : ''}`}
              onClick={() => setSpeedType('avg')}
            >
              <span className="tab-icon">📊</span>
              <span>平均速度</span>
            </button>
            <button
              className={`ladder-tab-btn ${speedType === 'max' ? 'active' : ''}`}
              onClick={() => setSpeedType('max')}
            >
              <span className="tab-icon">🏆</span>
              <span>最高速度</span>
            </button>
          </div>
          <div className="ladder-legend">
            <span className="legend-item">
              <span className="legend-icon">🎯</span>
              <span>悬停查看详情</span>
            </span>
          </div>
        </div>
      </div>
      <div className="ladder-chart">
        {ladderData.map(({ range, users, actualMax }, index) => {
          const mid = Math.round((range.min + actualMax) / 2);
          return (
            <div key={index} className="ladder-row">
              <div className="ladder-label">
                <div className="level-badge">
                  <span className="level-icon">{range.icon}</span>
                  <div className="level-text">
                    <div className="level-name">{range.label}</div>
                    <div className="level-range">{range.range} WPM</div>
                  </div>
                </div>
              </div>
              <div className="ladder-track">
                <div className="wpm-scale">
                  <span>{range.min}</span>
                  <span>{mid}</span>
                  <span>
                    {actualMax}
                    {range.max === Infinity ? '+' : ''}
                  </span>
                </div>
                <div className="scatter-points">
                  {users.map((point) => {
                    const user = udocs[point.uid];
                    if (!user) return null;

                    const wpm = speedType === 'avg' ? point.avgWpm : point.maxWpm;
                    const position = calculatePosition(wpm, range.min, actualMax);
                    // 基于 uid 生成伪随机的 yOffset，确保同一用户在重新渲染时始终显示在同一位置
                    const yOffset = ((point.uid * 7919) % 61 - 30.5) * (30 / 30.5);
                    const isCurrentUser = currentUserId === point.uid;

                    return (
                      <div
                        key={point.uid}
                        className={`user-avatar-point ${isCurrentUser ? 'current-user-point' : ''}`}
                        style={{
                          left: `${position}%`,
                          transform: `translateY(${yOffset}px)`,
                          animationDelay: `${index * 0.1}s`,
                        }}
                      >
                        <img src={user.avatarUrl} alt={user.uname || user.displayName} />
                        <div className="tooltip">
                          <div className="tooltip-name">
                            {user.uname || user.displayName}
                            {isCurrentUser && <span style={{ color: '#60a5fa', fontWeight: 700 }}> (You)</span>}
                          </div>
                          <div className="tooltip-wpm">{wpm} WPM</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="ladder-count">
                {users.length > 0 && <span className="ladder-count-badge">{users.length}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 排行榜标签页组件
interface RankingTabsProps {
  maxWpmRanking: UserStats[];
  avgWpmRanking: UserStats[];
  improvementRanking: UserStats[];
  udocs: Record<number, UserDoc>;
  currentUserId?: number;
}

const RankingTabs: React.FC<RankingTabsProps> = ({
  maxWpmRanking,
  avgWpmRanking,
  improvementRanking,
  udocs,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'max-wpm' | 'avg-wpm' | 'improvement'>('max-wpm');
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingPageSize] = useState(10);

  const getRankIcon = (rankNum: number) => {
    if (rankNum === 1) return <TrophyOutlined style={{ color: '#FFD700' }} />;
    if (rankNum === 2) return <TrophyOutlined style={{ color: '#C0C0C0' }} />;
    if (rankNum === 3) return <TrophyOutlined style={{ color: '#CD7F32' }} />;
    return rankNum;
  };

  const getCurrentRanking = () => {
    switch (activeTab) {
      case 'max-wpm':
        return maxWpmRanking;
      case 'avg-wpm':
        return avgWpmRanking;
      case 'improvement':
        return improvementRanking;
      default:
        return maxWpmRanking;
    }
  };

  const getRankingValue = (user: UserStats) => {
    switch (activeTab) {
      case 'max-wpm':
        return user.maxWpm;
      case 'avg-wpm':
        return user.avgWpm;
      case 'improvement':
        return user.improvement || 0;
      default:
        return user.maxWpm;
    }
  };

  const filteredRanking = useMemo(() => {
    const ranking = getCurrentRanking();
    if (!rankingSearch.trim()) {
      return ranking;
    }
    const keyword = rankingSearch.trim().toLowerCase();
    return ranking.filter((user) => {
      const userDoc = udocs[user.uid];
      const uname = userDoc?.uname?.toLowerCase() || '';
      const displayName = userDoc?.displayName?.toLowerCase() || '';
      return uname.includes(keyword) || displayName.includes(keyword);
    });
  }, [activeTab, rankingSearch, maxWpmRanking, avgWpmRanking, improvementRanking, udocs]);

  // 分页后的排行榜数据
  const paginatedRanking = useMemo(() => {
    const start = (rankingPage - 1) * rankingPageSize;
    const end = start + rankingPageSize;
    return filteredRanking.slice(start, end);
  }, [filteredRanking, rankingPage, rankingPageSize]);

  // 当搜索或标签页切换时，重置到第一页
  useEffect(() => {
    setRankingPage(1);
  }, [activeTab, rankingSearch]);

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Space>
            <TrophyOutlined />
            <span>排行榜</span>
          </Space>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Space size={[4, 4]}>
              <button
                className={`tab-btn ${activeTab === 'max-wpm' ? 'active' : ''}`}
                onClick={() => setActiveTab('max-wpm')}
                style={{
                  padding: '4px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  background: activeTab === 'max-wpm' ? '#1890ff' : '#fff',
                  color: activeTab === 'max-wpm' ? '#fff' : '#000',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                最高速度
              </button>
              <button
                className={`tab-btn ${activeTab === 'avg-wpm' ? 'active' : ''}`}
                onClick={() => setActiveTab('avg-wpm')}
                style={{
                  padding: '4px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  background: activeTab === 'avg-wpm' ? '#1890ff' : '#fff',
                  color: activeTab === 'avg-wpm' ? '#fff' : '#000',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                平均速度
              </button>
              <button
                className={`tab-btn ${activeTab === 'improvement' ? 'active' : ''}`}
                onClick={() => setActiveTab('improvement')}
                style={{
                  padding: '4px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  background: activeTab === 'improvement' ? '#1890ff' : '#fff',
                  color: activeTab === 'improvement' ? '#fff' : '#000',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                进步最快
              </button>
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
              onChange={(e) => setRankingSearch(e.target.value)}
            />
          </div>
        </div>
      }
      className="content-card"
    >
      {filteredRanking && filteredRanking.length > 0 ? (
        <>
          <List
            dataSource={paginatedRanking}
            renderItem={(user, index) => {
              const userDoc = udocs[user.uid];
              const isCurrentUser = currentUserId === user.uid;
              const rank = (rankingPage - 1) * rankingPageSize + index + 1;
              const value = getRankingValue(user);
              const showImprovement = activeTab === 'improvement';

              return (
                <List.Item className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}>
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
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #e5e7eb',
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
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {showImprovement
                          ? `本周平均: ${user.avgWpm} WPM`
                          : `${user.totalRecords} 条记录`}
                      </Text>
                    }
                  />
                  <div className="player-score">
                    <Text strong style={{ fontSize: 16, color: showImprovement ? '#10b981' : '#3b82f6' }}>
                      {showImprovement && '+'}
                      {value}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                      WPM
                    </Text>
                  </div>
                </List.Item>
              );
            }}
          />
          {filteredRanking.length > rankingPageSize && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={rankingPage}
                total={filteredRanking.length}
                pageSize={rankingPageSize}
                onChange={(page) => setRankingPage(page)}
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
  );
};

// 奖励说明组件
const BonusExplanation: React.FC = () => {
  const bonuses = [
    {
      title: '打字进步分',
      icon: '📈',
      description: '每次打字速度超过个人历史最高速度时，奖励',
      points: '+20分',
      pointsColor: '#3b82f6',
      example: '当你的最高速度从50 WPM突破到51 WPM时获得',
    },
    {
      title: '打字目标分',
      icon: '🎯',
      description: '达到新等级时，根据等级奖励对应积分',
      details: [
        { level: '打字小匠 (20-50 WPM)', points: '+100分' },
        { level: '键速高手 (50-80 WPM)', points: '+200分' },
        { level: '键速闪电 (80-110 WPM)', points: '+300分' },
        { level: '键速狂人 (110-140 WPM)', points: '+400分' },
        { level: '键速王者 (140-170 WPM)', points: '+500分' },
        { level: '键速狂魔 (170-200 WPM)', points: '+600分' },
        { level: '终极之神 (200+ WPM)', points: '+700分' },
      ],
      example: '首次达到80 WPM时获得该等级的积分奖励',
    },
    {
      title: '超越对手奖',
      icon: '⚔️',
      description: '超越排行榜中你前一名的对手时获得',
      points: '+20分',
      pointsColor: '#ef4444',
      example: '你的最高速度从85 WPM提升到95 WPM，正好超过前一名的对手时获得',
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {/* 奖励系统说明卡片 */}
      <Col xs={24} lg={16}>
        <Collapse
          className="content-card rules-card"
          defaultActiveKey={['bonus']}
          items={[
            {
              key: 'bonus',
              label: (
                <span>
                  <GiftOutlined style={{ marginRight: 8 }} />
                  奖励系统说明
                </span>
              ),
              children: (
                <div className="rules-grid">
                  {bonuses.map((bonus, index) => (
                    <div key={index} className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-dot" />
                        <span className="rule-title">
                          <span style={{ marginRight: 8 }}>{bonus.icon}</span>
                          {bonus.title}
                        </span>
                      </div>
                      <div className="rule-desc">{bonus.description}</div>
                      {bonus.details ? (
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {bonus.details.map((detail, idx) => (
                            <Tag key={idx} color="blue" style={{ margin: 0 }}>
                              {detail.level}: <strong>{detail.points}</strong>
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          <Tag color={bonus.pointsColor === '#3b82f6' ? 'blue' : 'red'} style={{ fontSize: 16, padding: '4px 12px' }}>
                            <strong>{bonus.points}</strong>
                          </Tag>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Col>

      {/* 开始练习卡片 */}
      <Col xs={24} lg={8}>
        <Card className="game-card practice-card" bordered={false}>
          <div className="game-card-content">
            <div className="game-card-header">
              <div className="game-icon-wrapper practice-icon">
                <PlayCircleOutlined style={{ fontSize: 40, color: '#fff' }} />
              </div>
              <div className="game-card-title-section">
                <Title level={4} className="game-card-title">开始练习</Title>
                <Text className="game-card-subtitle">提升打字速度</Text>
              </div>
            </div>
            <div className="game-card-body">
              <div className="game-card-info">
                <div className="game-info-item">
                  <Text className="game-info-text">在打字练习网站上坚持训练，当有进步成绩时，请汇报给老师录入数据</Text>
                </div>
              </div>
            </div>
            <div className="game-card-footer">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                href="https://dazi.91xjr.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="game-action-btn practice-btn"
                block
                size="large"
              >
                前往练习网站
                <ArrowRightOutlined style={{ marginLeft: 8 }} />
              </Button>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

// 周趋势图表组件
interface WeeklyTrendChartProps {
  weeklyTrend: TrendData[];
}

const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ weeklyTrend }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !weeklyTrend || weeklyTrend.length === 0) {
      return () => {
        // 清理函数：如果条件不满足，确保清理已存在的图表
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      return () => {
        // 清理函数：如果无法获取上下文，确保清理已存在的图表
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }

    // 销毁旧图表
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 创建新图表
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyTrend.map((d) => d.week),
        datasets: [
          {
            label: '平均 WPM',
            data: weeklyTrend.map((d) => d.avgWpm),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [weeklyTrend]);

  return (
    <div className="chart-section">
      <h3>周趋势</h3>
      <div className="trend-chart">
        <canvas ref={canvasRef} width="400" height="250"></canvas>
      </div>
    </div>
  );
};

// 最近记录组件
interface RecentRecordsProps {
  recentRecords: RecentRecord[];
  udocs: Record<number, UserDoc>;
  currentUserId?: number;
}

const RecentRecords: React.FC<RecentRecordsProps> = ({ recentRecords, udocs, currentUserId }) => {
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize] = useState(10);

  // 分页后的记录数据
  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * recordsPageSize;
    const end = start + recordsPageSize;
    return recentRecords.slice(start, end);
  }, [recentRecords, recordsPage, recordsPageSize]);

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>最近记录</span>
        </Space>
      }
      className="content-card"
    >
      {recentRecords.length > 0 ? (
        <>
          <List
            dataSource={paginatedRecords}
            renderItem={(record) => {
              const user = udocs[record.uid];
              const isCurrentUser = currentUserId === record.uid;
              return (
                <List.Item className={`record-item ${isCurrentUser ? 'current-user' : ''}`}>
                  <List.Item.Meta
                    avatar={
                      user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user?.uname || user?.displayName || `User ${record.uid}`}
                          className="record-avatar"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="record-badge badge-positive">
                          <ThunderboltOutlined />
                        </div>
                      )
                    }
                    title={
                      <div className="record-header">
                        <div className="record-user-info">
                          <Text strong className="record-username">
                            {user?.uname || `User ${record.uid}`}
                          </Text>
                          {user?.displayName && (
                            <Text type="secondary" className="record-displayname">
                              ({user.displayName})
                            </Text>
                          )}
                        </div>
                        <div className="record-score-badge score-positive">
                          <Text strong className="record-score-value score-positive">
                            {record.wpm}
                          </Text>
                          <Text type="secondary" className="record-score-unit">
                            WPM
                          </Text>
                        </div>
                      </div>
                    }
                    description={
                      <Text type="secondary" className="record-time">
                        {formatRelativeTime(record.createdAt)}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
          {recentRecords.length > recordsPageSize && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={recordsPage}
                total={recentRecords.length}
                pageSize={recordsPageSize}
                onChange={(page) => setRecordsPage(page)}
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
          <Text type="secondary">暂无记录</Text>
        </div>
      )}
    </Card>
  );
};

// 主应用组件
interface TypingHallAppProps {
  globalStats: any;
  userStats: any;
  userMaxRank: number | null;
  userAvgRank: number | null;
  maxWpmRanking: UserStats[];
  avgWpmRanking: UserStats[];
  improvementRanking: UserStats[];
  recentRecords: RecentRecord[];
  userSpeedPoints: UserSpeedPoint[];
  weeklyTrend: TrendData[];
  udocs: Record<number, UserDoc>;
  canManage: boolean;
  isLoggedIn: boolean;
  currentUserId?: number;
}

const TypingHallApp: React.FC<TypingHallAppProps> = ({
  globalStats: _globalStats,
  userStats,
  userMaxRank,
  userAvgRank,
  maxWpmRanking,
  avgWpmRanking,
  improvementRanking,
  recentRecords,
  userSpeedPoints,
  weeklyTrend,
  udocs,
  canManage,
  isLoggedIn,
  currentUserId,
}) => {
  return (
    <div className="typing-hall-container">
      {/* 打字统计悬浮球 */}
      {isLoggedIn && (
        <TypingStatsFloatingBall
          userStats={userStats}
          userRank={{
            maxRank: userMaxRank,
            avgRank: userAvgRank,
          }}
          userInfo={
            currentUserId
              ? {
                uid: currentUserId,
                avatarUrl: udocs[currentUserId]?.avatarUrl,
                uname: udocs[currentUserId]?.uname,
                displayName: udocs[currentUserId]?.displayName,
              }
              : undefined
          }
          detailUrl="/typing/me"
          isLoggedIn={isLoggedIn}
        />
      )}

      {/* Hero Section - 参考积分大厅设计 */}
      <Card className="hero-card" bordered={false}>
        <div className="hero-content-wrapper">
          <div className="hero-main-content">
            <div className="hero-text-section">
              <Title level={2} className="hero-title">
                打字大厅
              </Title>
              <Text className="hero-subtitle">追踪你的打字进步</Text>
            </div>
            <div className="hero-stats-section">
              <div className="hero-stat-item">
                <div className="hero-stat-icon">
                  <ThunderboltOutlined />
                </div>
                <div className="hero-stat-content">
                  <div className="hero-stat-value">{_globalStats?.maxWpm || 0}</div>
                  <div className="hero-stat-label">最高速度</div>
                </div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-icon">
                  <UserOutlined />
                </div>
                <div className="hero-stat-content">
                  <div className="hero-stat-value">{_globalStats?.totalUsers || 0}</div>
                  <div className="hero-stat-label">总用户数</div>
                </div>
              </div>
            </div>
          </div>
          {isLoggedIn && canManage && (
            <div className="hero-actions-section">
              <Button
                type="default"
                icon={<SettingOutlined />}
                href="/typing/admin"
                className="hero-action-btn"
              >
                管理面板
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 奖励系统说明 */}
      <BonusExplanation />

      {/* 天梯图 */}
      <SpeedLadder userSpeedPoints={userSpeedPoints} udocs={udocs} currentUserId={currentUserId} />

      {/* 排行榜和统计 */}
      <div className="dual-section-grid">
        {/* 排行榜 */}
        <RankingTabs
          maxWpmRanking={maxWpmRanking}
          avgWpmRanking={avgWpmRanking}
          improvementRanking={improvementRanking}
          udocs={udocs}
          currentUserId={currentUserId}
        />

        {/* 右侧栏 */}
        <div className="right-column">
          {/* 最近记录 */}
          <RecentRecords recentRecords={recentRecords} udocs={udocs} currentUserId={currentUserId} />
        </div>
      </div>

      {/* 图表区域 */}
      <div className="content-grid">
        {/* 周趋势 */}
        <WeeklyTrendChart weeklyTrend={weeklyTrend} />
      </div>
    </div>
  );
};

// 注册页面
addPage(
  new NamedPage(['typing_hall'], async () => {
    console.log('[Typing Hall] React page script loaded');

    // 等待 DOM 完全加载
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }

    // 获取挂载点和数据
    const mountPoint = document.getElementById('typing-hall-react-app');
    const dataElement = document.getElementById('typing-hall-data');

    console.log('[Typing Hall] Mount point found:', !!mountPoint);
    console.log('[Typing Hall] Data element found:', !!dataElement);

    if (mountPoint && dataElement) {
      try {
        const data = JSON.parse(dataElement.textContent || '{}');
        console.log('[Typing Hall] Data loaded:', data);

        const root = createRoot(mountPoint);
        root.render(<TypingHallApp {...data} />);
        console.log('[Typing Hall] React app rendered successfully');
      } catch (error) {
        console.error('[Typing Hall] Failed to render React app:', error);
      }
    } else {
      console.error('[Typing Hall] Mount point or data element not found');
    }
  }),
);
