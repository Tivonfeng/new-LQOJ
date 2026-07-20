# 微信插件 (WeChat Plugin)

一个为 Hydro OJ 开发的微信集成插件，支持微信分享(JSSDK)、微信登录(OAuth)和模板消息推送功能。

## 功能特性

### 1. 微信分享 (JSSDK)
- **完整的JSSDK集成**：支持微信公众号JS-SDK功能
- **智能签名生成**：自动生成和缓存AccessToken、JSApiTicket
- **域名验证**：安全的域名白名单机制
- **CORS支持**：跨域请求支持
- **自定义分享配置**：支持按页面自定义分享标题、描述、封面图

### 2. 微信登录 (OAuth)
- **OAuth 2.0授权**：标准的微信网页授权流程
- **双平台支持**：微信内网页授权（公众号）+ PC端扫码登录（开放平台）
- **账号自动绑定**：支持新用户注册和现有账号绑定
- **UnionID支持**：优先使用UnionID实现跨应用统一身份
- **用户信息同步**：自动获取昵称、头像等用户信息

### 3. 模板消息推送
- **按openid发送**：直接通过用户openid发送模板消息
- **按uid发送**：通过Hydro用户ID反查openid发送
- **批量发送**：支持一次性向多个用户发送
- **模板管理**：获取模板列表、删除模板
- **测试页面**：内置可视化管理界面 `/wechat/template/test`

### 4. H5 页面扩展基础设施
- **微信身份识别中间件**：`WechatH5Handler` 基类，微信内自动静默授权
- **JSSDK注入Helper**：`injectJSSDK()` 一行完成分享配置注入
- **公开静态资源Handler**：`/wechat/static/:filename` 服务CSS/JS/图片

## 安装方法

1. 确保插件位于 `Tf_plugins/wechat-share/` 目录
2. 确保已通过 `hydrooj addon add` 注册插件
3. 在 Hydro 后台配置面板中填入微信公众号和开放平台的 AppID/AppSecret
4. 重启 Hydro 服务

## 配置说明

在 Hydro 后台配置面板（或 `config.yaml`）中配置以下参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `appId` | 微信公众号 AppID | - |
| `appSecret` | 微信公众号 AppSecret | - |
| `openAppId` | 微信开放平台 AppID（可选，用于扫码登录） | - |
| `openAppSecret` | 微信开放平台 AppSecret | - |
| `useOpenPlatformForOAuth` | 优先使用开放平台进行OAuth登录 | false |
| `domains` | 授权域名列表 | ['yz.lqcode.fun', 'noj.lqcode.fun'] |
| `canRegister` | 是否允许通过微信注册新账号 | false |

### 微信公众平台设置

1. **获取开发者信息**：登录 [微信公众平台](https://mp.weixin.qq.com/)，在"开发 > 基本配置"中获取 AppID 和 AppSecret
2. **设置JS接口安全域名**（分享功能）：在"设置 > 公众号设置 > 功能设置"中添加网站域名
3. **设置网页授权域名**（登录功能）：同上，在"网页授权域名"中添加网站域名
4. **接口权限**：确保公众号具有"网页授权获取用户基本信息"权限（服务号或已认证的订阅号）

## API 接口

### 微信分享

**API**: `GET /wechat/share?url={current_url}&share={json}`

**参数**:
- `url`（必需）：当前页面URL
- `share`（可选）：JSON字符串，自定义分享配置 `{ title, desc, link, imgUrl }`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "jssdkConfig": {
      "appId": "wx123...",
      "timestamp": 1234567890,
      "nonceStr": "abc123",
      "signature": "sha1_signature"
    },
    "shareConfig": {
      "title": "分享标题",
      "desc": "分享描述",
      "link": "https://...",
      "imgUrl": "https://..."
    },
    "menuConfig": {
      "hideMenuItems": [...],
      "showMenuItems": [...]
    }
  }
}
```

### 模板消息

| API | 方法 | 说明 |
|-----|------|------|
| `/wechat/template/list` | GET | 获取模板列表 |
| `/wechat/template/send` | POST | 发送模板消息 |
| `/wechat/template/delete` | POST | 删除模板 |
| `/wechat/template/test` | GET | 可视化测试页面 |

### 静态资源

| API | 方法 | 说明 |
|-----|------|------|
| `/wechat/static/:filename` | GET | 公开访问静态资源（CSS/JS/图片等） |

## H5 页面开发指南

### 1. 使用微信身份识别中间件

```typescript
import { WechatH5Handler } from '../wechat-share/src/middleware/wechat-identity';

class MyH5PageHandler extends WechatH5Handler {
    async get() {
        // 微信内浏览器自动获取用户身份（静默授权）
        // 非微信浏览器 wechatIdentity 为 null
        const wxUser = this.wechatIdentity;
        if (wxUser) {
            // 已获取微信身份，可读取 wxUser.openid, wxUser.nickname 等
        }
        this.response.type = 'text/html';
        this.response.body = '<html>...</html>';
    }
}
```

### 2. 使用 JSSDK 注入 Helper

```typescript
import { injectJSSDK } from '../wechat-share/src/utils/jssdk-helper';

