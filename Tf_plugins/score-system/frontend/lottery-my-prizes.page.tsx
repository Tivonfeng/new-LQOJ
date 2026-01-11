/* eslint-disable react-refresh/only-export-components */
import './lottery-my-prizes.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
  HourglassOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  List,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 奖品记录接口
interface PrizeRecord {
  _id: string;
  prizeName: string;
  prizeType: 'physical';
  physicalPrize?: {
    description: string;
    imageUrl?: string;
  };
  redeemStatus: 'pending' | 'redeemed' | 'cancelled';
  gameTime: string;
  redeemedAt?: string;
  redeemNote?: string;
}

// 我的奖品React组件
const MyPrizesApp: React.FC = () => {
  // 从全局变量获取数据
  const initialData = (window as any).myPrizesData || {
    pending: [],
    redeemed: [],
    cancelled: [],
    pendingCount: 0,
    redeemedCount: 0,
    cancelledCount: 0,
  };

  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRecords, setPendingRecords] = useState<PrizeRecord[]>(initialData.pending || []);
  const [redeemedRecords, setRedeemedRecords] = useState<PrizeRecord[]>(initialData.redeemed || []);
  const [cancelledRecords, setCancelledRecords] = useState<PrizeRecord[]>(initialData.cancelled || []);
  const [loading, setLoading] = useState(false);

  // API URL
  const myPrizesApiUrl = (window as any).myPrizesApiUrl || '/score/lottery/my-prizes/api';

  // 获取奖品数据（全域统一）
  const fetchPrizes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('allDomains', 'true'); // 默认全域查询

      const response = await fetch(`${myPrizesApiUrl}?${params}`, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('获取数据失败');
      }

      const result = await response.json();
      if (result.success && result.records) {
        // 按状态分组记录
        const pending: PrizeRecord[] = [];
        const redeemed: PrizeRecord[] = [];
        const cancelled: PrizeRecord[] = [];

        result.records.forEach((record: PrizeRecord) => {
          switch (record.redeemStatus) {
            case 'pending':
              pending.push(record);
              break;
            case 'redeemed':
              redeemed.push(record);
              break;
            case 'cancelled':
              cancelled.push(record);
              break;
          }
        });

        setPendingRecords(pending);
        setRedeemedRecords(redeemed);
        setCancelledRecords(cancelled);
      }
    } catch (error) {
      console.error('获取奖品数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [myPrizesApiUrl]);

  // 初始加载和全域查询切换时重新获取数据
  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag color="orange" icon={<HourglassOutlined />}>待核销</Tag>;
      case 'redeemed':
        return <Tag color="green" icon={<CheckCircleOutlined />}>已核销</Tag>;
      case 'cancelled':
        return <Tag color="default" icon={<CloseCircleOutlined />}>已取消</Tag>;
      default:
        return null;
    }
  };

  const renderPrizeList = (records: PrizeRecord[]) => {
    if (records.length === 0) {
      return (
        <Empty
          description="暂无奖品记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <List
        dataSource={records}
        renderItem={(record) => (
          <List.Item className="prize-item">
            <List.Item.Meta
              avatar={
                <div className="prize-avatar">
                  <GiftOutlined style={{ fontSize: '24px', color: '#ec4899' }} />
                </div>
              }
              title={
                <Space>
                  <Text strong style={{ fontSize: '16px' }}>
                    {record.prizeName}
                  </Text>
                  {getStatusTag(record.redeemStatus)}
                </Space>
              }
              description={
                <div>
                  {record.physicalPrize?.description && (
                    <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                      {record.physicalPrize.description}
                    </Text>
                  )}
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    <Text type="secondary">中奖时间: {record.gameTime}</Text>
                    {record.redeemedAt && (
                      <>
                        <br />
                        <Text type="secondary">核销时间: {record.redeemedAt}</Text>
                      </>
                    )}
                    {record.redeemNote && (
                      <>
                        <br />
                        <Text type="secondary">备注: {record.redeemNote}</Text>
                      </>
                    )}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="my-prizes-container">
      {/* Hero Section */}
      <Card className="hero-card" bodyStyle={{ padding: '32px 24px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <GiftOutlined style={{ fontSize: '28px', color: '#fff' }} />
            <Title level={1} className="hero-title" style={{ margin: 0, color: '#fff' }}>
              我的奖品
            </Title>
          </Space>
          <Text className="hero-subtitle" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            查看您的实物奖品记录和核销状态
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

      {/* Prize Tabs */}
      <Card style={{ marginTop: '20px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: (
                <span>
                  待核销 <Badge count={pendingRecords.length} showZero />
                </span>
              ),
              children: renderPrizeList(pendingRecords),
            },
            {
              key: 'redeemed',
              label: (
                <span>
                  已核销 <Badge count={redeemedRecords.length} showZero />
                </span>
              ),
              children: renderPrizeList(redeemedRecords),
            },
            {
              key: 'cancelled',
              label: (
                <span>
                  已取消 <Badge count={cancelledRecords.length} showZero />
                </span>
              ),
              children: renderPrizeList(cancelledRecords),
            },
          ]}
        />
      </Card>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['lottery_my_prizes'], async () => {
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  const mountPoint = document.getElementById('my-prizes-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<MyPrizesApp />);
    } catch (error) {
      // Failed to render React app
    }
  }
}));
