/* eslint-disable react-refresh/only-export-components */
import './dice-game.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AimOutlined,
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FireOutlined,
  NumberOutlined,
  StarOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { animated, useSpring } from '@react-spring/web';
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

const { Title, Text } = Typography;

interface DiceDisplayProps {
  value: number;
  size?: string | number;
}

const DiceDisplay: React.FC<DiceDisplayProps> = ({ value, size = '1em' }) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    // 重置状态当 value 改变时
    setImageError(false);
  }, [value]);

  const iconSize = typeof size === 'string' ? size : `${size}px`;

  if (value === 0) {
    return <AppstoreOutlined style={{ fontSize: iconSize }} />;
  }

  // 尝试使用根路径，与 avatar-settings 插件相同的方式
  const imagePath = `/dice_${value}.png`;

  // 如果图片加载失败，显示图标
  if (imageError) {
    return <AppstoreOutlined style={{ fontSize: iconSize }} />;
  }

  return (
    <img
      src={imagePath}
      alt={`骰子 ${value}`}
      className="dice-display-img"
      style={{
        width: iconSize,
        height: iconSize,
      }}
      onError={() => {
        setImageError(true);
      }}
    />
  );
};

// 骰子游戏数据接口
interface DiceGameData {
  currentCoins: number;
  canPlay: boolean;
  availableBets: number[];
  gameConfig: {
    winMultiplier: number;
    availableBets: number[];
  };
  userStats: {
    totalGames: number;
    totalWins: number;
    netProfit: number;
    winStreak: number;
    maxWinStreak: number;
  };
  winRate: string;
  recentGames: Array<{
    diceValue: number;
    guess: 'big' | 'small';
    won: boolean;
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
  diceValue: number;
  guess: 'big' | 'small';
  actualResult: 'big' | 'small';
  won: boolean;
  netGain: number;
}

// 骰子游戏React组件
const DiceGameApp: React.FC = () => {
  // 从全局变量获取数据
  const gameData: DiceGameData = (window as any).diceGameData || {
    currentCoins: 0,
    canPlay: false,
    availableBets: [],
    gameConfig: { winMultiplier: 2, availableBets: [20, 50, 100] },
    userStats: { totalGames: 0, totalWins: 0, netProfit: 0, winStreak: 0, maxWinStreak: 0 },
    winRate: '0.0',
    recentGames: [],
    dailyLimit: { remainingPlays: 0, maxPlays: 10 },
  };

  const [selectedBetAmount, setSelectedBetAmount] = useState<number | null>(null);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(0); // 0 表示未显示，1-6 表示点数
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 使用状态管理所有游戏数据，以便在不刷新页面的情况下更新
  const [currentCoins, setCurrentCoins] = useState(gameData.currentCoins);
  const [userStats, setUserStats] = useState(gameData.userStats);
  const [winRate, setWinRate] = useState(gameData.winRate);
  const [recentGames, setRecentGames] = useState(gameData.recentGames);
  const [dailyLimit, setDailyLimit] = useState(gameData.dailyLimit);
  const [availableBets, setAvailableBets] = useState(gameData.availableBets);
  const [canPlay, setCanPlay] = useState(gameData.canPlay);
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalGames, setTotalGames] = useState(0);
  const [allGames, setAllGames] = useState(gameData.recentGames);

  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 骰子动画 - 使用 react-spring
  const [diceSpring, diceApi] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    config: { tension: 200, friction: 20 },
  }));

  // 骰子弹跳动画
  const [bounceSpring, bounceApi] = useSpring(() => ({
    y: 0,
    scale: 1,
    config: { tension: 300, friction: 10 },
  }));

  // 刷新游戏状态数据（不刷新页面）
  const refreshGameData = useCallback(async () => {
    try {
      const statusUrl = (window as any).diceStatusUrl || '/score/dice/status';
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
        setAvailableBets(data.availableBets);
        setCanPlay(data.canPlay);
      }
    } catch (err) {
      // Failed to refresh game data
    }
  }, []);

  // 获取分页游戏历史
  const fetchGameHistory = useCallback(async (page: number) => {
    try {
      const historyUrl = (window as any).diceHistoryUrl || '/score/dice/history';
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
          // 转换数据格式以匹配前端期望的格式
          const formattedRecords = result.records.map((record: any) => ({
            diceValue: record.diceValue,
            guess: record.guess,
            won: record.won,
            netGain: record.netGain,
            gameTime: record.gameTime,
          }));
          setAllGames(formattedRecords);
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

  // 选择投注金额
  const handleSelectBetAmount = useCallback((betAmount: number) => {
    if (gameInProgress) return;
    setSelectedBetAmount(betAmount);
    setGameResult(null);
    setError(null);
  }, [gameInProgress]);

  // 显示滚动动画 - 使用 react-spring 优化
  const showRollingAnimation = useCallback(() => {
    let rollCount = 0;
    const maxRolls = 25;
    const duration = 2000; // 2秒动画

    // 启动旋转动画
    diceApi.start({
      rotateX: 360 * 4, // 4圈
      rotateY: 360 * 4,
      rotateZ: 360 * 2,
      scale: 1.2,
      config: { duration, easing: (t: number) => t * (2 - t) },
    });

    // 启动弹跳动画 - 使用循环
    let bounceCount = 0;
    const bounceInterval = setInterval(() => {
      bounceApi.start({
        y: -30,
        scale: 1.1,
        config: { tension: 300, friction: 10 },
        onRest: () => {
          bounceApi.start({
            y: 0,
            scale: 1,
            config: { tension: 300, friction: 10 },
          });
        },
      });
      bounceCount++;
      if (bounceCount >= 10) {
        clearInterval(bounceInterval);
      }
    }, 200);

    // 快速切换骰子显示
    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
    }

    rollIntervalRef.current = setInterval(() => {
      const randomDice = Math.floor(Math.random() * 6) + 1;
      setDiceDisplay(randomDice);
      rollCount++;

      if (rollCount >= maxRolls) {
        if (rollIntervalRef.current) {
          clearInterval(rollIntervalRef.current);
          rollIntervalRef.current = null;
        }
        clearInterval(bounceInterval);
        // 停止弹跳，准备显示结果
        bounceApi.start({
          y: 0,
          scale: 1,
          config: { tension: 400, friction: 25 },
        });
      }
    }, duration / maxRolls);
  }, [diceApi, bounceApi, setDiceDisplay]);

  // 执行游戏
  const playGame = useCallback(async (guess: 'big' | 'small') => {
    if (gameInProgress || !selectedBetAmount) return;

    setGameInProgress(true);
    setGameResult(null);
    setError(null);
    showRollingAnimation();

    try {
      const playUrl = (window as any).dicePlayUrl || '/score/dice/play';

      const response = await fetch(playUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guess, betAmount: selectedBetAmount }),
        credentials: 'same-origin',
      });

      // 尝试解析响应
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
        // 等待动画完成
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const game: GameResult = result.result;
        setDiceDisplay(game.diceValue);
        setGameResult(game);

        // 停止旋转，显示最终结果
        diceApi.start({
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
          config: { tension: 300, friction: 30 },
        });

        // 结果弹跳效果
        bounceApi.start({
          y: -20,
          scale: 1.15,
          config: { tension: 400, friction: 20 },
          onRest: () => {
            bounceApi.start({
              y: 0,
              scale: 1,
              config: { tension: 400, friction: 20 },
            });
          },
        });

        // 更新当前积分（临时更新，稍后会从服务器获取最新数据）
        setCurrentCoins((prev) => prev + game.netGain);

        // 显示成功消息
        message.success(result.message || '游戏完成！');

        // 游戏完成后刷新游戏数据（不刷新页面）
        setTimeout(() => {
          refreshGameData();
          setGameInProgress(false);
        }, 2000);

        // 5秒后自动关闭游戏结果显示
        setTimeout(() => {
          setGameResult(null);
        }, 5000);
      } else {
        setError(result.message || '游戏失败');
        setGameInProgress(false);
        message.error(result.message || '游戏失败');
      }
    } catch (err: any) {
      const errorMessage = err.message || '网络错误，请重试';
      setError(errorMessage);
      setGameInProgress(false);
      message.error(errorMessage);
    }
  }, [gameInProgress, selectedBetAmount, showRollingAnimation, refreshGameData]);

  return (
    <div className="dice-game-container">
      {/* Hero Section */}
      <Card className="hero-card" bodyStyle={{ padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={1} className="hero-title">
                <AppstoreOutlined style={{ marginRight: '8px' }} /> 掷骰子游戏
              </Title>
              <Text className="hero-subtitle">
                测试你的运气，猜大小
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="default"
              icon={<ArrowLeftOutlined />}
              href={(window as any).scoreHallUrl || '/score/hall'}
              className="hero-back-button"
            >
              返回积分大厅
            </Button>
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
              title="总游戏数"
              value={userStats.totalGames}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#8b5cf6', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-total-wins">
            <Statistic
              title="胜利次数"
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
              title="胜率"
              value={winRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#3b82f6', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card className="stat-card-hover stat-card-avg-profit">
            <Statistic
              title="平均收益"
              value={
                userStats.totalGames > 0
                  ? (userStats.netProfit / userStats.totalGames).toFixed(1)
                  : 0
              }
              prefix={<DollarOutlined />}
              valueStyle={{
                color: userStats.netProfit >= 0 ? '#ec4899' : '#ef4444',
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
        {(userStats.winStreak > 0 || userStats.maxWinStreak > 0) && (
          <>
            <Col xs={12} sm={8} md={6}>
              <Card className="stat-card-hover stat-card-win-streak">
                <Statistic
                  title="当前连胜"
                  value={userStats.winStreak}
                  prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
                  valueStyle={{ color: '#f59e0b', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className="stat-card-hover stat-card-win-streak">
                <Statistic
                  title="最佳连胜"
                  value={userStats.maxWinStreak}
                  prefix={<StarOutlined style={{ color: '#f59e0b' }} />}
                  valueStyle={{ color: '#f59e0b', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Game Section */}
      <Row gutter={[16, 16]}>
        {/* Main Game Area */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <AppstoreOutlined style={{ fontSize: '20px' }} />
                <span style={{ fontSize: '20px', fontWeight: 600 }}>掷骰子</span>
                <Tag color="orange" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  猜大小
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
                        {gameData.gameConfig.availableBets.join(' / ')} <WalletOutlined />
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-win">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <AimOutlined className="info-icon-win" />
                        <Text type="secondary" className="info-label">获胜倍数</Text>
                      </Space>
                      <Text strong className="info-value info-value-win">
                        {gameData.gameConfig.winMultiplier}x 投注
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-size">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <NumberOutlined className="info-icon-size" />
                        <Text type="secondary" className="info-label">大小规则</Text>
                      </Space>
                      <Text strong className="info-value info-value-size">
                        1-3 小 / 4-6 大
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-daily">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <CalendarOutlined className="info-icon-daily" />
                        <Text type="secondary" className="info-label">每日游戏</Text>
                      </Space>
                      <Text strong className="info-value info-value-daily">
                        {dailyLimit.remainingPlays} / {dailyLimit.maxPlays}
                      </Text>
                    </Space>
                  </div>
                </Col>
          </Row>
        </Card>

            {/* Dice Game Area */}
            <Card className="dice-game-area" bodyStyle={{ padding: '32px 24px' }}>
              <div className="dice-display-animation">
                {/* @ts-ignore - react-spring animated component type issue */}
                <animated.div
                  style={{
                    display: 'inline-block',
                    transform: diceSpring.rotateX.to((x) => {
                      const y = diceSpring.rotateY.get();
                      const z = diceSpring.rotateZ.get();
                      const scale = diceSpring.scale.get();
                      const bounceY = bounceSpring.y.get();
                      const bounceScale = bounceSpring.scale.get();
                      return (
                        `perspective(1000px) rotateX(${x}deg) rotateY(${y}deg) `
                        + `rotateZ(${z}deg) scale(${scale * bounceScale}) translateY(${bounceY}px)`
                      );
                    }) as any,
                  }}
                >
                  <div className="dice-display-inner">
                    <DiceDisplay value={diceDisplay} key={`dice-${diceDisplay}`} />
                  </div>
                </animated.div>
              </div>
              <Text type="secondary" className="dice-instruction">
                选择你的预测并开始游戏！
              </Text>

          {canPlay ? (
            <>
              {/* Bet Amount Selection */}
              <div style={{ marginBottom: '24px' }}>
                <Title level={5} style={{ marginBottom: '16px', fontWeight: 600, fontSize: '16px' }}>
                  选择投注金额
                </Title>
                <Space wrap size="small" style={{ justifyContent: 'center', width: '100%' }}>
                  {availableBets.map((bet) => (
                    <Button
                      key={bet}
                      type={selectedBetAmount === bet ? 'primary' : 'default'}
                      size="large"
                      disabled={gameInProgress}
                      onClick={() => handleSelectBetAmount(bet)}
                      className={`bet-amount-button ${selectedBetAmount === bet ? 'selected' : ''}`}
                    >
                      <Space direction="vertical" size="small" style={{ alignItems: 'center' }}>
                        <Text strong className={`bet-amount-text ${selectedBetAmount === bet ? 'selected' : 'unselected'}`}>
                          {bet} <WalletOutlined />
                        </Text>
                        <Text type="secondary" className={`bet-amount-subtext ${selectedBetAmount === bet ? 'selected' : 'unselected'}`}>
                          获胜:{' '}
                          <Text strong className="win-amount">
                            {bet * gameData.gameConfig.winMultiplier}
                          </Text>
                        </Text>
                      </Space>
                    </Button>
                  ))}
                </Space>
              </div>

              {/* Bet Buttons */}
              <Space size="middle" wrap style={{ justifyContent: 'center', width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowDownOutlined />}
                  disabled={!selectedBetAmount || gameInProgress}
                  loading={gameInProgress}
                  onClick={() => playGame('small')}
                  className="bet-action-button bet-action-button-small"
                >
                  <Space direction="vertical" size="small">
                    <Text strong className="bet-action-text">
                      小
                    </Text>
                    <Text className="bet-action-subtext">
                      (1-3)
                    </Text>
                  </Space>
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowUpOutlined />}
                  disabled={!selectedBetAmount || gameInProgress}
                  loading={gameInProgress}
                  onClick={() => playGame('big')}
                  className="bet-action-button bet-action-button-big"
                >
                  <Space direction="vertical" size="small">
                    <Text strong className="bet-action-text">
                      大
                    </Text>
                    <Text className="bet-action-subtext">
                      (4-6)
                    </Text>
                  </Space>
                </Button>
              </Space>
            </>
          ) : (
            <Alert
              message={
                availableBets.length === 0 && dailyLimit.remainingPlays === 0
                  ? '余额不足且游戏次数已用完'
                  : availableBets.length === 0
                    ? '余额不足'
                    : '今日游戏次数已用完'
              }
              description={
                <>
                  {availableBets.length === 0 && dailyLimit.remainingPlays === 0 ? (
                    <>
                      至少需要 {gameData.gameConfig.availableBets[0]} <WalletOutlined /> 才能游戏，
                      且今日游戏次数已用完（{dailyLimit.remainingPlays}/{dailyLimit.maxPlays}）
                    </>
                  ) : availableBets.length === 0 ? (
                    <>
                      至少需要 {gameData.gameConfig.availableBets[0]} <WalletOutlined /> 才能游戏
                    </>
                  ) : (
                    <>
                      今日游戏次数已用完（{dailyLimit.remainingPlays}/{dailyLimit.maxPlays}），
                      请明天再来
                    </>
                  )}
                </>
              }
              type="warning"
              showIcon
              action={
                availableBets.length === 0 ? (
                  <Button
                    size="small"
                    href={(window as any).scoreHallUrl || '/score/hall'}
                  >
                    赚取更多积分
                  </Button>
                ) : null
              }
            />
          )}

            {/* Game Result */}
            {gameResult && (
              <Card
                className={`game-result-card ${gameResult.won ? 'won' : 'lost'}`}
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
              >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  {gameResult.won ? (
                    <CheckCircleOutlined className="game-result-icon won" />
                  ) : (
                    <CloseCircleOutlined className="game-result-icon lost" />
                  )}
                  <Title level={3} className="game-result-title">
                    {gameResult.won ? '恭喜！' : '下次好运'}
                  </Title>
                </div>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div className="result-dice-card">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" className="result-dice-label">骰子点数</Text>
                        <Space size="middle">
                          <DiceDisplay value={gameResult.diceValue} size={40} />
                          <Text strong className="result-dice-value">
                            {gameResult.diceValue} ({gameResult.actualResult === 'big' ? '大' : '小'})
                          </Text>
                        </Space>
                      </Space>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div className={`result-guess-card ${gameResult.won ? 'won' : 'lost'}`}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" className="result-guess-label">你的猜测</Text>
                        <Text strong className={`result-guess-value ${gameResult.won ? 'won' : 'lost'}`}>
                          {gameResult.guess === 'big' ? '大' : '小'}
                          {gameResult.won ? (
                            <CheckCircleOutlined style={{ marginLeft: '8px', color: '#10b981' }} />
                          ) : (
                            <CloseCircleOutlined style={{ marginLeft: '8px', color: '#ef4444' }} />
                          )}
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
                <span>游戏历史</span>
                <Badge count={totalGames || userStats.totalGames} showZero />
              </Space>
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
                            <DiceDisplay value={game.diceValue} />
                          </div>
                      }
                      title={
                        <Space>
                          <Text strong style={{ fontSize: '14px' }}>
                            {game.guess === 'big' ? '大' : '小'}
                          </Text>
                          <Tag color={game.won ? 'green' : 'red'} style={{ fontSize: '12px', margin: 0 }}>
                            {game.won ? '✓' : '✗'}
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
                <Text type="secondary">暂无游戏记录</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['dice_game'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('dice-game-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<DiceGameApp />);
    } catch (error) {
      // Failed to render React app
    }
  }
}));
