/* eslint-disable max-len */
/* eslint-disable react-refresh/only-export-components */
import './lottery-game.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  GiftOutlined,
  ToolOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons';
// @ts-ignore - @lucky-canvas/react 可能没有类型定义
import { LuckyGrid } from '@lucky-canvas/react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  List,
  message,
  Pagination,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletFloatingBall } from './components/WalletFloatingBall';

const { Title, Text } = Typography;

// 抽奖游戏数据接口
interface LotteryGameData {
  currentCoins: number;
  canPlay: boolean;
  gameConfig: {
    betAmount: number;
    prizes: Array<{
      index: number;
      name: string;
      type: 'reward' | 'nothing' | 'bonus';
      reward: number;
    }>;
  };
  userStats: {
    totalGames: number;
    totalWins: number;
    netProfit: number;
  };
  winRate: string;
  recentGames: Array<{
    prizeIndex: number;
    prizeName: string;
    prizeType: 'reward' | 'nothing' | 'bonus';
    reward: number;
    netGain: number;
    gameTime: string;
  }>;
  dailyLimit: {
    remainingPlays: number;
    maxPlays: number;
  };
}

// 游戏结果接口
interface GameResult {
  prizeIndex: number;
  prizeName: string;
  prizeType: 'reward' | 'nothing' | 'bonus' | 'physical';
  reward: number;
  netGain: number;
}

