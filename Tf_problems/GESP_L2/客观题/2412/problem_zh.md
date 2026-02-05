# 2024年12月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 2024年诺贝尔物理学奖得主约翰·霍普菲尔德和杰弗里·辛顿的主要研究方向是？

{{ select(1) }}

- A. 天体物理
- B. 流体力学
- C. 人工智能
- D. 量子理论

---

2. 计算机系统中存储基本单位B代表的是？（如照片大小3MB）

{{ select(2) }}

- A. Byte
- B. Block
- C. Bulk
- D. Bit

---

3. C++语句`cout << (3 + 3 % 3 * 2 - 1)`执行后输出的值是？

{{ select(3) }}

- A. -1
- B. 4
- C. 56
- D. 2

---

4. 下面C++代码执行后输出是？

```cpp
for (int i = 0; i < 10; i++)
    printf("%d", i);
```

{{ select(4) }}

- A. 123456789
- B. 0123456789
- C. 12345678910
- D. 012345678910

---

5. 下面C++代码的相关说法正确的是？

```cpp
int tnt;
for (int i = 0; i < 10; i++)
    tnt += i;
cout << tnt;
```

{{ select(5) }}

- A. 输出1-10的和（含10）
- B. 输出1-10的和（不含10）
- C. 输出0-10的和（不含10）
- D. 输出不确定的值

---

6. 下面C++代码执行后输出是？

```cpp
int i;
for (i = 1; i < 10; i++)
    if (i % 2)
        continue;
    else
        break;
cout << i;
```

{{ select(6) }}

- A. 1
- B. 2
- C. 9
- D. 10

---

7. 下面C++代码执行后的输出是？

```cpp
int i;
for (i = 0; i < 10; i++) {
    if (i % 3)
        continue;
    printf("0#");
}
if (i >= 10)
    printf("1#");
```

{{ select(7) }}

- A. 0#0#0#0#0#0#0#1#
- B. 0#0#0#0#0#0#1#
- C. 0#0#0#0#1#
- D. 0#0#0#0#

---

8. 下面C++代码用于输出0-100（含100）能被7整除但不能被3整除的数，横线处不能填入的代码是？

```cpp
for (int i = 0; i <= 100; i++)
    if (_______
        cout << i << endl;
```

{{ select(8) }}

- A. i % 7 == 0 && i % 3 != 0
- B. !(i % 7) && i % 3 != 0
- C. i % 7 && i % 3
- D. i % 7 == 0 && !(i % 3 == 0)

---

9. 下面C++代码用于求正整数各位数字之和，横线处不应填入的代码是？

```cpp
int tnt, N;
cin >> N;
tnt = 0;
while (N != 0) {
    _______;
    N /= 10;
}
cout << tnt;
```

{{ select(9) }}

- A. tnt = tnt + N % 10
- B. tnt += N % 10
- C. tnt = N % 10 + tnt
- D. tnt = N % 10

---

10. 下面C++代码执行后的输出是？

```cpp
for (int i = 0; i < 5; i++)
    for (int j = 0; j < i; j++)
        cout << j;
```

{{ select(10) }}

- A. 0010120123
- B. 01012012301234
- C. 001012012301234
- D. 01012012301234012345

---

11. 下面C++代码用于实现九九乘法表，说法错误的是？

```cpp
for (int Hang = 1; Hang < 10; Hang++) {
    for (int Lie = 1; Lie < Hang + 1; Lie++) {
        if (Lie * Hang > 9)
            printf("%d*%d=%d ", Lie, Hang, Lie * Hang);
        else
            printf("%d*%d=%d ", Lie, Hang, Lie * Hang);
    }
    printf("\n");  // L1
}
```

{{ select(11) }}

- A. 将L1的printf("\n")移到else分支后，效果相同
- B. 将L1的printf("\n")改为printf("%c", '\n')，效果相同
- C. 将Lie * Hang > 9改为Lie * Hang >= 10，效果相同
- D. 将Lie * Hang > 9改为Hang * Lie > 9，效果相同

