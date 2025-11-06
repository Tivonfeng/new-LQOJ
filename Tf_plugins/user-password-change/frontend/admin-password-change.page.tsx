/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage, UserSelectAutoComplete } from '@hydrooj/ui-default';
import $ from 'jquery';
import React, { useEffect, useRef, useState } from 'react';
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
  const [selectedUser, setSelectedUser] = useState('');
  const [formData, setFormData] = useState({
    uid: '',
    newPassword: '',
    confirmPassword: '',
  });
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

        // 监听值的变化 - 用于更新按钮状态
        userSelectComponentRef.current.onChange(() => {
          const selectedValue = userSelectComponentRef.current.value?.();
          if (selectedValue && typeof selectedValue === 'object' && (selectedValue.uid || selectedValue._id)) {
            const uid = selectedValue.uid || selectedValue._id;
            const username = selectedValue.uname || selectedValue.username || '';
            setSelectedUser(username);
            setFormData((prev) => ({ ...prev, uid: uid.toString() }));
            setInitError(null);
          } else if (selectedValue === null || selectedValue === undefined || selectedValue === '') {
            setSelectedUser('');
            setFormData((prev) => ({ ...prev, uid: '' }));
          }
        });

        setInitError(null);
      } catch (error: any) {
        const errorMsg = `用户选择组件初始化失败: ${error.message}`;
        setInitError(errorMsg);
      }
    }

    // 清理函数
    return () => {
      if (userSelectComponentRef.current) {
        try {
          userSelectComponentRef.current.detach?.();
        } catch (e) {
          // ignore error
        }
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 获取最终的用户ID
    let finalUid = formData.uid;
    if (userSelectComponentRef.current) {
      try {
        // 尝试从组件获取选中的用户对象
        const selectedUserObj = userSelectComponentRef.current.value?.();
        if (selectedUserObj && typeof selectedUserObj === 'object' && (selectedUserObj.uid || selectedUserObj._id)) {
          finalUid = (selectedUserObj.uid || selectedUserObj._id).toString();
        } else if (!finalUid && selectedUser) {
          // 如果组件没有返回对象但selectedUser有值，尝试作为用户名处理
          setResult({
            success: false,
            message: '请从下拉列表中选择一个有效的用户',
          });
          return;
        }
      } catch (error) {
        // ignore error
      }
    }

    if (!finalUid) {
      setResult({
        success: false,
        message: '请选择要修改密码的用户',
      });
      return;
    }

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
        body: new URLSearchParams({
          uid: finalUid,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const responseData = await response.json();
      setResult({
        success: responseData.success,
        message: responseData.message || (responseData.success ? '密码修改成功' : '密码修改失败'),
        uid: Number.parseInt(finalUid),
      });

      if (responseData.success) {
        setFormData({
          uid: '',
          newPassword: '',
          confirmPassword: '',
        });
        setSelectedUser('');
        // 清理UserSelectAutoComplete
        if (userSelectComponentRef.current) {
          userSelectComponentRef.current.clear();
        }
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
          {initError && (
            <div className="eui-alert eui-alert-warning mb-3">
              ⚠️ <strong>{initError}</strong>
              <p className="mt-2">请刷新页面重试，或联系管理员</p>
            </div>
          )}

          {result && (
            <div className={`eui-alert ${result.success ? 'eui-alert-success' : 'eui-alert-danger'} mb-3`}>
              {result.success ? '✅ ' : '❌ '}
              <strong>{result.message}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="eui-form-group">
              <label htmlFor="userSelect">
                <strong>选择用户</strong>
                <small className="text-muted ml-2">(搜索并选择要修改密码的用户)</small>
              </label>
              <input
                ref={userInputRef}
                type="text"
                id="userSelect"
                name="userSelect"
                className="eui-form-control"
                value={selectedUser}
                onChange={() => {}}
                placeholder="搜索用户名..."
                required
              />
              <div className="form-hint">输入用户名进行搜索，或直接选择</div>
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
                autoComplete="new-password"
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
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="eui-btn eui-btn-success eui-btn-lg"
                disabled={
                  isLoading
                  || (!selectedUser && !userSelectComponentRef.current?.value?.())
                  || !formData.newPassword
                  || !formData.confirmPassword
                }
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
  const mountPoint = document.getElementById('admin-password-change-app-mount-point');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<AdminPasswordChangeApp />);
  }
}));
