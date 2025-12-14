import './exam-hall.page.css';

import { FileTextOutlined, GiftOutlined, InfoCircleOutlined, SettingOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  List,
  Modal,
  Row,
  Segmented,
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
  const [recordFilter, setRecordFilter] = useState<'all' | 'competition' | 'certification'>('all');

  useEffect(() => {
    const examData = (window as any).examHallData as ExamHallData;
    setData(examData);
  }, []);

  const competitions = data?.recentCompetitions || [];
  const certifications = data?.recentCertifications || [];
  const recentRecords = data?.recentRecords || [];
  const leaderboard = data?.leaderboard || [];
  const udocs = data?.udocs || {};

  // 根据筛选条件过滤记录
  const filteredRecentRecords = useMemo(() => {
    if (recordFilter === 'all') {
      return recentRecords;
    }
    return recentRecords.filter((record) => {
      if (recordFilter === 'competition') {
        return record.examType === 'competition';
      }
      if (recordFilter === 'certification') {
        return record.examType === 'certification';
      }
      return true;
    });
  }, [recentRecords, recordFilter]);

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

      {/* 奖励系统说明 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
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
                {/* 权重计算说明 */}
                <Col xs={24} sm={12}>
                  <Card className="bonus-item-card" variant="outlined">
                    <div className="bonus-item-content">
                      <div className="bonus-item-header">
                        <div className="bonus-icon-wrapper">
                          <InfoCircleOutlined style={{ fontSize: 18 }} />
                        </div>
                        <div className="bonus-item-title-section">
                          <Title level={5} className="bonus-item-title" style={{ margin: 0 }}>
                            权重计算规则
                          </Title>
                          <Text type="secondary" className="bonus-item-desc">
                            证书权重由多个维度自动计算
                          </Text>
                        </div>
                      </div>
                      <div className="bonus-details-grid">
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            基础权重
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            10分
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            级别系数 (50%)
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            市级×1.0
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            省级
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            ×2.0
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            国家级
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            ×4.0
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            奖项系数 (40%)
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            一等奖×2.0
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            二等奖
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            ×1.6
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            三等奖
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            ×1.3
                          </Tag>
                        </div>
                        <div className="bonus-detail-item">
                          <Text type="secondary" className="bonus-detail-level">
                            类型系数 (10%)
                          </Text>
                          <Tag color="blue" className="bonus-detail-points">
                            竞赛×1.0
                          </Tag>
                        </div>
                      </div>
                      <div className="bonus-example">
                        <Text type="secondary" className="bonus-example-text">
                          示例：国家级一等奖 = 10 × 4.0 × 2.0 × 1.0 = 80分
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
                {/* 积分获取说明 */}
                <Col xs={24} sm={12}>
                  <Card className="bonus-item-card" variant="outlined">
                    <div className="bonus-item-content">
                      <div className="bonus-item-header">
                        <div className="bonus-icon-wrapper">
                          <TrophyOutlined style={{ fontSize: 18 }} />
                        </div>
                        <div className="bonus-item-title-section">
                          <Title level={5} className="bonus-item-title" style={{ margin: 0 }}>
                            积分获取规则
                          </Title>
                          <Text type="secondary" className="bonus-item-desc">
                            证书录入后自动获得对应积分
                          </Text>
                        </div>
                        <div className="bonus-points-badge">
                          <Tag color="green" className="bonus-points-tag">
                            自动获得
                          </Tag>
                        </div>
                      </div>
                      <div className="bonus-example" style={{ marginTop: 12 }}>
                        <Text type="secondary" className="bonus-example-text">
                          • 证书权重 = 积分数量
                        </Text>
                        <br />
                        <Text type="secondary" className="bonus-example-text">
                          • 权重越高，获得的积分越多
                        </Text>
                        <br />
                        <Text type="secondary" className="bonus-example-text">
                          • 赛考指数 = 所有证书权重总和
                        </Text>
                        <br />
                        <Text type="secondary" className="bonus-example-text">
                          • 指数越高，排行榜排名越靠前
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

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

        {/* 最近证书记录和排行榜 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {/* 最近证书记录 */}
          <Col xs={24} lg={16}>
            {recentRecords.length > 0 && (
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Space>
                      <FileTextOutlined />
                      <span>最近证书记录</span>
                    </Space>
                    <Segmented
                      value={recordFilter}
                      onChange={(value) => setRecordFilter(value as 'all' | 'competition' | 'certification')}
                      options={[
                        { label: '全部', value: 'all' },
                        { label: '竞赛', value: 'competition' },
                        { label: '等级考试', value: 'certification' },
                      ]}
                      size="small"
                    />
                  </div>
                }
                className="content-card"
              >
              {filteredRecentRecords.length === 0 ? (
                <Empty
                  description={
                    <Text type="secondary">
                      {recordFilter === 'all'
                        ? '暂无证书记录'
                        : recordFilter === 'competition'
                          ? '暂无竞赛证书记录'
                          : '暂无等级考试证书记录'}
                    </Text>
                  }
                  style={{ padding: '40px 0' }}
                />
              ) : (
                <List
                  dataSource={filteredRecentRecords}
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
                            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                              {(record as any).certificateImageUrl ? (
                                <img
                                  src={(record as any).certificateImageUrl}
                                  alt={record.certificateName}
                                  style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => setDetailCertificate({ cert: record, type: isCompetition ? 'competition' : 'certification' })}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                                    color: '#9ca3af',
                                    fontSize: 24,
                                  }}
                                >
                                  📄
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
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
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                    );
                  }}
                />
              )}
              </Card>
            )}
          </Col>

          {/* 赛考指数排行榜 */}
          <Col xs={24} lg={8}>
            {leaderboard.length > 0 && (
              <Card
                title={
                  <Space>
                    <TrophyOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
                    <span>赛考指数排行榜</span>
                  </Space>
                }
                className="content-card"
              >
                <List
                  dataSource={leaderboard}
                  renderItem={(item, index) => {
                    const user = udocs[String(item.uid)];
                    const rank = index + 1;
                    const getRankIcon = (r: number) => {
                      if (r === 1) return <TrophyOutlined style={{ fontSize: 24, color: '#fff' }} />;
                      if (r === 2) return <TrophyOutlined style={{ fontSize: 24, color: '#fff' }} />;
                      if (r === 3) return <TrophyOutlined style={{ fontSize: 24, color: '#fff' }} />;
                      return <span style={{ fontSize: 18, fontWeight: 700 }}>{r}</span>;
                    };

                    return (
                      <List.Item className="leaderboard-item">
                        <List.Item.Meta
                          avatar={
                            <>
                              <div className={`rank-badge rank-${rank <= 3 ? rank : 'other'}`}>
                                {getRankIcon(rank)}
                              </div>
                              {user?.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user?.uname || user?.displayName || `User ${item.uid}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                            </>
                          }
                          title={
                            <Text strong>
                              {user?.uname || item.username || `User ${item.uid}`}
                              {user?.displayName && (
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  ({user.displayName})
                                </Text>
                              )}
                            </Text>
                          }
                          description={
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                              <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                                证书: {item.totalCertificates}
                              </Tag>
                              <Tag color="gold" style={{ fontSize: 11, margin: 0 }}>
                                竞赛: {item.competitionWeight.toFixed(1)}
                              </Tag>
                              <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                                考级: {item.certificationWeight.toFixed(1)}
                              </Tag>
                            </div>
                          }
                        />
                        <div className="player-score">
                          <Text strong style={{ fontSize: 16, color: '#10b981' }}>
                            {item.totalWeight.toFixed(1)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            指数
                          </Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </Card>
            )}
          </Col>
        </Row>
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
