# 微信模板消息填写指南

## 如何根据模板详情填写数据

### 步骤 1：查看模板详情

在微信公众平台的模板消息页面，点击模板可以看到模板详情，包括：
- **模板ID**：用于发送消息
- **详细内容**：显示占位符，如 `{{thing8.DATA}}`, `{{time4.DATA}}` 等

### 步骤 2：理解占位符格式

微信模板使用占位符格式：`{{字段名.DATA}}`

**示例：**
- `{{thing8.DATA}}` → 字段名是 `thing8`
- `{{time4.DATA}}` → 字段名是 `time4`
- `{{keyword1.DATA}}` → 字段名是 `keyword1`
- `{{first.DATA}}` → 字段名是 `first`
- `{{remark.DATA}}` → 字段名是 `remark`

### 步骤 3：填写数据

在测试页面或代码中，需要将占位符转换为数据对象：

**模板详情中的占位符：**
```
学员姓名: {{thing8.DATA}}
上课时间: {{time4.DATA}}
科目: {{thing9.DATA}}
签到校区: {{thing15.DATA}}
课程名称: {{thing2.DATA}}
```

**对应的数据格式：**
```json
{
  "thing8": {
    "value": "子轩"
  },
  "time4": {
    "value": "2023年2月15日 10:00"
  },
  "thing9": {
    "value": "乒乓球"
  },
  "thing15": {
    "value": "北京大学西校区"
  },
  "thing2": {
    "value": "钢琴一对一"
  }
}
```

## 实际填写示例

### 示例：签到成功通知模板

**模板ID：** `XbOPGGW6_5k1plTFbLg2blnjBRpQx23rDUBNI3dFNOg`

**模板详情：**
- 学员姓名: `{{thing8.DATA}}`
- 上课时间: `{{time4.DATA}}`
- 科目: `{{thing9.DATA}}`
- 签到校区: `{{thing15.DATA}}`
- 课程名称: `{{thing2.DATA}}`

**在测试页面填写：**

1. **OpenID**: `omldrw_ZM8Ei_zJO0WOyHhXb7gYU` (用户的微信 openid)

2. **模板ID**: `XbOPGGW6_5k1plTFbLg2blnjBRpQx23rDUBNI3dFNOg`

3. **跳转URL** (可选): `https://example.com/course/detail`

4. **消息数据** - 添加以下字段：

   | 字段名 | 字段值 | 颜色（可选） |
   |--------|--------|--------------|
   | `thing8` | `子轩` | `#173177` |
   | `time4` | `2023年2月15日 10:00` | |
   | `thing9` | `乒乓球` | |
   | `thing15` | `北京大学西校区` | |
   | `thing2` | `钢琴一对一` | |

**在代码中使用：**

```typescript
await templateService.sendByOpenId(
    'omldrw_ZM8Ei_zJO0WOyHhXb7gYU',
    'XbOPGGW6_5k1plTFbLg2blnjBRpQx23rDUBNI3dFNOg',
    {
        thing8: {
            value: '子轩',
            color: '#173177',
        },
        time4: {
            value: '2023年2月15日 10:00',
        },
        thing9: {
            value: '乒乓球',
        },
        thing15: {
            value: '北京大学西校区',
        },
        thing2: {
            value: '钢琴一对一',
        },
    },
    {
        url: 'https://example.com/course/detail',
    },
);
```

## 常见字段类型

### 1. 标准字段

微信模板消息通常使用以下标准字段：

- `first` - 首行内容（通常用于标题）
- `keyword1` - `keyword10` - 关键词（最多10个）
- `remark` - 备注（通常用于底部说明）

**示例：**
```json
{
  "first": {
    "value": "系统通知",
    "color": "#173177"
  },
  "keyword1": {
    "value": "您的提交已通过"
  },
  "keyword2": {
    "value": "2024-01-01 12:00:00"
  },
  "remark": {
    "value": "感谢您的使用！"
  }
}
```

### 2. 自定义字段

微信也支持自定义字段名，如：
- `thing1` - `thing20` - 事物类型字段
- `time1` - `time10` - 时间类型字段
- `number1` - `number10` - 数字类型字段
- `date1` - `date10` - 日期类型字段

**注意：** 字段名必须与模板详情中的占位符完全匹配（去掉 `.DATA` 部分）

## 字段颜色

可以为字段设置颜色（可选），使用十六进制颜色码：

- `#173177` - 蓝色（微信默认）
- `#FF0000` - 红色
- `#00FF00` - 绿色
- `#000000` - 黑色

**示例：**
```json
{
  "thing8": {
    "value": "子轩",
    "color": "#173177"
  }
}
```

## 时间字段格式

对于时间类型字段（`time1` - `time10`），建议使用以下格式：

- `2023年2月15日 10:00`
- `2023-02-15 10:00:00`
- `2023/02/15 10:00`

## 常见问题

### Q1: 字段名应该填写什么？

**A:** 字段名就是模板详情中占位符去掉 `.DATA` 的部分。

例如：
- 模板显示 `{{thing8.DATA}}` → 字段名填写 `thing8`
- 模板显示 `{{keyword1.DATA}}` → 字段名填写 `keyword1`

### Q2: 为什么发送失败，提示模板ID无效？

**A:** 可能的原因：
1. 模板ID输入错误
2. 模板已被删除
3. 模板不属于当前公众号

**解决方法：**
- 在测试页面点击"刷新模板列表"，从列表中选择正确的模板ID
- 确认模板在微信公众平台中仍然存在

### Q3: 字段值有长度限制吗？

**A:** 是的，微信对字段值有长度限制：
- 一般字段：最多 20 个字符
- 时间字段：最多 20 个字符
- 备注字段：最多 200 个字符

### Q4: 可以省略某些字段吗？

**A:** 可以。模板中定义的字段都是可选的，但建议填写所有字段以获得更好的用户体验。

## 快速检查清单

发送模板消息前，请确认：

- [ ] OpenID 正确（用户已关注公众号）
- [ ] 模板ID 正确（从模板列表中选择）
- [ ] 字段名与模板详情中的占位符匹配
- [ ] 字段值符合长度要求
- [ ] 时间格式正确（如果是时间字段）
- [ ] 颜色代码格式正确（如果设置了颜色）

## 参考

- [微信模板消息文档](https://developers.weixin.qq.com/doc/service/guide/template-message.html)
- [模板消息运营规范](https://developers.weixin.qq.com/doc/service/guide/template-message-operations.html)

