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

  const userInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

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

        console.log('UserSelectAutoComplete initialized:', userSelectComponentRef.current);
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

  // 提交表单
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 获取最终用户名
    let finalUsername = username.trim();
    if (userSelectComponentRef.current && userSelectComponentRef.current.value) {
      const selectedUser = userSelectComponentRef.current.value();
      if (selectedUser && typeof selectedUser === 'object' && selectedUser.uname) {
        finalUsername = selectedUser.uname;
      } else if (typeof selectedUser === 'string') {
        finalUsername = selectedUser;
      }
    }

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
        // 重置表单（保留用户名）
        setScoreChange('');
        setReason('');
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
      <div className="manual-adjustment-section featured-section">
        <div className="section-header">
          <h2>⚖️ 手动积分调整</h2>
        </div>

        <div className="adjustment-panel">
          <div className="panel-header">
            <div className="panel-title">
              <div className="panel-icon">⚙️</div>
              <div className="title-content">
                <h3>调整用户积分</h3>
                <div className="domain-info">
                  <span className="domain-icon">🌐</span>
                  <span className="domain-text">
                    当前域: {(() => {
                      const ctx = (window as any).UiContext;
                      const scoreSystemDomain = (window as any).ScoreSystemDomain;
                      const currentDomain = ctx?.currentDomain?.displayName;
                      const domain = ctx?.domain?.displayName;
                      const domainId = ctx?.domain?._id || ctx?.domain?.id;

                      return scoreSystemDomain?.displayName
                        || scoreSystemDomain?.name
                        || scoreSystemDomain?.id
                        || currentDomain
                        || domain
                        || domainId
                        || 'Unknown';
                    })()}
                  </span>
                </div>
              </div>
            </div>
            <div className="panel-badge">仅限管理员</div>
          </div>

          <div className="panel-content">
            {/* 快捷操作按钮 */}
            <div className="quick-actions-section">
              <div className="quick-actions-header">
                <h4>快捷操作</h4>
              </div>

              <div className="quick-actions-compact">
                <div className="actions-row">
                  <button
                    type="button"
                    className="quick-action-btn positive compact"
                    onClick={() => handleQuickAction(10, '回答问题')}
                  >
                    <span className="action-icon">🙋</span>
                    <span className="action-score">+10</span>
                  </button>
                  <button
                    type="button"
                    className="quick-action-btn positive compact"
                    onClick={() => handleQuickAction(20, '作业')}
                  >
                    <span className="action-icon">📝</span>
                    <span className="action-score">+20</span>
                  </button>
                  <button
                    type="button"
                    className="quick-action-btn positive compact"
                    onClick={() => handleQuickAction(50, '测验优秀')}
                  >
                    <span className="action-icon">🏆</span>
                    <span className="action-score">+50</span>
                  </button>
                </div>

                <div className="actions-row">
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

            {/* 调整表单 */}
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
                    value={username}
                    onChange={handleUsernameChange}
                    className="form-input"
                    placeholder="搜索并选择用户..."
                    required
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
addPage(new NamedPage(['score_manage'], () => {
  console.log('Score Manage React page loaded');

  // 初始化React应用
  const mountPoint = document.getElementById('score-manage-react-app');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<ScoreManageApp />);
    console.log('Score Manage React app mounted successfully');

    // 通知应用已挂载成功
    document.dispatchEvent(new CustomEvent('scoreManageAppMounted'));
  } else {
    console.error('Mount point not found: score-manage-react-app');
  }
}));
