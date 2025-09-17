/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface UserPreview {
  username: string;
  email: string;
  password: string;
  exists: boolean;
}

// 用户快速创建React组件
const EnhancedUserImportApp: React.FC = () => {
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

    const newPreviews: UserPreview[] = names.map((username) => ({
      username,
      email: `${username}@lqcode.fun`,
      password: '123456',
      exists: false, // 这里可以后续添加检查逻辑
    }));

    setPreviews(newPreviews);
  };

  // 处理用户名输入变化
  const handleUsernamesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUsernames(value);
    generatePreviews(value);
    setShowResults(false);
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
  };

  return (
    <div className="eui-user-quick-create-container">
      <div className="eui-main-card">
        <div className="eui-card-header">
          <div className="header-content">
            <div className="header-icon">👥</div>
            <div className="header-text">
              <h2 className="header-title">用户快速创建</h2>
              <p className="header-subtitle">
                只需输入用户名，邮箱和密码将自动生成
              </p>
            </div>
          </div>
        </div>
        <div className="eui-card-body">
          {!showResults ? (
            <>
              <div className="eui-form-group">
                <label htmlFor="usernames">
                  <strong>用户名列表</strong>
                  <small className="text-muted ml-2">(一行一个用户名)</small>
                </label>
                <textarea
                  id="usernames"
                  className="eui-form-control"
                  rows={8}
                  value={usernames}
                  onChange={handleUsernamesChange}
                  placeholder={`请输入用户名，一行一个，例如：
student001
student002
teacher01
admin_zhang`}
                />
                {previews.length > 0 && (
                  <small className="eui-text-info">
                    将创建 {previews.length} 个用户
                  </small>
                )}
              </div>

              {previews.length > 0 && (
                <div className="eui-preview-section">
                  <h5>📋 预览将要创建的用户</h5>
                  <div className="eui-table-responsive">
                    <table className="eui-table eui-table-striped">
                      <thead>
                        <tr>
                          <th>用户名</th>
                          <th>邮箱</th>
                          <th>密码</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previews.slice(0, 10).map((preview, index) => (
                          <tr key={index}>
                            <td><code>{preview.username}</code></td>
                            <td><code>{preview.email}</code></td>
                            <td><code>{preview.password}</code></td>
                          </tr>
                        ))}
                        {previews.length > 10 && (
                          <tr>
                            <td colSpan={3} className="text-center text-muted">
                              ... 还有 {previews.length - 10} 个用户
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  className="eui-btn eui-btn-success eui-btn-lg"
                  disabled={previews.length === 0 || isLoading}
                  onClick={handleCreateUsers}
                >
                  {isLoading ? (
                    <>
                      <span className="eui-spinner-border-sm mr-2"></span>
                      创建中... ({results.length}/{previews.length})
                    </>
                  ) : (
                    <>
                      ✨ 创建 {previews.length} 个用户
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="eui-results-section">
              <h5>📊 创建结果</h5>
              <div className="eui-row mb-3">
                <div className="eui-col-md-4">
                  <div className="eui-alert eui-alert-success">
                    <strong>成功:</strong> {results.filter((r) => r.success).length}
                  </div>
                </div>
                <div className="eui-col-md-4">
                  <div className="eui-alert eui-alert-danger">
                    <strong>失败:</strong> {results.filter((r) => !r.success).length}
                  </div>
                </div>
                <div className="eui-col-md-4">
                  <div className="eui-alert eui-alert-info">
                    <strong>总计:</strong> {results.length}
                  </div>
                </div>
              </div>

              <div className="eui-table-responsive">
                <table className="eui-table">
                  <thead>
                    <tr>
                      <th>用户名</th>
                      <th>状态</th>
                      <th>消息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className={result.success ? 'eui-table-success' : 'eui-table-danger'}>
                        <td><code>{result.username}</code></td>
                        <td>
                          {result.success ? (
                            <span className="eui-badge eui-badge-success">✅ 成功</span>
                          ) : (
                            <span className="eui-badge eui-badge-danger">❌ 失败</span>
                          )}
                        </td>
                        <td>{result.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-actions">
                <button
                  className="eui-btn eui-btn-secondary"
                  onClick={() => {
                    setShowResults(false);
                    setUsernames('');
                    setPreviews([]);
                    setResults([]);
                  }}
                >
                  🔄 创建更多用户
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

addPage(new NamedPage(['manage_user_import_enhanced'], () => {
  console.log('Enhanced User Import React page loaded');
  console.log('Initial data available:', (window as any).EnhancedUserImportData);

  // 初始化React应用
  const mountPoint = document.getElementById('enhanced-user-import-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<EnhancedUserImportApp />);
    console.log('Enhanced User Import React app mounted successfully');

    // 通知应用已挂载成功
    document.dispatchEvent(new CustomEvent('enhancedUserImportAppMounted'));
  } else {
    console.error('Mount point not found: enhanced-user-import-app-mount-point');
  }
}));
