/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-alert */
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 迁移管理React组件
const MigrationManageComponent: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isMigrationLoading, setIsMigrationLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [showMigrationFeature, setShowMigrationFeature] = useState(false); // 控制迁移功能是否显示

  // 从配置中获取迁移功能显示状态
  useEffect(() => {
    const config = (window as any).ScoreSystemConfig;
    if (config && typeof config.enableMigrationFeature === 'boolean') {
      setShowMigrationFeature(config.enableMigrationFeature);
    }
  }, []);

  // 获取迁移状态
  const loadMigrationStatus = useCallback(async () => {
    try {
      const config = (window as any).ScoreSystemConfig;
      const url = config?.submitUrl || window.location.pathname;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_migration_status',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMigrationStatus(data.data);
      }
    } catch (error) {
      console.error('加载迁移状态失败:', error);
    }
  }, []);

  // 页面加载时获取迁移状态
  useEffect(() => {
    loadMigrationStatus();
  }, [loadMigrationStatus]);

  // 执行迁移
  const handleMigration = useCallback(async () => {
    if (!confirm('确定要合并所有域的积分数据吗？此操作不可逆，请确保已备份数据。')) {
      return;
    }

    setIsMigrationLoading(true);
    setResult(null);

    try {
      const config = (window as any).ScoreSystemConfig;
      const url = config?.submitUrl || window.location.pathname;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'migrate_scores',
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? '迁移完成' : '迁移失败'),
      });

      if (data.success) {
        await loadMigrationStatus();
      }
    } catch (error) {
      console.error('迁移失败:', error);
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setIsMigrationLoading(false);
    }
  }, [loadMigrationStatus]);

  // 回滚迁移
  const handleRollback = useCallback(async () => {
    if (!confirm('确定要回滚迁移吗？这将重新创建分域数据。')) {
      return;
    }

    setIsMigrationLoading(true);
    setResult(null);

    try {
      const config = (window as any).ScoreSystemConfig;
      const url = config?.submitUrl || window.location.pathname;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rollback_migration',
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? '回滚完成' : '回滚失败'),
      });

      if (data.success) {
        await loadMigrationStatus();
      }
    } catch (error) {
      console.error('回滚失败:', error);
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setIsMigrationLoading(false);
    }
  }, [loadMigrationStatus]);

  // 切换迁移功能显示状态（用于开发和测试）
  const toggleMigrationFeature = useCallback(() => {
    setShowMigrationFeature((prev) => !prev);
    console.log('Migration feature visibility toggled:', !showMigrationFeature);
  }, [showMigrationFeature]);

  // 将切换函数暴露到全局，方便调试
  useEffect(() => {
    (window as any).toggleMigrationFeature = toggleMigrationFeature;
    return () => {
      delete (window as any).toggleMigrationFeature;
    };
  }, [toggleMigrationFeature]);

  // 如果迁移功能被禁用，不渲染组件
  if (!showMigrationFeature) {
    return null;
  }

  return (
    <div className="migration-manage-component">
      {migrationStatus && (
        <div className="migration-section">
          <div className="migration-header">
            <h4>积分账户合并管理</h4>
            <p className="migration-subtitle">将不同域的积分账户合并为统一账户</p>
          </div>

          <div className="migration-status">
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">分域数据</span>
                <span className={`status-value ${migrationStatus.status?.hasDomainData ? 'has-data' : 'no-data'}`}>
                  {migrationStatus.status?.hasDomainData
                    ? `${migrationStatus.status.domainUserCount} 个用户记录`
                    : '无数据'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">全局数据</span>
                <span className={`status-value ${migrationStatus.status?.hasGlobalData ? 'has-data' : 'no-data'}`}>
                  {migrationStatus.status?.hasGlobalData
                    ? `${migrationStatus.status.globalUserCount} 个用户记录`
                    : '无数据'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">总用户数</span>
                <span className="status-value">{migrationStatus.stats?.uniqueUsers || 0}</span>
              </div>
              <div className="status-item">
                <span className="status-label">总域数</span>
                <span className="status-value">{migrationStatus.stats?.uniqueDomains || 0}</span>
              </div>
            </div>
          </div>

          <div className="migration-actions">
            {migrationStatus.status?.hasDomainData && !migrationStatus.status?.hasGlobalData && (
              <button
                type="button"
                className="migration-btn migrate-btn"
                onClick={handleMigration}
                disabled={isMigrationLoading}
              >
                <span className="btn-icon">{isMigrationLoading ? '⏳' : '🔄'}</span>
                <span className="btn-text">
                  {isMigrationLoading ? '合并中...' : '合并积分数据'}
                </span>
              </button>
            )}

            {migrationStatus.status?.hasGlobalData && (
              <button
                type="button"
                className="migration-btn rollback-btn"
                onClick={handleRollback}
                disabled={isMigrationLoading}
              >
                <span className="btn-icon">{isMigrationLoading ? '⏳' : '↩️'}</span>
                <span className="btn-text">
                  {isMigrationLoading ? '回滚中...' : '回滚到分域模式'}
                </span>
              </button>
            )}

            <button
              type="button"
              className="migration-btn refresh-btn"
              onClick={loadMigrationStatus}
              disabled={isMigrationLoading}
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-text">刷新状态</span>
            </button>
          </div>

          {!migrationStatus.status?.hasDomainData && !migrationStatus.status?.hasGlobalData && (
            <div className="migration-info">
              <span className="info-icon">ℹ️</span>
              <span className="info-text">当前没有积分数据需要迁移</span>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 初始化迁移管理组件
export const initMigrationComponent = () => {
  console.log('Migration Manage Component loading');

  const mountPoint = document.getElementById('migration-manage-component');
  if (mountPoint) {
    const root = createRoot(mountPoint);
    root.render(<MigrationManageComponent />);
    console.log('Migration Manage Component mounted successfully');
  } else {
    console.error('Mount point not found: migration-manage-component');
  }
};
