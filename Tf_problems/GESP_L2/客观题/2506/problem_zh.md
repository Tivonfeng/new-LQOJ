# 2025年6月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 人形机器人的传感器反馈数据调整姿态，这类传感器类似于计算机的？

{{ select(1) }}

- A. 处理器
- B. 存储器
- C. 输入设备
- D. 输出设备

---

2. 小明想购置更大容量的内存条，他需要的内存条是？

{{ select(2) }}

- A. RAM
- B. ROM
- C. CACHE
- D. EPROM

---

3. 下面C++代码执行后的输出是？

```cpp
int a = 3;
float b = 3.5;
cout << (a *= b);
```

{{ select(3) }}

- A. 3
- B. 3.5
- C. 10
- D. 11

---

4. 下面C++代码用于获得正整数的第3位数（如1234输出2，1-2位数输出0），横线处应填入？

```cpp
int N;
cin >> N;
cout << _______;
```

{{ select(4) }}

- A. N % 1000 / 100
- B. N / 1000 % 100
- C. N / 1000 / 100
- D. N % 100 / 100

---

5. 下面C++代码执行后的输出是？

```cpp
int a, b = (6, 28);
a = b;
cout << a << ' ' << b;
```

{{ select(5) }}

- A. 6 28
- B. 6 6
- C. 28 6
- D. 28 28

---

6. 今天是星期六，求其后第N天是星期几（周日输出"星期天"，其余输出"星期X"），横线处应填入？

```cpp
int N, remainder;
cin >> N;
remainder = _______;
if (remainder == 0)
    cout << "星期天";
else
    cout << "星期" << remainder;
```

{{ select(6) }}

- A. (N + 6) / 7
- B. (N + 6) // 7
- C. N % 7
- D. (N + 6) % 7

---

7. 下面C++代码执行后的输出是？

```cpp
int i, Sum = 0;
for (i = 1; i < 10; i++) {
    if (i % 2)
        continue;
    if (i % 7)
        break;
    Sum += i;
}
cout << Sum;
```

{{ select(7) }}

- A. 45
- B. 28
- C. 3
- D. 0

---

8. 下面C++代码执行后的输出是？

```cpp
int i, j;
for (i = 1; i < 12; i++)
    for (j = 1; j < i; j++)
        if (i * j % 2 == 1)
            break;
cout << i * j;
```

{{ select(8) }}

- A. 110
- B. 22
- C. 12
- D. 3

---

9. 下面C++代码执行后的输出是？

```cpp
int i, cnt = 0;
for (i = -99; i < 100; i += 2)
    cout << cnt;
cnt = 1 + cnt;
```

{{ select(9) }}

- A. 101
- B. 100
- C. 99
- D. 98

---

10. 下面C++代码执行后的输出是？

```cpp
int i;
for (i = 1; i < 10; i++) {
    if (i % 3 != 0) {
        printf("A#");
        continue;
    } else {
        printf("0#");
        break;
    }
}
if (i == 10)
    cout << "1";
```

{{ select(10) }}

- A. A#A#
- B. A#0#A#0
- C. A#A#1
- D. A#0#A#0#1

---

11. 下面C++代码执行后的输出是？

```cpp
int i, j;
for (i = 0; i < 3; i++)
    for (j = 0; j < i; j++)
        printf("%d#%d-", i, j);
printf("END");
```

{{ select(11) }}

- A. 0#0-1#0-2#0-2#1-END
- B. 0#0-1#0-1#1-2#0-2#1-2#2-3#0-3#1-3#2-END
- C. 0#0-1#0-1#1-2#0-2#1-2#2-END
- D. 1#0-2#0-2#1-END

---

12. 下面C++代码用于输出"不能被3整除且除以5余数为2"的数，不能实现的是？

```cpp
for (int i = 0; i < 100; i++)
    if (_______)
        cout << i << endl;
```

{{ select(12) }}

