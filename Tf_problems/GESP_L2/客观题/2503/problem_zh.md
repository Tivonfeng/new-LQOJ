# 2025年3月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 2025年春节，DeepSeek横空出世，《哪吒2》票房惊人。下面描述成立的是？

{{ select(1) }}

- A. 《哪吒2》是一款新型操作系统
- B. DeepSeek是深海钻探软件
- C. 《哪吒2》可以生成新的软件
- D. DeepSeek可以根据《哪吒2》的场景生成剧情脚本

---

2. 对整型变量N，若能同时被3和5整除，则输出"N含有至少两个质因数"。用流程图描述时，输出语句应在哪种图形框中？

{{ select(2) }}

- A. 圆形框
- B. 椭圆形框
- C. 平行四边形框
- D. 菱形框

---

3. 下面C++代码执行后的输出是？

```cpp
int a = 3, b = 4;
a == b;
b == a;
cout << a << ' ' << b << endl;
```

{{ select(3) }}

- A. 3 4
- B. 3 3
- C. 4 4
- D. 4 3

---

4. 彩球按"5红3绿2蓝"循环排列，输入编号求颜色，代码说法正确的是？

```cpp
int N, remainder;
cin >> N;
remainder = N % 10;
if ((1 <= remainder) && (remainder <= 5))
    cout << "Red";
else if ((6 <= remainder) && (remainder <= 8))
    cout << "Green";
else if ((remainder == 9) || (remainder == 0))
    cout << "Blue";
```

{{ select(4) }}

- A. 将最后一个else if改为else，效果相同
- B. 将第一个条件改为(remainder <= 5)，效果相同
- C. 第二个else if写法错误，应改为6 <= remainder <= 8
- D. remainder = N % 10应改为remainder = N / 10

---

5. 下面C++代码执行后的输出是？

```cpp
int tnt = 0;
for (int i = 0; i < 10; i++)
    if (i % 3)
        tnt += 1;
    else
        tnt += 2;
cout << tnt;
```

{{ select(5) }}

- A. 18
- B. 17
- C. 16
- D. 14

---

6. 下面C++代码执行后的输出是？

```cpp
int i;
for (i = 10; i > 0; i -= 2)
    break;
cout << i;
```

{{ select(6) }}

- A. 10
- B. 8
- C. 0
- D. i的值不确定（循环被break终止）

---

7. 下面C++代码执行后的输出是？

```cpp
int i;
for (i = 0; i < 10; i++) {
    if (i % 3 == 0)
        continue;
    cout << "0#";
}
if (i >= 10)
    cout << "1#";
```

{{ select(7) }}

- A. 0#0#0#0#0#0#
- B. 0#0#0#0#0#0#0#1#
- C. 0#0#0#0#1#
- D. 0#0#0#0#0#0#1#

---

8. 下面C++代码执行后的输出是？

```cpp
int i, j;
for (i = 0; i < 5; i++)
    for (j = i; j > 0; j--)
        printf("%d-", j);
```

{{ select(8) }}

- A. 1-2-1-3-2-1-4-3-2-1-
- B. 1-2-1-3-2-1-4-3-2-1-
- C. 0-0-1-0-1-2-0-1-2-3-
- D. 0-0-1-0-1-2-0-1-2-3-

---

9. 下面C++代码用于输出"能被2整除且除以7余2"的数，不能实现的是？

```cpp
for (int i = 0; i < 100; i++)
    if (_______)
        cout << i << " ";
```

{{ select(9) }}

- A. ((i % 2 == 0) && (i % 7 == 2))
- B. ((!(i % 2)) && (i % 7 == 2))
- C. ((!(i % 2)) && (!(i % 7)))
- D. ((i % 2 != 1) && (i % 7 == 2))

---

10. 下面C++代码用于求1到N中"含有数字3"的数的个数，前后两处横线应填入？

```cpp
int i, j;
int cnt = 0, N;
cin >> N;
for (i = 1; (j = i) < N; i++)
    while (j != 0) {
        if (j % 10 == 3) {
            cnt += 1;
            _______;
        }
        _______;
    }
cout << cnt;
```

{{ select(10) }}

- A. continue；j /= 10
- B. break；j /= 10
- C. continue；j %= 10
- D. break；j %= 10

---

