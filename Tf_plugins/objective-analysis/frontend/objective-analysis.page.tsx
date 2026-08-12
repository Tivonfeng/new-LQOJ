import { $, addPage, NamedPage, Notification, request } from '@hydrooj/ui-default';
import './objective-analysis.css';

// ============================================================
// 轻量 markdown 渲染（解析文本通常为简单格式，仅支持常用语法）
// ============================================================
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInline(s: string): string {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMd(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false; }
  };
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${codeBuf.map(escapeHtml).join('\n')}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    const listMatch = line.match(/^[-*]\s+(.*)/);
    if (listMatch) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${renderInline(listMatch[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }
  if (inCode) html.push(`<pre><code>${codeBuf.map(escapeHtml).join('\n')}</code></pre>`);
  closeList();
  return html.join('');
}

// ============================================================
// 答案解析块构建
// ============================================================
function stdText(std: unknown): string {
  if (Array.isArray(std)) return std.join('、');
  return String(std ?? '');
}

function resultBlock(data: any, key: string): string {
  const std = data.answers?.[key]?.[0];
  const analysis = data.analysis?.[key] || '';
  const res = data.results?.[key];
  const mine = data.userAnswers?.[key];
  const mineText = Array.isArray(mine) ? mine.join('、') : (mine ? String(mine) : '');
  const correct = res?.statusCode === 1; // STATUS_ACCEPTED
  const partial = !correct && (res?.score || 0) > 0;
  const cls = correct ? 'objective-analysis-ok'
    : (partial ? 'objective-analysis-partial' : 'objective-analysis-wrong');
  // 文案硬编码中文（不依赖用户界面语言，避免英文语言包下显示英文）
  return `
    <div class="objective-analysis-result ${cls}">
      <div class="objective-analysis-row"><span class="objective-analysis-label">我的答案</span>：<span class="objective-analysis-mine">${escapeHtml(mineText || '未作答')}</span></div>
      <div class="objective-analysis-row"><span class="objective-analysis-label">正确答案</span>：<span class="objective-analysis-std">${escapeHtml(stdText(std))}</span></div>
      ${analysis ? `<div class="objective-analysis-row objective-analysis-ana">解析：${renderMd(analysis)}</div>` : ''}
    </div>`;
}

// ============================================================
// 做题页：每题控件后内联展示
// ============================================================
function renderProblemResults(data: any) {
  $('.objective-analysis-result').remove();
  for (const key of Object.keys(data.answers || {})) {
    const $control = $(`.objective_${key}`).last();
    if (!$control.length) continue;
    $control.closest('pre, ul').after(resultBlock(data, key));
  }
}

// 判分结果（提交后接口返回，供底部导航题号显示对错状态）
let objectiveResults: Record<string, any> | null = null;

async function loadProblemData() {
  const UiContext: any = (window as any).UiContext;
  const pdoc = UiContext?.pdoc;
  if (!pdoc || pdoc.config?.type !== 'objective') return;
  const pid = pdoc.pid || pdoc.docId;
  const tid = UiContext.tdoc?._id || '';
  // 多域：显式传 domainId（全局路由默认取默认域，题目可能在非默认域）
  const domainId = UiContext.domainId || '';
  let data: any;
  try {
    data = await request.get(`/objective-analysis/${pid}`, { domainId, ...(tid ? { tid } : {}) });
  } catch (e) {
    return;
  }
  if (!data) return;
  objectiveResults = data.results || null;
  if (data.submitted) renderProblemResults(data);
  updateBottomNavState();
}

function initProblemPage() {
  const UiContext: any = (window as any).UiContext;
  if (!UiContext?.pdoc || UiContext.pdoc.config?.type !== 'objective') return;
  // 等待核心 loadObjective 渲染完控件后再插入
  const start = Date.now();
  const timer = setInterval(() => {
    if ($('.objective-input').length || Date.now() - start > 8000) {
      clearInterval(timer);
      loadProblemData();
    }
  }, 150);
}

// ============================================================
// 记录页：结果表格下方展示
// ============================================================
async function loadRecordData() {
  const match = location.pathname.match(/\/record\/([0-9a-f]{24})/i);
  if (!match) return;
  const UiContext: any = (window as any).UiContext;
  const domainId = UiContext?.domainId || '';
  let data: any;
  try {
    data = await request.get(`/objective-analysis/r/${match[1]}`, { domainId });
  } catch (e) {
    return;
  }
  if (!data?.submitted) return;
  $('.objective-analysis-record').remove();
  const blocks = Object.keys(data.answers || {})
    .map((key) => resultBlock(data, key))
    .join('');
  $('#status').after(`<div class="objective-analysis-record">${blocks}</div>`);
}

// ============================================================
// 原题目编辑页（/p/:pid/edit）：内联解析编辑器
// ============================================================
function renderInlineEditor(container: HTMLElement, data: any, pid: string | number, domainId: string) {
  const items = Object.keys(data.answers || {}).map((key) => ({
    key,
    std: stdText(data.answers[key]?.[0]),
    analysis: data.analysis?.[key] || '',
  }));
  $(container).append(`
    <div class="section objective-analysis-edit-section">
      <div class="section__header">
        <h1 class="section__title">解析管理</h1>
        <div class="section__tools">
          <button class="button rounded primary objective-analysis-save-btn">保存</button>
        </div>
      </div>
      <div class="section__body">
        <p style="opacity:.7;margin:0 0 .8em">每题解析保存到插件集合（不与题目配置冲突）。支持 Markdown 基础语法：**加粗**、\`行内代码\`、\`\`\` 代码块、- 列表、空行分段。</p>
        ${items.map((it) => `
          <div class="objective-analysis-edit-item">
            <div class="item-header">第 ${escapeHtml(it.key)} 题<span class="item-std">标准答案：${escapeHtml(it.std) || '—'}</span></div>
            <textarea data-key="${escapeHtml(it.key)}" placeholder="输入本题解析（留空表示无解析）">${escapeHtml(it.analysis)}</textarea>
          </div>`).join('')}
      </div>
    </div>`);
  $(container).find('.objective-analysis-save-btn').on('click', () => {
    const analysis: Record<string, string> = {};
    $(container).find('textarea[data-key]').each((_, el) => {
      const $el = $(el);
      const v = $el.val() as string;
      if (v?.trim()) analysis[$el.attr('data-key') as string] = v;
    });
    request.post(`/objective-analysis/${pid}`, { analysis: JSON.stringify(analysis), domainId })
      .then(() => Notification.success('解析已保存'))
      .catch((e: any) => Notification.error(e?.message || '保存失败'));
  });
}

function initEditPage() {
  const UiContext: any = (window as any).UiContext;
  const pdoc = UiContext?.pdoc;
  // 编辑页模板不注入 UiContext.pdoc，pid 从当前 URL 提取（/p/{pid}/edit 或 /d/{domain}/p/{pid}/edit）
  const pid = pdoc?.pid || pdoc?.docId || location.pathname.match(/\/(?:p\/)([^/]+)\/edit/)?.[1];
  if (!pid) return;
  if (pdoc && pdoc.config?.type !== 'objective') return;
  if ($('#objective-analysis-inline-editor').length) return;
  const domainId = UiContext?.domainId || '';
  request.get(`/objective-analysis/${pid}`, { domainId })
    .then((data: any) => {
      // 非 objective 题或非作者时接口不返回 isOwner，静默跳过
      if (!data?.isOwner) return;
      if ($('#objective-analysis-inline-editor').length) return;
      const container = document.createElement('div');
      container.id = 'objective-analysis-inline-editor';
      // 插入到左侧主体表单区之后
      const $main = $('.medium-9.columns .section').first();
      if ($main.length) $main.after(container);
      else document.querySelector('.problem-content-container')?.appendChild(container);
      renderInlineEditor(container, data, pid, domainId);
    })
    .catch(() => { /* 非作者或无权限，静默 */ });
}

// ============================================================
// 底部悬浮题号导航（核心侧栏题号导航不跟随滚动，改为页面底部横栏；
// 清空答案按钮保留在核心侧栏原位置）
// ============================================================
function updateBottomNavState() {
  $('.objective-bottom-nav .nav-item').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('data-id');
    const answered = $(`.objective_${id} input:checked`).length > 0
      || $(`.objective_${id} input[type=text]`).filter((_, i) => !!i.value).length > 0
      || $(`.objective_${id} textarea`).filter((_, i) => !!i.value).length > 0
      || $(`.objective_${id} select option:checked:not([value=""])`).length > 0;
    $el.removeClass('answered correct wrong partial');
    if (!answered) return;
    $el.addClass('answered');
    // 有判分结果时按对错着色（答对绿 / 答错红 / 多选漏选黄）
    const res = objectiveResults?.[id];
    if (res?.statusCode === 1) $el.addClass('correct');
    else if (res && (res.score || 0) > 0) $el.addClass('partial');
    else if (res) $el.addClass('wrong');
  });
}

