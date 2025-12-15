/* eslint-disable react-refresh/only-export-components */
import './student-analytics.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  FileTextOutlined,
  FireOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  Card,
  Col,
  Row,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title } = Typography;

// 学生数据分析页面组件
const StudentAnalyticsApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从全局变量获取数据
    const analyticsData = (window as any).studentAnalyticsData;
    if (analyticsData) {
      try {
        const parsedData = typeof analyticsData === 'string'
          ? JSON.parse(analyticsData)
          : analyticsData;
        console.log('[Student Analytics] Data loaded:', {
          hasMonthlyCodeStats: !!parsedData.monthlyCodeStats,
          monthlyCodeStatsLength: parsedData.monthlyCodeStats?.length || 0,
          monthlyCodeStats: parsedData.monthlyCodeStats,
        });
        setData(parsedData);
      } catch (error) {
        console.error('[Student Analytics] Failed to parse data:', error);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="student-analytics-container">Loading...</div>;
  }

  if (!data) {
    return <div className="student-analytics-container">暂无数据</div>;
  }

  const maxTimeCount = data.submissionTimeDistribution
    ? Math.max(...data.submissionTimeDistribution.map((i: any) => i.count))
    : 1;

  return (
    <div className="student-analytics-container">
      {/* Hero Section */}
      <Card className="hero-card">
        <div className="hero-content">
          <Title level={1} className="hero-title">
            <BarChartOutlined /> 学生数据分析（开发中）
          </Title>
          <div className="hero-subtitle">全面了解你的学习情况与进步轨迹</div>
        </div>
      </Card>

      {/* 代码统计 */}
      {data.totalCodeLines !== undefined && (
        <Card className="stats-card" title={<><CodeOutlined /> 代码统计</>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card className="stat-card stat-card-code">
                <Statistic
                  title="总代码行数"
                  value={data.totalCodeLines}
                  valueStyle={{ color: '#6366f1' }}
                  prefix={<CodeOutlined />}
                />
              </Card>
            </Col>
            {data.weeklyCodeStats && data.weeklyCodeStats.length > 0 && (
              <Col xs={24} sm={12} lg={8}>
                <Card className="stat-card stat-card-avg-code">
                  <Statistic
                    title="平均每周代码行数"
                    value={Math.round(
                      data.weeklyCodeStats.reduce((sum: number, w: any) => sum + w.totalLines, 0)
                      / data.weeklyCodeStats.length,
                    )}
                    valueStyle={{ color: '#8b5cf6' }}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* 提交统计 */}
      {data.submissionStats && (
        <Card className="stats-card" title={<><CheckCircleOutlined /> 提交统计</>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-submissions">
                <Statistic
                  title="总提交数"
                  value={data.submissionStats.totalSubmissions}
                  valueStyle={{ color: '#3b82f6' }}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-ac">
                <Statistic
                  title="AC 数量"
                  value={data.submissionStats.acCount}
                  valueStyle={{ color: '#10b981' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-ac-rate">
                <Statistic
                  title="AC 率"
                  value={data.submissionStats.acRate}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#f59e0b' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-problems">
                <Statistic
                  title="不同题目数"
                  value={data.submissionStats.uniqueProblems}
                  valueStyle={{ color: '#ec4899' }}
                  prefix={<FireOutlined />}
                />
              </Card>
            </Col>
          </Row>
          <Card className="status-breakdown-card" title="提交状态分布">
            <div className="status-list">
              <Tag color="red" className="status-tag">
                WA: {data.submissionStats.waCount}
              </Tag>
              <Tag color="orange" className="status-tag">
                TLE: {data.submissionStats.tleCount}
              </Tag>
              <Tag color="purple" className="status-tag">
                MLE: {data.submissionStats.mleCount}
              </Tag>
              <Tag color="blue" className="status-tag">
                RE: {data.submissionStats.reCount}
              </Tag>
              <Tag color="cyan" className="status-tag">
                CE: {data.submissionStats.ceCount}
              </Tag>
            </div>
          </Card>
        </Card>
      )}

      {/* 题目完成情况 */}
      {data.problemCompletionStats && (
        <Card className="stats-card" title={<><TrophyOutlined /> 题目完成情况</>}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-solved">
                <Statistic
                  title="已解决题目"
                  value={data.problemCompletionStats.solvedProblems}
                  valueStyle={{ color: '#10b981' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-attempted">
                <Statistic
                  title="已尝试题目"
                  value={data.problemCompletionStats.attemptedProblems}
                  valueStyle={{ color: '#3b82f6' }}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-completion">
                <Statistic
                  title="完成率"
                  value={data.problemCompletionStats.completionRate}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#f59e0b' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card stat-card-starred">
                <Statistic
                  title="收藏题目"
                  value={data.problemCompletionStats.starredProblems}
                  valueStyle={{ color: '#ec4899' }}
                  prefix={<StarOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* 每月代码统计 */}
      <Card className="stats-card" title={<><CalendarOutlined /> 每月代码统计</>}>
        {data.monthlyCodeStats && data.monthlyCodeStats.length > 0 ? (
          <Row gutter={[16, 16]}>
            {data.monthlyCodeStats.map((month: any, index: number) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={index}>
                <Card className="month-card">
                  <div className="month-header">
                    {month.year}年{month.month}月
                  </div>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic
                        title="代码行数"
                        value={month.totalLines}
                        valueStyle={{ fontSize: '18px', color: '#6366f1' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="提交数"
                        value={month.totalSubmissions}
                        valueStyle={{ fontSize: '18px', color: '#10b981' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="题目数"
                        value={month.uniqueProblems}
                        valueStyle={{ fontSize: '18px', color: '#f59e0b' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="平均行数"
                        value={month.averageLinesPerSubmission}
                        precision={1}
                        valueStyle={{ fontSize: '18px', color: '#ec4899' }}
                      />
                    </Col>
                    <Col span={24}>
                      <Statistic
                        title="日均代码行数"
                        value={month.averageLinesPerDay}
                        precision={1}
                        valueStyle={{ fontSize: '16px', color: '#8b5cf6' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无每月代码统计数据
            {data.monthlyCodeStats === undefined && ' (数据加载中...)'}
            {data.monthlyCodeStats && data.monthlyCodeStats.length === 0 && ' (最近12个月内无提交记录)'}
          </div>
        )}
      </Card>

      {/* 每周代码统计 */}
      {data.weeklyCodeStats && data.weeklyCodeStats.length > 0 && (
        <Card className="stats-card" title={<><ClockCircleOutlined /> 每周代码统计</>}>
          <Row gutter={[16, 16]}>
            {data.weeklyCodeStats.map((week: any, index: number) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card className="week-card">
                  <div className="week-header">
                    {week.year}年第{week.week}周
                  </div>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic
                        title="代码行数"
                        value={week.totalLines}
                        valueStyle={{ fontSize: '18px', color: '#6366f1' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="提交数"
                        value={week.totalSubmissions}
                        valueStyle={{ fontSize: '18px', color: '#10b981' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="题目数"
                        value={week.uniqueProblems}
                        valueStyle={{ fontSize: '18px', color: '#f59e0b' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="平均行数"
                        value={week.averageLinesPerSubmission}
                        precision={1}
                        valueStyle={{ fontSize: '18px', color: '#ec4899' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 提交时间分布 */}
      {data.submissionTimeDistribution && data.submissionTimeDistribution.length > 0 && (
        <Card className="stats-card" title={<><ClockCircleOutlined /> 提交时间分布（按小时）</>}>
          <div className="time-distribution">
            {data.submissionTimeDistribution.map((item: any) => (
              <div key={item.hour} className="time-bar">
                <div className="time-label">{item.hour.toString().padStart(2, '0')}:00</div>
                <div className="time-bar-container">
                  <div
                    className="time-bar-fill"
                    style={{
                      width: `${(item.count / maxTimeCount) * 100}%`,
                    }}
                  >
                    <span className="time-bar-text">{item.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['student_analytics'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('student-analytics-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<StudentAnalyticsApp />);
    } catch (error) {
      console.error('[Student Analytics] Failed to render React app:', error);
    }
  } else {
    console.error('[Student Analytics] Mount point not found');
  }
}));