- A. (i % 3 != 0) && (i % 5 == 2)
- B. (i % 3) && (i % 5 == 2)
- C. (i % 3) && !(i % 5 != 2)
- D. !(i % 3) && (i % 5 == 2)

---

13. 下面C++代码用于判断大于0的正整数是几位数，横线处应填入的代码先后是？

```cpp
int N, cnt = 0;
cin >> N;
while (_______) {
    cnt += 1;
    _______;
}
cout << cnt;
```

{{ select(13) }}

- A. N > 0；N = N / 10
- B. N > 1；N /= 16
- C. N = 8；N /= 16
- D. N > 0；N /= 16

---

14. 判断一个数是否为自守数（平方尾数与自身相同，如25），相关说法错误的是？

```cpp
int N, N1 = N, M1 = N * N;
bool Flag = true;
while (N1 > 0) {
    if (N1 % 10 != M1 % 10) {
        Flag = false;
        break;
    } else {
        N1 /= 10;
        M1 /= 10;
    }
}
cout << (Flag ? "是自守数" : "不是");
```

{{ select(14) }}

- A. Flag未改为false则是自守数
- B. 代码判断个位数是否相等，不等则非自守数
- C. 代码N1/=10、M1/=10用于去掉个位数
- D. 将N1>0改为N>0效果相同

---

15. 下面C++代码实现指定数字图形输出，相关说法错误的是？

```cpp
int line_number, now_number = 0, i, row;
cin >> line_number;
for (row = 1; row <= line_number; row++) {  // L1
    for (i = 0; i < row; i++) {  // L2
        cout << now_number;
        now_number++;
        if (now_number == 10)
            now_number = 0;  // L3
    }
    cout << endl;
}
```

{{ select(15) }}

- A. 将now_number=0移到L1和L2之间，效果不变
- B. now_number++改为now_number=1+now_number，效果不变
- C. now_number==10改为now_number>9，效果不变
- D. cout << endl改为cout << "\n"，效果不变

---

## 二、判断题（每题2分，共20分）

16. 闭卷考试不允许带智能手机、平板电脑，很多智能手表因有嵌入式操作系统及通信功能，也不允许随身携带。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 在C++中，N为正整数时，N/10舍弃个位数（N<10时为0，N≥10时为舍弃个位后的数）。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 下面C++代码执行后输出10 20，a==b和b==a对a、b的值无影响：

```cpp
int a = 10, b = 20;
a == b;
b == a;
cout << (a, b);
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. a、b为整型变量，若max(a,b)==min(a,b)为真，则a和b相等。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 下面C++代码编译报错，因字符变量a被赋值浮点值：

```cpp
char a = '1';
a = 45.6;
cout << a;
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码输入59.99，输出"及格"：

```cpp
int score;
cin >> score;
if (score < 60)
    cout << "不及格";
else
    cout << "及格";
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码中continue会执行，因此无输出：

```cpp
int i;
for (i = 1; i < 10; i++)
    if (i % 2 == 0)
        continue;
if (i == 10)
    cout << "END";
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 下面C++代码执行后输出15：

```cpp
int Sum = 0;
for (int i = 0; i < 5; i++)
    cout << Sum;
Sum += i;
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 将下面C++代码的for循环（int i=5;i>1;i--）改为int i=1;i<5;i++，输出结果相同（求和相同）：

```cpp
int tnt = 0;
for (int i = 5; i > 1; i--)
    tnt += i;
cout << tnt;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 下面代码能实现N行N列字符阵列（奇数中间列为*，偶数中间两列为*，其余为-）：

```cpp
int N;
cin >> N;
for (i = 0; i < N; i++) {
    for (j = 0; j < N; j++)
        if (j == N / 2 || j == (N - 1) / 2)
            cout << "*";
        else
            cout << "-";
    cout << endl;
}
```

{{ select(25) }}

- A. 正确
- B. 错误

---
