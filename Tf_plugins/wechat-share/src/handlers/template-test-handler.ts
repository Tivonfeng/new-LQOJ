import { Handler, PRIV } from 'hydrooj';

/**
 * 模板消息测试页面 Handler
 * 提供一个简单的测试界面用于测试模板消息发送功能
 */
export class WechatTemplateTestHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>微信模板消息测试</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .section h2 {
            font-size: 20px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
            font-size: 14px;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
            font-family: 'Courier New', monospace;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-right: 10px;
            margin-top: 10px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            display: block;
        }
        
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            display: block;
        }
        
        .template-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
            background: white;
        }
        
        .template-item {
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .template-item:hover {
            background: #f0f0f0;
        }
        
        .template-item.selected {
            background: #e7f3ff;
            border-color: #667eea;
        }
        
        .template-id {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .template-title {
            font-size: 14px;
            color: #666;
        }
        
        .data-editor {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .data-item {
            display: contents;
        }
        
        .remove-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .add-data-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-left: 10px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .code-block {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            margin-top: 10px;
        }
        
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 微信模板消息测试工具</h1>
            <p>用于测试和调试微信模板消息发送功能</p>
        </div>
        
        <div class="content">
            <!-- 模板列表 -->
            <div class="section">
                <h2>📋 模板列表</h2>
                <button class="btn btn-secondary" onclick="loadTemplates()">刷新模板列表</button>
                <div id="templateList" class="template-list" style="margin-top: 15px;">
                    <p style="text-align: center; color: #999; padding: 20px;">点击"刷新模板列表"加载模板</p>
                </div>
            </div>
            
            <!-- 发送消息 -->
            <div class="section">
                <h2>📤 发送模板消息</h2>
                <form id="sendForm">
                    <div class="form-group">
                        <label>OpenID <span style="color: red;">*</span></label>
                        <input type="text" id="openid" placeholder="输入用户的 openid" required>
                        <div class="help-text">用户的微信 openid，可通过 OAuth 获取</div>
                    </div>
                    
                    <div class="form-group">
                        <label>模板ID <span style="color: red;">*</span></label>
                        <input type="text" id="templateId" placeholder="输入模板ID或从上方选择" required>
                        <div class="help-text">从模板列表中选择模板后会自动填充</div>
                    </div>
                    
                    <div class="form-group">
                        <label>跳转URL（可选）</label>
                        <input type="text" id="url" placeholder="https://example.com/page">
                        <div class="help-text">用户点击消息后跳转的链接</div>
                    </div>
                    
                    <div class="form-group">
                        <label>消息数据 <span style="color: red;">*</span></label>
                        <div id="dataEditor">
                            <div class="data-editor">
                                <input type="text" placeholder="字段名 (如: thing8, time4)" class="data-key">
                                <input type="text" placeholder="字段值" class="data-value">
                                <input type="text" placeholder="颜色 (可选, 如: #173177)" class="data-color">
                            </div>
                        </div>
                        <button type="button" class="add-data-btn" onclick="addDataField()">+ 添加字段</button>
                        <div class="help-text">
                            <strong>填写说明：</strong><br>
                            1. 字段名：使用模板详情中的占位符名称（去掉 .DATA），如 <code>thing8</code>, <code>time4</code>, <code>keyword1</code> 等<br>
                            2. 字段值：填写实际内容，如 "子轩", "2023年2月15日 10:00" 等<br>
                            3. 颜色：可选，如 #173177（蓝色）<br>
                            <strong>示例：</strong> 对于模板 <code>{{thing8.DATA}}</code>，字段名填写 <code>thing8</code>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn" id="sendBtn">发送消息</button>
                    <div id="sendResult" class="result"></div>
                </form>
            </div>
            
            <!-- 删除模板 -->
            <div class="section">
                <h2>🗑️ 删除模板</h2>
                <div class="form-group">
                    <label>模板ID</label>
                    <input type="text" id="deleteTemplateId" placeholder="输入要删除的模板ID">
                </div>
                <button class="btn btn-danger" onclick="deleteTemplate()">删除模板</button>
                <div id="deleteResult" class="result"></div>
            </div>
        </div>
    </div>
    
    <script>
        const API_BASE = '/wechat/template';
        
        // 加载模板列表
        async function loadTemplates() {
            const listEl = document.getElementById('templateList');
            listEl.innerHTML = '<p style="text-align: center; padding: 20px;">加载中...</p>';
            
            try {
                const response = await fetch(API_BASE + '/list');
                const data = await response.json();
                
                if (data.success && data.templates && data.templates.length > 0) {
                    listEl.innerHTML = '';
                    data.templates.forEach(template => {
                        const item = document.createElement('div');
                        item.className = 'template-item';
                        item.innerHTML = \`
                            <div class="template-id">\${template.template_id}</div>
                            <div class="template-title">\${template.title || '无标题'}</div>
                        \`;
                        item.onclick = () => {
                            document.getElementById('templateId').value = template.template_id;
                            document.querySelectorAll('.template-item').forEach(el => el.classList.remove('selected'));
                            item.classList.add('selected');
                        };
                        listEl.appendChild(item);
                    });
                } else {
                    listEl.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无模板</p>';
                }
            } catch (error) {
                listEl.innerHTML = \`<p style="text-align: center; color: #dc3545; padding: 20px;">加载失败: \${error.message}</p>\`;
            }
        }
        
        // 添加数据字段
        function addDataField() {
            const editor = document.getElementById('dataEditor');
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = \`
                <input type="text" placeholder="字段名" class="data-key">
                <input type="text" placeholder="字段值" class="data-value">
                <input type="text" placeholder="颜色 (可选)" class="data-color">
                <button type="button" class="remove-btn" onclick="this.parentElement.remove()">删除</button>
            \`;
            editor.appendChild(div);
        }
        
        // 发送消息
        document.getElementById('sendForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sendBtn = document.getElementById('sendBtn');
            const resultEl = document.getElementById('sendResult');
            const originalText = sendBtn.textContent;
            
            sendBtn.disabled = true;
            sendBtn.innerHTML = originalText + '<span class="loading"></span>';
            resultEl.className = 'result';
            
            try {
                // 收集数据字段
                const data = {};
                document.querySelectorAll('#dataEditor .data-item').forEach(item => {
                    const key = item.querySelector('.data-key').value.trim();
                    const value = item.querySelector('.data-value').value.trim();
                    const color = item.querySelector('.data-color').value.trim();
                    
                    if (key && value) {
                        data[key] = { value };
                        if (color) {
                            data[key].color = color;
                        }
                    }
                });
                
                const payload = {
                    openid: document.getElementById('openid').value.trim(),
                    templateId: document.getElementById('templateId').value.trim(),
                    data: data,
                };
                
                const url = document.getElementById('url').value.trim();
                if (url) {
                    payload.url = url;
                }
                
                const response = await fetch(API_BASE + '/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                
                const result = await response.json();
                
                if (result.success) {
                    resultEl.className = 'result success';
                    resultEl.innerHTML = \`✅ 发送成功！<br>消息ID: \${result.msgid || 'N/A'}\`;
                } else {
                    resultEl.className = 'result error';
                    resultEl.innerHTML = \`❌ 发送失败: \${result.error || '未知错误'}\`;
                }
            } catch (error) {
                resultEl.className = 'result error';
                resultEl.innerHTML = \`❌ 请求失败: \${error.message}\`;
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText;
            }
        });
        
        // 删除模板
        async function deleteTemplate() {
            const templateId = document.getElementById('deleteTemplateId').value.trim();
            const resultEl = document.getElementById('deleteResult');
            
            if (!templateId) {
                resultEl.className = 'result error';
                resultEl.innerHTML = '❌ 请输入模板ID';
                return;
            }
            
            if (!confirm(\`确定要删除模板 \${templateId} 吗？此操作不可恢复！\`)) {
                return;
            }
            
            resultEl.className = 'result';
            resultEl.innerHTML = '删除中...';
            
            try {
                const response = await fetch(API_BASE + '/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ templateId }),
                });
                
                const result = await response.json();
                
                if (result.success) {
                    resultEl.className = 'result success';
                    resultEl.innerHTML = '✅ 删除成功！';
                    document.getElementById('deleteTemplateId').value = '';
                    loadTemplates(); // 刷新模板列表
                } else {
                    resultEl.className = 'result error';
                    resultEl.innerHTML = \`❌ 删除失败: \${result.error || '未知错误'}\`;
                }
            } catch (error) {
                resultEl.className = 'result error';
                resultEl.innerHTML = \`❌ 请求失败: \${error.message}\`;
            }
        }
        
        // 页面加载时自动加载模板列表
        window.addEventListener('load', () => {
            loadTemplates();
        });
    </script>
</body>
</html>`;
        
        this.response.body = html;
        this.response.type = 'text/html';
    }
}

