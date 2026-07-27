/* eslint-disable react-refresh/only-export-components */
import './sop-admin.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  CheckOutlined,
  DownOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Empty, message, Skeleton } from 'antd';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

const theme = { token: { colorPrimary: '#17ae68', borderRadius: 12 } };
const SOP_DATA_URL = (window as any).__SOP_DATA_URL__ || '/sop/data/sop.json';
const SOP_COURSE_DATA_URL = (window as any).__SOP_COURSE_DATA_URL__ || '/sop/data/course-sop.json';
const IMAGES_BASE = (window as any).__SOP_IMAGES_BASE__ || '/sop/images';

// ===================== Types =====================
interface SopTemplate {
  id: string;
  title: string;
  usage?: string;
  content: string;
  images?: string[];
  role?: string;
  group?: string;
}

interface SopStage {
  id: string;
  name: string;
  subtitle: string;
  icon?: string;
  desc?: string;
  templates: SopTemplate[];
}

interface SopData {
  title: string;
  subtitle: string;
  stages: SopStage[];
}

interface CourseLesson {
  id: string;
  name: string;
  title: string;
  templates: SopTemplate[];
}

interface CourseLevel {
  id: string;
  name: string;
  subtitle: string;
  lessons: CourseLesson[];
}

interface CourseSystem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  levels: CourseLevel[];
}

interface CourseSopData {
  title: string;
  subtitle: string;
  systems: CourseSystem[];
}

// 定位一个模板的路径
interface TemplateLocation {
  source: 'experience' | 'course';
  stageId?: string;
  systemId?: string;
  levelId?: string;
  lessonId?: string;
  templateId: string;
}

// ===================== API =====================
async function saveFile(file: string, data: any): Promise<boolean> {
  try {
    const res = await fetch('/sop/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, data }),
    });
    const result = await res.json();
    if (result.success) return true;
    message.error(result.error || '保存失败');
    return false;
  } catch {
    message.error('网络错误');
    return false;
  }
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/sop/admin/upload', { method: 'POST', body: formData });
    const result = await res.json();
    if (result.success) return result.filename;
    message.error(result.error || '上传失败');
    return null;
  } catch {
    message.error('上传失败');
    return null;
  }
}