// 滚动时高亮当前视口内的题号（requestAnimationFrame 节流）
let navTicking = false;
function updateActiveNav() {
  const items = $('.objective-bottom-nav .nav-item');
  if (!items.length) return;
  const half = window.innerHeight * 0.5;
  let currentId: string | null = null;
  items.each((_, el) => {
    const $el = $(el);
    const id = $el.attr('data-id') as string;
    const target = document.getElementById(`p${id}`);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.top <= half && rect.bottom >= 0) currentId = id;
  });
  items.removeClass('active');
  if (currentId) $(`.objective-bottom-nav .nav-item[data-id="${currentId}"]`).addClass('active');
}
function onNavScroll() {
  if (!navTicking) {
    navTicking = true;
    requestAnimationFrame(() => {
      navTicking = false;
      updateActiveNav();
    });
  }
}

// 底部导航点击：JS 平滑滚动（不用原生锚点，避免 pjax 拦截 hash 导航导致页面重载乱跳）
function bindBottomNavClick() {
  $('.objective-bottom-nav').off('click', '.nav-item').on('click', '.nav-item', (e) => {
    e.preventDefault();
    const id = $(e.currentTarget).attr('data-id');
    if (!id) return;
    const target = document.getElementById(`p${id}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// 提交按钮移入底栏（DOM 移动不丢事件绑定，核心提交逻辑与闭包数据不变）
function moveSubmitToBottomNav() {
  const $submit = $('.problem-content .typo input[type="submit"]').first();
  if ($submit.length && !$('.objective-bottom-nav').find($submit).length) {
    $('.objective-bottom-nav-items').append($submit);
    $submit.addClass('objective-bottom-nav-submit');
    return true;
  }
  return false;
}

function initBottomNav() {
  const UiContext: any = (window as any).UiContext;
  const pdoc = UiContext?.pdoc;
  if (!pdoc || pdoc.config?.type !== 'objective') return;
  // 等待核心 loadObjective 渲染控件（此时 #problem-navigation 容器也已创建）后：
  // 1. 隐藏核心侧栏的题号导航（.contest-problems），保留「清空答案」按钮在原侧栏位置
  // 2. 提取题号创建底部悬浮栏（题号 + 提交按钮）
  const start = Date.now();
  const timer = setInterval(() => {
    const inputs = document.querySelectorAll('.objective-input');
    if (inputs.length || Date.now() - start > 8000) {
      clearInterval(timer);
      $('#problem-navigation .contest-problems').hide();
      if (!$('.objective-bottom-nav').length) {
        const pids = [...new Set([...inputs].map((el) => el.getAttribute('name')).filter(Boolean))];
        if (!pids.length) return;
        $('body').append(`
          <div class="objective-bottom-nav" id="objective-bottom-nav">
            <span class="objective-bottom-nav-title">题号</span>
            <div class="objective-bottom-nav-items">
              ${pids.map((id) => `<a class="nav-item" data-id="${escapeHtml(id)}" href="#p${escapeHtml(id)}">${escapeHtml(id)}</a>`).join('')}
            </div>
          </div>`);
        bindBottomNavClick();
        updateBottomNavState();
      } else {
        updateBottomNavState();
      }
      // 提交按钮：立即尝试一次（兜底）+ MutationObserver 监听后续追加（核心可能稍后 append）
      moveSubmitToBottomNav();
      const typo = document.querySelector('.problem-content .typo');
      if (typo && !(typo as any).__submitObserver) {
        const observer = new MutationObserver(() => moveSubmitToBottomNav());
        observer.observe(typo, { childList: true, subtree: true });
        (typo as any).__submitObserver = observer;
      }
    }
  }, 150);
}

// ============================================================
// 注册页面
// ============================================================
addPage(new NamedPage(['problem_detail', 'contest_detail_problem', 'homework_detail_problem'], () => {
  initProblemPage();
  initBottomNav();
  // 答题状态变化时刷新底部导航高亮
  $(document).on('click', updateBottomNavState);
  $(document).on('input', updateBottomNavState);
  // 滚动时高亮当前视口内的题号
  $(window).on('scroll', onNavScroll);
  // 核心在 vjContentNew 事件里重跑 loadObjective，这里同步重挂
  $(document).on('vjContentNew', () => {
    initProblemPage();
    initBottomNav();
  });
}));

addPage(new NamedPage('record_detail', loadRecordData));

addPage(new NamedPage('problem_edit', initEditPage));
