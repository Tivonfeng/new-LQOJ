import './exam-hall.page.css';

import {
  CalendarOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ExamHallData } from './types';

const { Title, Text, Paragraph } = Typography;

const ExamHallApp: React.FC = () => {
  const [data, setData] = useState<ExamHallData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载延迟,让UI更流畅
    setTimeout(() => {
      const examData = (window as any).examHallData as ExamHallData;
      setData(examData);
      setLoading(false);
    }, 300);
  }, []);

  const competitions = data?.recentCompetitions || [];
  const certifications = data?.recentCertifications || [];

  // 计算统计数据
  const stats = useMemo(() => {
    const totalCertificates = competitions.length + certifications.length;
    const totalUsers = new Set([...competitions, ...certifications].map((cert) => cert.uid)).size;
    return {
      totalCertificates,
      competitions: competitions.length,
      certifications: certifications.length,
      totalUsers,
    };
  }, [competitions, certifications]);

  // 渲染证书卡片
  const renderCertificateCard = (cert: any, type: 'competition' | 'certification') => {
    const isCompetition = type === 'competition';
    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={cert._id}>
        <Card
          hoverable
          className={`certificate-card ${type}-card`}
          cover={
            cert.certificateImageUrl ? (
              <div className="certificate-card-image">
                <img src={cert.certificateImageUrl} alt={cert.certificateName} />
                <Tag
                  icon={isCompetition ? <TrophyOutlined /> : undefined}
                  color={isCompetition ? 'gold' : 'purple'}
                  className="certificate-type-badge"
                >
                  {isCompetition ? '竞赛' : '考级'}
                </Tag>
              </div>
            ) : undefined
          }
        >
          <Card.Meta
            title={
              <Tooltip title={cert.certificateName}>
                <div className="certificate-card-title">{cert.certificateName}</div>
              </Tooltip>
            }
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" className="certificate-card-subtitle">
                  {cert.certifyingBody}
                </Text>
                <div className="certificate-card-meta">
                  <Text strong>赛项:</Text> {cert.category}
                </div>
                {cert.level && (
                  <Tag
                    color={isCompetition ? 'orange' : 'blue'}
                    className="certificate-level-badge"
                  >
                    {cert.level}
                  </Tag>
                )}
              </Space>
            }
          />
          <div className="certificate-card-footer">
            {cert.username && (
              <Text type="secondary" className="certificate-card-username">
                <UserOutlined /> {cert.username}
              </Text>
            )}
            <Text type="secondary" className="certificate-card-date">
              <CalendarOutlined /> {dayjs(cert.issueDate).format('YYYY/MM/DD')}
            </Text>
          </div>
        </Card>
      </Col>
    );
  };

  if (loading) {
    return (
      <div className="exam-hall-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="exam-hall-loading">
        <Empty description="无法加载数据" />
      </div>
    );
  }

  return (
    <div className="exam-hall-react">
      {/* Hero区域 */}
      <div className="exam-hall-hero">
        <div className="exam-hall-header">
          {data.canManage && data.managementUrl && (
            <Button
              type="primary"
              icon={<SettingOutlined />}
              href={data.managementUrl}
              className="manage-button"
              ghost
            >
              证书管理
            </Button>
          )}
        </div>
        <div className="exam-hall-hero-content">
          <Title level={1} className="exam-hall-hero-title">
            赛考大厅
          </Title>
          <Paragraph className="exam-hall-hero-subtitle">
            展示优秀学员的竞赛成果与考级证书
          </Paragraph>
          <Row gutter={[8, 8]} className="exam-hall-hero-stats">
            <Col xs={12} sm={12} md={6}>
              <Card className="hero-stat-item" bordered={false}>
                <Statistic
                  title="证书总数"
                  value={stats.totalCertificates}
                  valueStyle={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="hero-stat-item" bordered={false}>
                <Statistic
                  title="竞赛证书"
                  value={stats.competitions}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="hero-stat-item" bordered={false}>
                <Statistic
                  title="考级证书"
                  value={stats.certifications}
                  valueStyle={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="hero-stat-item" bordered={false}>
                <Statistic
                  title="获奖人数"
                  value={stats.totalUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="exam-hall-content">
        {/* 最近竞赛证书 */}
        {competitions.length > 0 && (
          <div className="exam-hall-section">
            <div className="exam-hall-section-header">
              <Title level={3} className="exam-hall-section-title">
                <TrophyOutlined /> 最近竞赛证书
              </Title>
              <Tag icon={<ClockCircleOutlined />} color="gold">
                最近一个季度
              </Tag>
            </div>
            <Row gutter={[12, 12]} className="certificate-grid">
              {competitions.map((cert) => renderCertificateCard(cert, 'competition'))}
            </Row>
          </div>
        )}

        {/* 最近考级证书 */}
        {certifications.length > 0 && (
          <div className="exam-hall-section">
            <div className="exam-hall-section-header">
              <Title level={3} className="exam-hall-section-title">
                📚 最近考级证书
              </Title>
              <Tag icon={<ClockCircleOutlined />} color="purple">
                最近一个季度
              </Tag>
            </div>
            <Row gutter={[12, 12]} className="certificate-grid">
              {certifications.map((cert) => renderCertificateCard(cert, 'certification'))}
            </Row>
          </div>
        )}

        {/* 空状态 */}
        {competitions.length === 0 && certifications.length === 0 && (
          <Card className="certificate-empty-state">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size="small">
                  <Text className="certificate-empty-state-icon">📋</Text>
                  <Text type="secondary" className="certificate-empty-state-text">
                    最近一个季度暂无证书
                  </Text>
                </Space>
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
};

// React App 挂载
const container = document.getElementById('exam-hall-react-app');
if (container) {
  const root = createRoot(container);
  root.render(<ExamHallApp />);
}

export default ExamHallApp;
