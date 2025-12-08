/* eslint-disable react-refresh/only-export-components */
import './score-manage.page.css';

import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EditOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  Button,
  Card,
  Dropdown,
  Input,
  Space,
  Typography,
} from 'antd';
import $ from 'jquery';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

interface ScoreRecord {
  uid: string;
  score: number;
  pid: number;
  problemTitle?: string;
  reason?: string;
  createdAt?: string;
}

interface UserMap { [key: string]: { uname?: string, displayName?: string } }

// 积分管理React组件
const ScoreManageApp: React.FC = () => {
  const [username, setUsername] = useState('');
  const [scoreChange, setScoreChange] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);
  const [records] = useState<ScoreRecord[]>(() => {
    const raw = (window as any).ScoreManageRecentRecords?.records;
    return Array.isArray(raw) ? raw : [];
  });
  const [userMap] = useState<UserMap>(() => {
    const raw = (window as any).ScoreManageRecentRecords?.users;
    return raw && typeof raw === 'object' ? raw : {};
  });
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [, forceUpdate] = useState({});

  const userInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

  // 加载最近用户列表
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scoreManage_recentUsers');
      if (stored) {
        const users = JSON.parse(stored);
        if (Array.isArray(users)) {
          setRecentUsers(users.slice(0, 5)); // 只保留最多5个
        }
      }
    } catch (error) {
      console.warn('加载最近用户列表失败:', error);
    }
  }, []);

  // 添加用户到最近列表
  const addToRecentUsers = useCallback((user: string) => {
    if (!user.trim()) return;

    setRecentUsers((prev) => {
      // 移除重复项并添加到开头
      const filtered = prev.filter((u) => u !== user);
      const newList = [user, ...filtered].slice(0, 5); // 保持最多5个用户

      // 保存到localStorage
      try {
        localStorage.setItem('scoreManage_recentUsers', JSON.stringify(newList));
      } catch (error) {
        console.warn('保存最近用户列表失败:', error);
      }

      return newList;
    });
  }, []);

  // 初始化UserSelectAutoComplete组件
  useEffect(() => {
    if (userInputRef.current) {
      try {
        const $input = $(userInputRef.current);
        userSelectComponentRef.current = (UserSelectAutoComplete as any).getOrConstruct($input, {
          multi: false,
          freeSolo: true,
          freeSoloConverter: (input: string) => input,
          onChange: (value: any) => {
            if (value && typeof value === 'object' && value.uname) {
              setUsername(value.uname);
            } else if (typeof value === 'string') {
              setUsername(value);
            } else if (value === null || value === undefined) {
              setUsername('');
            }
          },
        });
      } catch (error) {
        console.error('Failed to initialize UserSelectAutoComplete:', error);
      }
    }

    // 清理函数
    return () => {
      if (userSelectComponentRef.current) {
        userSelectComponentRef.current.detach();
      }
    };
  }, []);

  // 快捷积分选项
  const scoreOptions = {
    positive: [
      { score: 10, label: '+10', icon: <DollarOutlined /> },
      { score: 20, label: '+20', icon: <DollarOutlined /> },
      { score: 30, label: '+30', icon: <DollarOutlined /> },
      { score: 50, label: '+50', icon: <DollarOutlined /> },
      { score: 100, label: '+100', icon: <DollarOutlined /> },
    ],
    negative: [
      { score: -10, label: '-10', icon: <CloseCircleOutlined /> },
      { score: -20, label: '-20', icon: <CloseCircleOutlined /> },
      { score: -30, label: '-30', icon: <CloseCircleOutlined /> },
      { score: -50, label: '-50', icon: <CloseCircleOutlined /> },
      { score: -100, label: '-100', icon: <CloseCircleOutlined /> },
    ],
  };

  // 快捷原因选项
  const reasonOptions = {
    positive: [
      '小小奖励',
      '大大奖励',
      '超级奖励',
      '巨大奖励',
      '特殊奖励',
      '活动奖励',
      '完成任务',
    ],
    negative: [
      '轻微违纪',
      '严重违纪',
      '重大违纪',
      '上课玩游戏',
      '系统惩罚',
    ],
  };

  // 快捷操作 - 选择积分
  const handleQuickScore = useCallback((score: number) => {
    // 清除之前的结果消息
    setResult(null);
    setScoreChange(score.toString());

    // 如果用户名为空，聚焦到用户输入框
    if (!username.trim() && userInputRef.current) {
      userInputRef.current.focus();
    }
  }, [username]);

  // 快捷操作 - 选择原因
  const handleQuickReason = useCallback((reasonText: string) => {
    setReason(reasonText);
    setResult(null);
  }, []);

  // 积分下拉菜单项
  const scoreMenuItems: MenuProps['items'] = [
    {
      key: 'positive-group',
      label: <Text strong style={{ color: '#10b981' }}>奖励</Text>,
      type: 'group',
    },
    ...scoreOptions.positive.map((option) => ({
      key: `positive-${option.score}`,
      label: (
        <Space>
          {option.icon}
          <span>{option.label}</span>
        </Space>
      ),
      onClick: () => handleQuickScore(option.score),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'negative-group',
      label: <Text strong style={{ color: '#ef4444' }}>扣分</Text>,
      type: 'group',
    },
    ...scoreOptions.negative.map((option) => ({
      key: `negative-${option.score}`,
      label: (
        <Space>
          {option.icon}
          <span>{option.label}</span>
        </Space>
      ),
      onClick: () => handleQuickScore(option.score),
    })),
  ];

  // 原因下拉菜单项
  const reasonMenuItems: MenuProps['items'] = [
    {
      key: 'positive-reason-group',
      label: <Text strong style={{ color: '#10b981' }}>奖励原因</Text>,
      type: 'group',
    },
    ...reasonOptions.positive.map((reasonText) => ({
      key: `positive-reason-${reasonText}`,
      label: reasonText,
      onClick: () => handleQuickReason(reasonText),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'negative-reason-group',
      label: <Text strong style={{ color: '#ef4444' }}>扣分原因</Text>,
      type: 'group',
    },
    ...reasonOptions.negative.map((reasonText) => ({
      key: `negative-reason-${reasonText}`,
      label: reasonText,
      onClick: () => handleQuickReason(reasonText),
    })),
  ];

  // 处理用户名输入变化
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  }, []);

  // 快速选择最近用户
  const handleSelectRecentUser = useCallback((user: string) => {
    // 首先更新React状态，这将触发重新渲染
    setUsername(user);

    // 使用setTimeout确保React状态更新和重新渲染完成
    setTimeout(() => {
      // 同步UserSelectAutoComplete组件状态
      if (userSelectComponentRef.current && userInputRef.current) {
        try {
          // 通过组件的value方法设置值
          const userObj = { uname: user, displayName: user };
          if (typeof userSelectComponentRef.current.value === 'function') {
            userSelectComponentRef.current.value(userObj);
          }
        } catch (error) {
          console.warn('设置用户选择组件失败:', error);
        }
      }

      // 确保所有输入框都显示正确的值
      if (userInputRef.current) {
        const parent = userInputRef.current.parentElement;
        if (parent && userInputRef.current.value === user) {
          // 强制React重新渲染
          forceUpdate({});

          // 更新所有可能的输入框
          const allInputs = parent.querySelectorAll('input');
          allInputs.forEach((input) => {
            if ((input as HTMLInputElement).value !== user) {
              (input as HTMLInputElement).value = user;
            }
          });
        }
      }
    }, 0);
  }, [forceUpdate]);

  // 提交表单
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的结果消息
    setResult(null);

    // 获取最终用户名
    let finalUsername = username.trim();
    if (userSelectComponentRef.current && userSelectComponentRef.current.value) {
      try {
        const selectedUser = userSelectComponentRef.current.value();
        if (selectedUser && typeof selectedUser === 'object' && selectedUser.uname) {
          finalUsername = selectedUser.uname;
        } else if (typeof selectedUser === 'string' && selectedUser.trim()) {
          finalUsername = selectedUser.trim();
        }
      } catch (error) {
        console.warn('获取用户选择失败，使用输入框值:', error);
        // 如果获取选择失败，继续使用username状态值
      }
    }

    // 确保用户名不为空
    finalUsername ||= username.trim();

    if (!finalUsername || !scoreChange.trim() || !reason.trim()) {
      setResult({ success: false, message: '请填写所有必填字段' });
      return;
    }

    const score = Number.parseInt(scoreChange);
    if (Number.isNaN(score) || score < -10000 || score > 10000) {
      setResult({ success: false, message: '积分变化必须在-10000到+10000之间' });
      return;
    }

    if (score === 0) {
      setResult({ success: false, message: '积分变化不能为零' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // 使用服务器提供的正确URL，如果不存在则回退到当前路径
      const config = (window as any).ScoreSystemConfig;
      const url = config?.submitUrl || window.location.pathname;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'adjust_score',
          username: finalUsername,
          scoreChange: score,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? '积分调整成功' : '积分调整失败'),
      });

      if (data.success) {
        // 添加用户到最近操作列表
        addToRecentUsers(finalUsername);

        // 重置表单（保留用户名以便连续操作）
        setScoreChange('');
        setReason('');

        // 确保UserSelectAutoComplete组件与当前用户名状态同步
        if (userSelectComponentRef.current && finalUsername) {
          try {
            // 设置组件的值为当前用户名，确保下次操作时可以正确获取
            userSelectComponentRef.current.value(finalUsername);
          } catch (error) {
            console.warn('同步用户选择组件失败:', error);
          }
        }

        // 清除结果消息，为下次操作做准备
        setTimeout(() => setResult(null), 3000);
      }
    } catch (error) {
      console.error('提交失败:', error);
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setIsSubmitting(false);
    }
  }, [username, scoreChange, reason]);

  // 返回积分大厅
  const handleGoToHall = useCallback(() => {
    const url = (window as any).scoreHallUrl || '/score/hall';
    window.location.href = url;
  }, []);

  // 侧边栏记录渲染
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const pageSafe = Math.min(totalPages, Math.max(1, page));
  const pageRecords = records.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const formatTime = useCallback((value?: string) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${m}/${day} ${hh}:${mm}`;
    }
    return value;
  }, []);

  const renderRecord = useCallback((record: ScoreRecord) => {
    const user = userMap?.[record.uid];
    const displayName = user?.displayName || user?.uname || record.uid;
    const positive = record.score > 0;
    const isAdmin = record.pid === 0 || record.problemTitle === '管理员操作';
    return (
      <div className={`record-item ${positive ? 'positive' : 'negative'}`} key={`${record.uid}-${record.createdAt}-${record.reason}`}>
        <div className="record-main">
          <div className="record-user">
            <span className={`record-dot ${positive ? 'up' : 'down'}`} />
            <span className="record-name">{displayName}</span>
            <span className="record-meta">{isAdmin ? '管理员操作' : (record.problemTitle || record.pid)}</span>
          </div>
          <div className={`record-score ${positive ? 'pos' : 'neg'}`}>
            {positive ? '+' : ''}
            {Math.abs(record.score)} pts
          </div>
        </div>
        <div className="record-footer">
          <span className="record-reason">{record.reason || '无原因'}</span>
          <span className="record-time">{formatTime(record.createdAt)}</span>
        </div>
      </div>
    );
  }, [formatTime, userMap]);

  return (
    <div className="score-manage-container">
      <div className="score-manage-grid-react">
        <div className="main-column">
          {/* Hero Section */}
          <Card className="hero-card" bordered={false}>
            <div className="hero-content">
              <div className="hero-text">
                <Title level={2} className="hero-title">
                  积分管理
                </Title>
                <Text className="hero-subtitle">管理员积分调整工具</Text>
              </div>
              <div className="hero-actions">
                <Space>
                  <Button
                    type="default"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleGoToHall}
                    className="hero-action-btn"
                  >
                    返回积分大厅
                  </Button>
                </Space>
              </div>
            </div>
          </Card>

          {/* 积分调整表单 */}
          <Card
            className="section-card manual-form-card"
            title={
              <Space>
                <EditOutlined />
                <span>积分调整</span>
              </Space>
            }
          >
              <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
                选择用户并调整积分
              </Text>
              <form onSubmit={handleSubmit} className="adjustment-form">
                <div className="form-grid two-rows">
                  <div className="form-group">
                    <label className="form-label">
                      <UserOutlined />
                      <span>用户名</span>
                    </label>
                    <input
                      ref={userInputRef}
                      type="text"
                      name="username"
                      value={username}
                      onChange={handleUsernameChange}
                      className="ant-input ant-input-lg"
                      placeholder="搜索并选择用户..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                      输入用户名进行搜索
                    </Text>
                  </div>

                  <div className="form-group recent-users-column">
                    <label className="form-label">
                      <UserOutlined />
                      <span>最近操作的用户</span>
                    </label>
                    {recentUsers.length > 0 ? (
                      <div className="recent-users-inline">
                        <Space wrap size={[8, 8]}>
                          {recentUsers.map((user, index) => (
                            <Button
                              key={`${user}-${index}`}
                              type={username === user ? 'primary' : 'default'}
                              icon={<UserOutlined />}
                              size="small"
                              className={`user-quick-btn-inline ${username === user ? 'active' : ''}`}
                              onClick={() => handleSelectRecentUser(user)}
                            >
                              {user}
                            </Button>
                          ))}
                        </Space>
                      </div>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        暂无最近记录
                      </Text>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <DollarOutlined />
                      <span>积分变化</span>
                    </label>
                    <Input.Group compact style={{ display: 'flex' }}>
                      <Input
                        type="number"
                        name="scoreChange"
                        value={scoreChange}
                        onChange={(e) => setScoreChange(e.target.value)}
                        placeholder="±1000"
                        min="-10000"
                        max="10000"
                        size="large"
                        required
                        style={{ flex: 1 }}
                      />
                      <Dropdown
                        menu={{ items: scoreMenuItems }}
                        placement="bottomRight"
                        trigger={['click']}
                      >
                        <Button
                          type="default"
                          icon={<ThunderboltOutlined />}
                          size="large"
                          className="score-quick-select-btn"
                        >
                          快捷选择
                        </Button>
                      </Dropdown>
                    </Input.Group>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                      范围：-10000 到 +10000，或使用快捷选择
                    </Text>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <EditOutlined />
                      <span>调整原因</span>
                    </label>
                    <Input.Group compact style={{ display: 'flex' }}>
                      <Input
                        type="text"
                        name="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="请说明此次调整的原因..."
                        size="large"
                        required
                        style={{ flex: 1 }}
                      />
                      <Dropdown
                        menu={{ items: reasonMenuItems }}
                        placement="bottomRight"
                        trigger={['click']}
                      >
                        <Button
                          type="default"
                          icon={<ThunderboltOutlined />}
                          size="large"
                          className="reason-quick-select-btn"
                        >
                          快捷选择
                        </Button>
                      </Dropdown>
                    </Input.Group>
                  </div>
                </div>

                <div className="form-actions">
                  <Button
                    type="primary"
                    icon={isSubmitting ? <ReloadOutlined spin /> : <ThunderboltOutlined />}
                    htmlType="submit"
                    size="large"
                    loading={isSubmitting}
                    className="submit-btn"
                  >
                    {isSubmitting ? '处理中...' : '应用调整'}
                  </Button>
                </div>
              </form>

              {/* 结果显示 */}
              {result && (
                <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                  {result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  <span>{result.message}</span>
                </div>
              )}
            </Card>
        </div>

        <div className="sidebar-column">
          <Card className="records-card" title="最近积分记录">
            <div className="records-list">
              {pageRecords.length === 0 && (
                <div className="empty-panel">
                  <div className="empty-icon">📋</div>
                  <p className="empty-text">暂无记录</p>
                </div>
              )}
              {pageRecords.map(renderRecord)}
            </div>
            <div className="records-pagination">
              <Button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
              >
                上一页
              </Button>
              <div className="pagination-info">
                <span className="current-page">{pageSafe}</span> / <span className="total-pages">{totalPages}</span>
              </div>
              <Button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
              >
                下一页
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['score_manage'], async () => {
  console.log('Score Manage React page loaded');

  // 初始化React应用
  const mountPoint = document.getElementById('score-manage-react-app');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<ScoreManageApp />);
    console.log('Score Manage React app mounted successfully');
  } else {
    console.error('Mount point not found: score-manage-react-app');
  }

  // 通知应用已挂载成功
  document.dispatchEvent(new CustomEvent('scoreManageAppMounted'));
}));
