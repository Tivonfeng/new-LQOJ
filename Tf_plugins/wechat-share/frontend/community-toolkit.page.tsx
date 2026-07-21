/* eslint-disable react-refresh/only-export-components */
import './community-toolkit.page.css';

import { addPage, NamedPage } from '@hydrooj/ui-default';
import {
  AimOutlined,
  ArrowLeftOutlined,
  BellOutlined,
  CameraOutlined,
  CheckOutlined,
  CopyOutlined,
  DownOutlined,
  DownloadOutlined,
  LeftOutlined,
  PhoneOutlined,
  PictureOutlined,
  ReadOutlined,
  RightOutlined,
  RightCircleOutlined,
  SnippetsOutlined,
  StarOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Card, ConfigProvider, Empty, Modal, Skeleton, Space, Tag, Typography, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { Text } = Typography;

// Ant Design 主题色统一为绿旗编程品牌色
const theme = {
  token: {
    colorPrimary: '#17ae68',
    borderRadius: 12,
  },
};

// ===================== Types =====================
interface CourseIndex {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  theme: string;
  lessons: number;
  pricing: 'free' | 'paid';
  clientTypes: string[];
  cover?: string;
  ageRange?: string;
  duration?: string;
  shortTitle?: string;
  category?: string;
}

interface OutlineItem {
  lesson: string;
  title: string;
  desc: string;
}

interface CourseIntro {
  description: string;
  highlights: string[];
  targetAudience: string;
  outline: OutlineItem[];
  gallery: string[];
}

interface TemplateItem {
  id: string;
  title: string;
  tag?: string;
  usage?: string;
  content: string;
  downloadable?: boolean;
  file?: string;
  poster?: string;
}

interface Section {
  type: 'list' | 'table' | 'timeline' | 'division';
  title: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

interface TimelineItem {
  time: string;
  title: string;
  desc: string;
}

interface PhotoGuide {
  title: string;
  headers: string[];
  rows: string[][];
  tips: string[];
}

interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  cover?: string;
  lessons: number;
  pricing: 'free' | 'paid';
  clientTypes: string[];
  code: string;
  intro: CourseIntro;
  share: { title: string; desc: string };
  recruit?: { title: string; templates: TemplateItem[] };
  prepare?: { title: string; sections: Section[] };
  execute?: { title: string; sections: Section[] };
  promote?: {
    title: string;
    templates: TemplateItem[];
    photoGuide?: PhotoGuide;
    albumUrl?: string;
  };
}

// ===================== Constants =====================
const COURSES_BASE = (window as any).__CT_COURSES_BASE__ || '/community-toolkit/courses';
const FILES_BASE = (window as any).__CT_FILES_BASE__ || '/community-toolkit/files';
const IMAGES_BASE = (window as any).__CT_IMAGES_BASE__ || '/community-toolkit/images';
const SHARE_API = (window as any).__CT_SHARE_API__ || '/wechat/share';
const LOGO_URL = (window as any).__CT_LOGO_URL__ || '/wechat/static/logo.png';
const PHONE = '15252522708';

const CLIENT_LABELS: Record<string, string> = {
  community: '社区', school: '学校', institution: '机构', enterprise: '企业',
};

// ===================== Utils =====================
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
  try { const r = document.execCommand('copy'); document.body.removeChild(ta); return r; }
  catch { document.body.removeChild(ta); return false; }
}

function downloadFile(url: string, fileName: string) {
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  if (isWeChat) message.info('如果无法下载，请点击右上角 ⋯ 在浏览器中打开');
  fetch(url)
    .then((res) => { if (!res.ok) throw new Error('not found'); return res.blob(); })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    })
    .catch(() => message.warning('文件即将上线，请稍后再试'));
}