class MyH5PageHandler extends WechatH5Handler {
    async get() {
        const result = await injectJSSDK(this.ctx, {
            url: this.request.href,
            share: {
                title: '活动标题',
                desc: '活动描述',
                imgUrl: 'https://example.com/cover.jpg',
            },
        });
        // result.initScript 可直接注入到 HTML 中
        this.response.type = 'text/html';
        this.response.body = `<html><head>...</head><body>...${result.initScript}</body></html>`;
    }
}
```

### 3. 前端手动使用分享接口

```javascript
// 获取配置
const response = await fetch(`/wechat/share?url=${encodeURIComponent(location.href)}`);
const { data } = await response.json();

// 初始化微信SDK（需提前引入 jweixin SDK）
wx.config({
    debug: false,
    ...data.jssdkConfig,
    jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData']
});

// 设置分享内容
wx.ready(() => {
    wx.updateAppMessageShareData(data.shareConfig);
    wx.updateTimelineShareData(data.shareConfig);
});
```

## 项目结构

```
Tf_plugins/wechat-share/
├── index.ts                              # 主入口（插件注册、路由、OAuth）
├── package.json                          # 包配置
├── README.md                             # 文档
├── public/                               # 静态资源（验证文件、H5资源）
└── src/
    ├── core/
    │   └── wechat-service.ts             # 微信API核心服务（继承 Service）
    ├── handlers/
    │   ├── share-handler.ts              # 分享路由处理器
    │   ├── static-handler.ts             # 公开静态资源处理器
    │   ├── template-handler.ts           # 模板消息管理
    │   └── template-test-handler.ts      # 模板消息测试页面
    ├── middleware/
    │   └── wechat-identity.ts            # 微信身份识别中间件 + H5基类
    ├── services/
    │   ├── api-limiter.ts                # API调用额度管理
    │   ├── token-cache.ts                # Token持久化缓存
    │   └── template-message-service.ts   # 模板消息业务服务（继承 Service）
    ├── types/
    │   └── wechat.ts                     # 类型定义
    └── utils/
        └── jssdk-helper.ts              # JSSDK注入Helper
```

## 技术实现

### 核心服务: WechatService

继承 Hydro 的 `Service` 基类，通过 `declare module 'cordis'` 做类型声明，
Handler 中直接 `this.ctx.wechatService` 获取实例，无需 `as any`。

```typescript
class WechatService extends Service {
    static inject = ['db'];
    // 分享功能
    async getAccessToken(): Promise<string>
    async getJSApiTicket(): Promise<string>
    async getJSSDKConfig(url: string): Promise<JSSDKConfig>
    validateDomain(url: string): boolean
    // OAuth登录
    async getOAuthAccessToken(code: string): Promise<WechatOAuthToken>
    async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo>
    // 模板消息
    async sendTemplateMessage(msg: TemplateMessage): Promise<number>
    async getTemplateList(forceRefresh?: boolean): Promise<TemplateItem[]>
    async deleteTemplate(templateId: string): Promise<void>
}
```

### Token 缓存机制

- **三级缓存**：内存缓存 -> 数据库持久化 -> 远程请求
- **提前过期**：Token 提前 5 分钟过期，避免临界问题
- **并发控制**：单飞模式防止重复请求
- **自动清理**：定时任务清理过期 Token

### API 额度管理

| 接口 | 每日限制 |
|------|----------|
| access_token | 2000 次 |
| jsapi_ticket | 2000 次 |
| oauth_access_token | 10000 次 |
| userinfo | 10000 次 |
| template_message | 100000 次 |

## 安全考虑

1. **AppSecret保护**：通过 Hydro Config 配置，不在日志中输出完整 Secret
2. **域名验证**：严格验证请求来源域名，支持本地开发环境
3. **Token管理**：AccessToken自动缓存和刷新，State token防止CSRF攻击
4. **静态资源安全**：白名单正则 + 路径校验，防止目录穿越

## 更新日志

### v3.0.0
- 🏗️ WechatService/TemplateMessageService 继承 Hydro Service，标准依赖注入
- 🐛 修复 sendByUserId 的 OAuth 反查 bug（方向反了导致功能完全不可用）
- 🔒 移除日志中的 Access Token 泄露
- 🐛 修复 OAuth 协议判断死代码（http/https 三元表达式两个分支相同）
- ✨ 新增微信身份识别中间件（WechatH5Handler 基类，微信内自动静默授权）
- ✨ 新增 JSSDK 注入 Helper（injectJSSDK 一行完成分享配置）
- ✨ 新增公开静态资源 Handler（/wechat/static/:filename）
- ✨ 分享接口支持自定义分享配置（title/desc/imgUrl）
- 🔇 正常流程日志从 info 降为 debug
- ♻️ 错误包装简化为单层，避免信息重复嵌套
- ♻️ CORS 逻辑提取为统一方法
- ♻️ fs-extra 改为静态 import
- 📝 更新文档，修正项目结构和邮箱格式

### v2.0.0
- ✨ 新增微信OAuth登录功能
- ♻️ 重构代码结构，模块化设计

### v1.0.0
- 🎉 初始版本（微信JSSDK分享功能）

## 许可证

AGPL-3.0
