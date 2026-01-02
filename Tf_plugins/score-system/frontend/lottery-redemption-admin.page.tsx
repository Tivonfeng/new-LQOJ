/* eslint-disable react-refresh/only-export-components */
import './lottery-redemption-admin.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Input,
  message,
  Modal,
  Pagination,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Typography,
} from 'antd';
import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 奖品记录接口
interface PrizeRecord {
  _id: string;
  uid: number;
  prizeName: string;
  physicalPrize?: {
    description: string;
    imageUrl?: string;
  };
  gameTime: string;
}

// 核销管理React组件
const RedemptionAdminApp: React.FC = () => {
  // 从全局变量获取数据
  const initialData = (window as any).redemptionAdminData || {
    pendingRecords: [],
    pendingData: {
      records: [],
      total: 0,
      page: 1,
      totalPages: 1,
    },
    stats: {
      totalPending: 0,
      totalRedeemed: 0,
      totalCancelled: 0,
      byPrize: [],
    },
    udocs: {},
  };

  const [pendingRecords, setPendingRecords] = useState<PrizeRecord[]>(initialData.pendingRecords || []);
  const [udocs, setUdocs] = useState<Record<string, any>>(initialData.udocs || {});
  const [stats] = useState(initialData.stats);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(initialData.pendingData?.total || 0);
  const [loading, setLoading] = useState(false);
  const [searchUid, setSearchUid] = useState('');
  const [searchPrizeName, setSearchPrizeName] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'redeemed'>('pending');

  const redemptionListUrl = (window as any).redemptionListUrl || '/score/lottery/admin/redeem/list';
  const redemptionRedeemUrl = (window as any).redemptionRedeemUrl || '/score/lottery/admin/redeem/redeem';
  const redemptionCancelUrl = (window as any).redemptionCancelUrl || '/score/lottery/admin/redeem/cancel';
  const redemptionHistoryUrl = (window as any).redemptionHistoryUrl || '/score/lottery/admin/redeem/history';
  const myPrizesApiUrl = (window as any).myPrizesApiUrl || '/score/lottery/my-prizes/api';

  // 刷新数据
  const refreshData = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      // 全域统一查询
      params.append('allDomains', 'true');

      if (activeTab === 'redeemed') {
        // 已核销记录查询历史API
        params.append('status', 'redeemed');
        const redemptionHistoryUrl = (window as any).redemptionHistoryUrl || '/score/lottery/admin/redeem/history';
        var apiUrl = redemptionHistoryUrl;
      } else {
        // 待核销记录查询列表API
        if (searchUid) {
          if (/^\d+$/.test(searchUid)) {
            params.append('uid', searchUid);
          } else {
            params.append('search', searchUid);
          }
        }
        if (searchPrizeName) params.append('prizeName', searchPrizeName);
        var apiUrl = redemptionListUrl;
      }

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('获取数据失败');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setPendingRecords(result.data.records || []);
        setTotal(result.data.total || 0);
        setUdocs(result.udocs || {});
        setCurrentPage(page);
      }
    } catch (error) {
      message.error('刷新数据失败');
    } finally {
      setLoading(false);
    }
  }, [searchUid, searchPrizeName, redemptionListUrl, activeTab]);

  // 执行核销
  const handleRedeem = useCallback(async (recordId: string | any) => {
    // 确保 recordId 是字符串格式
    const recordIdString = typeof recordId === 'string' ? recordId : (recordId?.toString?.() || String(recordId));

    Modal.confirm({
      title: '确认核销',
      content: '确定要核销这个奖品吗？',
      onOk: async () => {
        try {
          const response = await fetch(redemptionRedeemUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ recordId: recordIdString }),
          });

          const result = await response.json();
          if (result.success) {
            message.success('核销成功');
            refreshData(currentPage);
          } else {
            message.error(result.message || '核销失败');
          }
        } catch (error) {
          message.error('核销失败');
        }
      },
    });
  }, [currentPage, redemptionRedeemUrl, refreshData]);

  // 取消核销
  const handleCancel = useCallback(async (recordId: string | any) => {
    // 确保 recordId 是字符串格式
    const recordIdString = typeof recordId === 'string' ? recordId : (recordId?.toString?.() || String(recordId));

    Modal.confirm({
      title: '确认取消',
      content: '确定要取消这个奖品吗？',
      onOk: async () => {
        try {
          const response = await fetch(redemptionCancelUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ recordId: recordIdString }),
          });

          const result = await response.json();
          if (result.success) {
            message.success('取消成功');
            refreshData(currentPage);
          } else {
            message.error(result.message || '取消失败');
          }
        } catch (error) {
          message.error('取消失败');
        }
      },
    });
  }, [currentPage, redemptionCancelUrl, refreshData]);

  // 待核销记录的列定义
  const pendingColumns = [
    {
      title: '用户',
      dataIndex: 'uid',
      key: 'uid',
      render: (uid: number) => {
        const user = udocs[String(uid)];
        return user ? (
          <Space>
            <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            <Text>{user.displayName || user.uname || `UID: ${uid}`}</Text>
          </Space>
        ) : `UID: ${uid}`;
      },
    },
    {
      title: '奖品名称',
      dataIndex: 'prizeName',
      key: 'prizeName',
    },
    {
      title: '奖品描述',
      dataIndex: ['physicalPrize', 'description'],
      key: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '中奖时间',
      dataIndex: 'gameTime',
      key: 'gameTime',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PrizeRecord) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleRedeem(record._id)}
          >
            核销
          </Button>
          <Button
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleCancel(record._id)}
          >
            取消
          </Button>
        </Space>
      ),
    },
  ];

  // 已核销记录的列定义
  const redeemedColumns = [
    {
      title: '用户',
      dataIndex: 'uid',
      key: 'uid',
      render: (uid: number) => {
        const user = udocs[String(uid)];
        return user ? (
          <Space>
            <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            <Text>{user.displayName || user.uname || `UID: ${uid}`}</Text>
          </Space>
        ) : `UID: ${uid}`;
      },
    },
    {
      title: '奖品名称',
      dataIndex: 'prizeName',
      key: 'prizeName',
    },
    {
      title: '奖品描述',
      dataIndex: ['physicalPrize', 'description'],
      key: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '中奖时间',
      dataIndex: 'gameTime',
      key: 'gameTime',
    },
    {
      title: '核销时间',
      dataIndex: 'redeemedAt',
      key: 'redeemedAt',
      render: (redeemedAt: string) => redeemedAt ? new Date(redeemedAt).toLocaleString('zh-CN') : '-',
    },
    {
      title: '核销管理员',
      dataIndex: 'redeemedBy',
      key: 'redeemedBy',
      render: (redeemedBy: number) => {
        if (!redeemedBy) return '-';
        const admin = udocs[String(redeemedBy)];
        return admin ? admin.displayName || admin.uname || `UID: ${redeemedBy}` : `UID: ${redeemedBy}`;
      },
    },
  ];

  const columns = activeTab === 'pending' ? pendingColumns : redeemedColumns;

  return (
    <div className="redemption-admin-container">
      {/* Hero Section */}
      <Card className="hero-card" bodyStyle={{ padding: '32px 24px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <GiftOutlined style={{ fontSize: '28px', color: '#fff' }} />
            <Title level={1} className="hero-title" style={{ margin: 0, color: '#fff' }}>
              核销管理
            </Title>
          </Space>
          <Text className="hero-subtitle" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            管理实物奖品的核销操作
          </Text>
        </Space>
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          href={(window as any).lotteryGameUrl || (window as any).scoreHallUrl || '/score/lottery'}
          className="hero-back-button"
          style={{ position: 'absolute', top: '32px', right: '24px' }}
        >
          返回抽奖
        </Button>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="待核销"
              value={stats.totalPending}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已核销"
              value={stats.totalRedeemed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已取消"
              value={stats.totalCancelled}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs for different redemption statuses */}
      <Card style={{ marginTop: '20px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'pending' | 'redeemed');
            setCurrentPage(1);
            refreshData(1);
          }}
          type="card"
        >
          <Tabs.TabPane tab={`待核销 (${stats.totalPending})`} key="pending">
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Input
                  placeholder="搜索用户ID或用户名"
                  value={searchUid}
                  onChange={(e) => setSearchUid(e.target.value)}
                  style={{ width: 150 }}
                />
                <Input
                  placeholder="搜索奖品名称"
                  value={searchPrizeName}
                  onChange={(e) => setSearchPrizeName(e.target.value)}
                  style={{ width: 150 }}
                />
                <Button
                  icon={<SearchOutlined />}
                  onClick={() => refreshData(1)}
                >
                  搜索
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refreshData(currentPage)}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </div>
            <Table
              columns={columns}
              dataSource={pendingRecords}
              rowKey="_id"
              loading={loading}
              pagination={false}
            />
            {total > 0 && (
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={20}
                  onChange={refreshData}
                  showTotal={(t) => `共 ${t} 条记录`}
                />
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab={`已核销 (${stats.totalRedeemed})`} key="redeemed">
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Input
                  placeholder="搜索用户ID或用户名"
                  value={searchUid}
                  onChange={(e) => setSearchUid(e.target.value)}
                  style={{ width: 150 }}
                />
                <Input
                  placeholder="搜索奖品名称"
                  value={searchPrizeName}
                  onChange={(e) => setSearchPrizeName(e.target.value)}
                  style={{ width: 150 }}
                />
                <Button
                  icon={<SearchOutlined />}
                  onClick={() => refreshData(1)}
                >
                  搜索
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refreshData(currentPage)}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </div>
            <Table
              columns={columns}
              dataSource={pendingRecords}
              rowKey="_id"
              loading={loading}
              pagination={false}
            />
            {total > 0 && (
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={20}
                  onChange={refreshData}
                  showTotal={(t) => `共 ${t} 条记录`}
                />
              </div>
            )}
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['lottery_redemption_admin'], async () => {
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  const mountPoint = document.getElementById('redemption-admin-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<RedemptionAdminApp />);
    } catch (error) {
      // Failed to render React app
    }
  }
}));
