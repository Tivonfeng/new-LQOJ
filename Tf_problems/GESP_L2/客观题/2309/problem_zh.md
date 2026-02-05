# 2023年9月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 我国第一台大型通用电子计算机使用的逻辑部件是( )。

{{ select(1) }}

- A. 集成电路
- B. 大规模集成电路
- C. 晶体管
- D. 电子管

---

2. 流程图功能：开始→x=5,y=12→判断x>y（是则a=x、b=y；否则a=y、b=x）→输出a,b→结束，输出结果是( )？

{{ select(2) }}

- A. 5 12
- B. 12 5
- C. 5 5
- D. 12 12

---

3. 找出整数a、b中较大的一个，通常要用哪种程序结构？

{{ select(3) }}

- A. 顺序结构
- B. 循环结构
- C. 分支结构
- D. 跳转结构

---

4. 以下不是C++关键字的是( )。

{{ select(4) }}

- A. continue
- B. cout
- C. break
- D. goto

---

5. C++表达式int(-123.123 / 10) 的值是( )。

{{ select(5) }}

- A. -124
- B. -123
- C. -13
- D. -12

---

6. 代码实现从大到小输出N的所有因子（如输入18输出18 9 6 3 2 1），横线处应填入( )。

```cpp
int N = 0;
cin >> N;
for (____) // 横线处
    if (N % i == 0)
        cout << i << ' ';
```

{{ select(6) }}

- A. ; ;
- B. int i = 1; i < N; i++
- C. int i = N; i > 0; i--
- D. int i = N; i > 1; i--

---

7. 输出N行N列矩阵（对角线为1，其余为0），横线处应填入( )。

```cpp
int N = 0;
cin >> N;
for (int i = 1; i < N + 1; i++) {
    for (int j = 1; j < N + 1; j++)
        if (____) // 横线处
            cout << 1 << " ";
        else
            cout << 0 << " ";
    cout << endl;
}
```

{{ select(7) }}

- A. i = j
- B. j != j
- C. i >= j
- D. i == j

---

8. 代码判断N是否为质数（输入N≥2），横线处应填入( )。

```cpp
int N = 0, i = 0;
cin >> N;
for (i = 2; i < N; i++)
    if (N % i == 0) {
        cout << "非质数";
        ____; // 横线处
    }
if (i == N)
    cout << "是质数";
```

{{ select(8) }}

- A. break
- B. continue
- C. exit
- D. return

---

9. 代码执行后的输出是( )。

```cpp
int N = 9;
for (int i = 2; i < N; i++)
    if (N % i)
        cout << "1#";
cout << "0" << endl;
```

{{ select(9) }}

- A. 1#0
- B. 1#
- C. 1#1#1#1#1#1
- D. 1#1#1#1#1#1#0

---

10. 代码执行后的输出是( )。

```cpp
int cnt = 0;
for (int i = 1; i < 9; i++)
    for (int j = 1; j < i; j += 2)
        cnt += 1;
cout << cnt;
```

{{ select(10) }}

- A. 16
- B. 28
- C. 35
- D. 36

---

11. 代码执行后的输出是( )。

```cpp
int cnt = 0;
for (int i = 1; i < 13; i += 3)
    for (int j = 1; j < i; j += 2)
        if (i * j % 2 == 0)
            break;
        else
            cnt += 1;
cout << cnt;
```

{{ select(11) }}

- A. 1
- B. 3
- C. 15
- D. 没有输出

---

12. 代码执行后的输出是( )。

```cpp
int x = 1;
while (x < 100) {
    if (!(x % 3))
        cout << x << ",";
    else if (x / 10)
        break;
    x += 2;
}
cout << x;
```

{{ select(12) }}

- A. 1
- B. 3,9,11
- C. 3,6,9,10
- D. 1,5,7,11,13,15

---

13. 输出N行字母（每行从A开始，ABC重复，如第7行ABCABCA），横线处应填入( )。

```cpp
int N = 0;
cin >> N;
for (int i = 1; i < N + 1; i++) {
    for (int j = 0; j < i; j++)
        cout << ____; // 横线处
    cout << endl;
}
```

{{ select(13) }}

- A. 'A' + j / 3
- B. (char)('A' + j / 3)
- C. 'A' + j % 3
- D. (char)('A' + j % 3)

---

14. 输出指定行数的对称数字图形（如输入9行含12345678987654321），横线处应填入( )。

```cpp
int lineCount = 0;
cin >> lineCount;
for (int i = 0; i < lineCount; i++) {
    for (int j = 0; j < ____; j++) cout << ' '; // 横线处
    for (int j = 1; j < i + 1; j++)
        cout << j << " ";
    for (int j = i + 1; j > 0; j--)
        cout << j << " ";
    cout << endl;
}
```

{{ select(14) }}

- A. (lineCount - i - 1) * 2
- B. (lineCount - i) * 2
- C. lineCount - i - 1
- D. lineCount - i

---

15. 连续输入成绩直到负数停止，求平均分，横线处应填入( )。

```cpp
double totalScore = 0;
int studCount = 0;
while (____) { // 横线处
    cin >> score;
    if (score < 0)
        break;
    totalScore += score;
    studCount += 1;
}
cout << "平均分=" << totalScore / studCount;
```

{{ select(15) }}

- A. true
- B. false
- C. True
- D. False

---

## 二、判断题（每题2分，共20分）

16. 我们常说的互联网(Internet)是一个覆盖全球的广域网络，它不属于任何一个国家。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 神威·太湖之光超级计算机是中国自主研制的超级计算机，在全球超级计算机TOP500排行榜中多次荣膺榜首。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++表达式7.8 / 2 的值为3.9，类型为float。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. C++表达式(2 * 3) || (2 + 5) 的值为67。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 如果m和n为int类型变量，则执行for (m = 0, n = 1; n < 9; ) n = ((m = 3 * n, m + 1), m - 1); 之后n的值为偶数。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 如果a为int类型的变量，则表达式(a >= 5 && a <= 10) 与(5 <= a <= 10) 的值总是相同的。

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 代码执行后的输出为10：

```cpp
int cnt = 0;
for (int i = 1; i < 10; i++) {
    cnt += 1;
    i += 1;
}
cout << cnt;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 执行代码后的输出为0：

```cpp
int rst = 0;
for (int i = -100; i < 100; i += 2)
    rst += i;
cout << rst;
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 执行代码后的输出为30：

```cpp
int rst = 0;
for (int i = 0; i < 10; i += 2)
    rst += i;
cout << rst;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. C++是一种高级程序设计语言。

{{ select(25) }}

- A. 正确
- B. 错误

---
