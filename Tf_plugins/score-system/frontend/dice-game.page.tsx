/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FireOutlined,
  StarOutlined,
  TrophyOutlined,
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
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

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
  const [diceDisplay, setDiceDisplay] = useState('🎲');
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

  const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
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
        console.warn('Failed to refresh game data:', response.status);
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
      console.error('Failed to refresh game data:', err);
    }
  }, []);

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
      setDiceDisplay(diceEmojis[randomDice]);
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
  }, [diceEmojis, diceApi, bounceApi]);

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
        setDiceDisplay(diceEmojis[game.diceValue]);
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
      console.error('Game error:', err);
      const errorMessage = err.message || '网络错误，请重试';
      setError(errorMessage);
      setGameInProgress(false);
      message.error(errorMessage);
    }
  }, [gameInProgress, selectedBetAmount, showRollingAnimation, diceEmojis, refreshGameData]);

  return (
    <div className="dice-game-container" style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Section */}
      <Card
        className="hero-card"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
          border: 'none',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '32px 24px', position: 'relative', zIndex: 1 }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title
                level={1}
                style={{
                  color: 'white',
                  margin: 0,
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                }}
              >
                🎲 掷骰子游戏
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: 500 }}>
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
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontWeight: 600,
                height: '40px',
                padding: '0 20px',
              }}
            >
              返回积分大厅
            </Button>
          </Col>
        </Row>
      </Card>

      {/* User Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: '20px' }}>
        <Col xs={12} sm={12} md={6}>
          <Card
            className="stat-card-hover"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <Statistic
              title="当前积分"
              value={currentCoins}
              prefix="🏴"
              valueStyle={{ color: '#6366f1', fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            className="stat-card-hover"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Statistic
              title="总游戏数"
              value={userStats.totalGames}
              prefix="🎲"
              valueStyle={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            className="stat-card-hover"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Statistic
              title="胜利次数"
              value={userStats.totalWins}
              prefix={<TrophyOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#10b981', fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="stat-card-hover"
            style={{
              background: userStats.netProfit >= 0
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)',
              border: `1px solid ${userStats.netProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}
          >
            <Statistic
              title="净收益"
              value={userStats.netProfit}
              prefix={<DollarOutlined />}
              valueStyle={{
                color: userStats.netProfit >= 0 ? '#10b981' : '#ef4444',
                fontSize: 'clamp(20px, 3vw, 24px)',
                fontWeight: 700,
              }}
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
                <span style={{ fontSize: '24px' }}>🎲</span>
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
            <Card
              size="small"
              style={{
                marginBottom: '20px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={12} md={12}>
                  <Space>
                    <span style={{ fontSize: '18px' }}>💰</span>
                    <Text strong style={{ fontSize: '14px' }}>投注: {gameData.gameConfig.availableBets.join('/')} 🏴</Text>
                  </Space>
            </Col>
                <Col xs={24} sm={12} md={12}>
                  <Space>
                    <span style={{ fontSize: '18px' }}>🎯</span>
                    <Text strong style={{ fontSize: '14px' }}>获胜: {gameData.gameConfig.winMultiplier}x 投注</Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={12}>
                  <Space>
                    <span style={{ fontSize: '18px' }}>🔢</span>
                    <Text strong style={{ fontSize: '14px' }}>大小: 1-3小, 4-6大</Text>
                  </Space>
                </Col>
                <Col xs={24} sm={12} md={12}>
              <Badge
                count={`${dailyLimit.remainingPlays}/${dailyLimit.maxPlays}`}
                showZero
                style={{
                  backgroundColor: '#22c55e',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Space>
                  <span style={{ fontSize: '20px' }}>📅</span>
                  <Text strong>每日游戏</Text>
                </Space>
              </Badge>
            </Col>
          </Row>
        </Card>

            {/* Dice Game Area */}
            <Card
              style={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: '32px 24px' }}
            >
              <div
                className="dice-display-animation"
                style={{
                  fontSize: 'clamp(80px, 15vw, 120px)',
                  lineHeight: 1,
                  marginBottom: '16px',
                  display: 'inline-block',
                }}
              >
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
              {diceDisplay}
            </animated.div>
          </div>
              <Text
                type="secondary"
                style={{
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  display: 'block',
                  marginBottom: '20px',
                  fontWeight: 500,
                }}
              >
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
                      className="bet-amount-button"
                      style={{
                        minWidth: 'clamp(100px, 20vw, 140px)',
                        height: 'clamp(60px, 12vw, 80px)',
                        borderRadius: '12px',
                        border: selectedBetAmount === bet ? '2px solid #6366f1' : '2px solid transparent',
                        boxShadow:
                          selectedBetAmount === bet
                            ? '0 4px 12px rgba(99, 102, 241, 0.4)'
                            : '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Space direction="vertical" size="small">
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 22px)', lineHeight: 1 }}>
                          {bet} 🏴
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px', lineHeight: 1 }}>
                          获胜: {bet * gameData.gameConfig.winMultiplier}
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
                  icon={<span style={{ fontSize: '18px' }}>🔽</span>}
                  disabled={!selectedBetAmount || gameInProgress}
                  loading={gameInProgress}
                  onClick={() => playGame('small')}
                  className="bet-action-button"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    border: 'none',
                    minWidth: 'clamp(120px, 25vw, 160px)',
                    height: 'clamp(60px, 12vw, 70px)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Space direction="vertical" size="small">
                    <Text strong style={{ color: 'white', fontSize: 'clamp(16px, 3vw, 20px)' }}>
                      小
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
                      (1-3)
                    </Text>
                  </Space>
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<span style={{ fontSize: '18px' }}>🔼</span>}
                  disabled={!selectedBetAmount || gameInProgress}
                  loading={gameInProgress}
                  onClick={() => playGame('big')}
                  className="bet-action-button"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    minWidth: 'clamp(120px, 25vw, 160px)',
                    height: 'clamp(60px, 12vw, 70px)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Space direction="vertical" size="small">
                    <Text strong style={{ color: 'white', fontSize: 'clamp(16px, 3vw, 20px)' }}>
                      大
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
                      (4-6)
                    </Text>
                  </Space>
                </Button>
              </Space>
            </>
          ) : (
            <Alert
              message="余额不足"
              description="至少需要 20 🏴 才能游戏"
              type="warning"
              showIcon
              action={
                <Button
                  size="small"
                  href={(window as any).scoreHallUrl || '/score/hall'}
                >
                  赚取更多积分
                </Button>
              }
            />
          )}

            {/* Game Result */}
            {gameResult && (
              <Card
                className="game-result-card"
                style={{
                  marginTop: '24px',
                border: `2px solid ${gameResult.won ? '#10b981' : '#ef4444'}`,
                background: gameResult.won
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(255, 255, 255, 0.95) 100%)',
                boxShadow: gameResult.won
                  ? '0 8px 24px rgba(16, 185, 129, 0.2)'
                  : '0 8px 24px rgba(239, 68, 68, 0.2)',
                borderRadius: '16px',
                position: 'relative',
              }}
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
                    <CheckCircleOutlined style={{ fontSize: '48px', color: '#10b981' }} />
                  ) : (
                    <CloseCircleOutlined style={{ fontSize: '48px', color: '#ef4444' }} />
                  )}
                  <Title level={3} style={{ marginTop: '8px' }}>
                    {gameResult.won ? '恭喜！' : '下次好运'}
                  </Title>
                </div>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">骰子点数:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong>
                      {gameResult.diceValue} ({gameResult.actualResult === 'big' ? '大' : '小'})
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">你的猜测:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong>{gameResult.guess === 'big' ? '大' : '小'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">收益:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right' }}>
                    <Text
                      strong
                      style={{
                        fontSize: '18px',
                        color: gameResult.netGain >= 0 ? '#10b981' : '#ef4444',
                      }}
                    >
                      {gameResult.netGain > 0 ? '+' : ''}
                      {gameResult.netGain} 🏴
                    </Text>
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

        {/* Stats Sidebar */}
        <Col xs={24} lg={8}>
          <Card
            title="你的统计"
            extra={
              <Button
                type="link"
                size="small"
                href={(window as any).diceHistoryUrl || '/score/dice/history'}
                style={{ padding: 0 }}
              >
                查看历史 →
              </Button>
            }
            style={{
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small" bodyStyle={{ padding: '12px' }}>
                  <Statistic
                    title="胜率"
                    value={winRate}
                    suffix="%"
                    prefix="📊"
                    valueStyle={{ fontSize: '18px', fontWeight: 600 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" bodyStyle={{ padding: '12px' }}>
                  <Statistic
                    title="平均收益"
                    value={
                      userStats.totalGames > 0
                        ? (userStats.netProfit / userStats.totalGames).toFixed(1)
                        : 0
                    }
                    prefix={<DollarOutlined />}
                    valueStyle={{
                      color: userStats.netProfit >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '18px',
                      fontWeight: 600,
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {(userStats.winStreak > 0 || userStats.maxWinStreak > 0) && (
              <Row gutter={12} style={{ marginTop: '12px' }}>
                <Col span={12}>
                  <Card size="small" style={{ background: '#fef3c7' }} bodyStyle={{ padding: '12px' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <FireOutlined style={{ fontSize: '20px', color: '#f59e0b' }} />
                      <Statistic
                        title="当前连胜"
                        value={userStats.winStreak}
                        valueStyle={{ color: '#f59e0b', fontSize: '16px' }}
                      />
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ background: '#fef3c7' }} bodyStyle={{ padding: '12px' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <StarOutlined style={{ fontSize: '20px', color: '#f59e0b' }} />
                      <Statistic
                        title="最佳连胜"
                        value={userStats.maxWinStreak}
                        valueStyle={{ color: '#f59e0b', fontSize: '16px' }}
                      />
                    </Space>
                  </Card>
                </Col>
              </Row>
            )}
          </Card>

          {/* Recent Games */}
          {recentGames.length > 0 && (
            <Card
              title="最近游戏"
              extra={
                <Space>
                  <Badge count={recentGames.length} showZero />
                  <Button
                    type="link"
                    size="small"
                    href={(window as any).diceHistoryUrl || '/score/dice/history'}
                    style={{ padding: 0 }}
                  >
                    查看全部历史 →
                  </Button>
                </Space>
              }
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <List
                dataSource={recentGames.slice(0, 5)}
                renderItem={(game) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <span style={{ fontSize: '24px' }}>
                          {diceEmojis[game.diceValue] || '🎲'}
                        </span>
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
                          {game.netGain} 🏴
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
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
      console.error('Failed to render React app:', error);
    }
  }
}));
