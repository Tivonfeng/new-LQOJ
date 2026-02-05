# 2025年9月 C++二级考试真题单项选择题（每

## 一、题2分，共30分）

1. 人工智能中的"大模型"最贴切的是指？

{{ select(1) }}

- A. 大电脑模型
- B. 大规模智能
- C. 智能的单位
- D. 大语言模型

---

2. 在TCP协议中，完成连接建立需要通过几次握手？

{{ select(2) }}

- A. 一次
- B. 二次
- C. 三次
- D. 四次

---

3. 下面C++代码用于输入姓名并输出，正确的说法是？

```cpp
cout << "请输入您的姓名:";
string XingMing;
cin >> XingMing;
cout << XingMing;
```

{{ select(3) }}

- A. XingMing是汉语拼音，不能作为变量名
- B. 可改为Xing Ming
- C. 可改为xingming
- D. 可改为Xing-Ming

---

4. 下面C++代码用于获得正整数N的第M位数（如N=1234、M=2输出3），横线处应填入？

```cpp
int N, M, div = 1;
cin >> N >> M;
for (int i = 0; i < M - 1; i++)
    div *= 10;
cout << (______________);
```

{{ select(4) }}

- A. N % div / 10
- B. N / div / 10
- C. N % div % 10
- D. N / div % 10

---

5. 下面C++代码执行后的输出是？

```cpp
int a = 3, b = 4;
int c = a == b;
cout << a << ' ' << b << ' ' << c;
```

{{ select(5) }}

- A. 3 4 0
- B. 3 3 3
- C. 4 4 4
- D. 以上都不对

---

6. 编号规则"XX-Y"（XX：00-11，Y：0-9），第N个编号生成代码，横线处应填入？

```cpp
int N, part1, part2;
cin >> N;
part1 = N % _____;
part2 = N % ___;
if (part1 < 10)
    printf("0%d-%d", part1, part2);
else
    printf("%d-%d", part1, part2);
```

{{ select(6) }}

- A. 12 10
- B. 10 10
- C. 11 9
- D. 9 9

---

7. 下面C++代码执行后的输出是？

```cpp
int cnt = 0;
for (int i = -10; i < 10; i++)
    for (int j = 0; j < i; j++)
        cnt += 1;
cout << cnt;
```

{{ select(7) }}

- A. 145
- B. 125
- C. 55
- D. 45

---

8. 下面C++代码执行后的输出是？

```cpp
int i, j;
for (i = 1; i < 12; i++) {
    if (i % 2 == 0)
        continue;
    for (j = 0; j < i; j++)
        if (i * j % 2)
            break;
}
cout << i * j;
```

{{ select(8) }}

- A. 110
- B. 12
- C. 不确定
- D. 无输出

---

9. 下面C++代码（变量均为整型）说法正确的是？

```cpp
int a, b, remainder;
cin >> a >> b;
while (b != 0) {
    remainder = a % b;
    a = b;
    b = remainder;
}
cout << a;
```

{{ select(9) }}

- A. b不能为0，否则a%b报错
- B. a必须小于b，否则a%b报错
- C. a和b都必须为正整数，否则a%b报错
- D. 若a输入为0，输出绝对值为abs(b)

---

10. 下面C++代码执行后的输出是？

```cpp
int num = 0;
while (num <= 5) {
    num += 1;
    if (num == 3) {
        printf("%d#", num);
        continue;
    }
    printf("%d#", num);
}
```

{{ select(10) }}

- A. 1#2#4#5#6#
- B. 1#2#4#5#6
- C. 1#2#3#4#5#6#
- D. 1#2#3#4#5#6

---

11. 下面C++代码记录输入数的最大/最小值（输入-999结束），说法错误的是？

```cpp
int now_num, min_num, max_num;
cin >> now_num;
min_num = max_num = now_num;
while (now_num != -999) {
    if (max_num < now_num)
        max_num = now_num;
    if (min_num > now_num)
        min_num = now_num;
    cin >> now_num;
}
cout << min_num << ' ' << max_num;
```

{{ select(11) }}

- A. 第一个输入-999，输出-999 -999
- B. 无-999输入，能求出最大/最小值
- C. 输入考试成绩（无-999），能求出最高/最低分
- D. 把cin >> now_num移到while内，结果不变

