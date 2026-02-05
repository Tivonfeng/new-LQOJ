# 2024年6月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 小杨报名GESP一级，可选择的认证语言有几种？

{{ select(1) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

2. 流程图输入yr=2024时判定为闰年（输出2月29天），菱形框中应填入？

{{ select(2) }}

- A. (yr % 400 == 0) || (yr % 4 == 0)
- B. (yr % 400 == 0) || (yr % 4 == 0 && yr % 100 != 0)
- C. (yr % 400 == 0) && (yr % 4 == 0)
- D. (yr % 400 == 0) && (yr % 4 == 0 && yr % 100 != 0)

---

3. 在C++中，下列不可做变量的是？

{{ select(3) }}

- A. five-Star
- B. five_star
- C. fiveStar
- D. _fiveStar

---

4. 在C++中，与`for(int i = 0; i < 10; i++)`效果相同的是？

{{ select(4) }}

- A. for(int i = 0; i < 10; i += 1)
- B. for(int i = 1; i <= 10; i++)
- C. for(int i = 10; i > 0; i--)
- D. for(int i = 10; i < 1; i++)

---

5. 在C++中，`cout << (5 % 2 && 5 % 3)` 的输出是？

{{ select(5) }}

- A. 1
- B. 2
- C. true
- D. false

---

6. 执行下面C++代码时输入1，输出是？

```cpp
int month;
cin >> month;
switch(month) {
    case 1: cout << "Jan ";
    case 3: cout << "Mar ";
    break;
    default: ;
}
```

{{ select(6) }}

- A. Jan
- B. Mar
- C. Jan Mar
- D. 以上均不对

---

7. 执行下面C++代码后，说法错误的是？

```cpp
int a, b;
cin >> a >> b;
if (a && b)
    cout << "1";
else if (!(a || b))
    cout << "2";
else if (a || b)
    cout << "3";
else
    cout << "4";
```

{{ select(7) }}

- A. 输入1和1，输出1
- B. 输入0和1或1和0，输出3
- C. 输入0和0，输出2
- D. 输入0和0，输出4

---

8. 货币由5元、2元、1元组成，计算输入金额最少货币数量，横线处应填入？

```cpp
int N;
cin >> N;
int M5, M2, M1;
M5 = N / 5;
M2 = ____; // 第一横线
M1 = ____; // 第二横线
printf("5*%d+2*%d+1*%d", M5, M2, M1);
```

{{ select(8) }}

- A. 第一横线：N / 2；第二横线：N - M5 - M2
- B. 第一横线：(N - M5 * 5) / 2；第二横线：N - M5 * 5 - M2 * 2
- C. 第一横线：N - M5 * 5 / 2；第二横线：N - M5 * 5 - M2 * 2
- D. 第一横线：(N - M5 * 5) / 2；第二横线：N - M5 - M2

---

9. 下面C++代码执行后的输出是？

```cpp
int loopCount = 0;
for (int i = 0; i < 10; i++)
    for (int j = 1; j < i; j++)
        loopCount += 1;
cout << loopCount;
```

{{ select(9) }}

- A. 55
- B. 45
- C. 36
- D. 28

---

10. 下面C++代码执行后的输出是？

```cpp
int loopCount = 0;
for (int i = 0; i < 10; i++) {
    for (int j = 0; j < i; j++)
        if (i * j % 2)
            break;
    loopCount += 1;
}
cout << loopCount;
```

{{ select(10) }}

- A. 25
- B. 16
- C. 10
- D. 9

---

11. 下面C++代码仅输入正负整数或0，说法错误的是？

```cpp
int N, Sum = 0;
cin >> N;
while (N) {
    Sum += N;
    cin >> N;
}
cout << Sum;
```

{{ select(11) }}

- A. 输入0将终止循环
- B. 能实现所有非0整数的求和
- C. 第一次输入0，输出0
- D. 将陷入死循环，需将while(N)改为while(N==0)

---

12. 执行下面C++代码（判断质数），说法正确的是？

```cpp
int N;
cin >> N;
bool Flag = true;
for (int i = 2; i < N; i++) {
    if (i * i > N)
        break;
    if (N % i == 0) {
        Flag = false;
        break;
    }
}
if (Flag)
    cout << N << "是质数";
else
    cout << N << "不是质数";
```

{{ select(12) }}

- A. 输入正整数能正确判断
- B. 输入整数能正确判断
- C. 输入≥0的整数能正确判断
- D. 改Flag = N >= 2 ? true : false可判断所有整数

---

13. 下面C++代码用于实现指定图形（1→2 3 6 9→4 8 12 16→…），说法正确的是？

```cpp
for (int i = 1; i < 6; i++) {  // L1
    for (int j = 1; j < i + 1; j++)  // L2
        cout << i * j << " ";
    cout << endl;
}
```

{{ select(13) }}

- A. 当前代码能实现预期效果
- B. cout << endl;移到L2内部可实现
- C. cout << endl;移到L1外部可实现
- D. 删除cout << endl;可实现

---

14. 下面C++代码执行后的输出是？

```cpp
int cnt1 = 0, cnt2 = 0;
for (int i = 0; i < 10; i++) {
    if (i % 2 == 0)
        if (i % 2)
            continue;
    cnt1 += 1;
    else if (i % 3 == 0)
        cnt2 += 1;
}
cout << cnt1 << " " << cnt2;
```

{{ select(14) }}

- A. 5 2
- B. 5 0
- C. 0 2
- D. 0 0

---

15. 下面C++代码判断M是否为N的幸运数（能被N整除）或超级幸运数（含N且能被N整除），说法正确的是？

```cpp
int N, M;
cin >> N >> M;
bool Lucky;
if (M % N == 0)
    Lucky = true;
else
    Lucky = false;
while (M) {
    if (M % 10 == N && Lucky) {
        printf("%d是%d的超级幸运数!", M, N);
        break;
    }
    M /= 10;
}
if (M == 0) {
    if (Lucky)
        printf("%d是%d的幸运数!", M, N);
    else
        printf("%d非%d的幸运数!", M, N);
}
```

{{ select(15) }}

- A. N = 3、M = 36 → 输出"36是3的超级幸运数!"
- B. N = 7、M = 21 → 输出"21是7的幸运数!"
- C. N = 8、M = 36 → 输出"36非8的超级幸运数!"
- D. N = 3、M = 63 → 输出"63是3的超级幸运数!"

---

## 二、判断题（每题2分，共20分）

16. 执行C++代码`cout << '9' + '1';`的输出为10。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. C++表达式`-12 % 10`的值为2。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++表达式`int(12.56)`的值为13。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. C++的整型变量N被赋值为10，语句`cout << N / 3 << "-" << N % 3`执行后输出是3-1。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 在C++代码中，不可以将变量命名为scanf，因为scanf是C++语言的关键字。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码执行后将导致死循环：`for (int i = 0; i < 10; i++) continue;`

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码执行后将输出10：

```cpp
int cnt = 0;
for (int i = 0; i < 10; i++)
    for (int j = 0; j < i; j++) {
        cnt += 1;
        break;
    }
cout << cnt;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 下面C++代码执行后将输出5：

```cpp
int cnt = 0;
for (int i = 1; i < 5; i++)
    for (int j = i; j < 5; j += i)
        if (i * j % 2 == 0)
            cnt += 1;
cout << cnt;
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 下面C++代码能实现正整数各位数字之和：

```cpp
int N, Sum = 0;
cin >> N;
while (N) {
    Sum += N % 10;
    N /= 10;
}
cout << Sum;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. GESP测试是对认证者的编程能力进行等级认证，同一级别的能力基本上与编程语言无关。

{{ select(25) }}

- A. 正确
- B. 错误

---
