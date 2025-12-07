/* eslint-disable react-refresh/only-export-components */
import './user-tools.page.css';

import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Space,
  Statistic,
  Table,
  Tabs,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import $ from 'jquery';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { TextArea } = Input;
const { Title } = Typography;

interface UserPreview {
  username: string;
  email: string;
  password: string;
  exists: boolean;
}

interface PasswordChangeResult {
  success: boolean;
  message: string;
  uid?: number;
  username?: string;
}

// 用户导入组件
const UserImportTab: React.FC<{ config: any }> = ({ config }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [usernames, setUsernames] = useState('');
  const [previews, setPreviews] = useState<UserPreview[]>([]);
  const [results, setResults] = useState<Array<{
    username: string;
    success: boolean;
    message: string;
  }>>([]);
  const [showResults, setShowResults] = useState(false);

  // 生成用户预览
  const generatePreviews = (usernamesText: string) => {
    const names = usernamesText
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const defaultEmailDomain = config?.defaultEmailDomain || 'lqcode.fun';
    const defaultPassword = config?.defaultPassword || '123456';

    const newPreviews: UserPreview[] = names.map((username) => ({
      username,
      email: `${username}@${defaultEmailDomain}`,
      password: defaultPassword,
      exists: false,
    }));

    setPreviews(newPreviews);
  };

  // 创建用户
  const handleCreateUsers = async () => {
    setIsLoading(true);
    setResults([]);

    const creationResults: Array<{
      username: string;
      success: boolean;
      message: string;
    }> = [];

    for (const preview of previews) {
      try {
        const response = await fetch(window.location.pathname, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'import',
            username: preview.username,
            draft: 'false',
          }),
        });

        const result = await response.json();
        creationResults.push({
          username: preview.username,
          success: result.success,
          message: result.messages?.[0] || (result.success ? '创建成功' : '创建失败'),
        });
      } catch (error: any) {
        creationResults.push({
          username: preview.username,
          success: false,
          message: `创建失败: ${error.message}`,
        });
      }
    }

    setResults(creationResults);
    setShowResults(true);
    setIsLoading(false);

    const successCount = creationResults.filter((r) => r.success).length;
    if (successCount > 0) {
      message.success(`成功创建 ${successCount} 个用户`);
    }
  };

  const previewColumns: ColumnsType<UserPreview> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <code>{text}</code>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <code>{text}</code>,
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
      render: (text) => <code>{text}</code>,
    },
  ];

  const resultColumns: ColumnsType<any> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <code>{text}</code>,
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        success ? (
          <Button type="primary" size="small" disabled icon={<CheckCircleOutlined />}>成功</Button>
        ) : (
          <Button danger size="small" disabled icon={<CloseCircleOutlined />}>失败</Button>
        )
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  if (showResults) {
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>
          <BarChartOutlined /> 创建结果
        </Title>

        <Space size="large">
          <Statistic title="成功" value={successCount} valueStyle={{ color: '#3f8600' }} />
          <Statistic title="失败" value={failCount} valueStyle={{ color: '#cf1322' }} />
          <Statistic title="总计" value={results.length} />
        </Space>

        <Table
          columns={resultColumns}
          dataSource={results.map((r, i) => ({ ...r, key: i }))}
          pagination={false}
          size="small"
        />

        <Button
          onClick={() => {
            setShowResults(false);
            setUsernames('');
            setPreviews([]);
            setResults([]);
          }}
        >
          <ReloadOutlined /> 创建更多用户
        </Button>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Form.Item label="用户名列表" extra="一行一个用户名">
        <TextArea
          rows={8}
          value={usernames}
          onChange={(e) => {
            const value = e.target.value;
            setUsernames(value);
            generatePreviews(value);
          }}
          placeholder={`请输入用户名，一行一个，例如：
student001
student002
teacher01
admin_zhang`}
        />
        {previews.length > 0 && (
          <div style={{ marginTop: 8, color: '#1890ff' }}>
            将创建 {previews.length} 个用户
          </div>
        )}
      </Form.Item>

      {previews.length > 0 && (
        <Card title={<><FileTextOutlined /> 预览将要创建的用户</>} size="small">
          <Table
            columns={previewColumns}
            dataSource={previews.slice(0, 10).map((p, i) => ({ ...p, key: i }))}
            pagination={false}
            size="small"
          />
          {previews.length > 10 && (
            <div style={{ marginTop: 8, textAlign: 'center', color: '#999' }}>
              ... 还有 {previews.length - 10} 个用户
            </div>
          )}
        </Card>
      )}

      <Button
        type="primary"
        size="large"
        loading={isLoading}
        disabled={previews.length === 0}
        onClick={handleCreateUsers}
        block
      >
        {isLoading ? `创建中... (${results.length}/${previews.length})` : <><PlusCircleOutlined /> 创建 {previews.length} 个用户</>}
      </Button>
    </Space>
  );
};

