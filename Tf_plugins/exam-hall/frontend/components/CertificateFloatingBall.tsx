/* eslint-disable react-refresh/only-export-components */
import './certificate-floating-ball.css';

import {
  FileTextOutlined,
  GoldOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const { Text } = Typography;

interface CertificateFloatingBallProps {
  /** 当前用户证书总数 */
  totalCertificates: number;
  /** 竞赛证书数量 */
  competitionCount?: number;
  /** 考级证书数量 */
  certificationCount?: number;
  /** 用户权重/指数 */
  totalWeight?: number;
  /** 用户信息对象 */
  userInfo?: {
    uid: string;
    avatarUrl?: string;
    uname?: string;
    displayName?: string;
  };
  /** 证书页面URL */
  certificateUrl?: string;
  /** 是否已登录 */
  isLoggedIn?: boolean;
}

/**
 * 证书悬浮球组件
 * 可在多个页面中复用，显示用户证书信息并提供快速跳转
 */
export const CertificateFloatingBall: React.FC<CertificateFloatingBallProps> = ({
  totalCertificates = 0,
  competitionCount = 0,
  certificationCount = 0,
  totalWeight = 0,
  userInfo,
  certificateUrl = '/exam/certificates',
  isLoggedIn = false,
}) => {
  const [ballExpanded, setBallExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const ballRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭悬浮球
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ballRef.current && !ballRef.current.contains(event.target as Node)) {
        setBallExpanded(false);
      }
    };

    if (ballExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ballExpanded]);

  // 处理跳转到证书页面
  const handleNavigateToCertificates = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNavigating) return;
    setIsNavigating(true);
    setBallExpanded(false);
    // 等待关闭动画完成后再跳转
    setTimeout(() => {
      window.location.href = certificateUrl;
    }, 250);
  }, [isNavigating, certificateUrl]);

  // 如果未登录，不显示悬浮球
  if (!isLoggedIn) {
    return null;
  }

  const userAvatar = userInfo?.avatarUrl;
  const userName = userInfo?.uname || userInfo?.displayName || '用户';

  return (
    <div ref={ballRef} className={`certificate-floating-ball ${ballExpanded ? 'expanded' : ''}`}>
      <div className="certificate-ball-wrapper">
        <div className="certificate-ball-main" onClick={() => setBallExpanded(!ballExpanded)}>
          {/* 证书装饰背景 */}
          <div className="certificate-pattern"></div>

          {/* 顶部区域 - 头像和用户名 */}
          <div className="certificate-header">
            <div className="certificate-avatar-wrapper">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="certificate-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`certificate-avatar-fallback ${userAvatar ? 'hidden' : ''}`}>
                <UserOutlined />
              </div>
              <div className="certificate-avatar-ring"></div>
            </div>
            <div className="certificate-user-name">{userName}</div>
          </div>

          {/* 中间区域 - 证书统计 */}
          <div className="certificate-body">
            <div className="certificate-count-main">
              <FileTextOutlined className="certificate-count-icon" />
              <span className="certificate-count">{totalCertificates}</span>
            </div>
          </div>

          {/* 底部区域 - 证书标签 */}
          <div className="certificate-footer">
            <TrophyOutlined className="certificate-footer-icon" />
            <span className="certificate-label">我的证书</span>
          </div>
        </div>
      </div>
      {ballExpanded && (
        <div className="certificate-ball-content">
          <div className="certificate-content-header">
            <Text strong style={{ fontSize: 16, color: '#fff' }}>我的证书</Text>
          </div>
          <div className="certificate-content-body">
            <div className="certificate-stats-grid">
              <div className="certificate-stat-item">
                <TrophyOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
                <div className="certificate-stat-info">
                  <Text type="secondary" style={{ fontSize: 12 }}>竞赛证书</Text>
                  <Text strong style={{ fontSize: 20, color: '#f59e0b' }}>{competitionCount}</Text>
                </div>
              </div>
              <div className="certificate-stat-item">
                <GoldOutlined style={{ fontSize: 20, color: '#8b5cf6' }} />
                <div className="certificate-stat-info">
                  <Text type="secondary" style={{ fontSize: 12 }}>考级证书</Text>
                  <Text strong style={{ fontSize: 20, color: '#8b5cf6' }}>{certificationCount}</Text>
                </div>
              </div>
            </div>
            <div className="certificate-weight-section">
              <Text type="secondary" style={{ fontSize: 13 }}>赛考指数</Text>
              <div className="certificate-weight-value">
                <TrophyOutlined style={{ fontSize: 18, color: '#10b981' }} />
                <Text strong style={{ fontSize: 22, color: '#10b981', marginLeft: 6 }}>
                  {totalWeight.toFixed(1)}
                </Text>
                <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>指数</Text>
              </div>
            </div>
            <div className="certificate-content-divider" />
            <div className="certificate-actions">
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                block
                size="small"
                className="certificate-action-btn"
                loading={isNavigating}
                disabled={isNavigating}
                onClick={handleNavigateToCertificates}
              >
                查看我的证书
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