async function deleteImage(filename: string): Promise<boolean> {
  try {
    const res = await fetch('/sop/admin/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    const result = await res.json();
    return !!result.success;
  } catch {
    return false;
  }
}

// ===================== Sidebar =====================
const Sidebar: React.FC<{
  expData: SopData | null;
  courseData: CourseSopData | null;
  selected: TemplateLocation | null;
  onSelect: (loc: TemplateLocation) => void;
}> = ({ expData, courseData, selected, onSelect }) => {
  const [expExpanded, setExpExpanded] = useState(true);
  const [courseExpanded, setCourseExpanded] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSystem = (id: string) => {
    setExpandedSystems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleLevel = (key: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSelected = (loc: TemplateLocation) =>
    selected?.source === loc.source &&
    selected?.templateId === loc.templateId &&
    selected?.stageId === loc.stageId &&
    selected?.systemId === loc.systemId &&
    selected?.levelId === loc.levelId &&
    selected?.lessonId === loc.lessonId;

  return (
    <div className="sop-admin-sidebar">
      {/* 体验课SOP */}
      {expData && (
        <div className="sop-sidebar-section">
          <div className="sop-sidebar-section-header" onClick={() => setExpExpanded(!expExpanded)}>
            <DownOutlined className={`sop-sidebar-section-arrow ${expExpanded ? '' : 'collapsed'}`} />
            🎯 体验课SOP
          </div>
          {expExpanded && (
            <div className="sop-sidebar-section-body">
              {expData.stages.map((stage) => (
                <div key={stage.id}>
                  <div className="sop-sidebar-group" onClick={() => toggleStage(stage.id)}>
                    <DownOutlined className={`sop-sidebar-group-arrow ${expandedStages.has(stage.id) ? '' : 'collapsed'}`} />
                    {stage.name} · {stage.subtitle}
                  </div>
                  {expandedStages.has(stage.id) &&
                    stage.templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={`sop-sidebar-template ${isSelected({ source: 'experience', stageId: stage.id, templateId: tpl.id }) ? 'active' : ''}`}
                        onClick={() => onSelect({ source: 'experience', stageId: stage.id, templateId: tpl.id })}
                      >
                        {tpl.role && (
                          <span className={`sop-sidebar-template-role ${tpl.role}`}>
                            {tpl.role === 'advisor' ? '班' : '师'}
                          </span>
                        )}
                        <span className="sop-sidebar-template-title">{tpl.title}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 课程SOP */}
      {courseData && (
        <div className="sop-sidebar-section">
          <div className="sop-sidebar-section-header" onClick={() => setCourseExpanded(!courseExpanded)}>
            <DownOutlined className={`sop-sidebar-section-arrow ${courseExpanded ? '' : 'collapsed'}`} />
            📚 课程SOP
          </div>
          {courseExpanded && (
            <div className="sop-sidebar-section-body">
              {courseData.systems.map((sys) => (
                <div key={sys.id}>
                  <div className="sop-sidebar-group" onClick={() => toggleSystem(sys.id)}>
                    <DownOutlined className={`sop-sidebar-group-arrow ${expandedSystems.has(sys.id) ? '' : 'collapsed'}`} />
                    {sys.name}
                  </div>
                  {expandedSystems.has(sys.id) &&
                    sys.levels.map((level) => {
                      const levelKey = `${sys.id}-${level.id}`;
                      return (
                        <div key={levelKey}>
                          <div className="sop-sidebar-subgroup" onClick={() => toggleLevel(levelKey)}>
                            <DownOutlined className={`sop-sidebar-group-arrow ${expandedLevels.has(levelKey) ? '' : 'collapsed'}`} />
                            {level.name} {level.subtitle}
                          </div>
                          {expandedLevels.has(levelKey) &&
                            level.lessons.map((lesson) => (
                              <div key={lesson.id}>
                                <div className="sop-sidebar-lesson">{lesson.name} · {lesson.title}</div>
                                {lesson.templates.map((tpl) => (
                                  <div
                                    key={tpl.id}
                                    className={`sop-sidebar-template course ${isSelected({ source: 'course', systemId: sys.id, levelId: level.id, lessonId: lesson.id, templateId: tpl.id }) ? 'active' : ''}`}
                                    onClick={() => onSelect({ source: 'course', systemId: sys.id, levelId: level.id, lessonId: lesson.id, templateId: tpl.id })}
                                  >
                                    {tpl.role && (
                                      <span className={`sop-sidebar-template-role ${tpl.role}`}>
                                        {tpl.role === 'advisor' ? '班' : '师'}
                                      </span>
                                    )}
                                    <span className="sop-sidebar-template-title">{tpl.title}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===================== Editor =====================
const Editor: React.FC<{
  expData: SopData;
  courseData: CourseSopData;
  location: TemplateLocation | null;
  onUpdate: (loc: TemplateLocation, field: string, value: any) => void;
  onSave: () => void;
  saving: boolean;
}> = ({ expData, courseData, location, onUpdate, onSave, saving }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 根据 location 找到当前模板
  const findTemplate = useCallback((): { template: SopTemplate | null; breadcrumb: string } => {
    if (!location) return { template: null, breadcrumb: '' };
    if (location.source === 'experience') {
      const stage = expData.stages.find((s) => s.id === location.stageId);
      const tpl = stage?.templates.find((t) => t.id === location.templateId);
      return {
        template: tpl || null,
        breadcrumb: `体验课SOP / ${stage?.name || ''} / ${tpl?.title || ''}`,
      };
    }
    const sys = courseData.systems.find((s) => s.id === location.systemId);
    const level = sys?.levels.find((l) => l.id === location.levelId);
    const lesson = level?.lessons.find((les) => les.id === location.lessonId);
    const tpl = lesson?.templates.find((t) => t.id === location.templateId);
    return {
      template: tpl || null,
      breadcrumb: `课程SOP / ${sys?.name || ''} / ${level?.name || ''} / ${lesson?.name || ''} / ${tpl?.title || ''}`,
    };
  }, [location, expData, courseData]);

  const { template, breadcrumb } = findTemplate();

  if (!template) {
    return (
      <div className="sop-admin-editor">
        <div className="sop-admin-editor-empty">从左侧选择一个模板进行编辑</div>
      </div>
    );
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const filename = await uploadImage(file);
    setUploading(false);
    if (filename && location) {
      const currentImages = template.images || [];
      onUpdate(location, 'images', [...currentImages, filename]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (filename: string) => {
    // 先从模板中移除
    if (location) {
      const currentImages = template.images || [];
      onUpdate(location, 'images', currentImages.filter((f) => f !== filename));
    }
    // 再删除文件
    await deleteImage(filename);
    message.success('图片已删除');
  };

  return (
    <div className="sop-admin-editor">
      <div className="sop-editor-breadcrumb">{breadcrumb}</div>

      <div className="sop-editor-form">
        <div className="sop-editor-field">
          <label className="sop-editor-label">标题</label>
          <input
            className="sop-editor-input"
            value={template.title}
            onChange={(e) => location && onUpdate(location, 'title', e.target.value)}
          />
        </div>

        <div className="sop-editor-row">
          <div className="sop-editor-field">
            <label className="sop-editor-label">角色</label>
            <select
              className="sop-editor-select"
              value={template.role || 'advisor'}
              onChange={(e) => location && onUpdate(location, 'role', e.target.value)}
            >
              <option value="advisor">班主任</option>
              <option value="teacher">授课老师</option>
            </select>
          </div>
          <div className="sop-editor-field">
            <label className="sop-editor-label">分组</label>
            <select
              className="sop-editor-select"
              value={template.group || ''}
              onChange={(e) => location && onUpdate(location, 'group', e.target.value)}
            >
              {location?.source === 'experience' ? (
                <>
                  <option value="before">课前</option>
                  <option value="during">课中</option>
                  <option value="meeting">家长会</option>
                  <option value="after">课后</option>
                </>
              ) : (
                <>
                  <option value="review">课堂回顾</option>
                  <option value="performance">学员表现</option>
                  <option value="suggestion">学习建议</option>
                  <option value="conversion">续报引导</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="sop-editor-field">
          <label className="sop-editor-label">使用场景</label>
          <input
            className="sop-editor-input"
            value={template.usage || ''}
            placeholder="例如：建群后发布群公告"
            onChange={(e) => location && onUpdate(location, 'usage', e.target.value)}
          />
        </div>

        <div className="sop-editor-field">
          <label className="sop-editor-label">正文内容</label>
          <textarea
            className="sop-editor-textarea"
            value={template.content}
            onChange={(e) => location && onUpdate(location, 'content', e.target.value)}
          />
        </div>

        <div className="sop-editor-field">
          <label className="sop-editor-label">配图</label>
          <div className="sop-editor-images">
            {(template.images || []).map((img) => (
              <div key={img} className="sop-editor-image-item">
                <img src={`${IMAGES_BASE}/${img}`} alt={img} />
                <button
                  className="sop-editor-image-delete"
                  onClick={() => handleDeleteImage(img)}
                >
                  <CloseOutlined />
                </button>
              </div>
            ))}
            <div
              className="sop-editor-image-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? '...' : <PlusOutlined />}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </div>
        </div>

        <div className="sop-editor-actions">
          <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={onSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===================== Admin Page =====================
const SopAdminPage: React.FC = () => {
  const [expData, setExpData] = useState<SopData | null>(null);
  const [courseData, setCourseData] = useState<CourseSopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateLocation | null>(null);
  const [saving, setSaving] = useState(false);
  // 记录哪些文件有未保存修改
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch(SOP_DATA_URL, { headers: { 'Pragma': 'no-cache' } }).then((r) => r.json()),
      fetch(SOP_COURSE_DATA_URL, { headers: { 'Pragma': 'no-cache' } }).then((r) => r.json()),
    ])
      .then(([exp, course]) => {
        setExpData(exp);
        setCourseData(course);
        setLoading(false);
      })
      .catch(() => {
        message.error('数据加载失败');
        setLoading(false);
      });
  }, []);

  // 更新模板字段
  const handleUpdate = (loc: TemplateLocation, field: string, value: any) => {
    if (loc.source === 'experience') {
      setExpData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const stage = next.stages.find((s: SopStage) => s.id === loc.stageId);
        const tpl = stage?.templates.find((t: SopTemplate) => t.id === loc.templateId);
        if (tpl) (tpl as any)[field] = value;
        return next;
      });
      setDirty((prev) => new Set(prev).add('sop.json'));
    } else {
      setCourseData((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const sys = next.systems.find((s: CourseSystem) => s.id === loc.systemId);
        const level = sys?.levels.find((l: CourseLevel) => l.id === loc.levelId);
        const lesson = level?.lessons.find((les: CourseLesson) => les.id === loc.lessonId);
        const tpl = lesson?.templates.find((t: SopTemplate) => t.id === loc.templateId);
        if (tpl) (tpl as any)[field] = value;
        return next;
      });
      setDirty((prev) => new Set(prev).add('course-sop.json'));
    }
  };

  // 保存当前所选数据源
  const handleSave = async () => {
    if (dirty.size === 0) {
      message.info('没有需要保存的修改');
      return;
    }
    setSaving(true);
    let allOk = true;
    for (const file of dirty) {
      const data = file === 'sop.json' ? expData : courseData;
      const ok = await saveFile(file, data);
      if (!ok) allOk = false;
    }
    setSaving(false);
    if (allOk) {
      message.success('保存成功');
      setDirty(new Set());
    }
  };

  return (
    <div className="sop-admin-app">
      <header className="sop-admin-header">
        <div className="sop-admin-header-left">
          <a className="sop-admin-back" href="/sop">
            <CloseOutlined /> 返回
          </a>
          <span className="sop-admin-title">SOP 模板管理</span>
          {dirty.size > 0 && (
            <span style={{ fontSize: 12, color: '#ff8c1a' }}>● 未保存</span>
          )}
        </div>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={saving}
          onClick={handleSave}
          disabled={dirty.size === 0}
          className="sop-admin-save-all"
        >
          保存{dirty.size > 0 ? ` (${dirty.size})` : ''}
        </Button>
      </header>

      {loading ? (
        <div style={{ padding: 40 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : !expData || !courseData ? (
        <Empty description="数据加载失败" />
      ) : (
        <div className="sop-admin-layout">
          <Sidebar
            expData={expData}
            courseData={courseData}
            selected={selected}
            onSelect={setSelected}
          />
          <Editor
            expData={expData}
            courseData={courseData}
            location={selected}
            onUpdate={handleUpdate}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
};

// ===================== Register Page =====================
addPage(
  new NamedPage(['sop_admin'], async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }
    const mountPoint = document.getElementById('sop-admin-app');
    if (mountPoint) {
      createRoot(mountPoint).render(
        <ConfigProvider theme={theme}>
          <SopAdminPage />
        </ConfigProvider>,
      );
    }
  }),
);
