import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { createRoot } from 'react-dom/client';
import type {
  ExamHallData,
  GrowthChartData,
} from './types';

// ============================================================================
// 📊 Chart.js 注册
// ============================================================================
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const ExamHallApp: React.FC = () => {
  const [data, setData] = useState<ExamHallData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'trend'>('overview');

  useEffect(() => {
    // 获取从模板传来的数据
    const examData = (window as any).examHallData as ExamHallData;
    setData(examData);
  }, []);

  if (!data) {
    return <div className="exam-hall-loading">加载中...</div>;
  }

  const growthChartData: GrowthChartData = {
    labels: data.growthTrend.map((p) => p.date),
    datasets: [
      {
        label: '证书新增',
        data: data.growthTrend.map((p) => p.count),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
      },
      ...(data.newUsersStats
        ? [
          {
            label: '新用户',
            data: data.newUsersStats.trend.map((p) => p.count),
            borderColor: '#48bb78',
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ]
        : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="exam-hall-react">
      <div className="exam-hall-header">
        <div className="exam-hall-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 总览
          </button>
          <button
            className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            🏆 排行榜详情
          </button>
          <button
            className={`tab-button ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            📈 趋势分析
          </button>
        </div>
        {data.canManage && data.managementUrl && (
          <a href={data.managementUrl} className="manage-button">
            ⚙️ 证书管理
          </a>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="exam-hall-overview">
          <div className="overview-grid">
            <div className="overview-card">
              <div className="card-title">🎓 证书总数</div>
              <div className="card-value">{data.domainStats.totalCertificates}</div>
              <div className="card-subtitle">全域证书统计</div>
            </div>
            <div className="overview-card">
              <div className="card-title">👥 活跃用户</div>
              <div className="card-value">{data.domainStats.totalUsers}</div>
              <div className="card-subtitle">获得证书的用户</div>
            </div>
            <div className="overview-card">
              <div className="card-title">📚 证书分类</div>
              <div className="card-value">{data.domainStats.categoryCount}</div>
              <div className="card-subtitle">不同的证书类型</div>
            </div>
            <div className="overview-card">
              <div className="card-title">📊 人均证书</div>
              <div className="card-value">{data.domainStats.averageCertificatesPerUser.toFixed(2)}</div>
              <div className="card-subtitle">平均值</div>
            </div>
          </div>

          {data.isLoggedIn && data.userStats && (
            <div className="user-stats-section">
              <div className="section-heading">🎯 我的成就</div>
              <div className="user-stats-card">
                <div className="stat-row">
                  <span className="stat-label">我的证书数量</span>
                  <span className="stat-value">{data.userStats.totalCertificates}</span>
                </div>
                {data.userRank && (
                  <div className="stat-row">
                    <span className="stat-label">排行榜排名</span>
                    <span className="stat-value rank-badge">
                      #{data.userRank.rank} / {data.userRank.total}
                    </span>
                  </div>
                )}
                {data.userStats.topCategories.length > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">主要分类</span>
                    <span className="stat-value">
                      {data.userStats.topCategories.slice(0, 3).join(' / ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="exam-hall-leaderboard">
          <div className="section-heading">🏆 排行榜详情</div>
          <div className="leaderboard-list">
            {data.leaderboard.slice(0, 20).map((entry, index) => (
              <div key={index} className="leaderboard-item">
                <div className="rank-column">
                  <span
                    className={`rank-medal ${
                      entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : ''
                    }`}
                  >
                    #{entry.rank}
                  </span>
                </div>
                <div className="info-column">
                  <div className="rank-name">[User #{entry.uid}]</div>
                  <div className="rank-categories">
                    {entry.topCategories.slice(0, 3).map((cat, idx) => (
                      <span key={idx} className="category-badge">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="count-column">
                  <div className="count-value">{entry.certificateCount}</div>
                  <div className="count-label">证书</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trend' && (
        <div className="exam-hall-trend">
          <div className="section-heading">📈 增长趋势（最近30天）</div>
          <div className="chart-wrapper">
            <Line data={growthChartData} options={chartOptions} />
          </div>

          {data.popularCategories.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div className="section-heading">🔥 热门分类排行</div>
              <div className="popular-categories">
                {data.popularCategories.map((cat, idx) => (
                  <div key={idx} className="category-item">
                    <div className="category-rank">#{idx + 1}</div>
                    <div className="category-info">
                      <div className="category-name">{cat.category}</div>
                      <div className="category-count">{cat.count} 张证书</div>
                    </div>
                    <div className="category-bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(cat.count / Math.max(...data.popularCategories.map((c) => c.count))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
