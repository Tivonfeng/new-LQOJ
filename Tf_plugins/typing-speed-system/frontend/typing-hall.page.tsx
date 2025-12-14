/* eslint-disable react-refresh/only-export-components */
import './typing-hall.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AimOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  CrownOutlined,
  FireOutlined,
  GiftOutlined,
  LaptopOutlined,
  PlayCircleOutlined,
  RiseOutlined,
  SettingOutlined,
  StarOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Input, List, Pagination, Row, Space, Tag, Typography } from 'antd';
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
  icon: React.ReactNode;
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
    icon: <CrownOutlined style={{ fontSize: 20 }} />,
    range: '200+',
    min: 200,
    max: Infinity,
    color: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  {
    label: '键速狂魔',
    icon: <LaptopOutlined style={{ fontSize: 20 }} />,
    range: '170-200',
    min: 170,
    max: 200,
    color: 'rgba(219, 39, 119, 0.15)',
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  {
    label: '键速王者',
    icon: <TrophyOutlined style={{ fontSize: 20 }} />,
    range: '140-170',
    min: 140,
    max: 170,
    color: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  {
    label: '键速狂人',
    icon: <FireOutlined style={{ fontSize: 20 }} />,
    range: '110-140',
    min: 110,
    max: 140,
    color: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  {
    label: '键速闪电',
    icon: <ThunderboltOutlined style={{ fontSize: 20 }} />,
    range: '80-110',
    min: 80,
    max: 110,
    color: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  {
    label: '键速高手',
    icon: <StarOutlined style={{ fontSize: 20 }} />,
    range: '50-80',
    min: 50,
    max: 80,
    color: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  {
    label: '打字小匠',
    icon: <StarOutlined style={{ fontSize: 20 }} />,
    range: '20-50',
    min: 20,
    max: 50,
    color: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    label: '打字萌新',
    icon: <UserOutlined style={{ fontSize: 20 }} />,
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
    <Card
      className="content-card ladder-section-card"
      bordered={false}
      title={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
            <ThunderboltOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
            <Title level={4} style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              速度天梯分布
            </Title>
          </Space>
          <Text type="secondary" style={{ fontSize: '0.875rem', display: 'block', marginLeft: 28 }}>
            查看不同速度区间的用户分布情况，悬停头像查看详细信息
          </Text>
        </Space>
      }
      extra={
        <div className="ladder-controls">
          <div className="ladder-tabs">
            <button
              className={`ladder-tab-btn ${speedType === 'avg' ? 'active' : ''}`}
              onClick={() => setSpeedType('avg')}
            >
              <BarChartOutlined className="tab-icon" />
              <span>平均速度</span>
            </button>
            <button
              className={`ladder-tab-btn ${speedType === 'max' ? 'active' : ''}`}
              onClick={() => setSpeedType('max')}
            >
              <TrophyOutlined className="tab-icon" />
              <span>最高速度</span>
            </button>
          </div>
          <div className="ladder-legend">
            <span className="legend-item">
              <AimOutlined className="legend-icon" />
              <span>悬停查看详情</span>
            </span>
          </div>
        </div>
      }
    >
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
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.uname || user.displayName}
                            onError={(e) => {
                              // 如果头像加载失败，隐藏图片
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            loading="lazy"
                          />
                        ) : null}
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
    </Card>
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

// 趋势图表组件（支持周趋势和月趋势）
interface TrendChartProps {
  weeklyTrend: TrendData[];
  globalStats?: {
    maxWpm?: number;
    avgWpm?: number;
  };
}

type TrendType = 'week' | 'month';

const TrendChart: React.FC<TrendChartProps> = ({ weeklyTrend, globalStats }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<Chart | null>(null);
  const [trendType, setTrendType] = useState<TrendType>('week');

  // 计算月趋势数据
  const monthlyTrend = useMemo(() => {
    if (!weeklyTrend || weeklyTrend.length === 0) return [];

    // 按月份分组
    const monthMap = new Map<string, { total: number, count: number }>();

    weeklyTrend.forEach((item) => {
      // 从周字符串中提取年月（格式：2024-W01）
      const match = item.week.match(/^(\d{4})-W/);
      if (match) {
        const year = match[1];
        // 计算该周属于哪个月
        // 简化处理：使用周字符串的第一个日期来确定月份
        const weekNum = Number.parseInt(item.week.split('-W')[1], 10);
        const yearNum = Number.parseInt(year, 10);
        // 计算该年的第一周日期
        const firstDay = new Date(yearNum, 0, 1);
        const firstWeekStart = new Date(firstDay);
        firstWeekStart.setDate(firstDay.getDate() - firstDay.getDay());
        const weekStart = new Date(firstWeekStart);
        weekStart.setDate(firstWeekStart.getDate() + (weekNum - 1) * 7);
        const month = `${year}-${String(weekStart.getMonth() + 1).padStart(2, '0')}`;

        if (!monthMap.has(month)) {
          monthMap.set(month, { total: 0, count: 0 });
        }
        const monthData = monthMap.get(month)!;
        monthData.total += item.avgWpm;
        monthData.count += 1;
      }
    });

    // 转换为数组并计算平均值
    const monthlyData: TrendData[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        week: month,
        avgWpm: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return monthlyData;
  }, [weeklyTrend]);

  // 根据趋势类型获取数据
  const currentTrendData = useMemo(() => {
    return trendType === 'week' ? weeklyTrend : monthlyTrend;
  }, [trendType, weeklyTrend, monthlyTrend]);

  useEffect(() => {
    if (!canvasRef.current || !currentTrendData || currentTrendData.length === 0) {
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

    // 格式化标签
    const formatLabel = (label: string) => {
      if (trendType === 'week') {
        return label; // 周趋势直接显示
      } else {
        // 月趋势格式化为 "YYYY年MM月"
        const match = label.match(/^(\d{4})-(\d{2})$/);
        if (match) {
          return `${match[1]}年${Number.parseInt(match[2], 10)}月`;
        }
        return label;
      }
    };

    // 创建新图表
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: currentTrendData.map((d) => formatLabel(d.week)),
        datasets: [
          {
            label: '平均 WPM',
            data: currentTrendData.map((d) => d.avgWpm),
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#ffffff',
            pointRadius: 4,
            pointHoverRadius: 6,
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
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
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
  }, [currentTrendData, trendType]);

  return (
    <Card className="game-card trend-card" bordered={false}>
      <div className="game-card-content">
        <div className="game-card-header">
          <div className="game-icon-wrapper">
            <BarChartOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>
          <div className="game-card-title-section">
            <Title level={4} className="game-card-title">全校打字速度趋势分析</Title>
            <Text className="game-card-subtitle">平均速度变化</Text>
          </div>
        </div>
        <div className="trend-controls">
          <button
            className={`trend-tab-btn ${trendType === 'week' ? 'active' : ''}`}
            onClick={() => setTrendType('week')}
          >
            周趋势
          </button>
          <button
            className={`trend-tab-btn ${trendType === 'month' ? 'active' : ''}`}
            onClick={() => setTrendType('month')}
          >
            月趋势
          </button>
        </div>
        <div className="game-card-body">
          <div className="trend-chart">
            <canvas ref={canvasRef} width="400" height="180"></canvas>
          </div>
        </div>
        {/* 统计信息 */}
        {globalStats && (
          <div className="trend-stats">
            <div className="trend-stat-item">
              <div className="trend-stat-icon">
                <ThunderboltOutlined />
              </div>
              <div className="trend-stat-content">
                <div className="trend-stat-value">{globalStats.maxWpm || 0} WPM</div>
                <div className="trend-stat-label">全校最高速度</div>
              </div>
            </div>
            <div className="trend-stat-item">
              <div className="trend-stat-icon">
                <BarChartOutlined />
              </div>
              <div className="trend-stat-content">
                <div className="trend-stat-value">{globalStats.avgWpm || 0} WPM</div>
                <div className="trend-stat-label">全校平均速度</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// 奖励说明组件
interface BonusExplanationProps {
  weeklyTrend: TrendData[];
  globalStats?: {
    maxWpm?: number;
    avgWpm?: number;
  };
}

const BonusExplanation: React.FC<BonusExplanationProps> = ({ weeklyTrend, globalStats }) => {
  const bonuses = [
    {
      title: '打字进步分',
      icon: <RiseOutlined style={{ fontSize: 18 }} />,
      description: '每次打字速度超过个人历史最高速度奖励',
      points: '+20分',
      pointsColor: '#3b82f6',
      example: '当你的最高速度从50WPM突破到51WPM时获得',
    },
    {
      title: '打字目标分',
      icon: <AimOutlined style={{ fontSize: 18 }} />,
      description: '达到新等级时，根据等级奖励对应积分',
      details: [
        { level: '打字小匠 (20-50WPM)', points: '+100分' },
        { level: '键速高手 (50-80WPM)', points: '+200分' },
        { level: '键速闪电 (80-110WPM)', points: '+300分' },
        { level: '键速狂人 (110-140WPM)', points: '+400分' },
        { level: '键速王者 (140-170WPM)', points: '+500分' },
        { level: '键速狂魔 (170-200WPM)', points: '+600分' },
        { level: '终极之神 (200+WPM)', points: '+700分' },
      ],
      example: '首次达到80WPM时获得该等级的积分奖励',
    },
    {
      title: '超越对手奖',
      icon: <TrophyOutlined style={{ fontSize: 18 }} />,
      description: '超越排行榜中你前一名的对手获得',
      points: '+20分',
      pointsColor: '#ef4444',
      example: '你的最高速度从85WPM提升到95WPM，超过前一名的对手时获得',
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {/* 奖励系统说明卡片 */}
      <Col xs={24} lg={16}>
        <Card
          className="content-card"
          title={
            <Space>
              <GiftOutlined />
              奖励系统说明
            </Space>
          }
        >
          <div className="bonus-list">
            <Row gutter={[12, 12]}>
              {/* 第一行：打字进步分和超越对手奖 */}
              <Col xs={24} sm={12}>
                <Card className="bonus-item-card" bordered={false}>
                  <div className="bonus-item-content">
                    <div className="bonus-item-header">
                      <div className="bonus-icon-wrapper">
                        {bonuses[0].icon}
                      </div>
                      <div className="bonus-item-title-section">
                        <Title level={5} className="bonus-item-title" style={{ margin: 0 }}>
                          {bonuses[0].title}
                        </Title>
                        <Text type="secondary" className="bonus-item-desc">
                          {bonuses[0].description}
                        </Text>
                      </div>
                      <div className="bonus-points-badge">
                        <Tag
                          color={bonuses[0].pointsColor === '#3b82f6' ? 'blue' : 'red'}
                          className="bonus-points-tag"
                        >
                          {bonuses[0].points}
                        </Tag>
                      </div>
                    </div>
                    <div className="bonus-example">
                      <Text type="secondary" className="bonus-example-text">
                        {bonuses[0].example}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card className="bonus-item-card" bordered={false}>
                  <div className="bonus-item-content">
                    <div className="bonus-item-header">
                      <div className="bonus-icon-wrapper">
                        {bonuses[2].icon}
                      </div>
                      <div className="bonus-item-title-section">
                        <Title level={5} className="bonus-item-title" style={{ margin: 0 }}>
                          {bonuses[2].title}
                        </Title>
                        <Text type="secondary" className="bonus-item-desc">
                          {bonuses[2].description}
                        </Text>
                      </div>
                      <div className="bonus-points-badge">
                        <Tag
                          color={bonuses[2].pointsColor === '#3b82f6' ? 'blue' : 'red'}
                          className="bonus-points-tag"
                        >
                          {bonuses[2].points}
                        </Tag>
                      </div>
                    </div>
                    <div className="bonus-example">
                      <Text type="secondary" className="bonus-example-text">
                        {bonuses[2].example}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
            {/* 第二行：打字目标分 */}
            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24}>
                <Card className="bonus-item-card" bordered={false}>
                  <div className="bonus-item-content">
                    <div className="bonus-item-header">
                      <div className="bonus-icon-wrapper">
                        {bonuses[1].icon}
                      </div>
                      <div className="bonus-item-title-section">
                        <Title level={5} className="bonus-item-title" style={{ margin: 0 }}>
                          {bonuses[1].title}
                        </Title>
                        <Text type="secondary" className="bonus-item-desc">
                          {bonuses[1].description}
                        </Text>
                      </div>
                    </div>
                    {bonuses[1].details && (
                      <div className="bonus-details-grid">
                        {bonuses[1].details.map((detail, idx) => (
                          <div key={idx} className="bonus-detail-item">
                            <Text type="secondary" className="bonus-detail-level">
                              {detail.level}
                            </Text>
                            <Tag color="blue" className="bonus-detail-points">
                              {detail.points}
                            </Tag>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bonus-example">
                      <Text type="secondary" className="bonus-example-text">
                        {bonuses[1].example}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </Card>
      </Col>

      {/* 周趋势图表 */}
      <Col xs={24} lg={8}>
        <TrendChart weeklyTrend={weeklyTrend} globalStats={globalStats} />
      </Col>
    </Row>
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
          </div>
          <div className="hero-actions-section">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              href="https://dazi.91xjr.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-action-btn"
              size="large"
            >
              前往练习网站
              <ArrowRightOutlined style={{ marginLeft: 8 }} />
            </Button>
            {isLoggedIn && canManage && (
              <Button
                type="default"
                icon={<SettingOutlined />}
                href="/typing/admin"
                className="hero-action-btn"
              >
                管理面板
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 奖励系统说明 */}
      <BonusExplanation weeklyTrend={weeklyTrend} globalStats={_globalStats} />

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