// 密码修改组件
const PasswordChangeTab: React.FC = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [result, setResult] = useState<PasswordChangeResult | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const userInputRef = useRef<HTMLInputElement>(null);
  const userSelectComponentRef = useRef<any>(null);

  // 初始化UserSelectAutoComplete组件
  useEffect(() => {
    if (userInputRef.current) {
      try {
        const $input = $(userInputRef.current);
        userSelectComponentRef.current = (UserSelectAutoComplete as any).getOrConstruct($input, {
          multi: false,
          freeSolo: false,
        });

        userSelectComponentRef.current.onChange(() => {
          const selectedValue = userSelectComponentRef.current.value?.();
          if (selectedValue && typeof selectedValue === 'object' && (selectedValue.uid || selectedValue._id)) {
            const uid = selectedValue.uid || selectedValue._id;
            const username = selectedValue.uname || selectedValue.username || '';
            setSelectedUser(username);
            form.setFieldsValue({ uid: uid.toString() });
            setInitError(null);
          } else if (selectedValue === null || selectedValue === undefined || selectedValue === '') {
            setSelectedUser('');
            form.setFieldsValue({ uid: '' });
          }
        });

        setInitError(null);
      } catch (error: any) {
        const errorMsg = `用户选择组件初始化失败: ${error.message}`;
        setInitError(errorMsg);
      }
    }

    return () => {
      if (userSelectComponentRef.current) {
        try {
          userSelectComponentRef.current.detach?.();
        } catch (e) {
          // ignore error
        }
      }
    };
  }, [form]);

  const handleSubmit = async (values: any) => {
    let finalUid = values.uid;
    if (userSelectComponentRef.current) {
      try {
        const selectedUserObj = userSelectComponentRef.current.value?.();
        if (selectedUserObj && typeof selectedUserObj === 'object' && (selectedUserObj.uid || selectedUserObj._id)) {
          finalUid = (selectedUserObj.uid || selectedUserObj._id).toString();
        } else if (!finalUid && selectedUser) {
          message.error('请从下拉列表中选择一个有效的用户');
          return;
        }
      } catch (error) {
        // ignore error
      }
    }

    if (!finalUid) {
      message.error('请选择要修改密码的用户');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'password',
          uid: finalUid,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      const responseData = await response.json();
      setResult({
        success: responseData.success,
        message: responseData.message || (responseData.success ? '密码修改成功' : '密码修改失败'),
        uid: Number.parseInt(finalUid),
      });

      if (responseData.success) {
        message.success('密码修改成功');
        form.resetFields();
        setSelectedUser('');
        if (userSelectComponentRef.current) {
          userSelectComponentRef.current.clear();
        }
      } else {
        message.error(responseData.message || '密码修改失败');
      }
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`);
      setResult({
        success: false,
        message: `操作失败: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {initError && (
        <Alert
          message="初始化错误"
          description={initError}
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      )}

      {result && (
        <Alert
          message={result.message}
          type={result.success ? 'success' : 'error'}
          showIcon
          closable
          onClose={() => setResult(null)}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="选择用户"
          name="uid"
          rules={[{ required: true, message: '请选择要修改密码的用户' }]}
          extra="搜索并选择要修改密码的用户"
        >
          <input
            ref={userInputRef}
            type="text"
            className="ant-input"
            placeholder="搜索用户名..."
            value={selectedUser}
            onChange={() => {}}
            style={{ width: '100%', padding: '4px 11px', fontSize: '14px', lineHeight: '1.5715', border: '1px solid #d9d9d9', borderRadius: '6px' }}
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少为6位' },
          ]}
          extra="至少6个字符"
        >
          <Input.Password placeholder="请输入新密码" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('密码确认不匹配'));
              },
            }),
          ]}
          extra="再次输入新密码"
        >
          <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isLoading}
            disabled={!selectedUser && !userSelectComponentRef.current?.value?.()}
            block
            icon={<LockOutlined />}
          >
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </Space>
  );
};

// 主组件 - 使用 Ant Design Tabs
const UserToolsApp: React.FC<{ config: any }> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<string>('import');

  const tabItems = [
    {
      key: 'import',
      label: (
        <span>
          <UserOutlined /> 用户导入
        </span>
      ),
      children: <UserImportTab config={config} />,
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined /> 密码修改
        </span>
      ),
      children: <PasswordChangeTab />,
    },
  ];

  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Card>
  );
};

addPage(new NamedPage(['manage_user_tools'], () => {
  console.log('User Tools React page loaded');
  const data = (window as any).UserToolsData;

  const mountPoint = document.getElementById('user-tools-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<UserToolsApp config={data?.config} />);
    console.log('User Tools React app mounted successfully');

    document.dispatchEvent(new CustomEvent('userToolsAppMounted'));
  } else {
    console.error('Mount point not found: user-tools-app-mount-point');
  }
}));
