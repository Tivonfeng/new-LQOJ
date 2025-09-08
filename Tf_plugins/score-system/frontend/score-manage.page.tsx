/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 积分管理React组件
const ScoreManageApp: React.FC = () => {
  const [username, setUsername] = useState('');
  const [scoreChange, setScoreChange] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);
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
        userSelectComponentRef.current = UserSelectAutoComplete.getOrConstruct($input, {
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

  // 快捷操作
  const handleQuickAction = useCallback((score: number, reasonText: string) => {
    // 清除之前的结果消息
    setResult(null);
    setScoreChange(score.toString());
    setReason(reasonText);

    // 如果用户名为空，聚焦到用户输入框
    if (!username.trim() && userInputRef.current) {
      userInputRef.current.focus();
    }
  }, [username]);

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

  // 重置表单
  const handleReset = useCallback(() => {
    setUsername('');
    setScoreChange('');
    setReason('');
    setResult(null);

    // 清理UserSelectAutoComplete
    if (userSelectComponentRef.current) {
      userSelectComponentRef.current.clear();
    }
  }, []);

  return (
    <div className="score-manage-react-app">
      {/* 快捷操作区域 - 左右布局 */}
      <div className="quick-actions-section">
        <div className="quick-actions-header">
          <h4>快捷操作</h4>
          <p className="quick-actions-subtitle">先选择用户，再选择积分调整</p>
        </div>

        <div className="quick-actions-layout">
          {/* 左侧：用户选择 */}
          <div className="quick-users-panel">
            <div className="panel-header">
              <div className="panel-header-content">
                <span className="panel-icon">👥</span>
                <div>
                  <div className="panel-title">最近操作的用户</div>
                  <div className="panel-subtitle">从最近操作中快速选择</div>
                </div>
              </div>
              <div className="panel-badge">Step 1</div>
            </div>

            <div className="panel-content">
              {recentUsers.length > 0 && (
                <div className="recent-users-quick">
                  <div className="users-grid">
                    {recentUsers.map((user, index) => (
                      <button
                        key={`${user}-${index}`}
                        type="button"
                        className={`user-quick-btn ${username === user ? 'active' : ''}`}
                        onClick={() => handleSelectRecentUser(user)}
                        aria-label={`选择用户: ${user}`}
                      >
                        <span className="user-icon">👤</span>
                        <span className="user-name">{user}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="manual-input-hint">
                <span className="hint-icon">💡</span>
                <span className="hint-text">也可在下方表单中手动输入用户名</span>
              </div>
            </div>
          </div>

          {/* 右侧：积分选择 */}
          <div className="quick-scores-panel">
            <div className="panel-header">
              <div className="panel-header-content">
                <span className="panel-icon">⚡</span>
                <div>
                  <div className="panel-title">积分调整</div>
                  <div className="panel-subtitle">选择奖励或扣分操作</div>
                </div>
              </div>
              <div className="panel-badge">Step 2</div>
            </div>

            <div className="panel-content">
              <div className="scores-grid">
                <div className="scores-group positive">
                  <div className="group-label">奖励</div>
                  <div className="scores-row">
                    <button
                      type="button"
                      className="quick-action-btn positive compact"
                      onClick={() => handleQuickAction(10, '小小奖励')}
                    >
                      <span className="action-icon">🙋</span>
                      <span className="action-score">+10</span>
                    </button>
                    <button
                      type="button"
                      className="quick-action-btn positive compact"
                      onClick={() => handleQuickAction(20, '大大奖励')}
                    >
                      <span className="action-icon">📝</span>
                      <span className="action-score">+20</span>
                    </button>
                    <button
                      type="button"
                      className="quick-action-btn positive compact"
                      onClick={() => handleQuickAction(50, '超级奖励')}
                    >
                      <span className="action-icon">🏆</span>
                      <span className="action-score">+50</span>
                    </button>
                  </div>
                </div>

                <div className="scores-group negative">
                  <div className="group-label">扣分</div>
                  <div className="scores-row">
                    <button
                      type="button"
                      className="quick-action-btn negative compact"
                      onClick={() => handleQuickAction(-10, '轻微违纪')}
                    >
                      <span className="action-icon">⏰</span>
                      <span className="action-score">-10</span>
                    </button>
                    <button
                      type="button"
                      className="quick-action-btn negative compact"
                      onClick={() => handleQuickAction(-50, '严重违纪')}
                    >
                      <span className="action-icon">❌</span>
                      <span className="action-score">-50</span>
                    </button>
                    <button
                      type="button"
                      className="quick-action-btn negative compact"
                      onClick={() => handleQuickAction(-100, '重大违纪')}
                    >
                      <span className="action-icon">📅</span>
                      <span className="action-score">-100</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 手动调整表单 */}
        <div className="manual-form-section">
          <div className="section-header">
            <div className="section-header-content">
              <span className="section-icon">✏️</span>
              <div>
                <div className="section-title">手动调整</div>
                <div className="section-subtitle">自定义用户名、积分和原因</div>
              </div>
            </div>
            <div className="section-badge">Alternative</div>
          </div>

          <div className="section-content">
            <form onSubmit={handleSubmit} className="adjustment-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    用户名
                  </label>
                  <input
                    ref={userInputRef}
                    type="text"
                    name="username"
                    value={username}
                    onChange={handleUsernameChange}
                    className="form-input"
                    placeholder="搜索并选择用户..."
                  />
                  <div className="form-hint">输入用户名进行搜索</div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">💰</span>
                    积分变化
                  </label>
                  <input
                    type="number"
                    name="scoreChange"
                    value={scoreChange}
                    onChange={(e) => setScoreChange(e.target.value)}
                    className="form-input"
                    placeholder="±1000"
                    min="-10000"
                    max="10000"
                    required
                  />
                  <div className="form-hint">范围：-10000 到 +10000</div>
                </div>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <span className="label-icon">📝</span>
                  调整原因
                </label>
                <input
                  type="text"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input"
                  placeholder="请说明此次调整的原因..."
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  <span className="btn-icon">{isSubmitting ? '⏳' : '⚡'}</span>
                  <span className="btn-text">{isSubmitting ? '处理中...' : '应用调整'}</span>
                </button>
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  <span className="btn-icon">🔄</span>
                  <span className="btn-text">重置</span>
                </button>
              </div>
            </form>

            {/* 结果显示 */}
            {result && (
              <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                {result.message}
              </div>
            )}
          </div>
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

  // 初始化迁移管理组件
  try {
    const { initMigrationComponent } = await import('./migration-manage.component');
    initMigrationComponent();
  } catch (error) {
    console.error('Failed to load migration component:', error);
  }

  // 通知应用已挂载成功
  document.dispatchEvent(new CustomEvent('scoreManageAppMounted'));
}));
