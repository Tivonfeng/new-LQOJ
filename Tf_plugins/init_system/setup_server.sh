#!/bin/bash

# 服务器自动化配置脚本
# 适用于 Ubuntu 系统
# 必须使用 root 用户运行

set -e  # 遇到错误时退出

echo "🚀 开始配置服务器环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本必须使用 root 用户运行"
        log_error "请使用: sudo $0"
        exit 1
    fi
    log_success "检测到 root 用户，继续执行..."
}

# 更新系统包
update_system() {
    log_info "更新系统包..."
    apt update
    apt upgrade -y
    log_success "系统包更新完成"
}

# 检查并安装基础工具
install_basic_tools() {
    log_info "检查并安装基础工具..."
    
    # 检查git
    if ! command -v git &> /dev/null; then
        log_info "安装 git..."
        apt install -y git
        log_success "git 安装完成"
    else
        log_success "git 已安装"
    fi
    
    # 检查vim
    if ! command -v vim &> /dev/null; then
        log_info "安装 vim..."
        apt install -y vim
        log_success "vim 安装完成"
    else
        log_success "vim 已安装"
    fi
    
    # 检查zsh
    if ! command -v zsh &> /dev/null; then
        log_info "安装 zsh..."
        apt install -y zsh
        log_success "zsh 安装完成"
    else
        log_success "zsh 已安装"
    fi
    
    # 安装curl（oh-my-zsh需要）
    if ! command -v curl &> /dev/null; then
        log_info "安装 curl..."
        apt install -y curl
        log_success "curl 安装完成"
    else
        log_success "curl 已安装"
    fi
}

# 安装oh-my-zsh
install_ohmyzsh() {
    log_info "检查是否已安装 oh-my-zsh..."
    
    if [ -d "$HOME/.oh-my-zsh" ]; then
        log_warning "oh-my-zsh 已存在，跳过安装"
        return
    fi
    
    log_info "安装 oh-my-zsh..."
    
    # 下载并运行安装脚本
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    
    if [ -d "$HOME/.oh-my-zsh" ]; then
        log_success "oh-my-zsh 安装完成"
    else
        log_error "oh-my-zsh 安装失败"
        exit 1
    fi
}

# 安装zsh-autosuggestions插件
install_autosuggestions() {
    log_info "检查是否已安装 zsh-autosuggestions..."
    
    local plugin_dir="$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
    
    if [ -d "$plugin_dir" ]; then
        log_warning "zsh-autosuggestions 已存在，跳过安装"
        return
    fi
    
    log_info "安装 zsh-autosuggestions..."
    
    # 克隆插件仓库
    git clone https://github.com/zsh-users/zsh-autosuggestions "$plugin_dir"
    
    if [ -d "$plugin_dir" ]; then
        log_success "zsh-autosuggestions 安装完成"
    else
        log_error "zsh-autosuggestions 安装失败"
        exit 1
    fi
}

# 配置zsh
configure_zsh() {
    log_info "配置 zsh..."
    
    local zshrc="$HOME/.zshrc"
    
    # 备份现有的.zshrc
    if [ -f "$zshrc" ]; then
        cp "$zshrc" "$zshrc.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "已备份现有 .zshrc 文件"
    fi
    
    # 检查是否已经配置了autosuggestions
    if grep -q "zsh-autosuggestions" "$zshrc" 2>/dev/null; then
        log_warning "zsh-autosuggestions 已在 .zshrc 中配置"
        return
    fi
    
    # 添加autosuggestions到插件列表
    if [ -f "$zshrc" ]; then
        # 查找plugins行并添加autosuggestions
        sed -i 's/plugins=(/plugins=(zsh-autosuggestions /' "$zshrc"
        log_success "已添加 zsh-autosuggestions 到插件列表"
    else
        log_error ".zshrc 文件不存在，请手动配置"
    fi
}

# 设置zsh为默认shell
set_default_shell() {
    log_info "设置 zsh 为默认 shell..."
    
    # 检查当前默认shell
    current_shell=$(echo $SHELL)
    if [[ "$current_shell" == *"zsh"* ]]; then
        log_success "zsh 已经是默认 shell"
        return
    fi
    
    # 设置zsh为默认shell
    chsh -s $(which zsh)
    log_success "已设置 zsh 为默认 shell，重启终端后生效"
}

# 安装其他有用的工具
install_additional_tools() {
    log_info "安装其他有用的工具..."
    
    # 安装一些常用的开发工具
    apt install -y \
        htop \
        tree \
        wget \
        unzip \
        build-essential \
        software-properties-common
    
    log_success "额外工具安装完成"
}

# 显示完成信息
show_completion_info() {
    echo
    log_success "🎉 服务器配置完成！"
    echo
    echo "已安装的组件："
    echo "  ✅ Git"
    echo "  ✅ Vim"
    echo "  ✅ Zsh"
    echo "  ✅ Oh My Zsh"
    echo "  ✅ zsh-autosuggestions"
    echo
    echo "下一步操作："
    echo "  1. 重启终端或运行: exec zsh"
    echo "  2. 享受新的开发环境！"
    echo
    echo "如果需要自定义配置，可以编辑 ~/.zshrc 文件"
}

# 主函数
main() {
    echo "=========================================="
    echo "    Ubuntu 服务器自动化配置脚本"
    echo "    (必须使用 root 用户运行)"
    echo "=========================================="
    echo
    
    check_root
    update_system
    install_basic_tools
    install_ohmyzsh
    install_autosuggestions
    configure_zsh
    set_default_shell
    install_additional_tools
    show_completion_info
}

# 运行主函数
main "$@" 