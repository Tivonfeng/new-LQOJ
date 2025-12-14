import './exam-hall.page.css';

import { FileTextOutlined, SettingOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  List,
  Modal,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ExamHallData } from './types';

const { Title, Text, Paragraph } = Typography;

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

const ExamHallApp: React.FC = () => {
  const [data, setData] = useState<ExamHallData | null>(null);
  const [detailCertificate, setDetailCertificate] = useState<{
    cert: any;
    type: 'competition' | 'certification';
  } | null>(null);

  useEffect(() => {
    const examData = (window as any).examHallData as ExamHallData;
    setData(examData);
  }, []);

  const competitions = data?.recentCompetitions || [];
  const certifications = data?.recentCertifications || [];
  const recentRecords = data?.recentRecords || [];
  const udocs = data?.udocs || {};

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

  if (!data) {
    return (
      <div className="exam-hall-empty">
        <Empty description="无法加载数据" />
      </div>
    );
  }

  return (
    <div className="exam-hall-react">
      {/* Hero区域（参考积分大厅高度） */}
      <Card className="exam-hall-hero" styles={{ body: { padding: '28px 24px', position: 'relative', zIndex: 1 } }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={1} className="exam-hall-hero-title">
                <TrophyOutlined style={{ marginRight: '8px' }} /> 赛考大厅
              </Title>
              <Paragraph className="exam-hall-hero-subtitle">
                展示优秀学员的竞赛成果与考级证书
              </Paragraph>
            </Space>
          </Col>
          <Col>
          {data.canManage && data.managementUrl && (
            <Button
                type="default"
              icon={<SettingOutlined />}
              href={data.managementUrl}
              className="manage-button"
            >
              证书管理
            </Button>
          )}
          </Col>
        </Row>
      </Card>

      {/* 内容区域 */}
      <div className="exam-hall-content">
        {/* 统计卡片区域 */}
        <Row gutter={[12, 12]} className="exam-hall-hero-stats" style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={12} md={6}>
            <Card className="hero-stat-item stat-card-total" variant="outlined">
              <Statistic
                title="证书总数"
                value={stats.totalCertificates}
                valueStyle={{ color: '#6366f1', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="hero-stat-item stat-card-competition" variant="outlined">
              <Statistic
                title="竞赛证书"
                value={stats.competitions}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#f59e0b', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="hero-stat-item stat-card-certification" variant="outlined">
              <Statistic
                title="考级证书"
                value={stats.certifications}
                valueStyle={{ color: '#8b5cf6', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="hero-stat-item stat-card-users" variant="outlined">
              <Statistic
                title="获奖人数"
                value={stats.totalUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#10b981', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
        {/* 最近证书记录 */}
        {recentRecords.length > 0 && (
          <div className="exam-hall-section" style={{ marginBottom: '24px' }}>
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  <span>最近证书记录</span>
                </Space>
              }
              className="content-card"
            >
              <List
                dataSource={recentRecords}
                renderItem={(record) => {
                  const user = udocs[String(record.uid)];
                  const isCompetition = record.examType === 'competition';
                  return (
                    <List.Item className="record-item">
                      <List.Item.Meta
                        avatar={
                          user?.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user?.uname || user?.displayName || `User ${record.uid}`}
                              className="record-avatar"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className="record-badge"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: isCompetition
                                  ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                                  : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 18,
                              }}
                            >
                              <UserOutlined />
                            </div>
                          )
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <Text strong className="record-username">
                                {user?.uname || user?.displayName || `User ${record.uid}`}
                              </Text>
                              {user?.displayName && user?.displayName !== user?.uname && (
                                <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                                  ({user.displayName})
                                </Text>
                              )}
                            </div>
                            <Tag
                              color={isCompetition ? 'gold' : 'purple'}
                              icon={isCompetition ? <TrophyOutlined /> : undefined}
                            >
                              {isCompetition ? '竞赛证书' : '考级证书'}
                            </Tag>
                          </div>
                        }
                        description={
                          <div style={{ marginTop: 8 }}>
                            <div style={{ marginBottom: 4 }}>
                              <Text strong>{record.certificateName}</Text>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                              <Tag color="blue">{record.category || '赛项'}</Tag>
                              {record.level && (
                                <Tag color={isCompetition ? 'orange' : 'blue'}>
                                  {record.level}
                                </Tag>
                              )}
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.certifyingBody}
                              </Text>
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {record.createdAt
                                ? formatRelativeTime(record.createdAt, record.createdAtFormatted)
                                : '时间未知'}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </Card>
          </div>
        )}
      </div>
      <Modal
        open={!!detailCertificate}
        onCancel={() => setDetailCertificate(null)}
        footer={null}
        destroyOnHidden
        title={detailCertificate?.cert.certificateName || '证书详情'}
        width={520}
      >
        {detailCertificate && (() => {
          const { cert, type } = detailCertificate;
          const issueDate = cert.issueDate ? dayjs(cert.issueDate).format('YYYY/MM/DD') : '暂无日期';
          const issuerName = cert.certifyingBody || '未提供';
          const eventName = cert.category || '-';
          const examName = cert.competitionName || cert.certificationSeries;
          return (
            <div className="certificate-detail-modal">
              <div className="certificate-detail-image">
                {cert.certificateImageUrl ? (
                  <img src={cert.certificateImageUrl} alt={cert.certificateName} />
                ) : (
                  <div className="certificate-card-placeholder">
                    <span role="img" aria-label="Certificate icon">
                      📄
                    </span>
                    暂无证书图片
                  </div>
                )}
                <Tag
                  icon={type === 'competition' ? <TrophyOutlined /> : undefined}
                  color={type === 'competition' ? 'gold' : 'purple'}
                  className="certificate-detail-badge"
                >
                  {type === 'competition' ? '竞赛证书' : '考级证书'}
                </Tag>
              </div>
              <Space direction="vertical" size="small" className="certificate-detail-meta">
                <Text strong>学员：{cert.username || '优秀学员'}</Text>
                <Text type="secondary">颁发机构：{issuerName}</Text>
              </Space>
              <div className="certificate-detail-grid">
                <div className="detail-item">
                  <Text type="secondary">赛项</Text>
                  <span>{eventName}</span>
                </div>
                <div className="detail-item">
                  <Text type="secondary">级别</Text>
                  <span>
                    {cert.level ? (
                      <Tag color={type === 'competition' ? 'orange' : 'blue'} className="certificate-level-badge">
                        {cert.level}
                      </Tag>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
                {examName && (
                  <div className="detail-item detail-item-span">
                    <Text type="secondary">考试名称</Text>
                    <span>{examName}</span>
                  </div>
                )}
                <div className="detail-item detail-item-span">
                  <Text type="secondary">颁发日期</Text>
                  <span>{issueDate}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
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
