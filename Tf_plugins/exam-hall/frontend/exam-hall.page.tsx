import './exam-hall.page.css';

import dayjs from 'dayjs';
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

  const competitions = data.recentCompetitions || [];
  const certifications = data.recentCertifications || [];

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

        {/* 最近一个季度的竞赛证书 */}
        {competitions.length > 0 && (
          <div className="exam-hall-section certificate-section">
            <div className="exam-hall-section-header">
              <h3 className="exam-hall-section-title">
                🏆 最近一个季度的竞赛证书
              </h3>
            </div>
            <div className="certificate-scroll-container">
              <div className="certificate-grid">
                {competitions.map((cert) => (
                  <div key={cert._id} className="certificate-card competition-card">
                    {cert.certificateImageUrl && (
                      <div className="certificate-card-image">
                        <img src={cert.certificateImageUrl} alt={cert.certificateName} />
                      </div>
                    )}
                    <div className="certificate-card-heading">
                      <h4 className="certificate-card-title">{cert.certificateName}</h4>
                      <span className="certificate-card-subtitle">{cert.certifyingBody}</span>
                    </div>
                    <div className="certificate-card-meta">
                      <strong>赛项：</strong>
                      {cert.category}
                    </div>
                    {cert.level && (
                      <div className="certificate-card-meta">
                        <strong>等级：</strong>
                        {cert.level}
                      </div>
                    )}
                    {cert.username && (
                      <div className="certificate-card-username">获得者：{cert.username}</div>
                    )}
                    <div className="certificate-card-date">
                      {dayjs(cert.issueDate).format('YYYY年MM月DD日')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 最近一个季度的考级证书 */}
        {certifications.length > 0 && (
          <div className="exam-hall-section certificate-section">
            <div className="exam-hall-section-header">
              <h3 className="exam-hall-section-title">
                📚 最近一个季度的考级证书
              </h3>
            </div>
            <div className="certificate-scroll-container">
              <div className="certificate-grid">
                {certifications.map((cert) => (
                  <div key={cert._id} className="certificate-card certification-card">
                    {cert.certificateImageUrl && (
                      <div className="certificate-card-image">
                        <img src={cert.certificateImageUrl} alt={cert.certificateName} />
                      </div>
                    )}
                    <div className="certificate-card-heading">
                      <h4 className="certificate-card-title">{cert.certificateName}</h4>
                      <span className="certificate-card-subtitle">{cert.certifyingBody}</span>
                    </div>
                    <div className="certificate-card-meta">
                      <strong>赛项：</strong>
                      {cert.category}
                    </div>
                    {cert.level && (
                      <div className="certificate-card-meta">
                        <strong>等级：</strong>
                        {cert.level}
                      </div>
                    )}
                    {cert.username && (
                      <div className="certificate-card-username">获得者：{cert.username}</div>
                    )}
                    <div className="certificate-card-date">
                      {dayjs(cert.issueDate).format('YYYY年MM月DD日')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {competitions.length === 0 && certifications.length === 0 && (
          <div className="certificate-empty-state">
            <div className="certificate-empty-state-icon">📋</div>
            <div>最近一个季度暂无证书</div>
          </div>
        )}
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
