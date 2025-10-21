/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 打字速度管理React组件
const TypingAdminApp: React.FC = () => {
  const [username, setUsername] = useState('');
  const [wpm, setWpm] = useState('');
  const [note, setNote] = useState('');
  const [csvData, setCsvData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addRecordMessage, setAddRecordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

  const RECENT_USERS_KEY = 'typingAdmin_recentUsers';
  const MAX_RECENT_USERS = 8;

  // 加载最近用户列表
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_USERS_KEY);
      if (stored) {
        const users = JSON.parse(stored);
        if (Array.isArray(users)) {
          setRecentUsers(users.slice(0, MAX_RECENT_USERS));
        }
      }
    } catch (error) {
      console.warn('[Typing Admin] Failed to load recent users:', error);
    }
  }, []);

  // 添加用户到最近列表
  const addToRecentUsers = useCallback((user: string) => {
    if (!user || !user.trim()) return;

    const trimmedUser = user.trim();
    setRecentUsers((prev) => {
      const filtered = prev.filter((u) => u !== trimmedUser);
      const newList = [trimmedUser, ...filtered].slice(0, MAX_RECENT_USERS);

      try {
        localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(newList));
      } catch (error) {
        console.warn('[Typing Admin] Failed to save recent users:', error);
      }

      return newList;
    });
  }, []);

  // 初始化UserSelectAutoComplete组件
  useEffect(() => {
    if (usernameInputRef.current) {
      try {
        const $input = $(usernameInputRef.current);
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
        console.log('[Typing Admin] UserSelectAutoComplete initialized');
      } catch (error) {
        console.error('[Typing Admin] Failed to initialize UserSelectAutoComplete:', error);
      }
    }

    return () => {
      if (userSelectComponentRef.current) {
        userSelectComponentRef.current.detach();
      }
    };
  }, []);

  // 选择最近用户
  const handleSelectRecentUser = useCallback((user: string) => {
    console.log('[Typing Admin] Selecting recent user:', user);
    setUsername(user);

    setTimeout(() => {
      if (userSelectComponentRef.current && usernameInputRef.current) {
        try {
          const userObj = { uname: user, displayName: user };
          if (typeof userSelectComponentRef.current.value === 'function') {
            userSelectComponentRef.current.value(userObj);
          }
        } catch (error) {
          console.warn('[Typing Admin] Failed to set user select value:', error);
        }
      }

      // 聚焦到WPM输入框
      const wpmInput = document.querySelector('input[name="wpm"]') as HTMLInputElement;
      if (wpmInput) {
        wpmInput.focus();
      }
    }, 0);
  }, []);

  // 提交添加记录
  const handleAddRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAddRecordMessage(null);

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
        console.warn('[Typing Admin] Failed to get selected user, using input value:', error);
      }
    }

    finalUsername ||= username.trim();

    if (!finalUsername || !wpm.trim()) {
      setAddRecordMessage({ type: 'error', text: '请填写所有必填字段' });
      return;
    }

    const wpmNum = Number.parseInt(wpm);
    if (Number.isNaN(wpmNum) || wpmNum < 0 || wpmNum > 300) {
      setAddRecordMessage({ type: 'error', text: 'WPM必须在0-300之间' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_record',
          username: finalUsername,
          wpm: wpmNum,
          note: note.trim() || '',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAddRecordMessage({ type: 'success', text: result.message });

        // 添加到最近用户
        addToRecentUsers(finalUsername);

        // 重置表单
        setUsername('');
        setWpm('');
        setNote('');

        if (userSelectComponentRef.current && typeof userSelectComponentRef.current.clear === 'function') {
          userSelectComponentRef.current.clear();
        }

        // 1.5秒后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setAddRecordMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('[Typing Admin] Add record error:', error);
      setAddRecordMessage({ type: 'error', text: '网络错误' });
    } finally {
      setIsSubmitting(false);
    }
  }, [username, wpm, note, addToRecentUsers]);

  // 提交批量导入
  const handleImportCSV = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setImportMessage(null);

    if (!csvData.trim()) {
      setImportMessage({ type: 'error', text: 'CSV数据为空' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import_csv',
          csvData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        let message = result.message;
        if (result.data && result.data.errors && result.data.errors.length > 0) {
          message += `\n\n错误:\n${result.data.errors.slice(0, 5).join('\n')}`;
          if (result.data.errors.length > 5) {
            message += `\n...(和 ${result.data.errors.length - 5} 更多)`;
          }
        }
        setImportMessage({ type: 'success', text: message });
        setCsvData('');

        // 2秒后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setImportMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('[Typing Admin] Import CSV error:', error);
      setImportMessage({ type: 'error', text: '网络错误' });
    } finally {
      setIsSubmitting(false);
    }
  }, [csvData]);

  // 下载模板
  const handleDownloadTemplate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const csvContent = 'username,wpm,note\nstudent1,45,Class test\nstudent2,62,\nstudent3,38,Practice';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typing_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="typing-admin-react-app">
      <div className="admin-grid">
        {/* 添加单条记录 */}
        <div className="admin-card">
          <h2>添加单条记录</h2>

          {/* 最近用户快捷选择 */}
          {recentUsers.length > 0 && (
            <div className="recent-users-section">
              <div className="recent-users-header">
                <span className="recent-icon">👥</span>
                <span className="recent-title">最近用户</span>
              </div>
              <div className="recent-users-list">
                {recentUsers.map((user, index) => (
                  <button
                    key={`${user}-${index}`}
                    type="button"
                    className={`recent-user-btn ${username === user ? 'active' : ''}`}
                    onClick={() => handleSelectRecentUser(user)}
                  >
                    <span className="user-btn-icon">👤</span>
                    <span>{user}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleAddRecord}>
            <div className="form-group">
              <label>用户名</label>
              <input
                ref={usernameInputRef}
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="输入用户名"
                required
              />
              <div className="form-hint">开始输入以搜索用户</div>
            </div>

            <div className="form-group">
              <label>WPM (每分钟字数)</label>
              <input
                type="number"
                name="wpm"
                value={wpm}
                onChange={(e) => setWpm(e.target.value)}
                className="form-input"
                placeholder="0-300"
                min="0"
                max="300"
                required
              />
            </div>

            <div className="form-group">
              <label>备注 (可选)</label>
              <input
                type="text"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input"
                placeholder="例如: 课堂测试"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '添加中...' : '添加记录'}
            </button>

            {addRecordMessage && (
              <div className={`message ${addRecordMessage.type}`}>
                {addRecordMessage.text}
              </div>
            )}
          </form>
        </div>

        {/* 批量导入 */}
        <div className="admin-card">
          <h2>批量导入 (CSV)</h2>
          <div className="import-info">
            <p>CSV格式:</p>
            <code>
              username,wpm,note<br />
              student1,45,课堂测试<br />
              student2,62,<br />
              student3,38,练习
            </code>
            <a href="#" onClick={handleDownloadTemplate} className="download-link">
              下载模板
            </a>
          </div>

          <form onSubmit={handleImportCSV}>
            <div className="form-group">
              <label>CSV数据</label>
              <textarea
                name="csvData"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="form-textarea"
                rows={10}
                placeholder="在此粘贴CSV数据..."
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '导入中...' : '导入记录'}
            </button>

            {importMessage && (
              <div className={`message ${importMessage.type}`}>
                {importMessage.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['typing_admin'], async () => {
  console.log('[Typing Admin] React page script loaded');

  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('typing-admin-react-app');
  console.log('[Typing Admin] Mount point found:', !!mountPoint);

  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<TypingAdminApp />);
      console.log('[Typing Admin] React app rendered successfully');
    } catch (error) {
      console.error('[Typing Admin] Failed to render React app:', error);
    }
  } else {
    console.error('[Typing Admin] Mount point not found: typing-admin-react-app');
  }
}));
