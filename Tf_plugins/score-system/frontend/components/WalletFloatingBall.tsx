/* eslint-disable react-refresh/only-export-components */
import './wallet-floating-ball.css';

import {
  DollarOutlined,
  MoneyCollectOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const { Text } = Typography;

interface WalletFloatingBallProps {
  /** 当前用户余额 */
  currentCoins: number;
  /** 用户信息对象 */
  userInfo?: {
    uid: string;
    avatarUrl?: string;
    uname?: string;
    displayName?: string;
  };
  /** 钱包页面URL */
  walletUrl?: string;
  /** 是否已登录 */
  isLoggedIn?: boolean;
}

/**
 * 钱包悬浮球组件
 * 可在多个页面中复用，显示用户钱包信息并提供快速跳转
 */
export const WalletFloatingBall: React.FC<WalletFloatingBallProps> = ({
  currentCoins = 0,
  userInfo,
  walletUrl = '/score/transfer',
  isLoggedIn = false,
}) => {
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const walletBallRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭悬浮球
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletBallRef.current && !walletBallRef.current.contains(event.target as Node)) {
        setWalletExpanded(false);
      }
    };

    if (walletExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletExpanded]);

  // 处理跳转到钱包页面
  const handleNavigateToWallet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNavigating) return;
    setIsNavigating(true);
    setWalletExpanded(false);
    // 等待关闭动画完成后再跳转
    setTimeout(() => {
      window.location.href = walletUrl;
    }, 250);
  }, [isNavigating, walletUrl]);

  // 如果未登录，不显示悬浮球
  if (!isLoggedIn) {
    return null;
  }

  const userAvatar = userInfo?.avatarUrl;
  const userName = userInfo?.uname || userInfo?.displayName || '用户';

  return (
    <div ref={walletBallRef} className={`wallet-floating-ball ${walletExpanded ? 'expanded' : ''}`}>
      <div className="wallet-ball-wrapper">
        <div className="wallet-ball-main" onClick={() => setWalletExpanded(!walletExpanded)}>
          {/* 钱包装饰背景 */}
          <div className="wallet-pattern"></div>

          {/* 顶部区域 - 头像和用户名 */}
          <div className="wallet-header">
            <div className="wallet-avatar-wrapper">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="wallet-avatar"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`wallet-avatar-fallback ${userAvatar ? 'hidden' : ''}`}>
                <UserOutlined />
              </div>
              <div className="wallet-avatar-ring"></div>
            </div>
            <div className="wallet-user-name">{userName}</div>
          </div>

          {/* 中间区域 - 余额信息 */}
          <div className="wallet-body">
            <div className="wallet-balance-main">
              <MoneyCollectOutlined className="wallet-balance-icon" />
              <span className="wallet-balance">{currentCoins}</span>
            </div>
          </div>

          {/* 底部区域 - 钱包标签 */}
          <div className="wallet-footer">
            <WalletOutlined className="wallet-footer-icon" />
            <span className="wallet-label">我的钱包</span>
          </div>
        </div>
      </div>
      {walletExpanded && (
        <div className="wallet-ball-content">
          <div className="wallet-content-header">
            <Text strong style={{ fontSize: 16, color: '#fff' }}>我的钱包</Text>
          </div>
          <div className="wallet-content-body">
            <div className="wallet-balance-detail">
              <Text type="secondary" style={{ fontSize: 13 }}>当前余额</Text>
              <div className="wallet-balance-value">
                <DollarOutlined />
                <Text strong style={{ fontSize: 24, color: '#10b981', marginLeft: 8 }}>
                  {currentCoins}
                </Text>
                <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>积分</Text>
              </div>
            </div>
            <div className="wallet-content-divider" />
            <div className="wallet-actions">
              <Button
                type="primary"
                icon={<DollarOutlined />}
                block
                size="small"
                className="wallet-action-btn"
                loading={isNavigating}
                disabled={isNavigating}
                onClick={handleNavigateToWallet}
              >
                我的钱包
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

