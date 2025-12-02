/* eslint-disable react-refresh/only-export-components */
import { addPage, NamedPage } from '@hydrooj/ui-default';
import { Button, Card, Empty, message, Tabs, Tag } from 'antd';
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface TurtleWork {
  id: string;
  title: string;
  imageUrl?: string;
  likes: number;
  views: number;
  uid: number;
}

interface UserDoc {
  _id: number;
  uname: string;
  [key: string]: any;
}

interface GalleryData {
  works: TurtleWork[];
  myWorks: TurtleWork[];
  udocs: Record<string | number, UserDoc>;
  isLoggedIn: boolean;
  currentUserId: number | null;
  page: number;
  total: number;
  totalPages: number;
}

const TurtleGallery: React.FC<GalleryData> = ({
  works,
  myWorks,
  udocs,
  isLoggedIn,
  currentUserId,
  page,
  total,
  totalPages,
}) => {
  const [allWorks, setAllWorks] = useState<TurtleWork[]>(works);
  const [ownWorks, setOwnWorks] = useState<TurtleWork[]>(myWorks);

  const hasMyWorks = isLoggedIn && ownWorks.length > 0;

  const tabsItems = useMemo(
    () => [
      ...(isLoggedIn
        ? [
          {
            key: 'my',
            label: (
                <>
                  📁 我的作品
                  {ownWorks.length > 0 && (
                    <Tag style={{ marginLeft: 8 }} color="blue">
                      {ownWorks.length}
                    </Tag>
                  )}
                </>
            ),
            children: ownWorks.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="你还没有创作任何作品，点击右上角「新建作品」来开始吧～"
                />
            ) : (
                <WorkGrid
                  works={ownWorks}
                  udocs={udocs}
                  isOwn
                  onDeleted={(id) => {
                    setOwnWorks((list) => list.filter((w) => w.id !== id));
                    setAllWorks((list) => list.filter((w) => w.id !== id));
                  }}
                  onLiked={(id) => {
                    setOwnWorks((list) =>
                      list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                    );
                    setAllWorks((list) =>
                      list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                    );
                  }}
                />
            ),
          },
        ]
        : []),
      {
        key: 'all',
        label: (
          <>
            🌍 全部作品
            {total > 0 && (
              <Tag style={{ marginLeft: 8 }} color="default">
                {total}
              </Tag>
            )}
          </>
        ),
        children:
          allWorks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前还没有公开作品，快来成为第一个分享作品的人吧～"
            />
          ) : (
            <WorkGrid
              works={allWorks}
              udocs={udocs}
              currentUserId={currentUserId}
              onLiked={(id) => {
                setAllWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
                setOwnWorks((list) =>
                  list.map((w) => (w.id === id ? { ...w, likes: w.likes + 1 } : w)),
                );
              }}
            />
          ),
      },
    ],
    [isLoggedIn, ownWorks, allWorks, total, udocs],
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            🐢 Python Turtle 作品社区
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            创作、分享、浏览同学们的海龟绘图作品。
          </p>
        </div>
        {isLoggedIn && (
          <Button
            type="primary"
            size="large"
            onClick={() => {
              window.location.href = '/turtle/playground';
            }}
          >
            新建作品
          </Button>
        )}
      </div>

      <Card>
        <Tabs
          defaultActiveKey={hasMyWorks ? 'my' : 'all'}
          items={tabsItems}
        />
      </Card>

      {totalPages > 1 && (
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              size="small"
              type={p === page ? 'primary' : 'default'}
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('page', String(p));
                window.location.href = url.toString();
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

interface WorkGridProps {
  works: TurtleWork[];
  udocs: Record<string | number, UserDoc>;
  isOwn?: boolean;
  onDeleted?: (id: string) => void;
  onLiked?: (id: string) => void;
  currentUserId?: number | null;
}

const WorkGrid: React.FC<WorkGridProps> = ({
  works,
  udocs,
  isOwn,
  onDeleted,
  currentUserId,
  onLiked,
}) => {
  const handleLike = async (work: TurtleWork) => {
    try {
      const resp = await fetch(`/turtle/work/${work.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', workId: work.id }),
      });
      const data = await resp.json();
      if (data.success) {
        onLiked?.(work.id);
      } else {
        message.error(data.message || '点赞失败');
      }
    } catch {
      message.error('点赞请求失败');
    }
  };
  const handleDelete = async (work: TurtleWork) => {
    if (!onDeleted) return;
    if (!window.confirm(`确定要删除作品「${work.title}」吗？`)) return;
    try {
      const resp = await fetch(`/turtle/work/${work.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', workId: work.id }),
      });
      const data = await resp.json();
      if (data.success) {
        onDeleted(work.id);
        message.success('删除成功');
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (e) {
      message.error('删除请求失败');
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}
    >
      {works.map((work) => {
        const author = udocs[work.uid] || udocs[String(work.uid)];
        return (
          <Card
            key={work.id}
            hoverable
            cover={
              work.imageUrl ? (
                <div
                  style={{
                    width: '100%',
                    paddingTop: '62%',
                    backgroundImage: `url(${work.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    paddingTop: '62%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    background: '#f3f4f6',
                  }}
                >
                  🐢
                </div>
              )
            }
          >
            <Card.Meta
              title={work.title}
              description={
                <div>
                  {!isOwn && author && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      作者：{author.uname}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: '#6b7280',
                    }}
                  >
                    <span>❤️ {work.likes}</span>
                    <span>👁️ {work.views}</span>
                  </div>
                </div>
              }
            />
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <Button
                size="small"
                onClick={() => {
                  window.location.href = `/turtle/work/${work.id}`;
                }}
              >
                查看
              </Button>
              {!isOwn && (
                <Button
                  size="small"
                  disabled={!currentUserId || currentUserId === work.uid}
                  onClick={() => handleLike(work)}
                >
                  赞一下
                </Button>
              )}
              {isOwn && (
                <>
                  <Button
                    size="small"
                    onClick={() => {
                      const url = new URL('/turtle/playground', window.location.origin);
                      url.searchParams.set('workId', work.id);
                      window.location.href = url.toString();
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => handleDelete(work)}
                  >
                    删除
                  </Button>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// 注册页面
addPage(
  new NamedPage(['turtle_gallery'], async () => {
    const mountPoint = document.getElementById('turtle-gallery-app');
    const dataElement = document.getElementById('turtle-gallery-data');
    if (!mountPoint || !dataElement) return;
    try {
      const data: GalleryData = JSON.parse(dataElement.textContent || '{}');
      const root = createRoot(mountPoint);
      root.render(<TurtleGallery {...data} />);
    } catch (e) {
      console.error('[TurtleGallery] Failed to init React page', e);
    }
  }),
);
