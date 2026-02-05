# 2025年12月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 空客A320飞行控制系统执行判断的部件最可能是？

{{ select(1) }}

- A. 辐射传感器
- B. 处理器
- C. 内存单元
- D. 输出设备

---

2. 教学楼内的网络属于？

{{ select(2) }}

- A. PAN
- B. LAN
- C. MAN
- D. WAN

---

3. 有关C++变量的说法正确的是？

{{ select(3) }}

- A. 不可用for作为变量名，因for是关键字
- B. _tnt不可作为变量名，因首字符必须是英文字母
- C. _tnt_不可作为变量名，因最后一个字符易与减号混淆
- D. 可用printf作为变量名，因printf是关键字

---

4. 小数0.123123……求第N位的值，横线处应填入？

```cpp
int N;
cin >> N;
int remainder = _______;
if (remainder == 0)
    cout << 1;
else if (remainder == 1)
    cout << 2;
else
    cout << 3;
```

{{ select(4) }}

- A. N % 3
- B. (N - 1) % 3
- C. N / 3
- D. (N - 1) / 3

---

5. 执行`printf("%g\n", 3 + 3.1415926535)`输出6.14159的原因最可能是？

{{ select(5) }}

- A. 整数转浮点数产生舍入误差
- B. printf按格式默认保留小数位数
- C. 3.1415926535是无限循环小数
- D. CPU运算错误

---

6. 工号编码规则"前4位整除3的商之和 mod10为第5位"，代码横线处应填？

```cpp
int rst = 0, N;
for (int i = 0; i < 4; i++) {
    cin >> N;
    rst += _______;
}
cout << _______;
```

{{ select(6) }}

- A. N % 3；rst / 10
- B. N % 3；rst % 10
- C. N / 3；rst / 10
- D. N / 3；rst % 10

---

7. 下面C++代码执行后的输出是？

```cpp
for (int i = -2; i < 2; i++)
    if (i % 2)
        printf("%d#", i);
```

{{ select(7) }}

- A. -1#1#
- B. -1#0#1#
- C. -2#-1#1#
- D. -2#-1#1#2#

---

8. 下面C++代码执行后的输出是？

```cpp
int cnt = 0;
for (int i = 1; i < 10; i += 2)
    for (int j = 0; j < i; j++)
        cout << cnt;
cnt += 1;
```

{{ select(8) }}

- A. 100
- B. 55
- C. 45
- D. 25

---

9. 下面C++代码执行后的输出是？

```cpp
int i, j;
for (i = 1; i < 12; i++) {
    if (i % 2 == 0)
        continue;
    for (j = 0; j < i; j++)
        if (i * j % 2 == 0)
            break;
    if (j >= i)
        cout << i * j << " ";
}
cout << i * j;
```

{{ select(9) }}

- A. 0 0
- B. 11
- C. 0
- D. 0 11

---

10. 与`for (int i = 0; i < 10; i++) cout << i;`输出效果不一致的代码是？

{{ select(10) }}

- A. int i = 0; while (i < 10) { cout << i; i++; }
- B. int i = 0; while (i < 10) { i++; cout << i; }
- C. int i = 0; while (true) { cout << i; i++; if (i >= 10) break; }
- D. int i = 0; while (true) { if (i >= 10) break; cout << i; i++; }

---

11. 下面C++代码执行后的输出是？

```cpp
int num = 0;
while (num <= 5) {
    num += 1;
    if (num % 3)
        continue;
    printf("%d#", num);
}
if (num > 5)
    printf("%d", num);
```

{{ select(11) }}

- A. 3#6#
- B. 3#6#6
- C. 1#2#3#4#5#6#
- D. 1#2#3#4#5#6#6

---

12. 下面C++代码执行后的输出是？

```cpp
int cnt = 0;
for (int i = 0; i < 5; i++)
    for (int j = i; j < 4; j++)
        cnt += 1;
cout << cnt;
```

{{ select(12) }}

- A. 9
- B. 10
- C. 14
- D. 20

---

13. 判断N是否为M的"完整漂亮数"（能被M整除、含M、数位和能被M整除），说法正确的是？

```cpp
int N, M, Flag = 0, Sum = 0, num;
cin >> N >> M;
while (N != 0) {
    num = N % 10;
    Sum += num;
    if (num == M)
        Flag = 1;
    N /= 10;
}
if (N % M == 0 && Flag == 1 && Sum % M == 0)
    cout << "是完整漂亮数";
else
    cout << "不是";
```

{{ select(13) }}

- A. 代码能完成目标
- B. 需在while前保存N为old_num，再将判断中的N改为old_num
- C. while中需增加else Flag = 0
- D. 输入0和3输出"0是3的完整漂亮数"

---

14. 输入5，下面C++代码输出的图形是？

```cpp
int n, i, j, k;
cin >> n;
for (i = 0; i < n; i++) {
    for (j = 0; j < n - i - 1; j++)
        cout << " ";
    for (k = 0; k < 2 * i + 1; k++)
        cout << "*";
    cout << endl;
}
```

{{ select(14) }}

- A. 右对齐的*递减（*****→****→***→**→*）
- B. 左对齐的*递增（*→***→*****→*******→*********）
- C. 左对齐的*递增（**→***→****→*****→******）
- D. 右对齐的*递增（****→*****→******→*******→********）

---

15. 25名选手、10名评委，去掉最高分最低分求最终得分，说法正确的是？

```cpp
float total_score, max_score, min_score, now_score;
for (int i = 0; i < 25; i++) {
    max_score = 0;
    min_score = 10;
    total_score = 0;
    for (int j = 0; j < 10; j++) {
        cin >> now_score;
        max_score = max(max_score, now_score);
        min_score = min(min_score, now_score);
        total_score += now_score;
    }
    cout << (total_score - max_score - min_score);
}
```

{{ select(15) }}

- A. 逻辑错误，需排序才能去掉最值
- B. max_score等三行应移到外层循环外
- C. L1（max）和L2（min）可改用if或三目运算符
- D. total_score += now_score不能改为total_score = total_score + now_score

---

## 二、判断题（每题2分，共20分）

16. 鸿蒙是华为开发的操作系统，能够将正确源程序翻译成目标程序并运行。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. C++表达式5 < 10 && 20对应的逻辑值为true。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++表达式10 / 0.333333 == 10 / (1 / 3) 的值为true。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 下面C++代码无论输入负整数、0或正整数，输出都为0：

```cpp
int N;
cin >> N;
while (N)
    N /= 10;
cout << N;
```

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 下面C++代码执行后输出4 0：

```cpp
int a = 4, b = a == 5;
cout << a << ' ' << b;
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. C++表达式('Z' - 'A') < ('z' - 'A') 的结果输出为0。

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码可判断正整数N的位数：

```cpp
int N, N10 = 10, i = 1;
cin >> N;
while (true) {
    if (N % N10 == N) {
        printf("%d是%d位数", N, i);
        break;
    }
    i++;
    N10 *= 10;
}
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 计算1-2+3-4+……，将Flag = -Flag改为Flag -= Flag效果相同。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 下面C++代码执行后输出55：

```cpp
int cnt = 0;
for (int i = 0; i < 10; i++)
    for (int j = i; j < 10; j++)
        cout << cnt;
cnt += 1;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 下面C++代码中的printf("\n")无可读内容，删除不影响输出效果。

{{ select(25) }}

- A. 正确
- B. 错误

---
