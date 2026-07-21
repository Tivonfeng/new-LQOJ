/* eslint-disable react-refresh/only-export-components */
// SOP 共享组件：SopTemplateCard, GroupSection, GroupTimeline, RoleToggle, copyText
// 被 sop-experience.page.tsx 和 sop-course.page.tsx 共同引用

import {
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Card, Modal, Space, message } from 'antd';
import React, { useState } from 'react';

// ===================== Types =====================
export interface SopTemplate {
  id: string;
  title: string;
  usage?: string;
  content: string;
  images?: string[];
  role?: 'advisor' | 'teacher';
  group?: string;
}

// ===================== Constants =====================
// 体验课SOP的分组标签
export const GROUP_LABELS_EXPERIENCE: Record<string, string> = {
  before: '课前',
  during: '课中',
  after: '课后',
  meeting: '★ 家长会',
};

// 课程SOP的分组标签
export const GROUP_LABELS_COURSE: Record<string, string> = {
  review: '课堂回顾',
  performance: '学员表现',
  suggestion: '学习建议',
  conversion: '续报引导',
};

// ===================== Utils =====================
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback */
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  try {
    const r = document.execCommand('copy');
    document.body.removeChild(ta);
    return r;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

// ===================== Template Card =====================
export const SopTemplateCard: React.FC<{
  template: SopTemplate;
  imagesBase?: string;
  highlightMeeting?: boolean;
}> = ({ template, imagesBase, highlightMeeting }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const images = template.images?.filter((img) => img) || [];
  const imgBase = imagesBase || '/sop/images';

  const handleCopy = async () => {
    const ok = await copyText(template.content);
    if (ok) {
      setCopied(true);
      message.success('已复制！去微信群粘贴使用');
      setTimeout(() => setCopied(false), 3000);
    } else {
      setModalVisible(true);
    }
  };

  const isMeeting = highlightMeeting && template.group === 'meeting';

  return (
    <Card
      className={`sop-template-card ${isMeeting ? 'sop-template-meeting' : ''}`}
      size="small"
      styles={{ body: { padding: 16 } }}
    >
      <div className="sop-template-header">
        <div className="sop-template-header-left">
          <div className="sop-template-title-row">
            {template.role && (
              <span className={`sop-role-tag ${template.role}`}>
                {template.role === 'advisor' ? '班主任' : '授课老师'}
              </span>
            )}
            <div className="sop-template-title">{template.title}</div>
          </div>
          {template.usage && <div className="sop-template-usage">{template.usage}</div>}
        </div>
        <div className="sop-template-header-actions">
          <Button
            type="primary"
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
          >
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
      </div>
      <div className={`sop-template-content ${!expanded ? 'collapsed' : ''}`}>
        {template.content}
      </div>
      {images.length > 0 && expanded && (
        <div className="sop-image-grid">
          {images.map((img, i) => (
            <div
              key={i}
              className="sop-image-grid-item"
              style={{ backgroundImage: `url(${imgBase}/${img})` }}
              onClick={() => setPreviewImage(img)}
            >
              <img
                src={`${imgBase}/${img}`}
                alt={`${template.title} ${i + 1}`}
                style={{ display: 'none' }}
                onError={(e) => {
                  (e.target as HTMLElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="sop-expand-arrow" onClick={() => setExpanded(!expanded)}>
        <Space size={4}>
          {expanded ? <UpOutlined /> : <DownOutlined />}
          {expanded ? '收起' : '展开全文'}
        </Space>
      </div>
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        title="长按下方文字选择复制"
        footer={
          <Button type="primary" block onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        }
      >
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            userSelect: 'text',
          }}
        >
          {template.content}
        </div>
      </Modal>
      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage('')}
        footer={null}
        width="auto"
        centered
        styles={{ body: { padding: 0 } }}
      >
        {previewImage && (
          <img
            src={`${imgBase}/${previewImage}`}
            alt="预览"
            style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
          />
        )}
      </Modal>
    </Card>
  );
};

// ===================== Group Section =====================
export const GroupSection: React.FC<{
  groupName: string;
  templates: SopTemplate[];
  groupLabels: Record<string, string>;
  highlightKey?: string; // 需要特殊高亮的 group key (如 'meeting')
  imagesBase?: string;
}> = ({ groupName, templates, groupLabels, highlightKey, imagesBase }) => {
  if (templates.length === 0) return null;
  const label = groupLabels[groupName] || groupName;
  const isHighlight = highlightKey && groupName === highlightKey;

  return (
    <div
      id={`sop-group-${groupName}`}
      className={`sop-group-section ${isHighlight ? 'sop-group-meeting' : ''}`}
    >
      <div className="sop-group-label">{label}</div>
      {templates.map((tpl) => (
        <SopTemplateCard
          key={tpl.id}
          template={tpl}
          imagesBase={imagesBase}
          highlightMeeting={!!highlightKey}
        />
      ))}
    </div>
  );
};

// ===================== Group Timeline =====================
export const GroupTimeline: React.FC<{
  allGroups: string[];          // 该阶段/课时的所有分组（不按角色过滤）
  activeGroups: string[];       // 当前角色有内容的分组
  groupLabels: Record<string, string>;
  highlightKey?: string;
}> = ({ allGroups, activeGroups, groupLabels, highlightKey }) => {
  if (allGroups.length <= 1) return null;

  const handleJump = (g: string) => {
    if (!activeGroups.includes(g)) return;
    const el = document.getElementById(`sop-group-${g}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  return (
    <div className="sop-timeline">
      {allGroups.map((g, i) => {
        const isActive = activeGroups.includes(g);
        return (
          <React.Fragment key={g}>
            <div
              className={`sop-timeline-node ${!isActive ? 'disabled' : ''}`}
              onClick={() => handleJump(g)}
            >
              <div className={`sop-timeline-dot ${highlightKey && g === highlightKey ? 'meeting' : ''} ${!isActive ? 'disabled' : ''}`} />
              <span className="sop-timeline-text">{groupLabels[g] || g}</span>
            </div>
            {i < allGroups.length - 1 && <div className={`sop-timeline-line ${!isActive && !activeGroups.includes(allGroups[i + 1]) ? 'faded' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ===================== Role Toggle =====================
export const RoleToggle: React.FC<{
  roleFilter: string;
  onToggle: () => void;
}> = ({ roleFilter, onToggle }) => (
  <div className="sop-role-toggle" onClick={onToggle}>
    <span className="sop-role-toggle-label">
      {roleFilter === 'advisor' ? '班主任' : '授课老师'}
    </span>
    <div className={`sop-role-toggle-switch ${roleFilter === 'teacher' ? 'on' : ''}`}>
      <div className="sop-role-toggle-thumb" />
    </div>
  </div>
);
