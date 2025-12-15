import './student-analytics-admin.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// 管理员学生数据分析页面组件
const StudentAnalyticsAdminApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从全局变量获取数据
    const adminData = (window as any).studentAnalyticsAdminData;
    if (adminData) {
      try {
        const parsedData = typeof adminData === 'string'
          ? JSON.parse(adminData)
          : adminData;
        setData(parsedData);
      } catch (error) {
        console.error('[Student Analytics Admin] Failed to parse data:', error);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="student-analytics-admin-page">Loading...</div>;
  }

  return (
        <div className="student-analytics-admin-page">
            <h1>学生数据分析 - 管理员面板</h1>
            {data && (
                <div>
                    <h2>全局统计</h2>
                    <p>总学生数: {data.globalStats?.totalStudents || 0}</p>
                    <p>总事件数: {data.globalStats?.totalEvents || 0}</p>
                </div>
            )}
        </div>
  );
};

// 注册页面组件
addPage(new NamedPage(['student_analytics_admin'], async () => {
  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
  }

  // 初始化React应用
  const mountPoint = document.getElementById('student-analytics-admin-react-app');
  if (mountPoint) {
    try {
      const root = createRoot(mountPoint);
      root.render(<StudentAnalyticsAdminApp />);
    } catch (error) {
      console.error('[Student Analytics Admin] Failed to render React app:', error);
    }
  } else {
    console.error('[Student Analytics Admin] Mount point not found');
  }
}));
