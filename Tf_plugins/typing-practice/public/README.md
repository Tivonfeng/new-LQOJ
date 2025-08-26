# 静态资源文件夹

本文件夹包含打字练习插件的静态资源文件。

## 音效文件

为了提供更好的用户体验，建议添加以下音效文件：

### 推荐的音效文件：

1. **correct-keystroke.mp3** - 正确按键音效
   - 建议使用轻柔的"咔嗒"声
   - 时长: 50-100ms
   - 音量: 适中，不会干扰用户

2. **incorrect-keystroke.mp3** - 错误按键音效
   - 建议使用轻微的"嗡嗡"声或低频提示音
   - 时长: 100-150ms
   - 音量: 比正确音效稍大，但不刺耳

3. **practice-complete.mp3** - 练习完成音效
   - 建议使用成功提示音或短暂的庆祝音
   - 时长: 500-1000ms
   - 音量: 较大，表示成功

4. **achievement-unlock.mp3** - 成就解锁音效
   - 建议使用"叮"声或胜利音效
   - 时长: 1000-2000ms
   - 音量: 较大，表示重要成就

5. **level-up.mp3** - 升级音效
   - 建议使用上升音阶或特殊成就音
   - 时长: 1500-3000ms
   - 音量: 较大，表示重要里程碑

## 图像资源

可以添加以下图像资源：

1. **typing-background.jpg** - 练习页面背景图
2. **achievement-icons/** - 成就图标文件夹
3. **difficulty-badges/** - 难度徽章图标
4. **keyboard-layout.svg** - 键盘布局图

## 字体资源

建议添加等宽字体以改善代码文本的显示：

1. **fonts/monaco.woff2** - Monaco字体
2. **fonts/consolas.woff2** - Consolas字体
3. **fonts/source-code-pro.woff2** - Source Code Pro字体

## 使用方法

在插件中通过以下方式引用这些资源：

```typescript
// 音效播放
const audio = new Audio('/static/typing-practice/correct-keystroke.mp3');
audio.play();

// 背景图片
.typing-container {
  background-image: url('/static/typing-practice/typing-background.jpg');
}
```

## 注意事项

1. 所有音效文件应该进行适当的音量标准化
2. 建议提供多种格式（mp3, ogg, wav）以确保浏览器兼容性
3. 图像文件应该进行优化以减少加载时间
4. 考虑提供深色和浅色主题的不同资源变体

## 版权说明

使用任何第三方音效或图像资源时，请确保遵守相应的版权协议。
建议使用Creative Commons或类似开源许可的资源。