/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface PasswordChangeResult {
  success: boolean;
  message: string;
  uid?: number;
  username?: string;
}

// 管理员密码修改React组件
const AdminPasswordChangeApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    uid: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [result, setResult] = useState<PasswordChangeResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setResult({
        success: false,
        message: '密码确认不匹配',
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      setResult({
        success: false,
        message: '密码长度至少为6位',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData),
      });

      const responseData = await response.json();
      setResult({
        success: responseData.success,
        message: responseData.message || (responseData.success ? '密码修改成功' : '密码修改失败'),
        uid: Number.parseInt(formData.uid),
      });

      if (responseData.success) {
        setFormData({
          uid: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `操作失败: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="eui-user-quick-create-container">
      <div className="eui-main-card">
        <div className="eui-card-header">
          <div className="header-content">
            <div className="header-icon">🔐</div>
            <div className="header-text">
              <h2 className="header-title">修改用户密码</h2>
              <p className="header-subtitle">
                管理员可以修改任意用户的密码
              </p>
            </div>
          </div>
        </div>

        <div className="eui-card-body">
          {result && (
            <div className={`eui-alert ${result.success ? 'eui-alert-success' : 'eui-alert-danger'} mb-3`}>
              {result.success ? '✅ ' : '❌ '}
              <strong>{result.message}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="eui-form-group">
              <label htmlFor="uid">
                <strong>用户ID</strong>
                <small className="text-muted ml-2">(要修改密码的用户ID)</small>
              </label>
              <input
                type="number"
                id="uid"
                name="uid"
                className="eui-form-control"
                value={formData.uid}
                onChange={handleInputChange}
                placeholder="请输入用户ID"
                required
              />
            </div>

            <div className="eui-form-group">
              <label htmlFor="newPassword">
                <strong>新密码</strong>
                <small className="text-muted ml-2">(至少6个字符)</small>
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="eui-form-control"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="请输入新密码"
                required
              />
            </div>

            <div className="eui-form-group">
              <label htmlFor="confirmPassword">
                <strong>确认密码</strong>
                <small className="text-muted ml-2">(再次输入新密码)</small>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="eui-form-control"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="请再次输入新密码"
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="eui-btn eui-btn-success eui-btn-lg"
                disabled={isLoading || !formData.uid || !formData.newPassword || !formData.confirmPassword}
              >
                {isLoading ? (
                  <>
                    <span className="eui-spinner-border-sm mr-2"></span>
                    修改中...
                  </>
                ) : (
                  <>
                    🔑 修改密码
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

addPage(new NamedPage(['user_password_change'], () => {
  console.log('Admin Password Change React page loaded');

  const mountPoint = document.getElementById('admin-password-change-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<AdminPasswordChangeApp />);
    console.log('Admin Password Change React app mounted successfully');
  } else {
    console.error('Mount point not found: admin-password-change-app-mount-point');
  }
}));
