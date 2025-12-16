import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { addPage, NamedPage } from '@hydrooj/ui-default';

type PhaseProgress = {
    phaseId: string;
    solved: number;
    total: number;
    covered: number;
    updatedAt?: string;
};

type Phase = {
    phaseId: string;
    title: string;
    description?: string;
    problemIds?: number[];
    tagRules?: string[];
    targets?: { minSolved?: number; minCoverage?: number; deadline?: string };
};

type TagMastery = {
    tag: string;
    accepted: number;
    attempts: number;
    recentAcRate?: number;
};

type DailySnapshot = {
    date: string;
    submissions: number;
    accepted: number;
    pointsDelta?: number;
};

type MeResp = {
    ok: boolean;
    phaseProgress: PhaseProgress[];
    daily: DailySnapshot[];
    tags: TagMastery[];
};

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
    return (
        <div style={{ background: '#eee', borderRadius: 6, height: 10 }}>
            <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 6,
                background: '#4caf50',
                transition: 'width 0.3s',
            }}
            />
        </div>
    );
};

const MePage: React.FC = () => {
    const [data, setData] = useState<MeResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchJson<MeResp>('/analytics/me')
            .then((resp) => setData(resp))
            .catch((err) => setError(err.message || '加载失败'))
            .finally(() => setLoading(false));
    }, []);

    const dailyChartData = useMemo(() => data?.daily || [], [data]);

    if (loading) return <div>加载中...</div>;
    if (error) return <div>加载失败: {error}</div>;
    if (!data?.ok) return <div>未登录或无权限</div>;

    return (
        <div className="analytics-container">
            <h1>学习数据总览</h1>

            <section>
                <h2>训练阶段进度</h2>
                {data.phaseProgress.length === 0 && <div>暂无阶段数据</div>}
                {data.phaseProgress.map((p) => (
                    <div key={p.phaseId} className="card">
                        <div className="row">
                            <strong>{p.phaseId}</strong>
                            <span>{p.solved}/{p.total} 已通过</span>
                        </div>
                        <ProgressBar value={p.solved} max={p.total || 1} />
                        <small>覆盖 {p.covered} / {p.total}</small>
                    </div>
                ))}
            </section>

            <section>
                <h2>标签掌握</h2>
                {data.tags.length === 0 && <div>暂无标签数据</div>}
                {data.tags.map((t) => {
                    const rate = t.attempts ? Math.round((t.accepted / t.attempts) * 100) : 0;
                    return (
                        <div key={t.tag} className="row">
                            <span>{t.tag}</span>
                            <span>{t.accepted}/{t.attempts} ({rate}%)</span>
                        </div>
                    );
                })}
            </section>

            <section>
                <h2>最近提交/AC</h2>
                {dailyChartData.length === 0 && <div>暂无日数据</div>}
                {dailyChartData.map((d) => (
                    <div key={d.date} className="row">
                        <span>{d.date}</span>
                        <span>提交 {d.submissions} · AC {d.accepted}</span>
                    </div>
                ))}
            </section>
        </div>
    );
};

const mount = () => {
    const el = document.getElementById('app') || document.getElementById('page') || document.body;
    const root = createRoot(el);
    root.render(<MePage />);
};

addPage(new NamedPage(['analytics_me', 'analytics_daily', 'analytics_phases', 'analytics_phase_detail'], mount));

