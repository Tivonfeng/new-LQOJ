# 配置指南 - 方案2（推荐）

## 当前配置方案

**方案 2：公众号 + 开放平台**

这是最佳配置方案，同时支持：
- ✅ 微信分享功能（使用公众号）
- ✅ 微信内登录（使用公众号，响应快）
- ✅ 浏览器扫码登录（使用开放平台）

## 配置状态

### ✅ 已完成：公众号配置

```javascript
appId: 'wx8f8d991dfd127dca'
appSecret: '05068710fde31b2e914dceb3f45a8aa1'
domains: ['yz.lqcode.fun', 'noj.lqcode.fun']
```

**需要在微信公众平台配置：**

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"设置与开发" → "公众号设置" → "功能设置"
3. 配置以下域名：

   **JS接口安全域名**（用于分享）：
   - `yz.lqcode.fun`
   - `noj.lqcode.fun`

   **网页授权域名**（用于微信内登录）：
   - `yz.lqcode.fun`
   - `noj.lqcode.fun`

### ⏳ 待配置：开放平台

```javascript
openAppId: ''      // 👈 需要填入
openAppSecret: ''  // 👈 需要填入
```

## 开放平台配置步骤

### 步骤 1：注册/登录开放平台

访问 [微信开放平台](https://open.weixin.qq.com/) 并登录

### 步骤 2：创建网站应用

1. 点击"管理中心" → "网站应用" → "创建网站应用"
2. 填写应用信息：
   - **应用名称**：自定义（如：LQOJ 登录）
   - **应用简介**：简单描述
   - **应用官网**：`https://yz.lqcode.fun` 或 `https://noj.lqcode.fun`
   - **应用 Logo**：上传一个 Logo 图片
3. 提交审核（通常1-3个工作日）

### 步骤 3：配置授权回调域

应用审核通过后：

1. 进入应用详情
2. 找到"授权回调域"设置
3. 添加以下域名（不含协议）：
   - `yz.lqcode.fun`
   - `noj.lqcode.fun`

### 步骤 4：获取 AppID 和 AppSecret

1. 在应用详情页面查看
2. **AppID**：`wxXXXXXXXXXXXXXXXX`（应用ID）
3. **AppSecret**：点击"生成"按钮获取（只显示一次，请保存）

### 步骤 5：填入配置

编辑 `/Users/tivonfeng/Work/Code/new-LQOJ/Tf_plugins/wechat-share/index.ts`：

找到第 21-22 行：
```javascript
openAppId: Schema.string().description('微信开放平台 AppID (可选，用于扫码登录)').default(''),
openAppSecret: Schema.string().description('微信开放平台 AppSecret').role('secret').default(''),
```

修改为：
```javascript
openAppId: Schema.string().description('微信开放平台 AppID (可选，用于扫码登录)').default('你的开放平台AppID'),
openAppSecret: Schema.string().description('微信开放平台 AppSecret').role('secret').default('你的开放平台AppSecret'),
```

### 步骤 6：重启服务

```bash
# 重启 Hydro 服务
yarn run dev  # 或你的启动命令
```

## 配置验证

### 验证分享功能

1. 在微信客户端打开：`https://yz.lqcode.fun`
2. 打开浏览器控制台（F12）
3. 执行：
   ```javascript
   fetch('/wechat/share?url=' + encodeURIComponent(location.href))
     .then(r => r.json())
     .then(console.log)
   ```
4. 应该看到返回的配置信息

### 验证微信内登录

1. 在微信客户端打开：`https://yz.lqcode.fun/oauth/wechat/login`
2. 应该直接跳转到微信授权页面（不是扫码）
3. 授权后应该自动登录成功

### 验证浏览器扫码登录

1. 在普通浏览器打开：`https://yz.lqcode.fun/oauth/wechat/login`
2. 应该显示二维码
3. 用微信扫码后应该登录成功

## 可选：绑定公众号（UnionID互通）

在开放平台可以绑定公众号，实现用户统一：

1. 进入开放平台"管理中心"
2. 找到"公众账号绑定"
3. 绑定你的公众号：`wx8f8d991dfd127dca`
4. 绑定后，同一用户在公众号和网站的 UnionID 相同

**好处：**
- 用户在微信内和浏览器登录后是同一账号
- 不需要重复注册

## 当前配置总结

```javascript
{
  // 公众号配置（已完成）
  appId: 'wx8f8d991dfd127dca',
  appSecret: '05068710fde31b2e914dceb3f45a8aa1',

  // 开放平台配置（待填入）
  openAppId: '',      // 👈 填入开放平台 AppID
  openAppSecret: '',  // 👈 填入开放平台 AppSecret

  // 通用配置
  useOpenPlatformForOAuth: false,  // 微信内用公众号，浏览器用开放平台
  domains: ['yz.lqcode.fun', 'noj.lqcode.fun'],
  canRegister: true
}
```

## 功能对照表

| 功能 | 需要配置 | 当前状态 |
|------|---------|---------|
| 微信分享 | 公众号 | ✅ 可用 |
| 微信内登录 | 公众号 | ✅ 可用 |
| 浏览器扫码登录 | 开放平台 | ⏳ 待配置 |

配置完成开放平台后，所有功能都将可用！
