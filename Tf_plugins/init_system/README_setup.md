# Ubuntu 服务器自动化配置脚本

这个脚本可以帮助你在新的 Ubuntu 服务器上快速配置开发环境。

**⚠️ 重要提示：此脚本必须使用 root 用户运行**

## 功能特性

✅ **自动检测并安装基础工具**
- Git
- Vim
- Zsh
- Curl

✅ **自动安装 Oh My Zsh**
- 使用官方安装脚本
- 自动配置

✅ **自动安装 zsh-autosuggestions 插件**
- 自动下载并配置
- 智能提示功能

✅ **额外工具安装**
- htop (系统监控)
- tree (目录树显示)
- wget (文件下载)
- unzip (解压工具)
- build-essential (编译工具)

## 使用方法

### 1. 下载脚本
```bash
# 方法1: 直接下载
curl -fsSL https://raw.githubusercontent.com/your-repo/setup_server.sh -o setup_server.sh

# 方法2: 如果脚本在本地
# 直接使用当前目录的 setup_server.sh
```

### 2. 给脚本执行权限
```bash
chmod +x setup_server.sh
```

### 3. 运行脚本（必须使用 root 用户）
```bash
# 方法1: 切换到 root 用户后运行
sudo su -
./setup_server.sh

# 方法2: 直接使用 sudo 运行
sudo ./setup_server.sh
```

## 脚本特点

🛡️ **安全特性**
- 强制要求 root 用户运行
- 遇到错误时自动退出
- 自动备份现有配置文件

🎨 **用户体验**
- 彩色输出，清晰的状态提示
- 详细的安装进度显示
- 智能跳过已安装的组件

⚡ **自动化程度**
- 完全自动化安装
- 自动配置插件
- 自动设置默认 shell

## 安装后的效果

运行脚本后，你将获得：
- 现代化的 Zsh 终端
- 智能命令提示
- 美观的 Oh My Zsh 主题
- 常用的开发工具

## 注意事项

1. **权限要求**: 脚本必须使用 root 用户运行
2. **网络连接**: 需要稳定的网络连接来下载 Oh My Zsh 和插件
3. **备份**: 脚本会自动备份现有的 `.zshrc` 文件
4. **重启**: 安装完成后需要重启终端或运行 `exec zsh` 来激活新配置

## 故障排除

如果遇到问题：

1. **权限问题**: 确保使用 root 用户运行脚本
2. **网络问题**: 检查网络连接，确保可以访问 GitHub
3. **已安装组件**: 脚本会自动跳过已安装的组件
4. **配置文件**: 如果 `.zshrc` 不存在，脚本会提示手动配置

## 自定义配置

脚本运行完成后，你可以：
- 编辑 `~/.zshrc` 来修改 Oh My Zsh 配置
- 更换主题：修改 `ZSH_THEME` 变量
- 添加更多插件：在 `plugins` 数组中添加

## 支持的系统

- Ubuntu 18.04+
- Ubuntu 20.04+
- Ubuntu 22.04+
- 其他基于 Ubuntu 的发行版

## 运行示例

```bash
# 完整的运行流程
curl -fsSL https://raw.githubusercontent.com/your-repo/setup_server.sh -o setup_server.sh
chmod +x setup_server.sh
sudo ./setup_server.sh
``` 