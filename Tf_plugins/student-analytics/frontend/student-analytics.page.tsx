import './student-analytics.page.css';

import { addPage, NamedPage, request } from '@hydrooj/ui-default';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DownOutlined,
  FileTextOutlined,
  FireOutlined,
  LoadingOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title } = Typography;

// 时间范围类型
type TimeRangeType = 'weekly' | 'monthly';

// 学生数据分析页面组件
const StudentAnalyticsApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState<{weekly: boolean; monthly: boolean}>({
    weekly: false,
    monthly: false,
  });
  const [expanded, setExpanded] = useState<{weekly: boolean; monthly: boolean}>({
    weekly: false,
    monthly: false,
  });
  // 时间统计视图切换
  const [timeView, setTimeView] = useState<TimeRangeType>('monthly');

  useEffect(() => {
    // 从全局变量获取数据
    const analyticsData = (window as any).studentAnalyticsData;
    if (analyticsData) {
      try {
        const parsedData = typeof analyticsData === 'string'
          ? JSON.parse(analyticsData)
          : analyticsData;
        setData(parsedData);
      } catch (error) {
        console.error('[Student Analytics] Failed to parse data:', error);
      }
    }
    setLoading(false);
  }, []);

  // 加载更多数据
  const loadMore = async (type: TimeRangeType) => {
    setLoadingMore((prev) => ({ ...prev, [type]: true }));
    try {
      const params = type === 'weekly'
        ? { type: 'weekly', weeks: 12 }
        : { type: 'monthly', months: 12 };

      const response = await request.get('/analytics/student/api/more', params);

      if (response) {
        setData((prev: any) => ({
          ...prev,
          ...(type === 'weekly' && response.weeklyCodeStats
            ? { weeklyCodeStats: response.weeklyCodeStats }
            : {}),
          ...(type === 'monthly' && response.monthlyCodeStats
            ? { monthlyCodeStats: response.monthlyCodeStats }
            : {}),
        }));
        setExpanded((prev) => ({ ...prev, [type]: true }));
      }
    } catch (error) {
      console.error(`[Student Analytics] Failed to load more ${type} data:`, error);
    } finally {
      setLoadingMore((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (loading) {
    return <div className="student-analytics-container">Loading...</div>;
  }

  if (!data) {
    return <div className="student-analytics-container">暂无数据</div>;
  }

  const maxTimeCount = data.submissionTimeDistribution
    ? Math.max(...data.submissionTimeDistribution.map((i: any) => i.count))
    : 1;

  // 渲染时间统计内容
  const renderTimeStats = () => {
    if (timeView === 'monthly') {
      // 每月统计
      if (!data.monthlyCodeStats || data.monthlyCodeStats.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            暂无每月代码统计数据
            {data.monthlyCodeStats === undefined && ' (数据加载中...)'}
            {data.monthlyCodeStats && data.monthlyCodeStats.length === 0 && ' (最近无提交记录)'}
          </div>
        );
      }
      return (
        <Row gutter={[16, 16]}>
          {data.monthlyCodeStats.map((month: any, index: number) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={`month-${index}`}>
              <Card className="time-stat-card month-card">
                <div className="time-stat-header">
                  <CalendarOutlined /> {month.year}年{month.month}月
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
      );
    }
    // 每周统计
    if (!data.weeklyCodeStats || data.weeklyCodeStats.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          暂无每周代码统计数据
        </div>
      );
    }
    return (
      <Row gutter={[16, 16]}>
        {data.weeklyCodeStats.map((week: any, index: number) => (
          <Col xs={24} sm={12} lg={8} key={`week-${index}`}>
            <Card className="time-stat-card week-card">
              <div className="time-stat-header">
                <ClockCircleOutlined /> {week.year}年第{week.week}周
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
    );
  };

  // 判断是否可以加载更多
  const canLoadMore = timeView === 'weekly'
    ? !expanded.weekly && data.hasMoreWeeks
    : !expanded.monthly && data.hasMoreMonths;

  const isLoadingMore = timeView === 'weekly' ? loadingMore.weekly : loadingMore.monthly;

  return (
    <div className="student-analytics-container">
      {/* Hero Section */}
      <Card className="hero-card">
        <div className="hero-content">
          <Title level={1} className="hero-title">
            <BarChartOutlined /> 学生数据分析
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

      {/* 代码统计（按时间维度 - 合并周/月） */}
      <Card
        className="stats-card"
        title={
          <div className="time-stats-header">
            <span><CalendarOutlined /> 代码统计趋势</span>
            <Segmented
              options={[
                { label: '按月', value: 'monthly', icon: <CalendarOutlined /> },
                { label: '按周', value: 'weekly', icon: <ClockCircleOutlined /> },
              ]}
              value={timeView}
              onChange={(value) => setTimeView(value as TimeRangeType)}
              className="time-view-switch"
            />
          </div>
        }
        extra={
          canLoadMore && (
            <Button
              type="link"
              onClick={() => loadMore(timeView)}
              disabled={isLoadingMore}
              icon={isLoadingMore ? <LoadingOutlined /> : <DownOutlined />}
            >
              {isLoadingMore ? '加载中...' : '加载更多'}
            </Button>
          )
        }
      >
        {renderTimeStats()}
      </Card>

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
