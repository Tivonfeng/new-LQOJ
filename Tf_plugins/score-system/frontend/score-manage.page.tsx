/* eslint-disable react-refresh/only-export-components */
import './score-manage.page.css';

import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
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
  message,
  Modal,
  Space,
  Table,
  Typography,
} from 'antd';
import $ from 'jquery';
// @ts-ignore - optional dependency, may not have types in the workspace
import { pinyin } from 'pinyin-pro';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

interface ScoreRecord {
  uid: string;
  score: number;
  pid: number;
  category?: string;
  title?: string;
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
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<Array<{ username: string, scoreChange: number, reason?: string, status?: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);
  const downloadTemplate = useCallback(() => {
    const sample = [{ name: '示例姓名', scoreChange: 100, reason: '示例：活动奖励' }];
    const ws = XLSX.utils.json_to_sheet(sample, { header: ['name', 'scoreChange', 'reason'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    XLSX.writeFile(wb, 'score_adjust_template.xlsx');
  }, []);

  const toUsername = useCallback((chineseName: string) => {
    if (!chineseName) return '';
    const raw = pinyin(chineseName, { toneType: 'none', type: 'string' });
    return raw.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }, []);
  // 使用 useMemo 确保 records 数组的稳定性，避免重复渲染
  const records = React.useMemo<ScoreRecord[]>(() => {
    const raw = (window as any).ScoreManageRecentRecords?.records;
    return Array.isArray(raw) ? [...raw] : []; // 创建新数组，避免引用问题
  }, []); // 只在组件挂载时计算一次

  const userMap = React.useMemo<UserMap>(() => {
    const raw = (window as any).ScoreManageRecentRecords?.users;
    return raw && typeof raw === 'object' ? { ...raw } : {}; // 创建新对象，避免引用问题
  }, []); // 只在组件挂载时计算一次
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [, forceUpdate] = useState({});

  const userInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

  // 当记录数量变化时，自动调整当前页（避免超出范围）
  // 只在 records.length 变化时触发，避免在分页时重复触发
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    setPage((currentPage) => {
      if (records.length === 0) {
        return 1;
      }
      if (currentPage > totalPages && totalPages > 0) {
        return totalPages;
      }
      return currentPage;
    });
  }, [records.length]); // 只依赖 records.length，不依赖 pageSize（它是常量）

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
  // 确保当前页在有效范围内
  const currentPage = Math.min(totalPages, Math.max(1, page));
  const pageRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const renderRecord = useCallback((record: ScoreRecord, index: number) => {
    const user = userMap?.[record.uid];
    const displayName = user?.displayName || user?.uname || record.uid;
    const positive = record.score > 0;
    const isAdmin = record.pid === 0 || record.category === '管理员操作';
    // 使用更唯一的 key：包含索引和记录的唯一标识
    const recordKey = `${record.uid}-${record.pid}-${record.createdAt || ''}-${index}`;
    return (
      <div className={`manage-record-item ${positive ? 'positive' : 'negative'}`} key={recordKey}>
        <div className="manage-record-header">
          <div className="manage-record-user-info">
            <div className={`manage-record-indicator ${positive ? 'up' : 'down'}`} />
            <div className="manage-record-user-details">
              <span className="manage-record-name">{displayName}</span>
              <span className="manage-record-meta">{isAdmin ? '管理员操作' : (record.category || record.title || `PID: ${record.pid}`)}</span>
            </div>
          </div>
          <div className={`manage-record-score ${positive ? 'pos' : 'neg'}`}>
            <span className="manage-record-score-value">
              {positive ? '+' : ''}{Math.abs(record.score)}
            </span>
            <span className="manage-record-score-unit">pts</span>
          </div>
        </div>
        <div className="manage-record-footer">
          <span className="manage-record-reason">
            {record.reason || '无原因'}
          </span>
          <span className="manage-record-time">{formatTime(record.createdAt)}</span>
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
                  <Space>
                    <Button
                      type="primary"
                      icon={isSubmitting ? <ReloadOutlined spin /> : <ThunderboltOutlined />}
                      htmlType="submit"
                      size="large"
                      loading={isSubmitting}
                      className="submit-btn"
                      style={{ minWidth: 160 }}
                    >
                      {isSubmitting ? '处理中...' : '应用调整'}
                    </Button>
                    <Button
                      type="default"
                      icon={<EditOutlined />}
                      size="large"
                      onClick={() => setShowBulkModal(true)}
                    >
                      批量导入
                    </Button>
                  </Space>
                </div>
              </form>

            {/* 批量导入弹窗 */}
            <Modal
              title="批量积分调整 - 导入 Excel"
              open={showBulkModal}
              onCancel={() => setShowBulkModal(false)}
              footer={null}
              width={800}
            >
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button type="default" icon={<DownloadOutlined />} onClick={downloadTemplate}>
                  下载模板
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const arrayBuffer = await f.arrayBuffer();
                      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                      const firstSheetName = workbook.SheetNames[0];
                      const worksheet = workbook.Sheets[firstSheetName];
                      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
                      const parsedInitial = json.map((row: any, _idx: number) => {
                        // 支持多种列名：name/姓名，兼容 username/用户名
                        const nameVal = row.name ?? row.姓名 ?? row.username ?? row.用户名 ?? row.user ?? row.User ?? '';
                        const scoreRawVal = row.scoreChange ?? row.积分变化 ?? row.score ?? row.分数 ?? '';
                        const reasonVal = row.reason ?? row.原因 ?? row.Reason ?? '';
                        const scoreNum = Number.parseInt(String(scoreRawVal).trim() || '0');
                        const nameStr = String(nameVal).trim();
                        const usernameGenerated = nameStr ? toUsername(nameStr) : '';
                        return {
                          name: nameStr,
                          username: usernameGenerated,
                          scoreChange: Number.isNaN(scoreNum) ? 0 : scoreNum,
                          reason: String(reasonVal || '').trim(),
                          status: '待导入',
                        };
                      });

                      // 检查拼音冲突（重复的 username）
                      const usernameCounts: Record<string, number> = {};
                      for (const item of parsedInitial) {
                        const u = item.username || '';
                        if (u) usernameCounts[u] = (usernameCounts[u] || 0) + 1;
                      }

                      const parsed = parsedInitial.map((item) => {
                        const errors: string[] = [];
                        if (!item.username) errors.push('用户名为空');
                        if (!Number.isInteger(item.scoreChange) || Math.abs(item.scoreChange) > 10000 || item.scoreChange === 0) {
                          errors.push('积分变化无效');
                        }
                        const conflict = item.username && usernameCounts[item.username] > 1;
                        return {
                          ...item,
                          _errors: errors,
                          _conflict: !!conflict,
                          status: conflict ? '冲突：拼音重复' : (errors.length ? '存在错误' : '待导入'),
                        };
                      });

                      setBulkRows(parsed);
                      message.success(`解析 ${parsed.length} 条记录`);
                    } catch (err) {
                      console.error('解析文件失败', err);
                      message.error('解析文件失败，请确认是有效的 Excel/CSV 文件');
                    }
                  }}
                />
              </div>

              <div style={{ maxHeight: 360, overflow: 'auto', marginBottom: 12 }}>
                <Table
                  dataSource={bulkRows.map((r, i) => ({ ...r, key: `r-${i}` }))}
                  pagination={false}
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '用户名', dataIndex: 'username' },
                    { title: '积分变化', dataIndex: 'scoreChange' },
                    { title: '原因', dataIndex: 'reason' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (_: any, record: any) => {
                        const parts: string[] = [];
                        if (record._conflict) parts.push('冲突：拼音重复');
                        if (record._errors && record._errors.length > 0) parts.push(record._errors.join('；'));
                        if (parts.length === 0) return record.status || '待导入';
                        return parts.join('；');
                      },
                    },
                  ]}
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setBulkRows([]); setShowBulkModal(false); }}>取消</Button>
                <Button
                  type="primary"
                  loading={isImporting}
                  onClick={async () => {
                    if (bulkRows.length === 0) {
                      message.warning('请先导入或粘贴数据');
                      return;
                    }
                    // 本地校验（包含冲突）
                    const validated = bulkRows.map((r) => {
                      const errors: string[] = Array.isArray((r as any)._errors) ? (r as any)._errors.slice() : [];
                      if (!r.username) {
                        if (!errors.includes('用户名为空')) errors.push('用户名为空');
                      }
                      if (!Number.isInteger(r.scoreChange) || Math.abs(r.scoreChange) > 10000 || r.scoreChange === 0) {
                        if (!errors.includes('积分变化无效')) errors.push('积分变化无效');
                      }
                      return { ...r, _errors: errors };
                    });
                    // 标记冲突
                    const usernameCounts: Record<string, number> = {};
                    for (const item of validated) {
                      const u = item.username || '';
                      if (u) usernameCounts[u] = (usernameCounts[u] || 0) + 1;
                    }
                    const finalRows = validated.map((item) => {
                      const conflict = item.username && usernameCounts[item.username] > 1;
                      const status = conflict ? '冲突：拼音重复' : (item._errors && item._errors.length ? '存在错误' : '待导入');
                      return { ...item, _conflict: !!conflict, status };
                    });
                    setBulkRows(finalRows as any);

                    const hasErrors = finalRows.some((r) => (r as any)._errors.length > 0 || (r as any)._conflict);
                    if (hasErrors) {
                      message.error('存在格式错误或拼音冲突，请修正后重试');
                      return;
                    }

                    setIsImporting(true);
                    try {
                      const config = (window as any).ScoreSystemConfig;
                      const url = config?.submitUrl || window.location.pathname;
                      const payload = {
                        action: 'bulk_adjust',
                        rows: bulkRows.map((r) => ({ username: r.username, scoreChange: r.scoreChange, reason: r.reason })),
                      };
                      const resp = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      const data = await resp.json();
                      if (data && data.results) {
                        const updated = bulkRows.map((r, i) => {
                          const res = data.results[i];
                          return { ...r, status: res?.success ? '成功' : `失败: ${res?.message || '未知错误'}` };
                        });
                        setBulkRows(updated as any);
                        message.success('导入完成，查看每行状态');
                      } else {
                        message.error(data?.message || '导入失败');
                      }
                    } catch (err) {
                      console.error('导入失败', err);
                      message.error('导入失败，请重试');
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                >
                  开始导入
                </Button>
              </div>
            </Modal>

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
          <Card
className="manage-records-card"
title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThunderboltOutlined />
              <span>最近积分记录</span>
            </span>
          }>
            <div className="manage-records-list">
              {pageRecords.length === 0 && (
                <div className="manage-empty-panel">
                  <div className="manage-empty-icon">📋</div>
                  <p className="manage-empty-text">暂无记录</p>
                </div>
              )}
              {pageRecords.map((record, index) => renderRecord(record, index))}
            </div>
            <div className="manage-records-pagination">
              <Button
                className="manage-pagination-btn"
                size="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                上一页
              </Button>
              <div className="manage-pagination-info">
                <span className="manage-current-page">{currentPage}</span> / <span className="manage-total-pages">{totalPages}</span>
              </div>
              <Button
                className="manage-pagination-btn"
                size="small"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || records.length === 0}
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