11. 两段代码求1到N的阶乘之和（如N=3时结果为9），说法正确的是？

```cpp
// 实现1
int i, N;
cin >> N;
int tnt = 0, last = 1;
for (i = 1; i <= N; i++) {
    last *= i;
    tnt += last;
}

// 实现2
int i, N;
cin >> N;
int tnt = 0, tmp;
for (i = 1; i <= N; i++) {
    tmp = 1;
    for (int j = 1; j <= i; j++)
        tmp *= j;
    tnt += tmp;
}
```

{{ select(11) }}

- A. 实现1代码短但效率不高
- B. 实现2效率更高且易理解
- C. 实现1复用前项结果，计算量小、效率高
- D. 两种实现效率几乎一致

---

12. 代码验证4-1000内偶数能否分解为两个质数之和（isPrime已定义），说法错误的是？

```cpp
for (i = 4; i < 1000; i += 2)
    for (j = 2; j < i; j++)
        if (isPrime(j) && isPrime(i - j)) {
            printf("%d=%d+%d\n", i, j, i - j);
            break;
        }
```

{{ select(12) }}

- A. 将条件改为isPrime(j) == true && isPrime(i - j) == true，效果相同
- B. 输出的质数对一定是小数在前
- C. 扩大i的上界也不能证明哥德巴赫猜想
- D. break应移到if语句块之外

---

13. 代码按层数输出循环数字（如N=10时含1-9循环），说法正确的是？

```cpp
int i, j;
int last, N;
cin >> N;
last = 1;
for (i = 1; i < N; i++) {
    for (j = 1; j <= i; j++) {
        if (last > 9)
            last = 1;
        cout << last << " ";
        last += 1;
    }
    printf("\n");
}
```

{{ select(13) }}

- A. printf("\n")有错，应改为cout << endl;（printf不能换行）
- B. last += 1改为last = last + 1，效果相同
- C. L1行j <= i应改为j < i
- D. last = 1改为last = 0，效果相同

---

14. 在C++中，最适合填入横线处连续5次生成1-10随机整数的是？

```cpp
for (int i = 0; i < 5; i++)
    cout << _______ << " ";
```

{{ select(14) }}

- A. rand() % 11
- B. rand() % 10
- C. rand() % 10 + 1
- D. rand() % 9 + 1

---

15. 若a、b为float类型，相差小于0.000001视作相等，能正确判断"a等于b"的表达式是？

{{ select(15) }}

- A. (b - a) < 0.000001
- B. (b - a) <= 0.000001
- C. abs(b - a) <= 0.000001
- D. sqrt(b - a) <= 0.000001

---

## 二、判断题（每题2分，共20分）

16. C++、Python都是高级编程语言，它们的每条语句最终都要通过机器指令来完成。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 在C++代码中，假设N为正整数，则N - N / 10 * 10与N % 10都能获得N的个位数。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++语句cout << ((10 <= N <= 12) ? "true" : "false")中，若N=12，输出为true。原因是10 <= N为true，true与12相比仍为true。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. C++表达式(sqrt(N) * sqrt(N)) == N中，若N为正整数，则表达式值为true，相当于开平方后平方是本身。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 下面C++代码执行后将输出3*2=6：

```cpp
int a = 2, b = 3;
a = a - b;
b = a + b;
a = b - a;
printf("%d*%d=%d\n", a, b, a * b);
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码执行后将输出10：

```cpp
int i;
for (i = 0; i < 10; i++)
    cout << i << endl;
continue;
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++代码执行后将输出1：

```cpp
int i;
for (i = 1; i < 10; i++) {
    break;
    continue;
}
cout << i << endl;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 下面C++代码执行后将输出10行"OK"：

```cpp
for (int i = 0; i < 5; i++)
    for (int j = 0; j < i; j++)
        printf("OK\n");
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 将下面C++代码中for循环的i=1调整为i=0，输出结果相同：

```cpp
int tnt = 0;
for (int i = 1; i < 5; i++)
    tnt += i;
cout << tnt;
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 下面C++代码执行后将输出0123：

```cpp
for (i = 0; i < 5; i++)
    for (i = 0; i < i; i++)
        continue;
printf("%d\n", i);
```

{{ select(25) }}

- A. 正确
- B. 错误

---
