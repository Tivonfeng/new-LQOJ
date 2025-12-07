import { Context } from 'hydrooj';

/**
 * Logos 插件 - 自定义 Logo 和 Favicon
 *
 * 功能：
 * 1. 替换导航栏 Logo（通过 public/ 目录中的文件）
 * 2. 替换网站 Favicon（通过 public/ 目录中的文件）
 */
export default function apply(_ctx: Context) {
    // 插件会自动从 public/ 目录加载静态文件
    // 这些文件会被复制到 ~/.hydro/static/ 目录
    console.log('Logos plugin loaded');
}
