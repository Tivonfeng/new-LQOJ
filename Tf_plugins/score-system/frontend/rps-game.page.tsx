/* eslint-disable react-refresh/only-export-components */
import './rps-game.page.css';
import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FireOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
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
import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

// 选择显示组件
interface ChoiceDisplayProps {
  choice: 'rock' | 'paper' | 'scissors' | null;
  size?: string | number;
}

const ChoiceDisplay: React.FC<ChoiceDisplayProps> = ({ choice, size = '1em' }) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    // 重置状态当 choice 改变时
    setImageError(false);
  }, [choice]);

  const iconSize = typeof size === 'string' ? size : `${size}px`;

  // 选择对应的图片文件名
  const choiceImages = {
    rock: '/rps_s.png', // 石头
    paper: '/rps_b.png', // 布
    scissors: '/rps_j.png', // 剪刀
  };

  // 回退的Ant Design图标
  const choiceIcons = {
    rock: <AppstoreOutlined style={{ fontSize: iconSize }} />,
    paper: <AppstoreOutlined style={{ fontSize: iconSize }} />,
    scissors: <AppstoreOutlined style={{ fontSize: iconSize }} />,
  };

  if (!choice) {
    return <QuestionCircleOutlined style={{ fontSize: iconSize }} />;
  }

  const imagePath = choiceImages[choice];

  // 如果图片加载失败，显示Ant Design图标
  if (imageError) {
    return choiceIcons[choice];
  }

  return (
    <img
      src={imagePath}
      alt={choice === 'rock' ? '石头' : choice === 'paper' ? '布' : '剪刀'}
      className="rps-choice-img"
      style={{
        width: iconSize,
        height: iconSize,
        objectFit: 'contain',
        display: 'inline-block',
      }}
      onError={() => {
        setImageError(true);
      }}
    />
  );
};

// RPS游戏数据接口
interface RPSGameData {
  currentCoins: number;
  canPlay: boolean;
  gameConfig: {
    baseCost: number;
    winReward: number;
    drawReward: number;
    streakBonus: number;
    winMultiplier: number;
  };
  userStats: {
    totalGames: number;
    wins: number;
    draws: number;
    losses: number;
    netProfit: number;
    currentStreak: number;
    bestStreak: number;
  };
  winRate: string;
  recentGames: Array<{
    playerChoice: 'rock' | 'paper' | 'scissors';
    aiChoice: 'rock' | 'paper' | 'scissors';
    result: 'win' | 'lose' | 'draw';
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
  playerChoice: 'rock' | 'paper' | 'scissors';
  aiChoice: 'rock' | 'paper' | 'scissors';
  result: 'win' | 'lose' | 'draw';
  reward: number;
  netGain: number;
  streak: number;
  streakBonus: number;
}

// 剪刀石头布游戏React组件
const RPSGameApp: React.FC = () => {
  // 从全局变量获取数据
  const gameData: RPSGameData = (window as any).rpsGameData || {
    currentCoins: 0,
    canPlay: false,
    gameConfig: { baseCost: 15, winReward: 30, drawReward: 15, streakBonus: 5, winMultiplier: 2 },
    userStats: { totalGames: 0, wins: 0, draws: 0, losses: 0, netProfit: 0, currentStreak: 0, bestStreak: 0 },
    winRate: '0.0',
    recentGames: [],
    dailyLimit: { remainingPlays: 0, maxPlays: 10 },
  };

  const [selectedChoice, setSelectedChoice] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [playerDisplay, setPlayerDisplay] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [aiDisplay, setAiDisplay] = useState<'rock' | 'paper' | 'scissors' | null>(null);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [battleStatus, setBattleStatus] = useState('选择你的武器！');
  // 使用状态管理所有游戏数据
  const [currentCoins, setCurrentCoins] = useState(gameData.currentCoins);
  const [userStats, setUserStats] = useState(gameData.userStats);
  const [winRate, setWinRate] = useState(gameData.winRate);
  const [recentGames, setRecentGames] = useState(gameData.recentGames);
  const [dailyLimit, setDailyLimit] = useState(gameData.dailyLimit);
  const [canPlay, setCanPlay] = useState(gameData.canPlay);
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalGames, setTotalGames] = useState(0);
  const [allGames, setAllGames] = useState(gameData.recentGames);

  // 动画
  const [playerSpring, playerApi] = useSpring(() => ({
    scale: 1,
    rotateZ: 0,
    config: { tension: 300, friction: 20 },
  }));

  const [aiSpring, aiApi] = useSpring(() => ({
    scale: 1,
    rotateZ: 0,
    config: { tension: 300, friction: 20 },
  }));

