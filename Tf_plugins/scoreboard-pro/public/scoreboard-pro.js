/* ========== Scoreboard Pro 客户端逻辑 ==========
 * 功能：
 *  - FLIP 排名变化动画
 *  - WebSocket 实时数据
 *  - AC 烟花特效 + 音效
 *  - 超越提示
 *  - 投影/全屏模式
 *  - ICPC 冻榜回放
 */

(function () {
    'use strict';

    // ========== 数据加载 ==========
    const dataEl = document.getElementById('sbp-data');
    if (!dataEl) return console.error('[SBP] data element not found');
    const initial = JSON.parse(dataEl.textContent);

    let state = {
        tdoc: initial.tdoc,
        rows: initial.rows,       // 二维数组，第一行是表头
        udict: initial.udict,
        pdict: initial.pdict,
        mode: initial.mode || 'normal',
        soundMuted: false,
        ws: null,
        previousRanks: new Map(),  // uid -> rank (用于 FLIP)
        previousScores: new Map(), // uid -> total score
    };

    const canvas = document.getElementById('fx-canvas');
    const ctx2d = canvas.getContext('2d');
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ========== 音效 ==========
    const sounds = {
        ac: createOscillator(523.25, 0.15, 'square'),       // C5
        overtake: createOscillator(659.25, 0.2, 'sawtooth'), // E5
        medal: createOscillator(880, 0.3, 'sine'),          // A5
    };

    function createOscillator(freq, duration, type) {
        return function () {
            if (state.soundMuted) return;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const audioCtx = new AudioCtx();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.value = freq;
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {}
        };
    }

    window.toggleSound = function () {
        state.soundMuted = !state.soundMuted;
        document.getElementById('sbp-sound-icon').textContent = state.soundMuted ? '🔇' : '🔊';
    };

    // ========== 烟花特效 ==========
    let particles = [];
    function launchFirework(x, y, color) {
        for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 * i) / 60;
            const speed = 3 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: color || '#0ff',
                size: 2 + Math.random() * 2,
            });
        }
        // 限制总数
        if (particles.length > 1000) particles = particles.slice(-1000);
    }

    function animateParticles() {
        ctx2d.fillStyle = 'rgba(0,0,0,0.1)';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        particles = particles.filter((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= 0.018;
            if (p.life <= 0) return false;

            ctx2d.save();
            ctx2d.globalAlpha = p.life;
            ctx2d.fillStyle = p.color;
            ctx2d.shadowBlur = 15;
            ctx2d.shadowColor = p.color;
            ctx2d.beginPath();
            ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.restore();
            return true;
        });

        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        } else {
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function startParticleLoop() {
        if (particles.length > 0) requestAnimationFrame(animateParticles);
    }

    // ========== 超越提示 ==========
    function showOvertakeToast(message, color) {
        const toast = document.createElement('div');
        toast.className = 'sbp-toast';
        if (color) toast.style.background = color;
        toast.innerHTML = '<span>⚡</span><span>' + escapeHtml(message) + '</span>';
        document.getElementById('sbp-toasts').appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    }

    // ========== 渲染 ==========
    function getStatusClass(cell) {
        if (!cell || !cell.value) return 'sbp-cell--empty';
        const v = String(cell.value);
        if (v.startsWith('+') || v === 'AC' || /^\d+$/.test(v.trim())) return 'sbp-cell--ac';
        if (v.startsWith('-') || v === 'WA' || v.includes('未通过')) return 'sbp-cell--wa';
        if (v === '?' || v.includes('Pending')) return 'sbp-cell--pending';
        return '';
    }

    function renderTable() {
        if (!state.rows || state.rows.length === 0) return;

        const thead = document.getElementById('sbp-thead');
        const tbody = document.getElementById('sbp-tbody');

        // 渲染表头
        thead.innerHTML = '';
        const headerRow = document.createElement('tr');
        state.rows[0].forEach((col) => {
            const th = document.createElement('th');
            th.className = 'col-' + col.type;
            th.textContent = col.value || '';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // 渲染数据行
        const dataRows = state.rows.slice(1);
        const newScores = new Map();

        // 先快照旧位置（FLIP step 1: First）
        const oldPositions = new Map();
        document.querySelectorAll('.sbp-row').forEach((row) => {
            const uid = +row.dataset.uid;
            oldPositions.set(uid, row.getBoundingClientRect());
        });

        // 清空并重建
        tbody.innerHTML = '';

        dataRows.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const rank = idx + 1;
            tr.className = 'sbp-row';
            if (rank <= 3) tr.classList.add('sbp-row--rank-' + rank);

            let uid = null;
            row.forEach((col, ci) => {
                const colDef = state.rows[0][ci];
                const td = document.createElement('td');
                td.className = 'col-' + colDef.type;

                if (colDef.type === 'rank') {
                    td.innerHTML = '<span class="sbp-rank">' + (col.value === '0' ? '*' : escapeHtml(col.value)) + '</span>';
                } else if (colDef.type === 'user') {
                    uid = +col.raw;
                    const udoc = state.udict[uid] || {};
                    const uname = udoc.uname || ('UID:' + uid);
                    td.innerHTML = '<div class="sbp-user">' +
                        '<div class="sbp-user__avatar" style="background:#2a2f4a; display:flex; align-items:center; justify-content:center;">' +
                            '<span style="color:#0ff;font-size:18px;">' + escapeHtml(uname.charAt(0).toUpperCase()) + '</span>' +
                        '</div>' +
                        '<span class="sbp-user__name">' + escapeHtml(uname) + '</span>' +
                    '</div>';
                } else if (colDef.type === 'total_score' || colDef.type === 'total' || colDef.type === 'solved') {
                    const score = parseFloat(col.value) || 0;
                    newScores.set(uid, score);
                    td.innerHTML = '<div class="sbp-total">' + escapeHtml(col.value) + '</div>';
                } else if (colDef.type === 'record' || colDef.type === 'records') {
                    const cellClass = getStatusClass(col);
                    td.innerHTML = '<span class="sbp-cell ' + cellClass + '">' + escapeHtml(col.value || '-') + '</span>';
                } else {
                    td.textContent = col.value || '';
                }
                tr.appendChild(td);
            });

            if (uid !== null) tr.dataset.uid = uid;
            tbody.appendChild(tr);
        });

        // FLIP 动画 (step 2: Last; step 3: Invert + Play)
        requestAnimationFrame(() => {
            document.querySelectorAll('.sbp-row').forEach((row) => {
                const uid = +row.dataset.uid;
                const oldRect = oldPositions.get(uid);
                if (!oldRect) return;

                const newRect = row.getBoundingClientRect();
                const deltaY = oldRect.top - newRect.top;
                if (Math.abs(deltaY) < 1) return;

                // 检测超越
                const oldRank = state.previousRanks.get(uid);
                const newRank = +row.querySelector('.sbp-rank').textContent;
                if (oldRank && oldRank > newRank && deltaY > 0) {
                    const udoc = state.udict[uid] || {};
                    showOvertakeToast(`${udoc.uname || 'UID:' + uid} 超越! ${oldRank} → ${newRank}`);
                    sounds.overtake();

                    if (newRank <= 3 && oldRank > 3) {
                        sounds.medal();
                    }
                }
                state.previousRanks.set(uid, newRank);

                // FLIP
                row.style.transform = `translateY(${deltaY}px)`;
                row.style.transition = 'none';

                requestAnimationFrame(() => {
                    row.style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
                    row.style.transform = '';
                });
            });
        });

        // 检测刚 AC（对比 score 变化）
        for (const [uid, newScore] of newScores) {
            const oldScore = state.previousScores.get(uid);
            if (oldScore !== undefined && newScore > oldScore) {
                // 找到这一行触发烟花
                const row = document.querySelector(`.sbp-row[data-uid="${uid}"]`);
                if (row) {
                    const rect = row.getBoundingClientRect();
                    launchFirework(rect.left + rect.width / 2, rect.top + rect.height / 2, '#0f0');
                    sounds.ac();
                    startParticleLoop();
                }
            }
            state.previousScores.set(uid, newScore);
        }

        // 更新奖牌区
        renderPodium(dataRows);

        // 更新参与人数
        document.getElementById('sbp-attend').textContent = dataRows.length;
    }

    function renderPodium(dataRows) {
        const podium = document.getElementById('sbp-podium');
        podium.innerHTML = '';

        const top3 = dataRows.slice(0, 3);
        if (top3.length === 0) return;

        // 重新排列：第二名、第一名、第三名（左中右）
        const order = [];
        if (top3[1]) order.push({ rank: 2, row: top3[1] });
        if (top3[0]) order.push({ rank: 1, row: top3[0] });
        if (top3[2]) order.push({ rank: 3, row: top3[2] });

        order.forEach(({ rank, row }) => {
            // 找 user 列
            let uid = null, score = '';
            row.forEach((col, ci) => {
                const colDef = state.rows[0][ci];
                if (colDef.type === 'user') uid = +col.raw;
                if (colDef.type === 'total_score' || colDef.type === 'total' || colDef.type === 'solved') score = col.value;
            });
            const udoc = state.udict[uid] || {};

            const slot = document.createElement('div');
            slot.className = 'sbp-podium__slot sbp-podium__slot--' + rank;
            slot.innerHTML = `
                <div class="sbp-podium__rank">${rank}</div>
                <div class="sbp-podium__name">${escapeHtml(udoc.uname || 'UID:' + uid)}</div>
                <div class="sbp-podium__score">${escapeHtml(score)}</div>
                <div class="sbp-podium__detail">${rank === 1 ? '👑 冠军' : (rank === 2 ? '🥈 亚军' : '🥉 季军')}</div>
            `;
            podium.appendChild(slot);
        });
    }

    // ========== WebSocket ==========
    function connectWS() {
        const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + initial.wsPath;
        try {
            state.ws = new WebSocket(wsUrl);
            state.ws.onopen = () => {
                console.log('[SBP] WS connected');
                state.ws.send(JSON.stringify({ action: 'sync' }));
            };
            state.ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'full') {
                        state.rows = msg.rows;
                        state.udict = msg.udict || state.udict;
                        state.pdict = msg.pdict || state.pdict;
                        renderTable();
                    } else if (msg.type === 'submission') {
                        // 单次提交事件 - 立即闪烁该单元格
                        flashCell(msg.uid, msg.pid, msg.status);
                    }
                } catch (e) { console.error(e); }
            };
            state.ws.onclose = () => {
                console.log('[SBP] WS closed, reconnecting in 3s...');
                setTimeout(connectWS, 3000);
            };
            state.ws.onerror = (e) => console.error('[SBP] WS error', e);
        } catch (e) {
            console.error('[SBP] WS connect failed', e);
            setTimeout(connectWS, 3000);
        }
    }

    function flashCell(uid, pid, status) {
        const row = document.querySelector(`.sbp-row[data-uid="${uid}"]`);
        if (!row) return;
        // 暂时闪烁整行
        if (status === 1) {
            row.style.boxShadow = '0 0 40px #0f0';
            setTimeout(() => row.style.boxShadow = '', 1500);
        }
    }

    // ========== 倒计时 ==========
    function updateTimer() {
        const now = Date.now();
        const begin = new Date(state.tdoc.beginAt).getTime();
        const end = new Date(state.tdoc.endAt).getTime();

        let label = '', remain = 0;
        if (now < begin) {
            label = '距离开始';
            remain = begin - now;
        } else if (now < end) {
            label = '剩余时间';
            remain = end - now;
        } else {
            label = '已结束';
            document.getElementById('sbp-timer').textContent = label;
            return;
        }

        const h = Math.floor(remain / 3600000);
        const m = Math.floor((remain % 3600000) / 60000);
        const s = Math.floor((remain % 60000) / 1000);
        document.getElementById('sbp-timer').textContent =
            `${label} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    setInterval(updateTimer, 1000);
    updateTimer();

    // ========== 投影模式 ==========
    window.toggleProjector = function () {
        const el = document.getElementById('scoreboard-pro');
        if (el.classList.toggle('scoreboard-pro--projector')) {
            // 隐藏 nav
            document.querySelectorAll('.nav, .header, footer').forEach((n) => n.style.display = 'none');
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } else {
            document.querySelectorAll('.nav, .header, footer').forEach((n) => n.style.display = '');
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        }
    };

    // ========== 冻榜回放 ==========
    let replayState = { active: false, submissions: [], index: 0 };

    window.startReplay = async function () {
        if (replayState.active) return;
        try {
            const res = await fetch(`/contest/${state.tdoc._id}/scoreboard-pro/frozen`);
            const data = await res.json();
            if (!data.hasFrozen || !data.submissions || data.submissions.length === 0) {
                alert('该比赛没有冻榜数据或不在冻榜期间');
                return;
            }
            replayState.submissions = data.submissions;
            replayState.index = 0;
            replayState.active = true;
            document.getElementById('sbp-replay-overlay').style.display = 'flex';
            document.getElementById('sbp-replay-msg').textContent = `即将揭晓 ${data.submissions.length} 条冻榜提交`;
        } catch (e) {
            alert('启动回放失败: ' + e.message);
        }
    };

    function nextReplayStep() {
        if (!replayState.active) return;
        if (replayState.index >= replayState.submissions.length) {
            document.getElementById('sbp-replay-msg').textContent = '🎉 揭晓完毕!';
            setTimeout(() => {
                document.getElementById('sbp-replay-overlay').style.display = 'none';
                replayState.active = false;
            }, 3000);
            return;
        }
        const sub = replayState.submissions[replayState.index++];
        const udoc = state.udict[sub.uid] || {};
        document.getElementById('sbp-replay-msg').textContent =
            `${udoc.uname || 'UID:' + sub.uid} 提交 题目 ${sub.pid} - ${sub.status === 1 ? '✅ AC' : '❌ ' + sub.status}`;
        if (sub.status === 1) {
            launchFirework(window.innerWidth / 2, window.innerHeight / 2, '#0f0');
            sounds.ac();
            startParticleLoop();
        }
    }

    // ========== 键盘快捷键 ==========
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'KeyF') toggleProjector();
        else if (e.code === 'KeyM') toggleSound();
        else if (e.code === 'KeyR') startReplay();
        else if (e.code === 'Space' && replayState.active) {
            e.preventDefault();
            nextReplayStep();
        } else if (e.code === 'Escape') {
            if (replayState.active) {
                document.getElementById('sbp-replay-overlay').style.display = 'none';
                replayState.active = false;
            }
        }
    });

    // ========== 启动 ==========
    renderTable();
    connectWS();

    // 暴露调试接口
    window.SBP = { state, renderTable, launchFirework, showOvertakeToast };
})();