function initWechatShare(shareConfig: { title: string; desc: string }) {
  const ua = navigator.userAgent;
  if (!/MicroMessenger/i.test(ua)) return;
  if (/wxwork/i.test(ua)) return;
  const currentUrl = window.location.href.split('#')[0];
  fetch(`${SHARE_API}?url=${encodeURIComponent(currentUrl)}`)
    .then((r) => r.json())
    .then((result) => {
      if (!result.success) return;
      const c = result.data.jssdkConfig;
      const script = document.createElement('script');
      script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
      script.onload = () => {
        // @ts-ignore
        wx.config({ debug: false, appId: c.appId, timestamp: c.timestamp, nonceStr: c.nonceStr, signature: c.signature, jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'onMenuShareAppMessage', 'onMenuShareTimeline'] });
        // @ts-ignore
        wx.ready(() => {
          const shareData = { title: shareConfig.title, desc: shareConfig.desc, link: currentUrl, imgUrl: window.location.origin + LOGO_URL };
          // @ts-ignore
          wx.updateAppMessageShareData(shareData);
          // @ts-ignore
          wx.updateTimelineShareData({ title: shareData.title, link: shareData.link, imgUrl: shareData.imgUrl });
          // @ts-ignore
          wx.onMenuShareAppMessage(shareData);
          // @ts-ignore
          wx.onMenuShareTimeline({ title: shareData.title, link: shareData.link, imgUrl: shareData.imgUrl });
        });
      };
      document.head.appendChild(script);
    })
    .catch(() => {});
}