  // 刷新游戏状态数据
  const refreshGameData = useCallback(async () => {
    try {
      const statusUrl = (window as any).rpsStatusUrl || '/score/rps/status';
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
      const historyUrl = (window as any).rpsHistoryUrl || '/score/rps/history';
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
            playerChoice: record.playerChoice,
            aiChoice: record.aiChoice,
            result: record.result,
            netGain: record.netGain,
            gameTime: record.gameTime || record.time,
          }));
          setAllGames(formattedRecords);
          setTotalGames(result.total || 0);
          setCurrentPage(page);
        }
      }
    } catch (err) {
      // Failed to fetch game history
    }
  }, [pageSize]);

  // 初始化游戏历史数据
  React.useEffect(() => {
    if (recentGames.length > 0 && userStats.totalGames > 0) {
      setAllGames(recentGames);
      setTotalGames(userStats.totalGames);
    }
  }, [recentGames, userStats.totalGames]);

  // 当总游戏数超过分页大小时，主动获取第一页数据
  React.useEffect(() => {
    if (userStats.totalGames > pageSize) {
      fetchGameHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStats.totalGames]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setSelectedChoice(null);
    setPlayerDisplay(null);
    setAiDisplay(null);
    setGameResult(null);
    setBattleStatus('选择你的武器！');
    playerApi.start({ scale: 1, rotateZ: 0 });
    aiApi.start({ scale: 1, rotateZ: 0 });
  }, [playerApi, aiApi]);

  // 选择武器
  const handleSelectChoice = useCallback((choice: 'rock' | 'paper' | 'scissors') => {
    if (gameInProgress) return;
    setSelectedChoice(choice);
    setGameResult(null);
    setError(null);
  }, [gameInProgress]);

  // 执行游戏
  const playGame = useCallback(async (choice: 'rock' | 'paper' | 'scissors') => {
    if (gameInProgress) return;

    setGameInProgress(true);
    setGameResult(null);
    setError(null);
    setPlayerDisplay(choice);
    setAiDisplay(null);
    setBattleStatus('AI思考中...');

    // 玩家选择动画
    playerApi.start({
      scale: 1.2,
      rotateZ: 360,
      config: { duration: 500 },
      onRest: () => {
        playerApi.start({ scale: 1, rotateZ: 0, config: { tension: 300, friction: 20 } });
      },
    });

    // AI思考动画
    const thinkingInterval = setInterval(() => {
      const choices: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors'];
      const randomChoice = choices[Math.floor(Math.random() * choices.length)];
      setAiDisplay(randomChoice);
    }, 200);

    try {
      const playUrl = (window as any).rpsPlayUrl || '/score/rps/play';

      const response = await fetch(playUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ choice }),
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
        // 等待动画完成
        await new Promise((resolve) => setTimeout(resolve, 2000));
        clearInterval(thinkingInterval);

        const game: GameResult = {
          playerChoice: result.playerChoice,
          aiChoice: result.aiChoice,
          result: result.result,
          reward: result.reward || 0,
          netGain: result.netGain || 0,
          streak: result.streak || 0,
          streakBonus: result.streakBonus || 0,
        };

        setAiDisplay(game.aiChoice);
        setGameResult(game);

        // 结果动画
        if (game.result === 'win') {
          playerApi.start({
            scale: 1.3,
            config: { tension: 400, friction: 15 },
            onRest: () => {
              playerApi.start({ scale: 1, config: { tension: 300, friction: 20 } });
            },
          });
        } else if (game.result === 'lose') {
          aiApi.start({
            scale: 1.3,
            config: { tension: 400, friction: 15 },
            onRest: () => {
              aiApi.start({ scale: 1, config: { tension: 300, friction: 20 } });
            },
          });
        }

        // 更新状态文本
        if (game.result === 'win') {
          setBattleStatus('你赢了！');
        } else if (game.result === 'lose') {
          setBattleStatus('你输了！');
        } else {
          setBattleStatus('平局！');
        }

        // 更新当前积分
        setCurrentCoins((prev) => prev + game.netGain);

        // 显示成功消息
        message.success(result.message || '游戏完成！');

        // 游戏完成后刷新游戏数据
        setTimeout(() => {
          refreshGameData();
          setGameInProgress(false);
        }, 2000);

        // 5秒后自动关闭游戏结果显示
        setTimeout(() => {
          setGameResult(null);
          resetGame();
        }, 5000);
      } else {
        setError(result.message || '游戏失败');
        setGameInProgress(false);
        clearInterval(thinkingInterval);
        message.error(result.message || '游戏失败');
      }
    } catch (err: any) {
      const errorMessage = err.message || '网络错误，请重试';
      setError(errorMessage);
      setGameInProgress(false);
      clearInterval(thinkingInterval);
      message.error(errorMessage);
    }
  }, [gameInProgress, playerApi, aiApi, refreshGameData, resetGame]);

  return (
    <div className="rps-game-container">
      {/* Hero Section */}
      <Card className="hero-card" bodyStyle={{ padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={1} className="hero-title">
                <AppstoreOutlined style={{ marginRight: '8px' }} /> 剪刀石头布
              </Title>
              <Text className="hero-subtitle">
                挑战AI，赢得积分
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
              value={userStats.wins}
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
        {(userStats.currentStreak > 0 || userStats.bestStreak > 0) && (
          <>
            <Col xs={12} sm={8} md={6}>
              <Card className="stat-card-hover stat-card-win-streak">
                <Statistic
                  title="当前连胜"
                  value={userStats.currentStreak}
                  prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
                  valueStyle={{ color: '#f59e0b', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className="stat-card-hover stat-card-win-streak">
                <Statistic
                  title="最佳连胜"
                  value={userStats.bestStreak}
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
                <span style={{ fontSize: '20px', fontWeight: 600 }}>对战竞技场</span>
                <Tag color="purple" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  挑战AI
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
                        <Text type="secondary" className="info-label">游戏费用</Text>
                      </Space>
                      <Text strong className="info-value info-value-bet">
                        {gameData.gameConfig.baseCost} <WalletOutlined />
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-win">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <TrophyOutlined className="info-icon-win" />
                        <Text type="secondary" className="info-label">胜利奖励</Text>
                      </Space>
                      <Text strong className="info-value info-value-win">
                        +{gameData.gameConfig.winReward} <WalletOutlined />
                      </Text>
                    </Space>
                  </div>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <div className="info-card info-card-size">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <AppstoreOutlined className="info-icon-size" />
                        <Text type="secondary" className="info-label">平局退款</Text>
                      </Space>
                      <Text strong className="info-value info-value-size">
                        {gameData.gameConfig.drawReward} <WalletOutlined />
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

            {/* Battle Arena */}
            <Card
              className="rps-battle-arena"
              bodyStyle={{ padding: '32px 24px' }}
            >
              {/* Battle Display */}
              <div className="battle-display">
                <div className="player-side">
                  <div className="player-avatar">
                    <div className="avatar-circle">
                      <UserOutlined style={{ fontSize: '32px' }} />
                    </div>
                    <div className="player-label">你</div>
                  </div>
                  {/* @ts-ignore - react-spring animated component type issue */}
                  <animated.div
                    className="choice-display"
                    style={{
                      transform: playerSpring.scale.to((s) => `scale(${s}) rotateZ(${playerSpring.rotateZ.get()}deg)`),
                    }}
                  >
                    {playerDisplay ? (
                      <div className="choice-icon-large">
                        <ChoiceDisplay choice={playerDisplay} size={120} />
                      </div>
                    ) : (
                      <div className="choice-placeholder">
                        <QuestionCircleOutlined style={{ fontSize: '80px', opacity: 0.5 }} />
                      </div>
                    )}
                  </animated.div>
                </div>

                <div className="vs-section">
                  <div className="vs-text">VS</div>
                  <div className="battle-status">{battleStatus}</div>
                </div>

                <div className="ai-side">
                  <div className="ai-avatar">
                    <div className="avatar-circle">
                      <RobotOutlined style={{ fontSize: '32px' }} />
                    </div>
                    <div className="ai-label">AI对手</div>
                  </div>
                  {/* @ts-ignore - react-spring animated component type issue */}
                  <animated.div
                    className="choice-display"
                    style={{
                      transform: aiSpring.scale.to((s) => `scale(${s}) rotateZ(${aiSpring.rotateZ.get()}deg)`),
                    }}
                  >
                    {aiDisplay ? (
                      <div className="choice-icon-large">
                        <ChoiceDisplay choice={aiDisplay} size={120} />
                      </div>
                    ) : (
                      <div className="choice-placeholder">
                        <QuestionCircleOutlined style={{ fontSize: '80px', opacity: 0.5 }} />
                      </div>
                    )}
                  </animated.div>
                </div>
              </div>

              {canPlay ? (
                <>
                  {/* Choice Buttons */}
                  <div className="choice-buttons">
                    <Button
                      type={selectedChoice === 'rock' ? 'primary' : 'default'}
                      size="large"
                      disabled={gameInProgress}
                      onClick={() => {
                        handleSelectChoice('rock');
                        playGame('rock');
                      }}
                      className={`choice-btn ${selectedChoice === 'rock' ? 'selected' : ''}`}
                    >
                      <Space direction="vertical" size="small">
                        <div className="choice-icon-btn">
                          <ChoiceDisplay choice="rock" size={64} />
                        </div>
                        <Text strong>石头</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>克制剪刀</Text>
                      </Space>
                    </Button>
                    <Button
                      type={selectedChoice === 'paper' ? 'primary' : 'default'}
                      size="large"
                      disabled={gameInProgress}
                      onClick={() => {
                        handleSelectChoice('paper');
                        playGame('paper');
                      }}
                      className={`choice-btn ${selectedChoice === 'paper' ? 'selected' : ''}`}
                    >
                      <Space direction="vertical" size="small">
                        <div className="choice-icon-btn">
                          <ChoiceDisplay choice="paper" size={64} />
                        </div>
                        <Text strong>布</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>克制石头</Text>
                      </Space>
                    </Button>
                    <Button
                      type={selectedChoice === 'scissors' ? 'primary' : 'default'}
                      size="large"
                      disabled={gameInProgress}
                      onClick={() => {
                        handleSelectChoice('scissors');
                        playGame('scissors');
                      }}
                      className={`choice-btn ${selectedChoice === 'scissors' ? 'selected' : ''}`}
                    >
                      <Space direction="vertical" size="small">
                        <div className="choice-icon-btn">
                          <ChoiceDisplay choice="scissors" size={64} />
                        </div>
                        <Text strong>剪刀</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>克制布</Text>
                      </Space>
                    </Button>
                  </div>

                  {/* Game Result */}
                  {gameResult && (
                    <Card
                      className={`game-result-card ${gameResult.result === 'win' ? 'won' : gameResult.result === 'lose' ? 'lost' : 'draw'}`}
                      extra={
                        <Button
                          type="text"
                          size="small"
                          onClick={() => {
                            setGameResult(null);
                            resetGame();
                          }}
                          style={{ color: '#666' }}
                        >
                          关闭
                        </Button>
                      }
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div style={{ textAlign: 'center' }}>
                          {gameResult.result === 'win' ? (
                            <CheckCircleOutlined className="game-result-icon won" />
                          ) : gameResult.result === 'lose' ? (
                            <CloseCircleOutlined className="game-result-icon lost" />
                          ) : (
                            <AppstoreOutlined className="game-result-icon draw" />
                          )}
                          <Title level={3} className="game-result-title">
                            {gameResult.result === 'win' ? '恭喜！你赢了！' : gameResult.result === 'lose' ? '下次好运' : '平局！'}
                          </Title>
                        </div>
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <div className="result-gain-card positive">
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Text type="secondary" className="result-gain-label">本局收益</Text>
                                <Text strong className={`result-gain-value ${gameResult.netGain >= 0 ? 'positive' : 'negative'}`}>
                                  {gameResult.netGain > 0 ? '+' : ''}
                                  {gameResult.netGain} <WalletOutlined />
                                </Text>
                                {gameResult.streakBonus > 0 && (
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    连胜奖励: +{gameResult.streakBonus} <WalletOutlined /> (当前连胜: {gameResult.streak})
                                  </Text>
                                )}
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
                </>
              ) : (
                <Alert
                  message={
                    currentCoins < gameData.gameConfig.baseCost && dailyLimit.remainingPlays === 0
                      ? '余额不足且游戏次数已用完'
                      : currentCoins < gameData.gameConfig.baseCost
                        ? '余额不足'
                        : '今日游戏次数已用完'
                  }
                  description={
                    <>
                      {currentCoins < gameData.gameConfig.baseCost && dailyLimit.remainingPlays === 0 ? (
                        <>
                          至少需要 {gameData.gameConfig.baseCost} <WalletOutlined /> 才能游戏，
                          且今日游戏次数已用完（{dailyLimit.remainingPlays}/{dailyLimit.maxPlays}）
                        </>
                      ) : currentCoins < gameData.gameConfig.baseCost ? (
                        <>
                          至少需要 {gameData.gameConfig.baseCost} <WalletOutlined /> 才能游戏
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
                    currentCoins < gameData.gameConfig.baseCost ? (
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
                            <ChoiceDisplay choice={game.playerChoice} size={32} />
                            <span style={{ margin: '0 4px' }}>VS</span>
                            <ChoiceDisplay choice={game.aiChoice} size={32} />
                          </div>
                        }
                        title={
                          <Space>
                            <Text strong style={{ fontSize: '14px' }}>
                              {game.result === 'win' ? '胜利' : game.result === 'lose' ? '失败' : '平局'}
                            </Text>
                            <Tag
                              color={game.result === 'win' ? 'green' : game.result === 'lose' ? 'red' : 'orange'}
                              style={{ fontSize: '12px', margin: 0 }}
                            >
                              {game.result === 'win' ? '✓' : game.result === 'lose' ? '✗' : '='}
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
addPage(new NamedPage(['rock_paper_scissors'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('rps-game-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<RPSGameApp />);
    } catch (error) {
      // Failed to render React app
    }
  }
}));