---

12. 下面C++代码统计"与5有关的数"（含5或能被5整除）的数量，说法正确的是？

```cpp
int cnt = 0;
for (int i = 1; i < 1000; i++) {
    if (i % 5 == 0) {
        cnt++;
        continue;
    }
    int j = i;
    while (j > 0) {
        if (j % 10 == 5) {
            cnt++;
            break;
        }
        j /= 10;
    }
}
cout << cnt;
```

{{ select(12) }}

- A. 删除continue不影响结果
- B. 删除j=i并将while内j改为i，不影响结果
- C. 把break改为j=0，不影响结果
- D. 把while(j>0)改为while(j>=0)，不影响结果

---

13. 下面C++代码实现指定图形输出，横线处应填入？

```cpp
int N, K = 1;
cin >> N;
for (int i = 1; i <= N; i++) {
    for (int _ = 1; _ < ________; _++)
        cout << " ";
    for (int _ = 1; _ < ________; _++) {
        cout << K;
        K++;
        if (K == 10)
            K = 1;
    }
    cout << '\n';
}
```

{{ select(13) }}

- A. N - i + 1；i + 1
- B. N - i；i
- C. N；i
- D. N - 1；i + 1

---

14. 下面C++代码执行后的输出是？

```cpp
int a = 9, b = 27;
a = a - b;
b = 'a' - 'b';
a = 'a' + 'b';
cout << a << ' ' << b;
```

{{ select(14) }}

- A. 196 -1
- B. 27 9
- C. 98 97
- D. 不确定

---

15. 链由G3（3克/环，4环/组）、G4（4克/环，3环/组）、G6（6克/环，2环/组）循环组成，输入环编号N，求前N-1个环总重量，代码说法正确的是？

```cpp
int N, G, R, wc = 0;
cin >> N;
G = (N - 1) / 9;
wc += 36 * G;
R = (N - 1) % 9;
if (1 <= R && R <= 4)
    wc += 3 * R;
else if (5 <= R && R <= 7)
    wc += 4 * R;
else if (R == 8)
    wc += 6 * (R - 1);
cout << wc;
```

{{ select(15) }}

- A. 必须同时修改L1和L2
- B. 必须同时修改L3和L4
- C. 必须同时修改L3和L5
- D. 其他说法都不对

---

## 二、判断题（每题2分，共20分）

16. 在集成开发环境里调试程序时，不能修改源程序，否则需终止调试、关闭文件重新打开才能再次调试。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 在C++中，N为正整数且大于100时，N/10舍弃个位和十位（如N=1234输出12）；N<100时输出0。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 下面C++代码执行后输出1，因为a=5确实小于10和20：

```cpp
int a = 5;
cout << (a < 10 and 20);
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 下面C++代码执行后输出1：

```cpp
int x = 5, y = 10, z = 15;
int result = x < y < z;
cout << result;
```

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 下面C++代码输入99.99，输出"及格"：

```cpp
int score;
cin >> score;
if (score >= 60)
    printf("及格");
else
    printf("不及格");
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码输入123，输出DCB：

```cpp
int a;
cin >> a;
while (a) {
    cout << 'A' + a % 10;
    a /= 10;
}
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码执行后输出+#+#3#：

```cpp
int i;
for (i = 0; i < 3; i++) {
    if (i == 2)
        printf("+#");
    continue;
    printf("%d#", i);
}
cout << i << '#';
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 下面C++代码能输出斐波那契数列（第1个0、第2个1，后续为前两数之和）：

```cpp
int n, a = 0, b = 1;
cin >> n;
for (int j = 0; j < n; j++) {
    cout << a << " ";
    b = b + a;
    a = b - a;
}
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 下面C++代码不能实现对角线为1-9的矩阵输出，若将L1行cout << 0移到L2行则可以：

```cpp
int n, i, j;
cin >> n;
for (i = 0; i < n; i++) {
    for (j = 0; j < n; j++) {
        if (i == j) {
            cout << i + 1;
            continue;
        }
        cout << 0;  // L1
    }  // L2
    cout << endl;
}
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. C++代码cout << ('5' + 4); 执行后的输出为9。

{{ select(25) }}

- A. 正确
- B. 错误

---
