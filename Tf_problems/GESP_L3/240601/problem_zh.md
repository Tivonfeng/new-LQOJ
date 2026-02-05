# 移位

## 题目描述
小杨学习了加密技术移位，所有大写字母都向后按照一个固定数目进行偏移。偏移过程会将字母表视作首尾相接的环，例如，当偏移量是3的时候，大写字母 A 会替换成 D，大写字母 Z 会替换成 C，总体来看，大写字母表 ABCDEFGHIJKLMNOPQRSTUVWXYZ 会被替换成 DEFGHIJKLMNOPQRSTUVWXYZABC。注：当偏移量是26的倍数时，每个大写字母经过偏移后会恰好回到原来的位置，即大写字母表 ABCDEFGHIJKLMNOPQRSTUVWXYZ 经过偏移后会保持不变。

## 输入格式
第一行包含一个正整数 n。

## 输出格式
输出在偏移量为 n 的情况下，大写字母表 ABCDEFGHIJKLMNOPQRSTUVWXYZ 移位替换后的结果。

## 样例

```input1
3
```

```output1
DEFGHIJKLMNOPQRSTUVWXYZABC
```

## 数据范围
1 ≤ n ≤ 100

## 学习提示
- 使用循环遍历26个大写字母
- 使用取模运算 %26 实现循环偏移
- 公式：新字母 = 'A' + (原字母索引 + 偏移量) % 26

## 学习目标
- 掌握循环与取模的综合应用
- 理解环形偏移的原理
