/* eslint-disable react-refresh/only-export-components */
import './typing-profile.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, List, Pagination, Space, Tag, Typography } from 'antd';
import { Chart, registerables } from 'chart.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 注册 Chart.js 组件
Chart.register(...registerables);

interface TypingProfileAppProps {
  userStats: {
    maxWpm: number;
    avgWpm: number;
    totalRecords: number;
  };
  maxRank: number | null;
  avgRank: number | null;
  userRecords: Array<{
    wpm: number;
    createdAt: string;
    recordedBy: number;
    note?: string;
  }>;
  progressData: Array<{
    date: string;
    wpm: number;
  }>;
  recorderDocs: Record<string, { uname?: string, displayName?: string }>;
}

// 格式化相对时间
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

// 进步曲线图表组件
const ProgressChart: React.FC<{ progressData: Array<{ date: string, wpm: number }> }> = ({ progressData }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !progressData || progressData.length === 0) {
      return undefined;
    }

    // 销毁旧图表
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // 创建新图表
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: progressData.map((d) => d.date),
        datasets: [
          {
            label: 'WPM',
            data: progressData.map((d) => d.wpm),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
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
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => `速度: ${context.parsed.y} WPM`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'WPM',
              font: { size: 12, weight: 'bold' },
              color: '#6b7280',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            title: {
              display: true,
              text: '日期',
              font: { size: 12, weight: 'bold' },
              color: '#6b7280',
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [progressData]);

  return <canvas ref={chartRef} />;
};

// 打字页面主组件
const TypingProfileApp: React.FC<TypingProfileAppProps> = ({
  userStats,
  maxRank,
  avgRank,
  userRecords,
  progressData,
  recorderDocs,
}) => {
  const [recordsPage, setRecordsPage] = useState(1);
  const recordsPageSize = 10;

  // 分页后的记录
  const paginatedRecords = useMemo(() => {
    const startIndex = (recordsPage - 1) * recordsPageSize;
    return userRecords.slice(startIndex, startIndex + recordsPageSize);
  }, [userRecords, recordsPage, recordsPageSize]);

  // 处理返回大厅
  const handleGoToHall = useCallback(() => {
    window.location.href = '/typing/hall';
  }, []);

  return (
    <div className="typing-profile-container">
      {/* Hero Section */}
      <Card className="profile-hero-card" bordered={false}>
        <div className="profile-hero-content">
          <div className="profile-hero-text">
            <Title level={2} className="profile-hero-title">我的打字统计</Title>
            <Text className="profile-hero-subtitle">追踪你的打字进步，查看详细记录和趋势</Text>
            <div className="profile-hero-tags">
              <Tag color="blue">最高速度 {userStats.maxWpm} WPM</Tag>
              <Tag color="purple">平均速度 {userStats.avgWpm} WPM</Tag>
              <Tag color="gold">总记录数 {userStats.totalRecords}</Tag>
            </div>
          </div>
          <div className="profile-hero-actions">
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              className="profile-hero-action-btn"
              onClick={handleGoToHall}
            >
              返回打字大厅
            </Button>
          </div>
        </div>
      </Card>

      <div className="profile-grid">
        <div className="main-column">
          {/* 统计卡片 */}
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-icon-wrapper">
                <TrophyOutlined className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-label">最高速度</div>
                <div className="stat-value">
                  {userStats.maxWpm} <span className="stat-unit">WPM</span>
                </div>
                {maxRank && (
                  <div className="stat-rank">
                    <TrophyOutlined style={{ fontSize: 12, marginRight: 4 }} />
                    排名 #{maxRank}
                  </div>
                )}
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-icon-wrapper">
                <LineChartOutlined className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-label">平均速度</div>
                <div className="stat-value">
                  {userStats.avgWpm} <span className="stat-unit">WPM</span>
                </div>
                {avgRank && (
                  <div className="stat-rank">
                    <LineChartOutlined style={{ fontSize: 12, marginRight: 4 }} />
                    排名 #{avgRank}
                  </div>
                )}
              </div>
            </Card>

            <Card className="stat-card">
              <div className="stat-icon-wrapper">
                <ThunderboltOutlined className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-label">总记录数</div>
                <div className="stat-value">{userStats.totalRecords}</div>
                <div className="stat-rank">历史记录总数</div>
              </div>
            </Card>
          </div>

          {/* 进步曲线 */}
          {progressData && progressData.length > 0 && (
            <Card
              className="section-card chart-card"
              title={
                <Space>
                  <LineChartOutlined />
                  <span>进步曲线</span>
                </Space>
              }
            >
              <div className="chart-container">
                <ProgressChart progressData={progressData} />
              </div>
            </Card>
          )}

          {/* 记录列表 */}
          <Card
            className="section-card records-card"
            title={
              <Space>
                <ThunderboltOutlined />
                <span>历史记录</span>
              </Space>
            }
          >
            {userRecords.length > 0 ? (
              <>
                <List
                  dataSource={paginatedRecords}
                  renderItem={(record, index) => {
                    const isBestRecord = record.wpm === userStats.maxWpm;
                    const recorder = recorderDocs[String(record.recordedBy)];
                    const recorderName = recorder?.uname || recorder?.displayName || '管理员';

                    return (
                      <List.Item className={`record-item ${isBestRecord ? 'best-record' : ''}`}>
                        <div className="record-content">
                          <div className="record-header">
                            <Space>
                              <Tag color={isBestRecord ? 'green' : 'blue'} className="record-wpm-tag">
                                {record.wpm} WPM
                              </Tag>
                              <Text strong style={{ fontSize: 14 }}>
                                {isBestRecord ? '最佳记录' : `记录 #${(recordsPage - 1) * recordsPageSize + index + 1}`}
                              </Text>
                            </Space>
                          </div>
                          <div className="record-meta">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <UserOutlined style={{ marginRight: 4 }} />
                              录入人: {recorderName}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatRelativeTime(record.createdAt)}
                            </Text>
                          </div>
                          {record.note && (
                            <div className="record-note">
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                备注: {record.note}
                              </Text>
                            </div>
                          )}
                        </div>
                      </List.Item>
                    );
                  }}
                />
                {userRecords.length > recordsPageSize && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Pagination
                      current={recordsPage}
                      total={userRecords.length}
                      pageSize={recordsPageSize}
                      onChange={setRecordsPage}
                      size="small"
                      showSizeChanger={false}
                      showQuickJumper={false}
                      showTotal={(total) => `共 ${total} 条记录`}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <Text type="secondary">暂无记录</Text>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['typing_profile'], async () => {
  // 等待 DOM 完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 从全局变量获取数据
  const dataScript = document.getElementById('typing-profile-data');
  const mountPoint = document.getElementById('typing-profile-react-app');

  console.log('[Typing Profile] Mount point found:', !!mountPoint);
  console.log('[Typing Profile] Data script found:', !!dataScript);

  if (!dataScript) {
    console.error('[Typing Profile] Data script not found');
    return;
  }

  if (!mountPoint) {
    console.error('[Typing Profile] Mount point not found: typing-profile-react-app');
    return;
  }

  let props: TypingProfileAppProps;
  try {
    props = JSON.parse(dataScript.textContent || '{}');
    console.log('[Typing Profile] Data loaded:', props);
  } catch (error) {
    console.error('[Typing Profile] Failed to parse typing profile data:', error);
    return;
  }

  // 初始化React应用
  try {
    const root = createRoot(mountPoint);
    root.render(<TypingProfileApp {...props} />);
    console.log('[Typing Profile] React app rendered successfully');
  } catch (error) {
    console.error('[Typing Profile] Failed to render React app:', error);
  }
}));
