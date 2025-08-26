import { addPage, NamedPage } from '@hydrooj/ui-default';
import React from 'react';

// 初始化统计页面的功能
const initializeTypingStats = () => {
  const statsData = (window as any).TypingStatsData || {};
  
  console.log('Typing Stats page loaded with data:', statsData);

  // 图表数据处理
  let progressChart: any = null;
  
  // 初始化进度图表
  const initProgressChart = () => {
    const canvas = document.getElementById('progress-chart') as HTMLCanvasElement;
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('Chart.js not available or canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chartData = generateChartData(statsData.progressData || [], '30d');
    
    progressChart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'WPM',
            data: chartData.wmpData,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            yAxisID: 'y'
          },
          {
            label: '准确率 (%)',
            data: chartData.accuracyData,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: '日期'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'WPM'
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '准确率 (%)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          title: {
            display: true,
            text: '打字进步曲线'
          },
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context: any) {
                if (context.datasetIndex === 0) {
                  return 'WPM: ' + context.parsed.y;
                } else {
                  return '准确率: ' + context.parsed.y + '%';
                }
              }
            }
          }
        }
      }
    });
  };

  // 生成图表数据
  const generateChartData = (progressData: any[], period: string) => {
    if (!progressData || progressData.length === 0) {
      return { labels: [], wmpData: [], accuracyData: [] };
    }

    // 根据时间段筛选数据
    const filtered = filterProgressByPeriod(progressData, period);
    
    return {
      labels: filtered.map((p: any) => p.date),
      wmpData: filtered.map((p: any) => ({ x: p.date, y: p.wmp })),
      accuracyData: filtered.map((p: any) => ({ x: p.date, y: p.accuracy }))
    };
  };

  // 根据时间段过滤进度数据
  const filterProgressByPeriod = (progressData: any[], period: string) => {
    const now = new Date();
    let daysBack: number;
    
    switch (period) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
      default: daysBack = 30;
    }
    
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    return progressData
      .filter((p: any) => new Date(p.date) >= cutoffDate)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  // 初始化热力图
  const initHeatmap = () => {
    const heatmapContainer = document.getElementById('practice-heatmap');
    if (!heatmapContainer || !statsData.heatmapData) return;

    const heatmapData = statsData.heatmapData;
    const today = new Date();
    
    // 生成热力图HTML
    let heatmapHTML = '<div class="heatmap-grid">';
    
    // 生成周标签
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    heatmapHTML += '<div class="weekday-labels">';
    weekdays.forEach((day, index) => {
      if (index % 2 === 1) { // 只显示部分标签以节省空间
        heatmapHTML += `<div class="weekday-label">${day}</div>`;
      } else {
        heatmapHTML += `<div class="weekday-label"></div>`;
      }
    });
    heatmapHTML += '</div>';
    
    // 生成日期方块
    heatmapHTML += '<div class="heatmap-days">';
    
    heatmapData.forEach((day: any) => {
      const date = new Date(day.date);
      const intensity = Math.min(day.intensity || 0, 4);
      const practices = day.practices || 0;
      const totalTime = Math.round((day.totalTime || 0) / 60); // 转换为分钟
      
      heatmapHTML += `
        <div class="heatmap-day level-${intensity}" 
             title="${day.date}: ${practices} 次练习, ${totalTime} 分钟"
             data-date="${day.date}"
             data-practices="${practices}"
             data-time="${totalTime}">
        </div>
      `;
    });
    
    heatmapHTML += '</div></div>';
    
    heatmapContainer.innerHTML = heatmapHTML;

    // 添加月份标签
    addMonthLabels(heatmapContainer, heatmapData);
  };

  // 添加月份标签
  const addMonthLabels = (container: HTMLElement, heatmapData: any[]) => {
    if (heatmapData.length === 0) return;

    const monthLabels = document.createElement('div');
    monthLabels.className = 'month-labels';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let lastMonth = -1;
    let position = 0;
    
    heatmapData.forEach((day: any, index: number) => {
      const date = new Date(day.date);
      const currentMonth = date.getMonth();
      
      if (currentMonth !== lastMonth && index % 7 === 0) { // 月初且在周开始
        const monthLabel = document.createElement('div');
        monthLabel.className = 'month-label';
        monthLabel.textContent = months[currentMonth];
        monthLabel.style.left = `${position * 12}px`; // 假设每个方块宽12px
        monthLabels.appendChild(monthLabel);
        lastMonth = currentMonth;
      }
      position++;
    });
    
    container.insertBefore(monthLabels, container.firstChild);
  };

  // 初始化分布图表
  const initDistributionCharts = () => {
    initDifficultyDistribution();
    initTextTypeDistribution();
  };

  // 难度分布图表
  const initDifficultyDistribution = () => {
    const container = document.getElementById('difficulty-distribution');
    if (!container || !statsData.practiceHistory) return;

    // 统计难度分布
    const difficultyCount: { [key: string]: number } = {};
    statsData.practiceHistory.forEach((record: any) => {
      const difficulty = record.result?.difficulty || 'unknown';
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });

    const total = Object.values(difficultyCount).reduce((sum, count) => sum + count, 0);
    
    let html = '';
    Object.entries(difficultyCount).forEach(([difficulty, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="distribution-bar">
          <div class="bar-label">${difficulty}</div>
          <div class="bar-track">
            <div class="bar-fill difficulty-${difficulty}" style="width: ${percentage}%"></div>
          </div>
          <div class="bar-value">${count} (${percentage}%)</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  };

  // 文本类型分布图表
  const initTextTypeDistribution = () => {
    const container = document.getElementById('text-type-distribution');
    if (!container || !statsData.practiceHistory) return;

    // 统计文本类型分布
    const typeCount: { [key: string]: number } = {};
    statsData.practiceHistory.forEach((record: any) => {
      const textType = record.result?.textType || 'unknown';
      typeCount[textType] = (typeCount[textType] || 0) + 1;
    });

    const total = Object.values(typeCount).reduce((sum, count) => sum + count, 0);
    
    let html = '';
    Object.entries(typeCount).forEach(([type, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="distribution-bar">
          <div class="bar-label">${type}</div>
          <div class="bar-track">
            <div class="bar-fill text-type-${type}" style="width: ${percentage}%"></div>
          </div>
          <div class="bar-value">${count} (${percentage}%)</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  };

  // 图表时间段切换处理
  const handleChartPeriodChange = () => {
    const periodSelect = document.getElementById('chart-period') as HTMLSelectElement;
    if (!periodSelect) return;

    periodSelect.addEventListener('change', (e) => {
      const period = (e.target as HTMLSelectElement).value;
      
      if (progressChart) {
        const chartData = generateChartData(statsData.progressData || [], period);
        progressChart.data.labels = chartData.labels;
        progressChart.data.datasets[0].data = chartData.wmpData;
        progressChart.data.datasets[1].data = chartData.accuracyData;
        progressChart.update();
      }
    });
  };

  // 加载更多历史记录
  const handleLoadMoreHistory = () => {
    const loadMoreBtn = document.getElementById('load-more-history');
    if (!loadMoreBtn) return;

    loadMoreBtn.addEventListener('click', async () => {
      loadMoreBtn.textContent = '加载中...';
      loadMoreBtn.setAttribute('disabled', 'true');

      try {
        const currentRows = document.querySelectorAll('.practice-history-table tbody tr').length;
        const response = await fetch(`/typing/history?limit=20&offset=${currentRows}`);
        const data = await response.json();

        if (data.success && data.data.history) {
          const tbody = document.querySelector('.practice-history-table tbody');
          if (tbody) {
            data.data.history.forEach((record: any) => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${new Date(record.createdAt).toLocaleDateString()}</td>
                <td>${record.result.wmp}</td>
                <td>${record.result.accuracy}%</td>
                <td>${(record.result.timeSpent / 60).toFixed(1)}m</td>
                <td>${record.scoreEarned}</td>
                <td>
                  <span class="difficulty-badge difficulty-${record.result.difficulty}">
                    ${record.result.difficulty}
                  </span>
                </td>
              `;
              tbody.appendChild(row);
            });
          }

          if (data.data.history.length < 20) {
            loadMoreBtn.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('Error loading more history:', error);
      } finally {
        loadMoreBtn.textContent = '加载更多历史';
        loadMoreBtn.removeAttribute('disabled');
      }
    });
  };

  // 数据导出功能
  const handleDataExport = () => {
    const exportBtn = document.getElementById('export-data-btn');
    const modal = document.getElementById('export-modal');
    const downloadBtn = document.getElementById('download-data');
    const formatSelect = document.getElementById('export-format-select') as HTMLSelectElement;

    if (!exportBtn || !modal || !downloadBtn || !formatSelect) return;

    exportBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    downloadBtn.addEventListener('click', async () => {
      const format = formatSelect.value;
      
      try {
        const response = await fetch(`/typing/stats/export?format=${format}`);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `typing-practice-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        modal.style.display = 'none';
      } catch (error) {
        console.error('Error exporting data:', error);
        alert('导出失败，请稍后重试');
      }
    });
  };

  // API数据更新
  const updateStatsFromAPI = async (period: string = '30d') => {
    try {
      const response = await fetch(`/typing/stats/api?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        // 更新图表数据
        if (progressChart && data.data.chartData) {
          progressChart.data.labels = data.data.chartData.labels;
          progressChart.data.datasets[0].data = data.data.chartData.wmpData;
          progressChart.data.datasets[1].data = data.data.chartData.accuracyData;
          progressChart.update();
        }
        
        // 更新统计卡片
        updateOverviewCards(data.data.userStats, data.data.periodStats);
      }
    } catch (error) {
      console.error('Error updating stats from API:', error);
    }
  };

  // 更新概览卡片
  const updateOverviewCards = (userStats: any, periodStats: any) => {
    const updates = {
      'best-wmp': userStats?.bestWPM,
      'best-accuracy': userStats?.bestAccuracy ? `${userStats.bestAccuracy}%` : undefined,
      'total-practices': userStats?.totalPractices,
      'longest-streak': userStats?.longestStreak,
      'user-level': userStats?.level,
      'total-score': userStats?.totalScore
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const element = document.querySelector(`[data-stat="${key}"]`);
        if (element) {
          element.textContent = value.toString();
        }
      }
    });
  };

  // 初始化所有功能
  const initializeAll = () => {
    // 延迟初始化以确保DOM完全加载
    setTimeout(() => {
      initProgressChart();
      initHeatmap();
      initDistributionCharts();
      handleChartPeriodChange();
      handleLoadMoreHistory();
      handleDataExport();
    }, 100);
  };

  // 模态框处理
  const initModalHandlers = () => {
    document.addEventListener('click', (e) => {
      if (e.target instanceof Element) {
        if (e.target.classList.contains('modal-close')) {
          const modal = e.target.closest('.modal');
          if (modal instanceof HTMLElement) {
            modal.style.display = 'none';
          }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
        modals.forEach(modal => {
          if (modal instanceof HTMLElement) {
            modal.style.display = 'none';
          }
        });
      }
    });
  };

  // 启动初始化
  document.addEventListener('DOMContentLoaded', initializeAll);
  initModalHandlers();

  // 定期更新数据（可选）
  setInterval(() => {
    updateStatsFromAPI();
  }, 5 * 60 * 1000); // 每5分钟更新一次
};

// 注册统计页面
addPage(new NamedPage(['typing_stats'], () => {
  console.log('Typing Stats page loaded');
  initializeTypingStats();
}));