---

12. 下面C++代码用于求1-N的阶乘之和（如N=3时为1!+2!+3!），不能实现功能的选项是？

```cpp
int N;
cin >> N;
int tnt = 0, nowNum = 1;
for (int i = 1; i < N + 1; i++) {
    _______;
    _______;
}
cout << tnt;
```

{{ select(12) }}

- A. nowNum *= i; tnt += nowNum;
- B. nowNum = nowNum * i; tnt = tnt + nowNum;
- C. nowNum *= i; tnt = nowNum + tnt;
- D. nowNum = nowNum + i; tnt *= nowNum;

---

13. 下面C++代码用于输出N和M之间的孪生素数（间隔为2的两个质数），横线处应填入的代码是？

```cpp
int N, M;
cin >> N >> M;
for (int i = N; i < __________; i++)
    if (isPrime(i) && isPrime(i + 2))
        printf("%d %d\n", i, i + 2);
```

{{ select(13) }}

- A. M - 2
- B. M - 1
- C. M
- D. M + 1

---

14. 下面C++代码实现输出等腰三角形（高度5时为3、5、7、9个星号），横线应填入的代码是？

```cpp
int height;
cin >> height;
for (int i = 0; i < height; i++) {
    // 打印空格
    for (int j = 0; j < _______; j++)
        cout << " ";
    // 打印星号
    for (int k = 0; k < _______; k++)
        cout << "*";
    cout << endl;
}
```

{{ select(14) }}

- A. height; 2 * i
- B. height; 2 * i
- C. height - i; 2 * i + 1
- D. height - i - 1; 2 * i + 1

---

15. 下面C++代码执行后的输出是30，则横线处不能填入？

```cpp
int a = 10, b = 20, c = 30;
cout << _______ << endl;
```

{{ select(15) }}

- A. max(max(a, b), c)
- B. min(a + b, c)
- C. sqrt(a + b + c)
- D. (a + b + c) / 2

---

## 二、判断题（每题2分，共20分）

16. 在Windows的资源管理器中为已有文件A建立副本的操作是Ctrl+C，然后Ctrl+V。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 在C++代码中，假设N为正整数，则cout << (N - N / 10 * 10) 将获得N的个位数。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 在C++语句cout << (10 <= N <= 12) 中，假设N为12，则其输出为1。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 如果C++表达式int(sqrt(N)) * int(sqrt(N)) == N 的值为True，则说明N为完全平方数（如4、9、25等）。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 下面C++代码执行后将输出2*3=6：

```cpp
int a = 2, b = 3;
printf("%%a*%%b=%d", a * b);
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 以下C++代码因循环变量"_"不符合命名规范，将导致错误：

```cpp
for (int _ = 0; _ < 10; _++)
    continue;
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码执行后因有break，将输出0：

```cpp
int i;
for (i = 0; i < 10; i++) {
    continue;
    break;
}
cout << i;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 下面的C++代码执行后将输出18行"OK"：

```cpp
int i, j;
for (i = 8; i > 2; i -= 2)
    for (j = 0; j < i; j++)
        printf("OK\n");
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 将下面C++代码中的i=1调整为i=0，输出结果相同：

```cpp
int i, cnt = 0;
for (i = 1; i < 5; i++)
    if (i % 2)
        cnt += 1;
cout << cnt;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 下面两段C++代码均用于求1-10的和，运行结果相同，且for循环均可转换为while循环：

```cpp
// 代码1
int tnt, i;
tnt = 0;
for (i = 1; i <= 10; i++)
    tnt += i;
cout << tnt;

// 代码2
int tnt, i;
tnt = 0, i = 1;
while (i <= 10) {
    tnt += i;
    i++;
}
cout << tnt;
```

{{ select(25) }}

- A. 正确
- B. 错误

---
