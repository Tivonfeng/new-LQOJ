/* eslint-disable react-refresh/only-export-components */
import './sop-home.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AimOutlined,
  ArrowRightOutlined,
  BookOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import React from 'react';
import { createRoot } from 'react-dom/client';

const theme = { token: { colorPrimary: '#17ae68', borderRadius: 12 } };

interface HomeCardProps {
  accent: string;
  accentSoft: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  tags: string[];
  count: string;
  countLabel: string;
  href: string;
}

const HomeCard: React.FC<HomeCardProps> = ({
  accent,
  accentSoft,
  icon,
  badge,
  title,
  desc,
  tags,
  count,
  countLabel,
  href,
}) => (
  <a
    className="sop-home-card"
    href={href}
    style={{ '--accent': accent, '--accent-soft': accentSoft } as React.CSSProperties}
  >
    <div className="sop-home-card-top">
      <div className="sop-home-card-icon">{icon}</div>
      <span className="sop-home-card-badge">{badge}</span>
    </div>

    <div className="sop-home-card-title">{title}</div>
    <div className="sop-home-card-desc">{desc}</div>

    <div className="sop-home-card-tags">
      {tags.map((t) => (
        <span key={t} className="sop-home-card-tag">{t}</span>
      ))}
    </div>

    <div className="sop-home-card-foot">
      <div className="sop-home-card-stat">
        <span className="sop-home-card-stat-num">{count}</span>
        <span className="sop-home-card-stat-label">{countLabel}</span>
      </div>
      <span className="sop-home-card-enter">
        进入
        <ArrowRightOutlined />
      </span>
    </div>
  </a>
);

const SopHomePage: React.FC = () => (
  <div className="sop-home-app">
    <header className="sop-home-header">
      <div className="sop-home-brand">
        <img className="sop-home-brand-logo" src="/wechat/static/logo.png" alt="绿旗编程" />
        <span>绿旗编程</span>
      </div>
      <h1 className="sop-home-title">运营 SOP</h1>
      <p className="sop-home-subtitle">选择要使用的模板集，文案可直接复制到微信群</p>
    </header>

    <div className="sop-home-cards">
      <HomeCard
        accent="#17ae68"
        accentSoft="#e8f7ef"
        icon={<AimOutlined />}
        badge="售前"
        title="体验课群运营 SOP"
        desc="体验课全周期转化指南，覆盖建群到成交"
        tags={['启蒙课', '规划课', '成果课']}
        count="35"
        countLabel="条文案"
        href="/sop/experience"
      />
      <HomeCard
        accent="#4a7dff"
        accentSoft="#eef2ff"
        icon={<BookOutlined />}
        badge="课后"
        title="课程课后反馈 SOP"
        desc="每节课课后反馈模板，老师直接替换发送"
        tags={['Scratch', 'Python', 'C++', '3D打印', '乐高']}
        count="1152"
        countLabel="条模板"
        href="/sop/course"
      />
    </div>

    <footer className="sop-home-footer">
      <p>青少年人工智能科普 · 运营工具</p>
    </footer>
  </div>
);

addPage(
  new NamedPage(['sop_home'], async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }
    const mountPoint = document.getElementById('sop-home-app');
    if (mountPoint) {
      createRoot(mountPoint).render(
        <ConfigProvider theme={theme}>
          <SopHomePage />
        </ConfigProvider>,
      );
    }
  }),
);
