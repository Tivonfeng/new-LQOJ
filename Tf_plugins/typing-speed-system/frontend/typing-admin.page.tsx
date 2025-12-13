/* eslint-disable react-refresh/only-export-components */
import './typing-admin.page.css';

import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  Space,
  Typography,
} from 'antd';
import $ from 'jquery';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Title, Text } = Typography;

interface TypingRecord {
  _id: string;
  uid: string;
  wpm: number;
  note?: string;
  createdAt: string;
}

interface UserMap {
  [key: string]: {
    uname?: string;
    displayName?: string;
  };
}

// 打字速度管理React组件
const TypingAdminApp: React.FC = () => {
  const [username, setUsername] = useState('');
  const [wpm, setWpm] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addRecordMessage, setAddRecordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);

  // 从全局变量获取最近记录数据
  const [records] = useState<TypingRecord[]>(() => {
    const raw = (window as any).TypingAdminRecentRecords?.records;
    return Array.isArray(raw) ? raw : [];
  });
  const [userMap] = useState<UserMap>(() => {
    const raw = (window as any).TypingAdminRecentRecords?.users;
    return raw && typeof raw === 'object' ? raw : {};
  });
  const [page, setPage] = useState(1);
  const pageSize = 5;

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

  // 返回打字大厅
  const handleGoToHall = useCallback(() => {
    const url = (window as any).typingHallUrl || '/typing/hall';
    window.location.href = url;
  }, []);

  // 删除记录
  const handleDeleteRecord = useCallback(async (recordId: string, userName: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm(`确认删除 ${userName} 的记录？`)) {
      return;
    }

    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_record',
          recordId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        window.location.reload();
      } else {
        // eslint-disable-next-line no-alert
        alert(`删除失败: ${result.message}`);
      }
    } catch (error) {
      console.error('[Typing Admin] Delete error:', error);
      // eslint-disable-next-line no-alert
      alert('网络错误');
    }
  }, []);

  // 重新计算统计
  const handleRecalculateStats = useCallback(async () => {
    // eslint-disable-next-line no-alert
    if (!confirm('这将重新计算所有用户的统计数据。继续吗？')) {
      return;
    }

    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recalculate_stats',
        }),
      });

      const result = await response.json();
      if (result.success) {
        // eslint-disable-next-line no-alert
        alert(result.message);
        window.location.reload();
      } else {
        // eslint-disable-next-line no-alert
        alert(`错误: ${result.message}`);
      }
    } catch (error) {
      console.error('[Typing Admin] Recalculate error:', error);
      // eslint-disable-next-line no-alert
      alert('网络错误');
    }
  }, []);

  // 格式化时间
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

  // 侧边栏记录渲染
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const pageSafe = Math.min(totalPages, Math.max(1, page));
  const pageRecords = records.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const renderRecord = useCallback((record: TypingRecord) => {
    const user = userMap?.[record.uid];
    const displayName = user?.displayName || user?.uname || record.uid;
    return (
      <div className="record-item" key={record._id}>
        <div className="record-main">
          <div className="record-user">
            <span className="record-name">{displayName}</span>
          </div>
          <div className="record-wpm">{record.wpm} WPM</div>
        </div>
        <div className="record-footer">
          <span className="record-note">{record.note || '-'}</span>
          <span className="record-time">{formatTime(record.createdAt)}</span>
        </div>
        <div className="record-actions">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            className="delete-record-btn"
            onClick={() => handleDeleteRecord(record._id, displayName)}
          >
            删除
          </Button>
        </div>
      </div>
    );
  }, [formatTime, userMap, handleDeleteRecord]);

  return (
    <div className="typing-admin-container">
      <div className="typing-admin-grid">
        <div className="main-column">
          {/* Hero Section */}
          <Card className="hero-card" bordered={false}>
            <div className="hero-content">
              <div className="hero-text">
                <Title level={2} className="hero-title">
                  打字速度管理
                </Title>
                <Text className="hero-subtitle">管理员打字速度记录工具</Text>
              </div>
              <div className="hero-actions">
                <Space>
                  <Button
                    type="default"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleGoToHall}
                    className="hero-action-btn"
                  >
                    返回打字大厅
                  </Button>
                </Space>
              </div>
            </div>
          </Card>

          {/* 添加单条记录 */}
          <Card
            className="section-card add-record-card"
            title={
              <Space>
                <EditOutlined />
                <span>添加单条记录</span>
              </Space>
            }
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
              选择用户并添加打字速度记录
            </Text>
            <form onSubmit={handleAddRecord} className="typing-form">
              <div className="form-grid two-rows">
                <div className="form-group">
                  <label className="form-label">
                    <UserOutlined />
                    <span>用户名</span>
                  </label>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    <ThunderboltOutlined />
                    <span>WPM (每分钟字数)</span>
                  </label>
                  <Input
                    type="number"
                    name="wpm"
                    value={wpm}
                    onChange={(e) => setWpm(e.target.value)}
                    placeholder="0-300"
                    min="0"
                    max="300"
                    size="large"
                    required
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    范围：0-300 WPM
                  </Text>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <EditOutlined />
                    <span>备注 (可选)</span>
                  </label>
                  <Input
                    type="text"
                    name="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="例如: 课堂测试"
                    size="large"
                  />
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
                  {isSubmitting ? '添加中...' : '添加记录'}
                </Button>
              </div>
            </form>

            {/* 结果显示 */}
            {addRecordMessage && (
              <div className={`result-message ${addRecordMessage.type === 'success' ? 'success' : 'error'}`}>
                {addRecordMessage.type === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                <span>{addRecordMessage.text}</span>
              </div>
            )}
          </Card>
        </div>

        <div className="sidebar-column">
          <Card
            className="section-card records-card"
            title={
              <Space>
                <ThunderboltOutlined />
                <span>最近记录</span>
              </Space>
            }
          >
            <div className="records-list">
              {pageRecords.length === 0 && (
                <div className="empty-panel">
                  <div className="empty-icon">📋</div>
                  <p className="empty-text">暂无记录</p>
                </div>
              )}
              {pageRecords.map(renderRecord)}
            </div>
            {records.length > pageSize && (
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
            )}
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={handleRecalculateStats}
              className="recalculate-btn"
            >
              重新计算统计
            </Button>
          </Card>
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
