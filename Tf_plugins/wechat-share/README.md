# 微信插件 (WeChat Plugin)

一个为 Hydro OJ 开发的微信集成插件，支持微信分享(JSSDK)和微信登录(OAuth)功能。

## 功能特性

### 1. 微信分享 (JSSDK)
- **完整的JSSDK集成**：支持微信公众号JS-SDK功能
- **智能签名生成**：自动生成和缓存AccessToken、JSApiTicket
- **域名验证**：安全的域名白名单机制
- **CORS支持**：跨域请求支持

### 2. 微信登录 (OAuth)
- **OAuth 2.0授权**：标准的微信网页授权流程
- **账号自动绑定**：支持新用户注册和现有账号绑定
- **UnionID支持**：优先使用UnionID实现跨应用统一身份
- **用户信息同步**：自动获取昵称、头像等用户信息

## 安装方法

1. 确保插件位于 `Tf_plugins/wechat-share/` 目录
2. 安装依赖：
   ```bash
   cd Tf_plugins/wechat-share
   yarn install
   ```
3. 配置环境变量（可选）：
   ```bash
   export WECHAT_APP_ID=your_app_id
   export WECHAT_APP_SECRET=your_app_secret
   export WECHAT_DOMAIN=your_domain.com
   ```
4. 重启 Hydro 服务

## 配置要求

### 微信公众号设置

1. **获取开发者信息**：
   - 登录 [微信公众平台](https://mp.weixin.qq.com/)
   - 在"开发 > 基本配置"中获取 AppID 和 AppSecret

2. **设置JS接口安全域名**（分享功能）：
   - 在"设置 > 公众号设置 > 功能设置"中
   - 添加您的网站域名到"JS接口安全域名"

3. **设置网页授权域名**（登录功能）：
   - 在"设置 > 公众号设置 > 功能设置"中
   - 添加您的网站域名到"网页授权域名"

4. **接口权限**：
   - 确保公众号具有"网页授权获取用户基本信息"权限
   - 服务号或已认证的订阅号

### 配置参数

在 `index.ts` 中配置（或使用环境变量）：

```typescript
const WECHAT_CONFIG = {
  appId: 'wx1234567890abcdef',      // 微信公众号AppID
  appSecret: 'your_app_secret',     // 微信公众号AppSecret
  domain: 'example.com',            // 授权域名（不含协议）
};
```

## 功能说明

### 微信分享

**API接口**: `GET /wechat/share?url={current_url}`

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
    "menuConfig": {
      "hideMenuItems": [...],
      "showMenuItems": [...]
    }
  }
}
```

**前端使用**:
```javascript
// 获取配置
const response = await fetch(`/wechat/share?url=${encodeURIComponent(location.href)}`);
const { jssdkConfig } = await response.json();

// 初始化微信SDK
wx.config({
  debug: false,
  ...jssdkConfig,
  jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData']
});

// 设置分享内容
wx.ready(() => {
  const shareData = {
    title: '分享标题',
    desc: '分享描述',
    link: location.href,
    imgUrl: 'https://example.com/image.jpg'
  };

  wx.updateAppMessageShareData(shareData);
  wx.updateTimelineShareData(shareData);
});
```

### 微信登录

**登录流程**:
1. 用户点击"微信登录"按钮
2. 跳转到微信授权页面（`/oauth/wechat/login`）
3. 用户同意授权
4. 回调到系统（`/oauth/wechat/callback`）
5. 自动创建账号或绑定现有账号

**登录入口**:
- 登录页面会自动显示"微信登录"按钮
- 用户中心可以绑定/解绑微信账号

**用户数据**:
- 使用 UnionID（如有）或 OpenID 作为唯一标识
- 自动导入昵称、头像
- 占位邮箱格式：`wechat_{id}@wechat.placeholder`

## 项目结构

```
Tf_plugins/wechat-share/
├── index.ts                          # 主入口
├── package.json                      # 包配置
├── README.md                         # 文档
└── src/
    ├── core/
    │   └── wechat-service.ts        # 微信API核心服务
    ├── handlers/
    │   └── share-handler.ts         # 分享路由处理器
    ├── services/
    │   └── oauth-service.ts         # OAuth业务逻辑
    └── types/
        ├── wechat.ts                # 微信类型定义
        └── oauth.ts                 # OAuth类型定义
```

## 技术实现

### 核心类: WechatService

```typescript
class WechatService {
  // 分享功能
  async getAccessToken(): Promise<string>
  async getJSApiTicket(): Promise<string>
  async getJSSDKConfig(url: string): Promise<JSSDKConfig>
  validateDomain(url: string): boolean

  // OAuth登录
  async getOAuthAccessToken(code: string): Promise<WechatOAuthToken>
  async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo>
  isWechatBrowser(userAgent: string): boolean
}
```

### OAuth Provider

遵循 Hydro OAuth 标准接口:
```typescript
interface OAuthProvider {
  name: string
  text: string
  icon: string
  canRegister: boolean
  get: (this: Handler) => Promise<void>
  callback: (this: Handler, args: any) => Promise<OAuthUserResponse>
}
```

## 安全考虑

1. **AppSecret保护**：
   - 使用环境变量存储敏感信息
   - 不在日志中输出完整Secret
   - 建议定期更换

2. **域名验证**：
   - 严格验证请求来源域名
   - 支持本地开发环境

3. **Token管理**：
   - AccessToken自动缓存和刷新
   - 提前5分钟过期避免临界问题
   - State token防止CSRF攻击

## 故障排除

### 常见问题

**1. 分享签名验证失败**
- 检查JS接口安全域名是否正确配置
- 确认URL格式正确（不含hash部分）
- 验证时间戳是否准确

**2. 登录授权失败**
- 确认网页授权域名已配置
- 检查AppID和AppSecret是否正确
- 验证公众号类型和权限

**3. 回调地址错误**
- 确保 `server.url` 系统配置正确
- 检查回调地址格式：`{server.url}oauth/wechat/callback`

### 调试模式

启用详细日志:
```typescript
// 所有关键步骤都有日志输出
// 查看控制台输出，前缀为 [WechatPlugin], [WechatService], [WechatOAuth]
```

前端调试:
```javascript
wx.config({
  debug: true,  // 开启调试模式，会在微信中弹出详细信息
  // ...
});
```

## API限制

- 微信 AccessToken: 2000次/天
- 网页授权: 根据公众号类型不同
- JSSDK签名: 无限制（建议缓存）

## 更新日志

### v2.0.0 (Current)
- ✨ 新增微信OAuth登录功能
- ♻️ 重构代码结构，模块化设计
- 📝 完善文档和类型定义
- 🐛 修复Token缓存问题

### v1.0.0
- 🎉 初始版本
- ✅ 微信JSSDK分享功能

## 许可证

AGPL-3.0

## 技术支持

- 微信开发文档: https://developers.weixin.qq.com/doc/offiaccount/
- Hydro 文档: https://hydro.ac/

---

**作者**: tivonfeng
**版本**: 2.0.0
