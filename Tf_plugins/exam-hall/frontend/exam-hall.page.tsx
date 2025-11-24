import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ExamHallData } from './types';

const ExamHallApp: React.FC = () => {
  const [data, setData] = useState<ExamHallData | null>(null);

  useEffect(() => {
    // 获取从模板传来的数据
    const examData = (window as any).examHallData as ExamHallData;
    setData(examData);
  }, []);

  if (!data) {
    return <div className="exam-hall-loading">加载中...</div>;
  }

  return (
    <div className="exam-hall-react">
      <div className="exam-hall-header">
        {data.canManage && data.managementUrl && (
          <a href={data.managementUrl} className="manage-button">
            ⚙️ 证书管理
          </a>
        )}
      </div>
      <div className="exam-hall-content">
        <div className="section-heading">欢迎来到赛考大厅</div>
        <p>这是一个管理和展示证书的平台。</p>
      </div>
    </div>
  );
};

// React App 挂载
const container = document.getElementById('exam-hall-react-app');
if (container) {
  const root = createRoot(container);
  root.render(<ExamHallApp />);
}

export default ExamHallApp;
