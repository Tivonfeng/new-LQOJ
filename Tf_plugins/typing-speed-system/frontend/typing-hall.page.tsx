/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import { Chart, registerables } from 'chart.js';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

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

// 天梯等级定义
const LADDER_RANGES: LadderRange[] = [
  {
    label: '键盘之神',
    icon: '👑',
    range: '200+',
    min: 200,
    max: Infinity,
    color: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  {
    label: '指尖飞舞',
    icon: '💎',
    range: '180-200',
    min: 180,
    max: 200,
    color: 'rgba(219, 39, 119, 0.15)',
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  {
    label: '超级赛亚人',
    icon: '🌟',
    range: '160-180',
    min: 160,
    max: 180,
    color: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  {
    label: '速度狂魔',
    icon: '🔥',
    range: '120-160',
    min: 120,
    max: 160,
    color: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  {
    label: '闪电侠',
    icon: '⚡',
    range: '90-120',
    min: 90,
    max: 120,
    color: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  {
    label: '打字高手',
    icon: '⭐',
    range: '70-90',
    min: 70,
    max: 90,
    color: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  {
    label: '键盘侠',
    icon: '✨',
    range: '50-70',
    min: 50,
    max: 70,
    color: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    label: '进阶选手',
    icon: '📈',
    range: '30-50',
    min: 30,
    max: 50,
    color: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  {
    label: '键盘萌新',
    icon: '🌱',
    range: '0-30',
    min: 0,
    max: 30,
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
                  {users.map((point, pointIndex) => {
                    const user = udocs[point.uid];
                    if (!user) return null;

                    const wpm = speedType === 'avg' ? point.avgWpm : point.maxWpm;
                    const position = calculatePosition(wpm, range.min, actualMax);
                    const yOffset = (Math.random() - 0.5) * 30;
                    const isCurrentUser = currentUserId === point.uid;

                    return (
                      <div
                        key={`${point.uid}-${pointIndex}`}
                        className={`user-avatar-point ${isCurrentUser ? 'current-user-point' : ''}`}
                        style={{
                          left: `${position}%`,
                          transform: `translateY(${yOffset}px)`,
                          animationDelay: `${index * 0.1 + pointIndex * 0.05}s`,
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

  const getMedal = (index: number): string => {
    const medals = ['🥇', '🥈', '🥉'];
    return index < 3 ? medals[index] : `${index + 1}`;
  };

  const renderRanking = (ranking: UserStats[], showImprovement: boolean = false) => (
    <div className="ranking-list">
      {ranking.length > 0 ? (
        ranking.map((user, index) => {
          const userDoc = udocs[user.uid];
          const isCurrentUser = currentUserId === user.uid;
          return (
            <div key={user.uid} className={`ranking-item ${isCurrentUser ? 'current-user' : ''}`}>
              <div className={`rank-badge rank-${index < 3 ? index + 1 : 'other'}`}>{getMedal(index)}</div>
              <div className="user-info">
                <div className="user-name">{userDoc?.uname || `User ${user.uid}`}</div>
                <div className="user-meta">
                  {showImprovement ? `本周平均: ${user.avgWpm} WPM` : `${user.totalRecords} 条记录`}
                </div>
              </div>
              <div className={`score-value ${showImprovement ? 'improvement' : ''}`}>
                {showImprovement && '+'}
                {showImprovement ? user.improvement : activeTab === 'max-wpm' ? user.maxWpm : user.avgWpm}{' '}
                <span className="unit">WPM</span>
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty-state">
          <p>暂无数据</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="rankings-section">
      <div className="section-header">
        <h2>排行榜</h2>
        <a href="/typing/ranking" className="view-all-link">
          查看全部 →
        </a>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'max-wpm' ? 'active' : ''}`}
          onClick={() => setActiveTab('max-wpm')}
        >
          最高速度
        </button>
        <button
          className={`tab-btn ${activeTab === 'avg-wpm' ? 'active' : ''}`}
          onClick={() => setActiveTab('avg-wpm')}
        >
          平均速度
        </button>
        <button
          className={`tab-btn ${activeTab === 'improvement' ? 'active' : ''}`}
          onClick={() => setActiveTab('improvement')}
        >
          进步最快
        </button>
      </div>

      <div className="tab-content active">
        {activeTab === 'max-wpm' && renderRanking(maxWpmRanking)}
        {activeTab === 'avg-wpm' && renderRanking(avgWpmRanking)}
        {activeTab === 'improvement' && renderRanking(improvementRanking, true)}
      </div>
    </div>
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
    if (!canvasRef.current || !weeklyTrend || weeklyTrend.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

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
  return (
    <div className="recent-section">
      <div className="section-header">
        <h3>最近记录</h3>
      </div>
      <div className="records-list">
        {recentRecords.length > 0 ? (
          recentRecords.map((record, index) => {
            const user = udocs[record.uid];
            const isCurrentUser = currentUserId === record.uid;
            return (
              <div key={index} className={`record-item ${isCurrentUser ? 'current-user' : ''}`}>
                <div className="record-icon">⌨️</div>
                <div className="record-info">
                  <div className="record-user">{user?.uname || `User ${record.uid}`}</div>
                  <div className="record-time">{record.createdAt}</div>
                </div>
                <div className="record-wpm">
                  {record.wpm} <span className="unit">WPM</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>暂无记录</p>
          </div>
        )}
      </div>
    </div>
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
  globalStats,
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
  isLoggedIn,
  currentUserId,
}) => {
  return (
    <div className="typing-hall-react-app">
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
          {/* 用户统计卡片 */}
          {isLoggedIn && (
            <div className="user-overview-card-compact">
              <div className="overview-header">
                <h2>我的打字统计</h2>
                <a href="/typing/me" className="view-details-link">
                  查看详情 →
                </a>
              </div>
              <div className="overview-stats-compact">
                <div className="stat-item">
                  <div className="stat-label">最高速度</div>
                  <div className="stat-value">
                    {userStats.maxWpm} <span className="unit">WPM</span>
                  </div>
                  {userMaxRank && <div className="stat-rank">排名 #{userMaxRank}</div>}
                </div>
                <div className="stat-item">
                  <div className="stat-label">平均速度</div>
                  <div className="stat-value">
                    {userStats.avgWpm} <span className="unit">WPM</span>
                  </div>
                  {userAvgRank && <div className="stat-rank">排名 #{userAvgRank}</div>}
                </div>
                <div className="stat-item">
                  <div className="stat-label">总记录数</div>
                  <div className="stat-value">{userStats.totalRecords}</div>
                </div>
              </div>
            </div>
          )}

          {/* 最近记录 */}
          <RecentRecords recentRecords={recentRecords} udocs={udocs} currentUserId={currentUserId} />
        </div>
      </div>

      {/* 图表区域 */}
      <div className="content-grid">
        {/* 周趋势 */}
        <WeeklyTrendChart weeklyTrend={weeklyTrend} />

        {/* 活动概览 */}
        <div className="chart-section">
          <h3>活动概览</h3>
          <div className="activity-stats">
            <div className="activity-item">
              <div className="activity-icon">👥</div>
              <div className="activity-value">{globalStats.totalUsers}</div>
              <div className="activity-label">总用户数</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">⚡</div>
              <div className="activity-value">{globalStats.maxWpm}</div>
              <div className="activity-label">最高速度</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">📈</div>
              <div className="activity-value">{globalStats.avgWpm}</div>
              <div className="activity-label">平均速度</div>
            </div>
          </div>
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
