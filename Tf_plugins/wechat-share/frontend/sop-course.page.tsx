/* eslint-disable react-refresh/only-export-components */
import './sop-course.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import { CodeOutlined, LeftOutlined, ThunderboltOutlined, UpOutlined, BuildOutlined, BlockOutlined } from '@ant-design/icons';
import { ConfigProvider, Empty, Skeleton } from 'antd';
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  SopTemplate,
  GroupSection,
  GroupTimeline,
  RoleToggle,
  GROUP_LABELS_COURSE,
} from './sop-shared';

const theme = { token: { colorPrimary: '#17ae68', borderRadius: 12 } };
const SOP_JSON_URL = (window as any).__SOP_DATA_URL__ || '/sop/data/course-sop.json';
const SOP_IMAGES_BASE = (window as any).__SOP_IMAGES_BASE__ || '/sop/images';

const GROUP_ORDER = ['review', 'performance', 'suggestion', 'conversion'];

// 体系图标映射
const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  scratch: <CodeOutlined />,
  python: <CodeOutlined />,
  cpp: <ThunderboltOutlined />,
  '3dprint': <BuildOutlined />,
  lego: <BlockOutlined />,
};

// 体系简称映射（底部 tab 显示）
const SYSTEM_NAMES: Record<string, string> = {
  scratch: 'Scratch',
  python: 'Python',
  cpp: 'C++',
  '3dprint': '3D打印',
  lego: '乐高',
};

interface SopLesson {
  id: string;
  name: string;
  title: string;
  templates: SopTemplate[];
}

interface SopLevel {
  id: string;
  name: string;
  subtitle: string;
  lessons: SopLesson[];
}

interface SopSystem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  ageRange: string;
  levels: SopLevel[];
}

interface CourseSopData {
  title: string;
  subtitle: string;
  systems: SopSystem[];
}

const SopCoursePage: React.FC = () => {
  const [data, setData] = useState<CourseSopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSystem, setActiveSystem] = useState(0);
  const [activeLevel, setActiveLevel] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [roleFilter, setRoleFilter] = useState('teacher');
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    fetch(SOP_JSON_URL)
      .then((r) => { if (!r.ok) throw new Error('加载失败'); return r.json(); })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 切换体系时重置阶段和课时
  const handleSystemChange = (idx: number) => {
    setActiveSystem(idx);
    setActiveLevel(0);
    setActiveLesson(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 切换阶段时重置课时
  const handleLevelChange = (idx: number) => {
    setActiveLevel(idx);
    setActiveLesson(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLessonChange = (idx: number) => {
    setActiveLesson(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSystem = data?.systems[activeSystem];
  const currentLevel = currentSystem?.levels[activeLevel];
  const currentLesson = currentLevel?.lessons[activeLesson];

  // 当前课时的模板按角色过滤后，按 group 分组
  const groupedTemplates = useMemo(() => {
    if (!currentLesson) return [];
    const filtered = currentLesson.templates.filter((t) => t.role === roleFilter);
    return GROUP_ORDER.map((g) => ({
      group: g,
      templates: filtered.filter((t) => (t.group || 'conversion') === g),
    })).filter((g) => g.templates.length > 0);
  }, [currentLesson, roleFilter]);

  // 当前课时的所有分组（不按角色过滤）
  const allGroups = useMemo(() => {
    if (!currentLesson) return [];
    return GROUP_ORDER.filter((g) =>
      currentLesson.templates.some((t) => (t.group || 'conversion') === g),
    );
  }, [currentLesson]);

  // 当前角色有内容的分组（用于 timeline）
  const activeGroups = useMemo(() => {
    if (!currentLesson) return [];
    return GROUP_ORDER.filter((g) =>
      currentLesson.templates.some(
        (t) => (t.group || 'conversion') === g && t.role === roleFilter,
      ),
    );
  }, [currentLesson, roleFilter]);

  return (
    <div className="sop-course-app sop-app">
      <a className="sop-course-back" href="/sop">
        <LeftOutlined />
      </a>
      <header className="sop-header">
        <h1>{data?.title || '课程课后反馈SOP'}</h1>
        <p className="sop-subtitle">{data?.subtitle || '每节课课后反馈模板，直接复制使用'}</p>
      </header>

      <main className="sop-content sop-course-content">
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !data ? (
          <Empty description="加载失败" />
        ) : !currentSystem || !currentLevel || !currentLesson ? null : (
          <>
            {/* 阶段选择条 */}
            <div className="sop-course-level-bar">
              {currentSystem.levels.map((level, i) => (
                <div
                  key={level.id}
                  className={`sop-course-level-item ${i === activeLevel ? 'active' : ''}`}
                  onClick={() => handleLevelChange(i)}
                >
                  <div className="sop-course-level-name">{level.name}</div>
                  <div className="sop-course-level-sub">{level.subtitle}</div>
                </div>
              ))}
            </div>

            {/* 课时选择条（水平滚动） */}
            <div className="sop-course-lesson-bar">
              {currentLevel.lessons.map((lesson, i) => (
                <div
                  key={lesson.id}
                  className={`sop-course-lesson-item ${i === activeLesson ? 'active' : ''}`}
                  onClick={() => handleLessonChange(i)}
                >
                  <div className="sop-course-lesson-num">{lesson.name}</div>
                </div>
              ))}
            </div>

            {/* 当前课时信息 */}
            <div className="sop-course-lesson-info">
              <div className="sop-course-lesson-info-name">
                {currentSystem.name} {currentLevel.name} · {currentLesson.name}
              </div>
              <div className="sop-course-lesson-info-title">{currentLesson.title}</div>
            </div>

            {/* Timeline + Role Toggle */}
            <div className="sop-toolbar">
              <GroupTimeline
                allGroups={allGroups}
                activeGroups={activeGroups}
                groupLabels={GROUP_LABELS_COURSE}
              />
              <RoleToggle
                roleFilter={roleFilter}
                onToggle={() => setRoleFilter(roleFilter === 'advisor' ? 'teacher' : 'advisor')}
              />
            </div>

            {/* 模板列表 */}
            {groupedTemplates.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--sop-text-hint)', fontSize: 13 }}>
                本课暂无该角色的模板
              </div>
            ) : (
              groupedTemplates.map((g) => (
                <GroupSection
                  key={g.group}
                  groupName={g.group}
                  templates={g.templates}
                  groupLabels={GROUP_LABELS_COURSE}
                  imagesBase={SOP_IMAGES_BASE}
                />
              ))
            )}
          </>
        )}
      </main>

      {/* 底部体系切换 Tab */}
      {data && (
        <nav className="sop-course-system-bar">
          {data.systems.map((sys, i) => (
            <div
              key={sys.id}
              className={`sop-course-system-item ${i === activeSystem ? 'active' : ''}`}
              onClick={() => handleSystemChange(i)}
            >
              <span className="sop-course-system-icon">{SYSTEM_ICONS[sys.icon] || <CodeOutlined />}</span>
              <span className="sop-course-system-name">
                {SYSTEM_NAMES[sys.id] || sys.name}
              </span>
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

addPage(
  new NamedPage(['sop_course'], async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }
    const mountPoint = document.getElementById('sop-course-app');
    if (mountPoint) {
      createRoot(mountPoint).render(
        <ConfigProvider theme={theme}>
          <SopCoursePage />
        </ConfigProvider>,
      );
    }
  }),
);
