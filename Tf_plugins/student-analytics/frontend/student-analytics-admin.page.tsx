import './student-analytics-admin.page.css';

import { addPage, NamedPage, request } from '@hydrooj/ui-default';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  CloudSyncOutlined,
  CodeOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ReloadOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Statistic,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 管理员学生数据分析页面组件
export const StudentAnalyticsAdminApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // 从全局变量获取数据
    const adminData = (window as any).studentAnalyticsAdminData;
    if (adminData) {
      try {
        const parsedData = typeof adminData === 'string'
          ? JSON.parse(adminData)
          : adminData;
        setData(parsedData);
      } catch (error) {
        console.error('[Student Analytics Admin] Failed to parse data:', error);
      }
    }
    setLoading(false);
  }, []);

  // 执行管理操作
  const handleAction = async (action: string, actionName: string) => {
    setActionLoading(action);
    try {
      const response = await request.post('/analytics/student/admin', { action });
      if (response.success) {
        message.success(`${actionName}成功`);
        // 刷新统计数据
        if (response.stats) {
          setData((prev: any) => ({
            ...prev,
            globalStats: response.stats,
          }));
        } else {
          // 重新获取页面数据
          window.location.reload();
        }
      } else {
        message.error(response.error || `${actionName}失败`);
      }
    } catch (error) {
      console.error(`[Student Analytics Admin] ${actionName} failed:`, error);
      message.error(`${actionName}失败`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="student-analytics-admin-page">Loading...</div>;
  }

  const globalStats = data?.globalStats || {};
  const cacheStats = globalStats.cacheStats || {};

  return (
        <div className="student-analytics-admin-page">
            {/* Hero Section */}
            <Card className="admin-hero-card">
                <div className="admin-hero-content">
                    <Title level={1} className="admin-hero-title">
                        <BarChartOutlined /> 学生数据分析 - 管理面板
                    </Title>
                    <div className="admin-hero-subtitle">全局数据统计与缓存管理</div>
                </div>
            </Card>

            {/* 用户统计 */}
            <Card
                className="admin-stats-card"
                title={<><TeamOutlined /> 用户统计</>}
            >
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="总用户数（有提交记录）"
                                value={globalStats.totalUsers || 0}
                                valueStyle={{ color: '#3b82f6' }}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="活跃用户（30天内有提交）"
                                value={globalStats.activeUsers || 0}
                                valueStyle={{ color: '#10b981' }}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* 提交统计 */}
            <Card
                className="admin-stats-card"
                title={<><FileTextOutlined /> 提交统计</>}
            >
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="总提交数"
                                value={globalStats.totalSubmissions || 0}
                                valueStyle={{ color: '#6366f1' }}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="AC 提交数"
                                value={globalStats.totalAcSubmissions || 0}
                                valueStyle={{ color: '#10b981' }}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="今日提交"
                                value={globalStats.todaySubmissions || 0}
                                valueStyle={{ color: '#f59e0b' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="本周提交"
                                value={globalStats.weekSubmissions || 0}
                                valueStyle={{ color: '#ec4899' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* 代码与题目统计 */}
            <Card
                className="admin-stats-card"
                title={<><CodeOutlined /> 代码与题目统计</>}
            >
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="总代码行数（估算）"
                                value={globalStats.totalCodeLines || 0}
                                valueStyle={{ color: '#8b5cf6' }}
                                prefix={<CodeOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="被尝试题目数"
                                value={globalStats.totalProblemsAttempted || 0}
                                valueStyle={{ color: '#3b82f6' }}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="被 AC 题目数"
                                value={globalStats.totalProblemsSolved || 0}
                                valueStyle={{ color: '#10b981' }}
                                prefix={<TrophyOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="本月提交"
                                value={globalStats.monthSubmissions || 0}
                                valueStyle={{ color: '#f59e0b' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* 缓存管理 */}
            <Card
                className="admin-stats-card"
                title={<><DatabaseOutlined /> 缓存管理</>}
            >
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="已缓存用户数"
                                value={cacheStats.totalCached || 0}
                                valueStyle={{ color: '#3b82f6' }}
                                prefix={<DatabaseOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="待刷新缓存数"
                                value={cacheStats.dirtyCount || 0}
                                valueStyle={{ color: '#f59e0b' }}
                                prefix={<CloudSyncOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="admin-stat-card">
                            <Statistic
                                title="已过期缓存数"
                                value={cacheStats.expiredCount || 0}
                                valueStyle={{ color: '#ef4444' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <div className="admin-actions">
                    <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                        缓存操作：
                    </Text>
                    <Space wrap>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            loading={actionLoading === 'refreshStats'}
                            onClick={() => handleAction('refreshStats', '刷新统计')}
                        >
                            刷新统计
                        </Button>
                        <Button
                            icon={<CloudSyncOutlined />}
                            loading={actionLoading === 'markAllDirty'}
                            onClick={() => handleAction('markAllDirty', '标记全部缓存为待刷新')}
                        >
                            标记全部待刷新
                        </Button>
                        <Button
                            danger
                            icon={<ClearOutlined />}
                            loading={actionLoading === 'clearCache'}
                            onClick={() => handleAction('clearCache', '清空全部缓存')}
                        >
                            清空全部缓存
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* 更新时间 */}
            {globalStats.lastUpdated && (
                <div className="admin-footer">
                    <Text type="secondary">
                        数据更新时间: {new Date(globalStats.lastUpdated).toLocaleString()}
                    </Text>
                </div>
            )}
        </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['student_analytics_admin'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('student-analytics-admin-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<StudentAnalyticsAdminApp />);
    } catch (error) {
      console.error('[Student Analytics Admin] Failed to render React app:', error);
    }
  } else {
    console.error('[Student Analytics Admin] Mount point not found');
  }
}));
