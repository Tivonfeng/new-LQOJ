/* eslint-disable react-refresh/only-export-components */
import './sop-experience.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import { CheckOutlined, LeftOutlined, UpOutlined } from '@ant-design/icons';
import { ConfigProvider, Empty, Skeleton } from 'antd';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  SopTemplate,
  GroupSection,
  GroupTimeline,
  RoleToggle,
  GROUP_LABELS_EXPERIENCE,
} from './sop-shared';

const theme = { token: { colorPrimary: '#17ae68', borderRadius: 12 } };
const SOP_JSON_URL = (window as any).__SOP_DATA_URL__ || '/sop/data/sop.json';
const SOP_IMAGES_BASE = (window as any).__SOP_IMAGES_BASE__ || '/sop/images';

interface SopStage {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  desc: string;
  templates: SopTemplate[];
}

interface SopData {
  title: string;
  subtitle: string;
  stages: SopStage[];
}

const GROUP_ORDER = ['before', 'during', 'meeting', 'after'];

// ===================== Stage Card =====================
const StageCard: React.FC<{
  stage: SopStage;
  index: number;
  done: boolean;
  onDone: () => void;
  roleFilter: string;
}> = ({ stage, index, done, onDone, roleFilter }) => {
  const filteredTemplates = stage.templates.filter((t) => t.role === roleFilter);

  const groupedTemplates = GROUP_ORDER.map((g) => ({
    group: g,
    templates: filteredTemplates.filter((t) => (t.group || 'after') === g),
  })).filter((g) => g.templates.length > 0);

  return (
    <div className={`sop-stage-card ${done ? 'sop-stage-done' : ''}`}>
      <div className="sop-stage-header">
        <div className="sop-stage-left">
          <div className={`sop-stage-num ${done ? 'done' : ''}`} onClick={onDone}>
            {done ? <CheckOutlined /> : index + 1}
          </div>
          <div className="sop-stage-info">
            <div className="sop-stage-name">{stage.name} · {stage.subtitle}</div>
            <div className="sop-stage-desc">{stage.desc}</div>
          </div>
        </div>
        <div className="sop-stage-count">{filteredTemplates.length}条</div>
      </div>
      <div className="sop-stage-body">
        {groupedTemplates.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--sop-text-hint)', fontSize: 13 }}>
            本阶段暂无该角色的文案
          </div>
        ) : (
          groupedTemplates.map((g) => (
            <GroupSection
              key={g.group}
              groupName={g.group}
              templates={g.templates}
              groupLabels={GROUP_LABELS_EXPERIENCE}
              highlightKey="meeting"
              imagesBase={SOP_IMAGES_BASE}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ===================== SOP Page =====================
const SopPage: React.FC = () => {
  const [data, setData] = useState<SopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('');
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [doneStages, setDoneStages] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState('advisor');

  useEffect(() => {
    fetch(SOP_JSON_URL)
      .then((r) => { if (!r.ok) throw new Error('加载失败'); return r.json(); })
      .then((d) => {
        setData(d);
        setLoading(false);
        setActiveStage(d.stages[0]?.id || '');
        try {
          const saved = localStorage.getItem('sop_done_stages');
          if (saved) setDoneStages(new Set(JSON.parse(saved)));
        } catch { /* ignore */ }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (activeStage) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStage]);

  const toggleDone = (stageId: string) => {
    setDoneStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      try {
        localStorage.setItem('sop_done_stages', JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  };

  const activeStageData = data?.stages.find((s) => s.id === activeStage);
  const activeStageIndex = data?.stages.findIndex((s) => s.id === activeStage) ?? 0;

  // 当前阶段的所有分组（不按角色过滤）
  const allGroups = activeStageData
    ? GROUP_ORDER.filter((g) =>
        activeStageData.templates.some((t) => (t.group || 'after') === g),
      )
    : [];

  // 当前角色有内容的分组
  const activeGroups = activeStageData
    ? GROUP_ORDER.filter((g) =>
        activeStageData.templates.some(
          (t) => (t.group || 'after') === g && t.role === roleFilter,
        ),
      )
    : [];

  return (
    <div className="sop-app">
      <a className="sop-course-back" href="/sop">
        <LeftOutlined />
      </a>
      <header className="sop-header">
        <h1>体验课群运营SOP</h1>
        <p className="sop-subtitle">体验课全周期转化指南，文案直接复制</p>
      </header>
      <main className="sop-content has-tabbar">
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !data ? (
          <Empty description="加载失败" />
        ) : !activeStageData ? null : (
          <>
            <div className="sop-toolbar">
              <GroupTimeline
                allGroups={allGroups}
                activeGroups={activeGroups}
                groupLabels={GROUP_LABELS_EXPERIENCE}
                highlightKey="meeting"
              />
              <RoleToggle
                roleFilter={roleFilter}
                onToggle={() => setRoleFilter(roleFilter === 'advisor' ? 'teacher' : 'advisor')}
              />
            </div>

            <StageCard
              stage={activeStageData}
              index={activeStageIndex}
              done={doneStages.has(activeStageData.id)}
              onDone={() => toggleDone(activeStageData.id)}
              roleFilter={roleFilter}
            />
          </>
        )}
      </main>
      {data && (
        <nav className="sop-tab-bar">
          {data.stages.map((stage, i) => (
            <div
              key={stage.id}
              className={`sop-tab-item ${activeStage === stage.id ? 'active' : ''}`}
              onClick={() => setActiveStage(stage.id)}
            >
              <span className="sop-tab-num">
                {doneStages.has(stage.id) ? <CheckOutlined /> : i + 1}
              </span>
              <span className="sop-tab-label">{stage.name}</span>
            </div>
          ))}
        </nav>
      )}
      {showTopBtn && (
        <div className="sop-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <UpOutlined />
        </div>
      )}
    </div>
  );
};

// ===================== Register Page =====================
addPage(
  new NamedPage(['sales_sop'], async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }
    const mountPoint = document.getElementById('sop-app');
    if (mountPoint) {
      createRoot(mountPoint).render(
        <ConfigProvider theme={theme}>
          <SopPage />
        </ConfigProvider>,
      );
    }
  }),
);