// ===================== Gallery (图片轮播) =====================
const Gallery: React.FC<{ images: string[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});

  const validImages = images.map((img, i) => ({ img, i })).filter(({ i }) => !imgError[i]);
  if (validImages.length === 0) {
    return (
      <div className="ct-gallery-empty">
        <PictureOutlined style={{ fontSize: 32, color: '#ccc' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>往期照片即将上线</Text>
      </div>
    );
  }

  const currentImg = validImages[current % validImages.length];
  const loaded = imgLoaded[currentImg.i];

  return (
    <div className="ct-gallery">
      <div className="ct-gallery-main">
        {!loaded && <div className="ct-gallery-loading" />}
        <img
          src={`${IMAGES_BASE}/${currentImg.img}`}
          alt={`往期照片 ${current + 1}`}
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setImgLoaded((prev) => ({ ...prev, [currentImg.i]: true }))}
          onError={() => setImgError((prev) => ({ ...prev, [currentImg.i]: true }))}
        />
      </div>
      {validImages.length > 1 && (
        <>
          <div className="ct-gallery-prev" onClick={() => setCurrent((c) => (c - 1 + validImages.length) % validImages.length)}>
            <LeftOutlined />
          </div>
          <div className="ct-gallery-next" onClick={() => setCurrent((c) => (c + 1) % validImages.length)}>
            <RightOutlined style={{ transform: 'none' }} />
          </div>
          <div className="ct-gallery-dots">
            {validImages.map((_, i) => (
              <span
                key={i}
                className={`ct-gallery-dot ${i === current % validImages.length ? 'active' : ''}`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ===================== Template Card =====================
const TemplateCard: React.FC<{ template: TemplateItem; index: number; sectionKey: string }> = ({ template, index, sectionKey }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // @ts-ignore
  const DATA = (window as any).__CT_DATA__;
  const content = DATA?.[sectionKey]?.templates?.[index]?.content || template.content;

  const handleCopy = async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      message.success('已复制！去微信群/朋友圈粘贴，替换括号内容即可使用');
      setTimeout(() => setCopied(false), 3000);
    } else {
      setModalVisible(true);
    }
  };

  return (
    <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
      <div className="ct-template-header">
        <div className="ct-template-header-left">
          <div className="ct-template-title">{template.title}</div>
          {template.usage && <div className="ct-template-usage">{template.usage}</div>}
        </div>
        <div className="ct-template-header-actions">
          {template.downloadable && template.file && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadFile(`${FILES_BASE}/${encodeURIComponent(template.file)}`, template.file!)}>
              下载
            </Button>
          )}
          <Button type="primary" size="small" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
      </div>
      <div className={`ct-template-content ${!expanded ? 'collapsed' : ''}`}>{content}</div>
      {template.poster && expanded && (
        <div className="ct-poster-section">
          <div className="ct-poster-hint">长按图片保存到手机</div>
          <img
            className="ct-poster-img"
            src={`${IMAGES_BASE}/${encodeURIComponent(template.poster)}`}
            alt={template.title}
            onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="ct-expand-arrow" onClick={() => setExpanded(!expanded)}>
        <Space size={4}>
          {expanded ? <UpOutlined /> : <DownOutlined />}
          {expanded ? '收起' : '展开全文'}
        </Space>
      </div>
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        title="长按下方文字选择复制"
        footer={<Button type="primary" block onClick={() => setModalVisible(false)}>关闭</Button>}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'text' }}>
          {content}
        </div>
      </Modal>
    </Card>
  );
};

// ===================== Section Renderers =====================
const ListSection: React.FC<{ section: Section }> = ({ section }) => (
  <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
    <div className="ct-section-title">{section.title}</div>
    <ul className="ct-checklist">
      {section.items?.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  </Card>
);

const TableSection: React.FC<{ section: Section }> = ({ section }) => (
  <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
    <div className="ct-section-title">{section.title}</div>
    <table className="ct-data-table">
      <thead><tr>{section.headers?.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>
        {section.rows?.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </Card>
);

const DivisionSection: React.FC<{ section: Section }> = ({ section }) => {
  if (!section.rows) return null;
  const headers = section.headers || [];
  const greenHeader = headers[1] || '绿旗编程';
  const blueHeader = headers[2] || '合作方';
  const greenItems: { text: string; tag?: string }[] = [];
  const blueItems: { text: string; tag?: string }[] = [];

  section.rows.forEach((row) => {
    const item = row[0];
    const g = row[1] || '';
    const b = row[2] || '';
    if (g && b) {
      greenItems.push({ text: item, tag: g });
      blueItems.push({ text: item, tag: b });
    } else if (g) {
      greenItems.push({ text: item, tag: g === '✅' ? undefined : g });
    } else if (b) {
      blueItems.push({ text: item, tag: b === '✅' ? undefined : b });
    }
  });

  return (
    <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
      <div className="ct-section-title">{section.title}</div>
      <div className="ct-division-container">
        <div className="ct-division-group">
          <div className="ct-division-group-title green">{greenHeader}</div>
          <div className="ct-division-items">
            {greenItems.map((item, i) => (
              <div key={i} className="ct-division-item">
                {item.text}
                {item.tag && <span className="ct-division-tag">({item.tag})</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="ct-division-group">
          <div className="ct-division-group-title blue">{blueHeader}</div>
          <div className="ct-division-items">
            {blueItems.map((item, i) => (
              <div key={i} className="ct-division-item">
                {item.text}
                {item.tag && <span className="ct-division-tag">({item.tag})</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const TimelineSection: React.FC<{ section: Section }> = ({ section }) => (
  <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
    <div className="ct-section-title">{section.title}</div>
    <div className="ct-timeline">
      {section.items?.map((item, i) => {
        const t = item as unknown as TimelineItem;
        return (
          <div className="ct-timeline-item" key={i}>
            <div className="ct-timeline-time">{t.time}</div>
            <div className="ct-timeline-title">{t.title}</div>
            <div className="ct-timeline-desc">{t.desc}</div>
          </div>
        );
      })}
    </div>
  </Card>
);

const renderSection = (section: Section) => {
  if (section.type === 'list') return <ListSection key={section.title} section={section} />;
  if (section.type === 'table') return <TableSection key={section.title} section={section} />;
  if (section.type === 'division') return <DivisionSection key={section.title} section={section} />;
  if (section.type === 'timeline') return <TimelineSection key={section.title} section={section} />;
  return null;
};

// ===================== Tab Bar =====================
const TabBar: React.FC<{ active: string; onChange: (tab: string) => void }> = ({ active, onChange }) => {
  const tabs = [
    { key: 'intro', icon: <ReadOutlined />, label: '介绍' },
    { key: 'recruit', icon: <BellOutlined />, label: '招募' },
    { key: 'execute', icon: <AimOutlined />, label: '备课' },
    { key: 'promote', icon: <CameraOutlined />, label: '宣传' },
  ];
  return (
    <nav className="ct-tab-bar">
      {tabs.map((tab) => (
        <div key={tab.key} className={`ct-tab-item ${active === tab.key ? 'active' : ''}`} onClick={() => onChange(tab.key)}>
          <span className="ct-tab-icon">{tab.icon}</span>
          {tab.label}
        </div>
      ))}
    </nav>
  );
};

const THEME_LABELS: Record<string, string> = {
  ai: 'AI课',
  programming: '编程课',
  maker: '创客课',
  thinking: '思维课',
};

// ===================== Course List Page =====================
const CourseListPage: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
  const [courses, setCourses] = useState<CourseIndex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${COURSES_BASE}/index.json`)
      .then((r) => r.json())
      .then((data) => { setCourses(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  return (
    <div className="ct-app">
      <header className="ct-header">
        <img className="ct-header-logo" src={LOGO_URL} alt="绿旗编程" />
        <div className="ct-header-text">
          <h1>绿旗编程 · B端合作平台</h1>
        </div>
      </header>
      <main className="ct-content">
        <div className="ct-platform-intro">
          <p className="ct-platform-intro-text">为社区、学校、机构提供一站式课程交付工具包，招募文案、执行流程、宣传模板，解锁即用，复制即发。</p>
        </div>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : courses.length === 0 ? (
          <Empty description="暂无课程" />
        ) : (
          <div className="ct-course-grid-2x2">
            {courses.map((course) => (
              <Card key={course.id} className="ct-course-card-2x2" onClick={() => onSelect(course.id)}>
                <div className="ct-course-card-2x2-body">
                  <div className="ct-course-cover-2x2" style={{ backgroundImage: `url(${IMAGES_BASE}/${course.cover})` }}>
                    {course.category && <div className="ct-course-badge-2x2">{course.category}</div>}
                  </div>
                  <div className="ct-course-title-2x2">{course.shortTitle || course.title}</div>
                  <div className="ct-course-meta-2x2">
                    {course.ageRange && <span className="ct-course-age-2x2">{course.ageRange}</span>}
                    <span>{course.duration || `${course.lessons}节`}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        <Card className="ct-about" size="small">
          <div className="ct-about-title">关于绿旗编程</div>
          <div className="ct-about-desc">
            创办于2016年，累计培养学员超千人，近百人在省级以上赛事获奖。<br />
            课程覆盖Scratch、Python、C++信奥全链路，由前大厂工程师领衔教学。
          </div>
          <div className="ct-contact">
            <Button type="link" icon={<PhoneOutlined />} href={`tel:${PHONE}`} style={{ fontWeight: 600 }}>
              冯老师 {PHONE}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

// ===================== Course Intro Page (展示页) =====================
const CourseIntroPage: React.FC<{ courseId: string; onBack: () => void; onEnter: () => void }> = ({ courseId, onBack, onEnter }) => {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${COURSES_BASE}/${courseId}.json`)
      .then((r) => { if (!r.ok) throw new Error('课程不存在'); return r.json(); })
      .then((course) => {
        setData(course);
        (window as any).__CT_DATA__ = course;
        setLoading(false);
        if (course.share) initWechatShare(course.share);
      })
      .catch(() => setLoading(false));
  }, [courseId]);

  if (loading) return (
    <div className="ct-app">
      <header className="ct-header">
        <span className="ct-back" onClick={onBack}><ArrowLeftOutlined /></span>
        <Skeleton.Input active size="small" style={{ width: 200 }} />
      </header>
      <main className="ct-content"><Skeleton active paragraph={{ rows: 8 }} /></main>
    </div>
  );

  if (!data) return (
    <div className="ct-app">
      <header className="ct-header"><span className="ct-back" onClick={onBack}><ArrowLeftOutlined /></span></header>
      <main className="ct-content">
        <Empty description="课程加载失败">
          <Button type="primary" onClick={onBack}>返回课程列表</Button>
        </Empty>
      </main>
    </div>
  );

  const intro = data.intro;

  return (
    <div className="ct-app">
      <div className="ct-cover-header">
        {data.cover && (
          <div className="ct-cover-header-bg" style={{ backgroundImage: `url(${IMAGES_BASE}/${data.cover})` }} />
        )}
        <div className="ct-cover-header-overlay" />
        <span className="ct-back ct-back-float" onClick={onBack}><ArrowLeftOutlined /></span>
        <div className="ct-cover-header-info">
          <h1>{data.title}</h1>
          <p className="ct-subtitle">{data.subtitle}</p>
        </div>
      </div>
      <main className="ct-content">
        {/* 基本信息标签行 */}
        <div className="ct-intro-tags">
          <Tag icon={<StarOutlined />} color="green">{intro.targetAudience}</Tag>
          <Tag icon={<AimOutlined />} color="green">{data.lessons}课时</Tag>
          <Tag color={data.pricing === 'free' ? 'green' : 'orange'}>{data.pricing === 'free' ? '公益免费' : '付费'}</Tag>
        </div>

        {/* 课程介绍 + 亮点合并 */}
        <Card className="ct-intro-card" size="small" styles={{ body: { padding: 16 } }}>
          <p className="ct-intro-desc">{intro.description}</p>
          <div className="ct-highlights">
            {intro.highlights.map((h, i) => (
              <div key={i} className="ct-highlight-item">
                <CheckOutlined className="ct-highlight-icon" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 课程大纲 */}
        <Card className="ct-intro-card" size="small" styles={{ body: { padding: 16 } }}>
          <div className="ct-section-title"><SnippetsOutlined /> 课程大纲</div>
          <div className="ct-outline">
            {intro.outline.map((item, i) => (
              <div key={i} className="ct-outline-item">
                <div className="ct-outline-lesson">{item.lesson}</div>
                <div className="ct-outline-content">
                  <div className="ct-outline-title">{item.title}</div>
                  <div className="ct-outline-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 往期现场图片 - 全宽 */}
        <div className="ct-section-title" style={{ marginTop: 16 }}><CameraOutlined /> 往期现场</div>
        <Gallery images={intro.gallery} />
        {data.promote?.albumUrl && (
          <Button
            type="link"
            icon={<PictureOutlined />}
            href={data.promote.albumUrl}
            target="_blank"
            style={{ marginTop: 8, padding: 0 }}
          >
            查看更多往期照片
          </Button>
        )}

        {/* 行动按钮 */}
        <div className="ct-unlock-area">
          <div className="ct-contact-btn-row">
            <Button
              size="large"
              block
              icon={<PhoneOutlined />}
              href={`tel:${PHONE}`}
              style={{ borderRadius: 'var(--ct-radius-btn)', height: 48, fontSize: 16 }}
            >
              联系合作
            </Button>
          </div>
          <Button
            type="primary"
            size="large"
            block
            icon={<RightCircleOutlined />}
            onClick={onEnter}
            style={{ borderRadius: 'var(--ct-radius-btn)', height: 48, fontSize: 16, marginTop: 8 }}
          >
            进入工具包
          </Button>
        </div>
      </main>
    </div>
  );
};

// ===================== Course Toolkit Page (工具包，解锁后) =====================
const CourseToolkitPage: React.FC<{ courseId: string; onBack: () => void; onIntro: () => void }> = ({ courseId, onBack, onIntro }) => {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('intro');

  useEffect(() => {
    setLoading(true);
    fetch(`${COURSES_BASE}/${courseId}.json`)
      .then((r) => { if (!r.ok) throw new Error('课程不存在'); return r.json(); })
      .then((course) => {
        setData(course);
        (window as any).__CT_DATA__ = course;
        setLoading(false);
        if (course.share) initWechatShare(course.share);
      })
      .catch(() => setLoading(false));
  }, [courseId]);

  if (loading) return (
    <div className="ct-app">
      <header className="ct-header">
        <span className="ct-back" onClick={onBack}><ArrowLeftOutlined /></span>
        <Skeleton.Input active size="small" style={{ width: 200 }} />
      </header>
      <main className="ct-content"><Skeleton active paragraph={{ rows: 6 }} /></main>
    </div>
  );

  if (!data) return (
    <div className="ct-app">
      <header className="ct-header"><span className="ct-back" onClick={onBack}><ArrowLeftOutlined /></span></header>
      <main className="ct-content">
        <Empty description="课程加载失败">
          <Button type="primary" onClick={onBack}>返回课程列表</Button>
        </Empty>
      </main>
    </div>
  );

  return (
    <div className="ct-app">
      <header className="ct-header">
        <span className="ct-back" onClick={onBack}><ArrowLeftOutlined /></span>
        <img className="ct-header-icon" src={data.cover ? `${IMAGES_BASE}/${data.cover}` : LOGO_URL} alt={data.title} />
        <div className="ct-header-text">
          <h1>{data.title}</h1>
          <p className="ct-subtitle">{data.subtitle}</p>
        </div>
        <span className="ct-header-intro-btn" onClick={onIntro}>返回</span>
      </header>
      <main className="ct-content has-tabbar">
        {tab === 'intro' && (
          <>
            <div className="ct-intro-tags">
              <Tag icon={<StarOutlined />} color="green">{data.intro.targetAudience}</Tag>
              <Tag icon={<AimOutlined />} color="green">{data.lessons}课时</Tag>
              <Tag color={data.pricing === 'free' ? 'green' : 'orange'}>{data.pricing === 'free' ? '公益免费' : '付费'}</Tag>
            </div>
            <Card className="ct-intro-card" size="small" styles={{ body: { padding: 16 } }}>
              <p className="ct-intro-desc">{data.intro.description}</p>
              <div className="ct-highlights">
                {data.intro.highlights.map((h, i) => (
                  <div key={i} className="ct-highlight-item">
                    <CheckOutlined className="ct-highlight-icon" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="ct-intro-card" size="small" styles={{ body: { padding: 16 } }}>
              <div className="ct-section-title"><SnippetsOutlined /> 课程大纲</div>
              <div className="ct-outline">
                {data.intro.outline.map((item, i) => (
                  <div key={i} className="ct-outline-item">
                    <div className="ct-outline-lesson">{item.lesson}</div>
                    <div className="ct-outline-content">
                      <div className="ct-outline-title">{item.title}</div>
                      <div className="ct-outline-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
        {tab === 'recruit' && data.recruit && (
          <>
            <div className="ct-section-title"><BellOutlined /> {data.recruit.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ct-text-hint)', marginBottom: 12 }}>
              点击「复制」后粘贴到微信群/朋友圈，替换括号内容即可使用
            </div>
            {data.recruit.templates.map((tpl, i) => (
              <TemplateCard key={tpl.id} template={tpl} index={i} sectionKey="recruit" />
            ))}
          </>
        )}
        {tab === 'execute' && (
          <>
            {data.prepare && data.prepare.sections.map(renderSection)}
            {data.execute && data.execute.sections.map(renderSection)}
          </>
        )}
        {tab === 'promote' && data.promote && (
          <>
            <div className="ct-section-title"><ReadOutlined /> {data.promote.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ct-text-hint)', marginBottom: 12 }}>
              复制文案后替换括号内容，用于公众号/宣传栏发布
            </div>
            {data.promote.templates.map((tpl, i) => (
              <TemplateCard key={tpl.id} template={tpl} index={i} sectionKey="promote" />
            ))}
            {data.promote.albumUrl && (
              <Card className="ct-album-card" size="small" styles={{ body: { textAlign: 'center', padding: '24px 20px' } }}>
                <CameraOutlined style={{ fontSize: 32, color: 'var(--ct-primary)' }} />
                <div className="ct-album-title">活动照片相册</div>
                <div className="ct-album-desc">点击进入相册，查看和下载活动照片</div>
                <Button type="primary" href={data.promote.albumUrl} target="_blank" style={{ marginTop: 12, borderRadius: 'var(--ct-radius-btn)' }}>
                  进入相册
                </Button>
              </Card>
            )}
            {data.promote.photoGuide && (
              <Card className="ct-template-card" size="small" styles={{ body: { padding: 16 } }}>
                <div className="ct-section-title">{data.promote.photoGuide.title}</div>
                <table className="ct-data-table">
                  <thead><tr>{data.promote.photoGuide.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.promote.photoGuide.rows.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {data.promote.photoGuide.tips && (
                  <div className="ct-tips-box" style={{ marginTop: 12 }}>
                    <div className="ct-tips-title">拍照 Tips</div>
                    <ul>{data.promote.photoGuide.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>
      <TabBar active={tab} onChange={(t) => { setTab(t); window.scrollTo(0, 0); }} />
    </div>
  );
};

// ===================== App (Root with hash routing) =====================
const App: React.FC = () => {
  const [view, setView] = useState<'list' | 'intro' | 'toolkit'>('list');
  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    const handleHash = () => {
      const hash = location.hash.slice(1);
      const parts = hash.split('/').filter(Boolean);
      if (parts[0] === 'course' && parts[1]) {
        setCourseId(parts[1]);
        setView('intro');
      } else {
        setView('list');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const selectCourse = useCallback((id: string) => {
    location.hash = `course/${id}`;
  }, []);

  const backToList = useCallback(() => {
    location.hash = '';
  }, []);

  const goToToolkit = useCallback(() => {
    setView('toolkit');
  }, []);

  const goToIntro = useCallback(() => {
    setView('intro');
  }, []);

  if (view === 'intro') {
    return <CourseIntroPage courseId={courseId} onBack={backToList} onEnter={goToToolkit} />;
  }
  if (view === 'toolkit') {
    return <CourseToolkitPage courseId={courseId} onBack={backToList} onIntro={goToIntro} />;
  }
  return <CourseListPage onSelect={selectCourse} />;
};

// ===================== Register Page =====================
addPage(
  new NamedPage(['community_toolkit'], async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
    }
    const mountPoint = document.getElementById('community-toolkit-app');
    if (mountPoint) {
      createRoot(mountPoint).render(
        <ConfigProvider theme={theme}>
          <App />
        </ConfigProvider>,
      );
    }
  }),
);
