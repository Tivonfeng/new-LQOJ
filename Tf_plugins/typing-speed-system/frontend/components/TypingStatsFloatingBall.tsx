import './typing-stats-floating-ball.css';

import { ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const { Text } = Typography;

interface TypingStatsFloatingBallProps {
  /** 用户统计信息 */
  userStats: {
    maxWpm: number;
    avgWpm: number;
    totalRecords: number;
  };
  /** 用户排名信息 */
  userRank?: {
    maxRank: number | null;
    avgRank: number | null;
  };
  /** 用户信息对象 */
  userInfo?: {
    uid: number;
    avatarUrl?: string;
    uname?: string;
    displayName?: string;
  };
  /** 详情页面URL */
  detailUrl?: string;
  /** 是否已登录 */
  isLoggedIn?: boolean;
}

/**
 * 打字统计悬浮球组件
 * 参考积分大厅的钱包悬浮球设计
 */
export const TypingStatsFloatingBall: React.FC<TypingStatsFloatingBallProps> = ({
  userStats,
  userRank,
  userInfo,
  detailUrl = '/typing/me',
  isLoggedIn = false,
}) => {
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const statsBallRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭悬浮球
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statsBallRef.current && !statsBallRef.current.contains(event.target as Node)) {
        setStatsExpanded(false);
      }
    };

    if (statsExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statsExpanded]);

  // 处理跳转到详情页面
  const handleNavigateToDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNavigating) return;
    setIsNavigating(true);
    setStatsExpanded(false);
    // 等待关闭动画完成后再跳转
    setTimeout(() => {
      window.location.href = detailUrl;
    }, 250);
  }, [isNavigating, detailUrl]);

  // 如果未登录，不显示悬浮球
  if (!isLoggedIn) {
    return null;
  }

  const userAvatar = userInfo?.avatarUrl;
  const userName = userInfo?.uname || userInfo?.displayName || '用户';

  return (
    <div ref={statsBallRef} className={`typing-stats-floating-ball ${statsExpanded ? 'expanded' : ''}`}>
      <div className="stats-ball-wrapper">
        <div className="stats-ball-main" onClick={() => setStatsExpanded(!statsExpanded)}>
          {/* 装饰背景 */}
          <div className="stats-pattern"></div>

          {/* 顶部区域 - 头像和用户名 */}
          <div className="stats-header">
            <div className="stats-avatar-wrapper">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="stats-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`stats-avatar-fallback ${userAvatar ? 'hidden' : ''}`}>
                <UserOutlined />
              </div>
              <div className="stats-avatar-ring"></div>
            </div>
            <div className="stats-user-name">{userName}</div>
          </div>

          {/* 中间区域 - 最高速度信息 */}
          <div className="stats-body">
            <div className="stats-value-main">
              <ThunderboltOutlined className="stats-value-icon" />
              <span className="stats-value">{userStats.maxWpm}</span>
            </div>
            <div className="stats-value-unit">WPM</div>
          </div>

          {/* 底部区域 - 标签 */}
          <div className="stats-footer">
            <ThunderboltOutlined className="stats-footer-icon" />
            <span className="stats-label">我的统计</span>
          </div>
        </div>
      </div>
      {statsExpanded && (
        <div className="stats-ball-content">
          <div className="stats-content-header">
            <Text strong style={{ fontSize: 16, color: '#fff' }}>我的打字统计</Text>
          </div>
          <div className="stats-content-body">
            <div className="stats-detail-item">
              <Text type="secondary" style={{ fontSize: 13 }}>最高速度</Text>
              <div className="stats-detail-value">
                <ThunderboltOutlined />
                <Text strong style={{ fontSize: 24, color: '#3b82f6', marginLeft: 8 }}>
                  {userStats.maxWpm}
                </Text>
                <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>WPM</Text>
              </div>
              {userRank?.maxRank && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  排名 #{userRank.maxRank}
                </Text>
              )}
            </div>
            <div className="stats-content-divider" />
            <div className="stats-detail-item">
              <Text type="secondary" style={{ fontSize: 13 }}>平均速度</Text>
              <div className="stats-detail-value">
                <Text strong style={{ fontSize: 20, color: '#10b981' }}>
                  {userStats.avgWpm}
                </Text>
                <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>WPM</Text>
              </div>
              {userRank?.avgRank && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  排名 #{userRank.avgRank}
                </Text>
              )}
            </div>
            <div className="stats-content-divider" />
            <div className="stats-detail-item">
              <Text type="secondary" style={{ fontSize: 13 }}>总记录数</Text>
              <div className="stats-detail-value">
                <Text strong style={{ fontSize: 20, color: '#8b5cf6' }}>
                  {userStats.totalRecords}
                </Text>
                <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>条</Text>
              </div>
            </div>
            <div className="stats-content-divider" />
            <div className="stats-actions">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                block
                size="small"
                className="stats-action-btn"
                loading={isNavigating}
                disabled={isNavigating}
                onClick={handleNavigateToDetail}
              >
                查看详情
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
