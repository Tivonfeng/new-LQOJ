# 2024年9月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 山东大学DJL-1计算机的磁心存储元件相当于现代计算机的？

{{ select(1) }}

- A. 内存
- B. 磁盘
- C. CPU
- D. 显示器

---

2. IPv4版本的因特网总共有多少个A类地址网络？

{{ select(2) }}

- A. 65000
- B. 200万
- C. 126
- D. 128

---

3. 在C++中，下列不可做变量的是？

{{ select(3) }}

- A. ccf-gesp
- B. ccf_gesp
- C. ccfGesp
- D. _ccfGesp

---

4. 在C++中，与`for (int i = 1; i < 10; i++)`效果相同的是？

{{ select(4) }}

- A. for (int i = 0; i < 10; i++)
- B. for (int i = 0; i < 11; i++)
- C. for (int i = 1; i < 10; ++i)
- D. for (int i = 0; i < 11; ++i)

---

5. 在C++中，`cout << (5 / 2 + 5 % 3)` 的输出是？

{{ select(5) }}

- A. 1
- B. 2
- C. 4
- D. 5

---

6. 变量a和b可能是整型、字符型或浮点型，输入-2和3.14后，输出不可能是？

（已知'+' '-' '=' ASCII码为43、45、61）

{{ select(6) }}

- A. 1
- B. 1.14
- C. 47
- D. 将触发异常

---

7. 假设N为正整数，能获得其个位数的是？

{{ select(7) }}

- A. N % 10
- B. N / 10
- C. N && 10
- D. 以上均不正确

---

8. 下面C++代码执行后的输出是？

```cpp
int i;
for (i = 0; i < 10; i++) {
    if (i % 2)
        cout << "0#";
    break;
}
if (i == 10)
    cout << "1#";
```

{{ select(8) }}

- A. 0#
- B. 1#
- C. 0#0#1
- D. 没有输出

---

9. 执行下面C++代码并输入1和0，输出是？

```cpp
int a, b;
cin >> a >> b;
if (a && b)
    cout << ("1");
else if (!(a || b))
    cout << ("2");
else if (a || b)
    cout << ("3");
else
    cout << ("4");
```

{{ select(9) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

10. 下面C++代码执行后的输出是？

```cpp
int loopCount = 0;
for (int i = 1; i < 5; i += 2)
    loopCount += 1;
cout << (loopCount);
```

{{ select(10) }}

- A. 1
- B. 2
- C. 3
- D. 5

---

11. 代码实现指定图形（第1行1、第2行2 3、第3行3 4 5…），横线处应填入？

```cpp
int lineNum;
cin >> lineNum;
for (int i = 1; i < lineNum + 1; i++) {
    for (int ____)
        cout << j << " ";
    cout << endl;
}
```

{{ select(11) }}

- A. j = i; j < i; j++
- B. j = 1; j < i; j++
- C. j = i; j < i * 2; j++
- D. j = i + 1; j < i + i; j++

---

12. 代码输出逆序数（如123→321、120→21），横线处应填入？

```cpp
int N;
cin >> N;
int rst = 0;
while (N) {
    ____;
    ____;
}
cout << (rst);
```

{{ select(12) }}

- A. rst = rst * 10 + N % 10；N = N / 10
- B. rst += N % 10；N = N / 10
- C. rst = rst * 10 + N / 10；N = N % 10
- D. rst += N / 10；N = N % 10

---

13. 代码输入学生成绩并计算平均分，说法错误的是？

```cpp
float Sum = 0;
int cnt = 0;
while (1) {
    int score;
    cin >> score;
    if (score < 0)
        break;
    cnt += 1;
    Sum += score;
}
cout << "总学生数:" << cnt << "平均分:" << Sum / cnt;
```

{{ select(13) }}

- A. 代码while (1)写法错误
- B. 输入负数将结束输入并正确输出
- C. 输入小数程序无法正常执行
- D. score初始值不确定但不影响执行

---

14. 代码判断正整数是否为质数（是输出YES，否输出NO），横线处应填入？

```cpp
int num, i;
cin >> num;
for (i = 2; i < num; i++)
    if (____) {
        cout << ("NO");
        break;
    }
if (i == num)
    cout << ("YES");
```

{{ select(14) }}

- A. num % i
- B. num % i == 0
- C. num / i
- D. num / i == 0

---

15. 代码判定输入的数与7是否有关（能被7整除或含7），说法错误的是？

```cpp
int N, M;
bool Flag = false;
cin >> N;
M = N;
if (M % 7 == 0)
    Flag = true;
while (!Flag && M) {
    if (M % 10 == 7) {
        Flag = true;
        break;
    }
    M /= 10;
}
if (Flag)
    cout << N << "与7有关";
else
    cout << N << "与7无关";
```

{{ select(15) }}

- A. 删除break不会死循环，但可能结果错误
- B. 删除M /= 10可能导致死循环
- C. 删除M = N并将后续M改为N，调整输出可完成功能
- D. 删除break不会死循环，但可能影响效率

---

## 二、判断题（每题2分，共20分）

16. C++是一门面向对象的编程语言，也是一门高级语言。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. `cout << (3, 4, 5)` 可以输出3 4 5，且每个输出项之间用空格分开。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++表达式`12 % 10 % 10` 的值为2。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 语句`cout << rand() << ' ' << rand();` 的第二个输出值较大。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 定义int类型变量ch，值为'1'，语句`cout << int(ch);` 的输出为1。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码执行后将输出10：

```cpp
int i;
for (i = 0; i < 10; i++)
    continue;
if (i == 10)
    cout << i;
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码能求整数N和M之间所有整数之和（包含N和M）：

```cpp
int N, M, Sum;
cin >> N >> M;
if (N > M) {
    int tmp = N;
    N = M, M = tmp;
}
for (int i = N; i < M + 1; i++)
    Sum += i;
cout << Sum;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 将代码中L3行`for (int i = 1; i < 5; i++)` 改为`for (int i = 0; i < 5; i++)` 后输出结果相同：

```cpp
int loopCount = 0;
for (int i = 1; i < 5; i++)  // L3
    for (int j = 0; j < i; j++)
        cout << loopCount;
loopCount += 1;
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 下面C++代码求第N个数的值（第3个数开始是前两个数之和，N>2）：

```cpp
int start1, start2, N, tmp;
cin >> start1 >> start2 >> N;
for (int i = 2; i < N; i++) {
    tmp = start1 + start2;
    start1 = start2;
    start2 = tmp;
}
cout << start2;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 下面C++代码输入2024后输出4202：

```cpp
int N, flag = 0;
cin >> N;
while (N) {
    if (!flag)
        cout << N % 10;
    N /= 10;
    flag = (flag + 1) % 2;
}
```

{{ select(25) }}

- A. 正确
- B. 错误

---
