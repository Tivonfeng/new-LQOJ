import { NamedPage, Notification, request } from '@hydrooj/ui-default';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface Domain {
  _id: string;
  name: string;
  roles: Role[];
}

interface Role {
  _id: string;
  name: string;
  perm: string;
}

const EnhancedUserImportApp: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('default');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUser, setPreviewUser] = useState<any>(null);

  useEffect(() => {
    // 获取域和角色数据
    const initData = async () => {
      try {
        const response = await request.get('/manage/userimport/enhanced');
        setDomains(response.domains);
        setSelectedDomain(response.currentDomain);
      } catch (error) {
        Notification.error('获取域信息失败');
      }
    };
    initData();
  }, []);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomain(domainId);
    const domain = domains.find((d) => d._id === domainId);
    if (domain && domain.roles.length > 0) {
      const defaultRole = domain.roles.find((r) => r._id === 'default') || domain.roles[0];
      setSelectedRole(defaultRole._id);
    }
  };

  const handlePreview = async () => {
    if (!username.trim()) {
      Notification.error('请输入用户名');
      return;
    }

    setLoading(true);
    try {
      const response = await request.post('/manage/userimport/enhanced', {
        username: username.trim(),
        domainId: selectedDomain,
        role: selectedRole,
        format: 'quick',
        draft: 'true',
      });

      if (response.users && response.users.length > 0) {
        setPreviewUser(response.users[0]);
      }
    } catch (error) {
      Notification.error(`预览失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!username.trim()) {
      Notification.error('请输入用户名');
      return;
    }

    setLoading(true);
    try {
      const response = await request.post('/manage/userimport/enhanced', {
        username: username.trim(),
        domainId: selectedDomain,
        role: selectedRole,
        format: 'quick',
        draft: 'false',
      });

      if (response.imported) {
        Notification.success(`用户 ${username} 创建成功！`);
        setUsername('');
        setPreviewUser(null);
      } else if (response.messages) {
        Notification.error(response.messages.join('\n'));
      }
    } catch (error) {
      Notification.error(`创建失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDomainRoles = () => {
    const domain = domains.find((d) => d._id === selectedDomain);
    return domain?.roles || [];
  };

  const getRoleDisplayName = (roleId: string) => {
    const roleNames: Record<string, string> = {
      guest: '游客',
      default: '默认用户',
      root: '管理员',
      admin: '管理员',
      teacher: '教师',
      student: '学生',
    };
    return roleNames[roleId] || roleId;
  };

  return (
    <div className="enhanced-user-import-app">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">👥 用户快速创建</h1>
            <p className="hero-subtitle">快速创建用户并分配域和角色</p>
          </div>
          <div className="hero-stats">
            <div className="stat-badge">
              <span className="stat-icon">🌐</span>
              <span className="stat-text">域: {domains.find((d) => d._id === selectedDomain)?.name || selectedDomain}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="main-container">
        {/* Creation Form */}
        <div className="creation-spotlight">
          <div className="spotlight-header">
            <div className="spotlight-title">
              <span className="title-icon">⚡</span>
              <h2>快速用户创建</h2>
              <span className="subtitle">简单快捷</span>
            </div>
          </div>

          <div className="creation-content">
            {/* Info Cards */}
            <div className="creation-info">
              <div className="info-card">
                <div className="info-header">
                  <div className="info-icon">📧</div>
                  <div className="info-details">
                    <h4>自动邮箱生成</h4>
                    <p>自动添加 @lqcode.fun 后缀</p>
                  </div>
                </div>
                <div className="info-example">
                  <span className="example-input">student001</span>
                  <span className="example-arrow">→</span>
                  <span className="example-output">student001@lqcode.fun</span>
                </div>
              </div>

              <div className="info-card">
                <div className="info-header">
                  <div className="info-icon">🔑</div>
                  <div className="info-details">
                    <h4>默认密码</h4>
                    <p>固定密码便于访问</p>
                  </div>
                </div>
                <div className="info-example">
                  <span className="password-display">123456</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="creation-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🌐</span>
                    目标域
                  </label>
                  <select
                    className="form-select"
                    value={selectedDomain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                  >
                    {domains.map((domain) => (
                      <option key={domain._id} value={domain._id}>
                        {domain.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🎭</span>
                    用户角色
                  </label>
                  <select
                    className="form-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    {getCurrentDomainRoles().map((role) => (
                      <option key={role._id} value={role._id}>
                        {getRoleDisplayName(role._id)}
                      </option>
                    ))}
                  </select>
                  <div className="form-hint">
                    <span className="hint-icon">ℹ️</span>
                    角色决定用户在域中的权限
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">👤</span>
                    用户名
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="输入用户名..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <div className="form-hint">
                    <span className="hint-icon">💡</span>
                    邮箱将是: <strong>{username || 'username'}@lqcode.fun</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔑</span>
                    密码
                  </label>
                  <div className="password-info">
                    <span className="password-display">123456</span>
                    <span className="password-note">固定默认密码</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions">
                <button
                  className="action-btn preview"
                  onClick={handlePreview}
                  disabled={loading || !username.trim()}
                >
                  <span className="btn-icon">👁️</span>
                  <span className="btn-text">预览用户</span>
                </button>
                <button
                  className="action-btn create"
                  onClick={handleCreateUser}
                  disabled={loading || !username.trim()}
                >
                  <span className="btn-icon">⚡</span>
                  <span className="btn-text">{loading ? '创建中...' : '创建用户'}</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Result */}
        {previewUser && (
          <div className="results-section">
            <div className="preview-card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon">👁️</div>
                  <h3>预览结果</h3>
                </div>
                <div className="card-badge">1 用户</div>
              </div>

              <div className="card-content">
                <div className="user-preview-list">
                  <div className="user-preview-item">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                      <div className="user-name">{previewUser.username}</div>
                      <div className="user-email">{previewUser.email}</div>
                      <div className="user-role">
                        <span className="role-icon">🎭</span>
                        <span className="role-text">角色: <strong>{getRoleDisplayName(selectedRole)}</strong></span>
                      </div>
                    </div>
                    <div className="user-status">
                      <span className="status-badge ready">就绪</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const page = new NamedPage('manage_user_import_enhanced', () => {
  async function mountComponent() {
    const containerElement = document.getElementById('enhanced-user-import-react');
    if (containerElement) {
      const root = createRoot(containerElement);
      root.render(<EnhancedUserImportApp />);
    }
  }

  mountComponent();
});

export default page;