// 抽奖游戏React组件
const LotteryGameApp: React.FC = () => {
  // 从全局变量获取数据
  const gameData: LotteryGameData = (window as any).lotteryGameData || {
    currentCoins: 0,
    canPlay: false,
    gameConfig: { betAmount: 100, prizes: [] },
    userStats: { totalGames: 0, totalWins: 0, netProfit: 0 },
    winRate: '0.0',
    recentGames: [],
    dailyLimit: { remainingPlays: 0, maxPlays: 10 },
  };

  const [gameInProgress, setGameInProgress] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCoins, setCurrentCoins] = useState(gameData.currentCoins);
  const [userStats, setUserStats] = useState(gameData.userStats);
  const [winRate, setWinRate] = useState(gameData.winRate);
  const [recentGames, setRecentGames] = useState(gameData.recentGames);
  const [dailyLimit, setDailyLimit] = useState(gameData.dailyLimit);
  const [canPlay, setCanPlay] = useState(gameData.canPlay);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalGames, setTotalGames] = useState(0);
  const [allGames, setAllGames] = useState(gameData.recentGames);

  const luckyGridRef = useRef<any>(null);

  // 刷新游戏状态数据
  const refreshGameData = useCallback(async () => {
    try {
      const statusUrl = (window as any).lotteryStatusUrl || '/score/lottery/status';
      const response = await fetch(statusUrl, {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        setCurrentCoins(data.currentCoins);
        setUserStats(data.userStats);
        setWinRate(data.winRate);
        setRecentGames(data.recentGames);
        setDailyLimit(data.dailyLimit);
        setCanPlay(data.canPlay);
      }
    } catch (err) {
      // Failed to refresh game data
    }
  }, []);

  // 获取分页游戏历史
  const fetchGameHistory = useCallback(async (page: number) => {
    try {
      const historyUrl = (window as any).lotteryHistoryUrl || '/score/lottery/history';
      const response = await fetch(`${historyUrl}?page=${page}&limit=${pageSize}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.success && result.records) {
          setAllGames(result.records);
          setTotalGames(result.total || userStats.totalGames);
        }
      }
    } catch (err) {
      // Failed to fetch game history
    }
  }, [pageSize, userStats.totalGames]);

  // 初始化游戏历史数据
  React.useEffect(() => {
    if (recentGames.length > 0 && userStats.totalGames > 0) {
      setAllGames(recentGames);
      setTotalGames(userStats.totalGames);
    }
  }, [recentGames, userStats.totalGames]);

  // 存储抽奖结果，供 end 回调使用
  const lotteryResultRef = useRef<GameResult | null>(null);

  // 开始抽奖回调（点击按钮时触发）
  // React 版本需要手动调用 play() 和 stop() 方法
  const handleStart = useCallback(async () => {
    if (gameInProgress || !canPlay) {
      return;
    }

    setGameInProgress(true);
    setGameResult(null);
    setError(null);
    lotteryResultRef.current = null;

    // 先开始动画
    if (luckyGridRef.current && typeof luckyGridRef.current.play === 'function') {
      luckyGridRef.current.play();
    } else {
      setGameInProgress(false);
      return;
    }

    try {
      const playUrl = (window as any).lotteryPlayUrl || '/score/lottery/play';

      const response = await fetch(playUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
      }

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success && result.result) {
        const game: GameResult = {
          prizeIndex: result.result.prizeIndex,
          prizeName: result.result.prizeName,
          prizeType: result.result.prizeType,
          reward: result.result.reward,
          netGain: result.result.netGain,
        };

        // 保存结果供 end 回调使用
        lotteryResultRef.current = game;

        // 确保索引在有效范围内
        let prizeIndex = Math.max(0, Math.min(game.prizeIndex, gameData.gameConfig.prizes.length - 1));

        // 如果索引是4（中间按钮位置），需要映射到其他位置
        // 将索引4映射到索引3（右中位置），因为中间是按钮，顺时针下一个位置是右中
        if (prizeIndex === 4) {
          prizeIndex = 3;
        }

        // 等待一段时间后停止动画（模拟抽奖过程）
        setTimeout(() => {
          if (luckyGridRef.current && typeof luckyGridRef.current.stop === 'function') {
            luckyGridRef.current.stop(prizeIndex);
          } else {
            setGameInProgress(false);
          }
        }, 2500); // 2.5秒后停止，与 defaultConfig 中的 decelerationTime 匹配
      } else {
        const errorMsg = result.message || '抽奖失败';
        setError(errorMsg);
        setGameInProgress(false);
        message.error(errorMsg);
        // 停止动画
        if (luckyGridRef.current && typeof luckyGridRef.current.stop === 'function') {
          luckyGridRef.current.stop();
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || '网络错误，请重试';
      setError(errorMessage);
      setGameInProgress(false);
      message.error(errorMessage);
      // 停止动画
      if (luckyGridRef.current && typeof luckyGridRef.current.stop === 'function') {
        luckyGridRef.current.stop();
      }
    }
  }, [gameInProgress, canPlay, gameData.gameConfig.prizes.length]);

  // 结束抽奖回调（动画停止后触发）
  const handleEnd = useCallback(() => {
    const game = lotteryResultRef.current;
    if (!game) {
      setGameInProgress(false);
      return;
    }

    // 显示结果
    setGameResult(game);
    setCurrentCoins((prev) => prev + game.netGain);

    // 显示成功消息
    if (game.prizeType === 'physical') {
      message.success(`恭喜获得实物奖品 ${game.prizeName}！请前往「我的奖品」查看详情`);
    } else if (game.reward > 0) {
      message.success(`恭喜获得 ${game.prizeName}！`);
    } else if (game.prizeType === 'bonus') {
      message.success('获得再来一次，已返还投注！');
    } else {
      message.info('谢谢参与，下次再来！');
    }

    // 游戏完成后刷新游戏数据
    setTimeout(() => {
      refreshGameData();
      setGameInProgress(false);
    }, 2000);

    // 5秒后自动关闭游戏结果显示
    setTimeout(() => {
      setGameResult(null);
    }, 5000);
  }, [refreshGameData]);

  return (
    <div className="lottery-game-container">
      {/* 个人钱包悬浮球 */}
      {(() => {
        const currentUserId = String((window as any).currentUserId || '');
        const udocs = (window as any).lotteryGameData?.udocs || {};
        const currentUser = udocs[currentUserId];
        const isLoggedIn = !!(window as any).currentUserId;
        return (
          <WalletFloatingBall
            currentCoins={currentCoins}
            userInfo={{
              uid: currentUserId,
              avatarUrl: currentUser?.avatarUrl,
              uname: currentUser?.uname,
              displayName: currentUser?.displayName,
            }}
            walletUrl={(window as any).transferUrl || '/score/transfer'}
            isLoggedIn={isLoggedIn}
          />
        );
      })()}
      {/* Hero Section */}
      <Card className="hero-card" bodyStyle={{ padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={1} className="hero-title">
                <GiftOutlined style={{ marginRight: '8px' }} /> 实物抽奖（测试版）
              </Title>
              <Text className="hero-subtitle">
                测试你的运气，赢取丰厚奖励
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="default"
                icon={<ArrowLeftOutlined />}
                href={(window as any).scoreHallUrl || '/score/hall'}
                className="hero-back-button"
              >
                返回积分大厅
              </Button>
              {(window as any).isLotteryAdmin && (
                <Button
                  type="primary"
                  icon={<ToolOutlined />}
                  href={(window as any).redemptionAdminUrl || '/score/lottery/admin/redeem'}
                >
                  核销管理
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* User Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: '20px' }}>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-current-coins">
            <Statistic
              title="当前积分"
              value={currentCoins}
              prefix={<WalletOutlined />}
              valueStyle={{ color: '#6366f1', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-total-games">
            <Statistic
              title="总抽奖数"
              value={userStats.totalGames}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#8b5cf6', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-total-wins">
            <Statistic
              title="中奖次数"
              value={userStats.totalWins}
              prefix={<TrophyOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#10b981', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className={`stat-card-hover stat-card-net-profit ${userStats.netProfit < 0 ? 'negative' : ''}`}>
            <Statistic
              title="净收益"
              value={userStats.netProfit}
              prefix={<DollarOutlined />}
              valueStyle={{
                color: userStats.netProfit >= 0 ? '#10b981' : '#ef4444',
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-win-rate">
            <Statistic
              title="中奖率"
              value={winRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#3b82f6', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Game Section */}
      <Row gutter={[16, 16]}>
        {/* Main Game Area */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <GiftOutlined style={{ fontSize: '20px' }} />
                <span style={{ fontSize: '20px', fontWeight: 600 }}>实物抽奖</span>
                <Tag color="orange" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  每次 {gameData.gameConfig.betAmount} 积分
                </Tag>
              </Space>
            }
            style={{
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%',
            }}
          >
            {/* Game Rules */}
            <Card size="small" className="game-rules-card" bodyStyle={{ padding: '12px 16px' }}>
              <Row gutter={[12, 8]}>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-bet">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <DollarOutlined className="info-icon-bet" />
                        <Text type="secondary" className="info-label">投注金额</Text>
                      </Space>
                      <Text strong className="info-value info-value-bet">
                        {gameData.gameConfig.betAmount} <WalletOutlined />
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-daily">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <GiftOutlined className="info-icon-daily" />
                        <Text type="secondary" className="info-label">每日抽奖</Text>
                      </Space>
                      <Text strong className="info-value info-value-daily">
                        {dailyLimit.remainingPlays} / {dailyLimit.maxPlays}
                      </Text>
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Lottery Game Area */}
            <Card className="lottery-game-area" bodyStyle={{ padding: '32px 24px' }}>
              <div className="lottery-display-container">
                <LuckyGrid
                  ref={luckyGridRef}
                  width="500px"
                  height="500px"
                  blocks={[
                    {
                      padding: '20px',
                      imgs: [{
                        src: '/lottery_bg.png',
                        width: '100%',
                        height: '100%',
                      }],
                    },
                  ]}
                  prizes={gameData.gameConfig.prizes.map((prize, index) => {
                    // 九宫格布局：中心 (1,1) 是按钮，8个奖品绕一圈（顺时针）
                    // 顺时针顺序：0(0,0) -> 1(1,0) -> 2(2,0) -> 3(2,1) -> 5(2,2) -> 6(1,2) -> 7(0,2) -> 8(0,1)
                    // 奖品索引到位置的映射（跳过中间位置4）：
                    // 奖品0 -> (0,0) 左上
                    // 奖品1 -> (1,0) 上中
                    // 奖品2 -> (2,0) 右上
                    // 奖品3 -> (2,1) 右中
                    // 奖品4 -> (1,1) 中间（会被按钮覆盖，但保留在数组中以便索引对应）
                    // 奖品5 -> (2,2) 右下
                    // 奖品6 -> (1,2) 下中
                    // 奖品7 -> (0,2) 左下
                    // 奖品8 -> (0,1) 左中
                    let x: number, y: number;
                    if (index === 0) {
                      x = 0; y = 0; // 左上
                    } else if (index === 1) {
                      x = 1; y = 0; // 上中
                    } else if (index === 2) {
                      x = 2; y = 0; // 右上
                    } else if (index === 3) {
                      x = 2; y = 1; // 右中
                    } else if (index === 4) {
                      x = 1; y = 1; // 中间（会被按钮覆盖）
                    } else if (index === 5) {
                      x = 2; y = 2; // 右下
                    } else if (index === 6) {
                      x = 1; y = 2; // 下中
                    } else if (index === 7) {
                      x = 0; y = 2; // 左下
                    } else {
                      x = 0; y = 1; // 左中
                    }
                    return {
                      x,
                      y,
                      fonts: [{ text: prize.name, top: '40%', fontColor: '#ff4e4e', fontSize: '16px' }],
                      imgs: [],
                    };
                  })}
                  buttons={[
                    {
                      x: 1,
                      y: 1,
                      background: '#ec4899',
                      imgs: [{
                        src: '/lottery_btn.gif',
                        width: '100%',
                        height: '100%',
                      }],
                    },
                  ]}
                  defaultStyle={{
                    borderRadius: 10,
                    background: '#4A7BA7', // 深蓝色，与红色文字形成良好对比，同时与浅蓝边框形成层次感
                  }}
                  activeStyle={{
                    background: '#5B8FC7', // 激活时稍亮的蓝色，提供清晰的视觉反馈
                    shadow: '0 0 12px rgba(74, 123, 167, 0.6)',
                  }}
                  defaultConfig={{
                    gutter: 5,
                    speed: 20,
                    accelerationTime: 2500,
                    decelerationTime: 2500,
                  }}
                  onStart={handleStart}
                  onEnd={handleEnd}
                />
              </div>

              {!canPlay && (
                <Alert
                  message={
                    currentCoins < gameData.gameConfig.betAmount && dailyLimit.remainingPlays === 0
                      ? '积分不足且抽奖次数已用完'
                      : currentCoins < gameData.gameConfig.betAmount
                        ? '积分不足'
                        : '今日抽奖次数已用完'
                  }
                  description={
                    <>
                      {currentCoins < gameData.gameConfig.betAmount && dailyLimit.remainingPlays === 0 ? (
                        <>
                          至少需要 {gameData.gameConfig.betAmount} <WalletOutlined /> 才能抽奖，
                          且今日抽奖次数已用完（{dailyLimit.remainingPlays}/{dailyLimit.maxPlays}）
                        </>
                      ) : currentCoins < gameData.gameConfig.betAmount ? (
                        <>
                          至少需要 {gameData.gameConfig.betAmount} <WalletOutlined /> 才能抽奖
                        </>
                      ) : (
                        <>
                          今日抽奖次数已用完（{dailyLimit.remainingPlays}/{dailyLimit.maxPlays}），
                          请明天再来
                        </>
                      )}
                    </>
                  }
                  type="warning"
                  showIcon
                  action={
                    currentCoins < gameData.gameConfig.betAmount ? (
                      <Button
                        size="small"
                        href={(window as any).scoreHallUrl || '/score/hall'}
                      >
                        赚取更多积分
                      </Button>
                    ) : null
                  }
                  style={{ marginTop: '20px' }}
                />
              )}

              {/* Game Result */}
              {gameResult && (
                <Card
                  className={`game-result-card ${gameResult.reward > 0 ? 'won' : 'lost'}`}
                  extra={
                    <Button
                      type="text"
                      size="small"
                      onClick={() => setGameResult(null)}
                      style={{ color: '#666' }}
                    >
                      关闭
                    </Button>
                  }
                  style={{ marginTop: '20px' }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      {gameResult.reward > 0 ? (
                        <CheckCircleOutlined className="game-result-icon won" />
                      ) : (
                        <GiftOutlined className="game-result-icon lost" />
                      )}
                      <Title level={3} className="game-result-title">
                        {gameResult.prizeType === 'physical' ? '恭喜获得实物奖品！'
                          : gameResult.reward > 0 ? '恭喜中奖！'
                            : gameResult.prizeType === 'bonus' ? '再来一次！'
                              : '谢谢参与'}
                      </Title>
                    </div>
                    {gameResult.prizeType === 'physical' && (
                      <Alert
                        message="实物奖品"
                        description="请前往「我的奖品」页面查看详情，并联系管理员核销"
                        type="success"
                        showIcon
                        action={
                          <Button
                            size="small"
                            href={(window as any).myPrizesUrl || '/score/lottery/my-prizes'}
                          >
                            查看我的奖品
                          </Button>
                        }
                        style={{ marginBottom: '16px' }}
                      />
                    )}
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <div className={`result-prize-card ${gameResult.prizeType === 'physical' || gameResult.reward > 0 ? 'won' : 'lost'}`}>
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text type="secondary" className="result-prize-label">获得奖品</Text>
                            <Text strong className={`result-prize-value ${gameResult.prizeType === 'physical' || gameResult.reward > 0 ? 'won' : 'lost'}`}>
                              {gameResult.prizeName}
                            </Text>
                          </Space>
                        </div>
                      </Col>
                      <Col span={24}>
                        <div className={`result-gain-card ${gameResult.netGain >= 0 ? 'positive' : 'negative'}`}>
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text type="secondary" className="result-gain-label">本局收益</Text>
                            <Text strong className={`result-gain-value ${gameResult.netGain >= 0 ? 'positive' : 'negative'}`}>
                              {gameResult.netGain > 0 ? '+' : ''}
                              {gameResult.netGain} <WalletOutlined />
                            </Text>
                          </Space>
                        </div>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  style={{ marginTop: '20px' }}
                />
              )}
            </Card>
          </Card>
        </Col>

        {/* Game History with Pagination */}
        <Col xs={24} lg={8}>
          <Card
            className="game-history-card"
            title={
              <Space>
                <span>抽奖历史</span>
                <Badge count={totalGames || userStats.totalGames} showZero />
              </Space>
            }
          extra={
            <Button
              size="small"
              type="default"
              href={(window as any).myPrizesUrl || '/score/lottery/my-prizes'}
            >
              我的实物奖品
            </Button>
          }
          >
            {allGames.length > 0 ? (
              <>
                <List
                  dataSource={allGames}
                  renderItem={(game) => (
                    <List.Item className="game-history-item">
                      <List.Item.Meta
                        avatar={
                          <div className="game-history-avatar">
                            <GiftOutlined style={{ fontSize: '20px' }} />
                          </div>
                        }
                        title={
                          <Space>
                            <Text strong style={{ fontSize: '14px' }}>
                              {game.prizeName}
                            </Text>
                            <Tag color={game.reward > 0 ? 'green' : 'default'} style={{ fontSize: '12px', margin: 0 }}>
                              {game.reward > 0 ? '✓' : '✗'}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {game.gameTime} · {game.netGain > 0 ? '+' : ''}
                            {game.netGain} <WalletOutlined />
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
                {(totalGames || userStats.totalGames) > pageSize && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Pagination
                      current={currentPage}
                      total={totalGames || userStats.totalGames}
                      pageSize={pageSize}
                      onChange={(page) => {
                        setCurrentPage(page);
                        fetchGameHistory(page);
                      }}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total) => `共 ${total} 条记录`}
                      size="small"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="game-history-empty">
                <Text type="secondary">暂无抽奖记录</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['lottery_game'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('lottery-game-react-app');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<LotteryGameApp />);
  }
}));
