# 微信分享插件 (WeChat Share Plugin)

一个为 Hydro OJ 开发的微信JSSDK分享插件，支持在微信生态中分享OJ内容，包括题目、比赛、用户资料等。

## 功能特性

- **微信JSSDK集成**：完整集成微信公众号JSSDK功能
- **智能分享配置**：根据页面类型自动生成合适的分享内容
- **管理后台**：提供可视化的配置管理界面
- **多页面支持**：支持题目、比赛、用户、排行榜等页面分享
- **分享统计**：记录分享行为，支持数据分析
- **响应式设计**：适配移动端和桌面端
- **国际化支持**：支持中英文界面

## 安装方法

1. 将插件文件放置到 `Tf_plugins/wechat-share/` 目录
2. 安装依赖包：
   ```bash
   npm install wechat-jssdk axios
   ```
3. 重启 Hydro 服务
4. 访问 `/wechat/config` 配置微信参数

## 配置要求

### 微信公众号准备

1. **获取开发者信息**：
   - 登录 [微信公众平台](https://mp.weixin.qq.com/)
   - 在 "开发 > 基本配置" 中获取 AppID 和 AppSecret

2. **设置JS接口安全域名**：
   - 在 "设置 > 公众号设置 > 功能设置" 中
   - 添加您的网站域名到 "JS接口安全域名"
   - 域名必须通过ICP备案且支持HTTPS

3. **接口权限**：
   - 确保公众号具有自定义菜单和JS接口权限

### 系统配置

访问 `/wechat/config` 配置以下参数：

```yaml
wechat-share:
  enabled: true                    # 是否启用微信分享
  appId: "wx1234567890abcdef"      # 微信公众号AppID
  appSecret: "your_app_secret"     # 微信公众号AppSecret
  domain: "example.com"            # 授权域名（不含协议）
```

## 功能说明

### 管理界面

- **配置管理**：`/wechat/config` - 设置微信公众号信息
- **连接测试**：验证配置是否正确，测试微信API连通性
- **缓存管理**：清理Token和Ticket缓存
- **状态监控**：实时显示服务状态

### 分享功能

插件会在以下页面自动启用分享：

1. **题目页面** (`/p/{id}`)：
   - 标题：题目名称
   - 描述：难度和通过率信息
   - 链接：题目详情页

2. **比赛页面** (`/c/{id}`)：
   - 标题：比赛名称
   - 描述：报名截止时间和参赛人数
   - 链接：比赛详情页

3. **用户页面** (`/user/{id}`)：
   - 标题：用户昵称
   - 描述：等级和AC题数
   - 链接：用户资料页

4. **排行榜** (`/ranking`)：
   - 标题：积分排行榜
   - 描述：编程达人排名
   - 链接：排行榜页面

### API接口

#### 获取JSSDK配置
```javascript
GET /wechat/share?url={current_url}

Response:
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

#### 生成分享配置
```javascript
POST /wechat/share
Content-Type: application/json

{
  "type": "problem",
  "data": {
    "_id": "1001",
    "title": "A+B Problem",
    "difficulty": "简单",
    "stats": { "ac_rate": 0.85 }
  }
}

Response:
{
  "success": true,
  "data": {
    "shareConfig": {
      "title": "A+B Problem - 算法题目",
      "desc": "难度: 简单 | 通过率: 85%",
      "link": "https://example.com/p/1001",
      "imgUrl": "https://example.com/static/oj-logo.png"
    }
  }
}
```

## 前端集成

### 自动配置（推荐）

插件会自动在支持的页面初始化分享功能：

```javascript
// 页面加载时自动执行
document.addEventListener('DOMContentLoaded', function() {
    if (window.WechatShareManager) {
        window.WechatShareManager.getInstance().autoConfigureShare();
    }
});
```

### 手动配置

```javascript
import { shareManager } from '/static/wechat-share-utils.js';

// 设置自定义分享内容
shareManager.setShareData({
    title: '自定义标题',
    desc: '自定义描述',
    link: 'https://example.com/custom',
    imgUrl: 'https://example.com/custom-image.png'
});

// 配置菜单显示
shareManager.configureMenu(
    ['menuItem:copyUrl'],  // 隐藏的菜单项
    ['menuItem:share:appMessage', 'menuItem:share:timeline']  // 显示的菜单项
);
```

## 数据库结构

插件创建以下 MongoDB 集合：

### wechat.config
```javascript
{
  domainId: String,      // 域名ID
  appId: String,         // 微信AppID
  appSecret: String,     // 微信AppSecret
  domain: String,        // 授权域名
  enabled: Boolean,      // 是否启用
  updatedAt: Date,       // 更新时间
  updatedBy: Number      // 更新者ID
}
```

### wechat.shares
```javascript
{
  _id: String,           // 分享记录ID
  type: String,          // 分享类型（problem/contest/user等）
  title: String,         // 分享标题
  link: String,          // 分享链接
  shareType: String,     // 分享方式（friend/timeline）
  timestamp: Date,       // 分享时间
  uid: Number,           // 分享用户ID（可选）
  domainId: String       // 域名ID
}
```

## 安全考虑

1. **AppSecret保护**：
   - 配置界面不显示完整AppSecret
   - 数据库存储加密建议
   - 定期更换AppSecret

2. **域名验证**：
   - 严格验证授权域名
   - 防止未授权域名使用

3. **API限制**：
   - 微信API调用频率限制
   - Token自动刷新机制

## 故障排除

### 常见问题

1. **签名验证失败**：
   - 检查时间戳是否正确
   - 确认URL编码格式
   - 验证AppSecret是否正确

2. **分享不生效**：
   - 确认在微信浏览器中测试
   - 检查JS接口安全域名设置
   - 查看浏览器控制台错误信息

3. **配置测试失败**：
   - 验证网络连接
   - 检查AppID和AppSecret
   - 确认公众号类型和权限

### 调试模式

开发环境可启用调试模式：

```javascript
// 在分享工具初始化时启用debug
window.wx.config({
    debug: true,  // 开启调试模式
    // ... 其他配置
});
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的微信JSSDK分享功能
- 提供管理界面和API接口
- 支持多种页面类型分享
- 包含中英文国际化

## 许可证

本插件采用 AGPL-3.0 许可证。

## 技术支持

- GitHub Issues: [项目地址]/issues
- 微信开发文档: https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html

---

**注意**：使用前请确保已获得微信公众号的相关权限，并正确配置域名白名单。