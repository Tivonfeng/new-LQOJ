# 2023年12月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 以下不可以做为C++变量的是( )。

{{ select(1) }}

- A. FiveStar
- B. fiveStar
- C. 5Star
- D. Star5

---

2. 在C++中，与`for(int i = 10; i < 20; i += 2) cout << i;`输出结果相同的是( )。

{{ select(2) }}

- A. for(int i = 10; i < 19; i += 2) cout << i;
- B. for(int i = 11; i < 19; i += 2) cout << i;
- C. for(int i = 10; i < 21; i += 2) cout << i;
- D. 以上均不对

---

3. 以下C++代码实现从小到大输出N的因子（如N=18输出1 2 3 6 9 18），横线处应填入( )。

```cpp
cin >> N;
for (____)
    if (N % i == 0)
        cout << i << " ";
```

{{ select(3) }}

- A. int i = 0; i < N; i++
- B. int i = 1; i < N; i++
- C. int i = 0; i < N + 1; i++
- D. int i = 1; i < N + 1; i++

---

4. 下面C++代码用于判断输入的整数是否为对称数（如1221、12321），对该代码的说法正确的是( )。

```cpp
cin >> N;
newNum = 0;
while (N) {
    newNum = newNum * 10 + N % 10;
    N = N / 10;
}
if (newNum == N)
    cout << N << "为对称数";
```

{{ select(4) }}

- A. 代码无语法错误，N为对称数时第8行能正确输出
- B. 代码无语法错误，但N为负数时会导致死循环
- C. 代码存在语法错误，程序不能执行
- D. 代码无语法错误，但不能达到预期目标，因循环结束N总为0

---

5. 下面C++代码用于判断N（≥2的正整数）是否为质数，说法正确的是( )。

```cpp
cin >> N;
for (i = 2; i < N / 2; i++)
    if (N % i == 0) {
        cout << N << "不是质数";
        break;
    }
if (i >= N / 2)
    cout << N << "是质数";
```

{{ select(5) }}

- A. 代码能正确判断N是否为质数
- B. 代码总是不能判断N是否为质数
- C. 删除第5行break，能正确判断N是否为质数
- D. 代码存在漏洞，应将第2行和第7行的N/2改为N/2 + 1

---

6. 下面C++代码执行后的输出是( )。

```cpp
N = 4;
for (int i = 0; i < N; i++) {
    for (int j = 1; j < i; j++)
        continue;
    if (i * j % 2 == 0)
        cout << i << "#";
}
cout << "0";
```

{{ select(6) }}

- A. 2#3#0
- B. 1#2#0
- C. 1#0#
- D. 2#3#

---

7. 下面C++代码执行后的输出是( )。

```cpp
cnt = 0;
for (i = 1; i < 10; i++) {
    for (j = 1; j < i; j += 2)
        if (i * j % 2 == 0) {
            cnt++;
            break;
        }
}
if (i >= 10)
    cout << cnt << "#";
cout << cnt;
```

{{ select(7) }}

- A. 0
- B. 8#8
- C. 4
- D. 4#4

---

8. 下面C++代码执行后的输出是( )。

```cpp
N = 100;
while (N > 0) {
    if (N % 2)
        break;
    else if (N % 3 == 0)
        N -= 5;
    else
        N -= 20;
}
cout << N;
```

{{ select(8) }}

- A. 100
- B. 95
- C. 55
- D. 0

---

9. 下面C++代码执行后的输出是( )。

```cpp
x = 1;
while (x < 100) {
    if (x % 3 != 0)
        cout << x << ",";
    else if (x / 10)
        break;
    else
        x += 2;
}
cout << x;
```

{{ select(9) }}

- A. 1
- B. 1,3
- C. 15,17
- D. 1,10,12

---

10. 下面C++代码执行后的输出是( )。

```cpp
cnt = 0;
for (i = 0; i < 5; i++)
    for (j = 0; j < i; j++)
        cnt += 1;
cout << cnt;
```

{{ select(10) }}

- A. 5
- B. 10
- C. 20
- D. 30

---

11. 以下C++代码用于输出1-100（含）的完全平方数，横线处应填写( )。

```cpp
for (i = 1; i < 100 + 1; i++)
    if (____)
        cout << i << " ";
```

{{ select(11) }}

- A. int(sqrt(i)) * int(sqrt(i)) = i
- B. int(sqrt(i)) == sqrt(i)
- C. int(sqrt(i)) * int(sqrt(i)) == i
- D. int(sqrt(i)) = sqrt(i)

---

12. 下面C++代码用于实现指定数字图形效果，应在代码中填入( )。

```cpp
cin >> N;
nowNum = 0;
for (i = 0; i < N; i++) {
    for (j = 0; j < i + 1; j++) {
        cout << nowNum << " ";
        nowNum += 1;
        if (nowNum == 10)
            nowNum = 0;
    }
    ____;
}
```

{{ select(12) }}

- A. 在第8行下填入：cout << nowNum;
- B. 在第2行下填入：cout << endl;
- C. 在第7行下填入：cout << nowNum;
- D. 在第9行下填入：cout << endl;

---

13. 无人驾驶汽车的声控智能驾驶系统，选路不需要的是( )。

{{ select(13) }}

- A. 麦克风
- B. 扬声器
- C. 油量表
- D. 传感器

---

14. 现代计算机基于的体系结构是( )。

{{ select(14) }}

- A. 艾伦·图灵
- B. 冯·诺依曼
- C. 阿塔纳索夫
- D. 埃克特-莫克利

---

15. 输入正整数N，找出所有相邻因数对（如12的因数对(1,2)、(2,3)、(3,4)），找不到所有因数对的代码是( )。

{{ select(15) }}

- A. for(i = 1; i < N; i++) if(!(N % i) && !(N % (i + 1))) printf("(%d,%d)\n", i, i + 1);
- B. for(i = 2; i < N; i++) if(!(N % i) && !(N % (i + 1))) printf("(%d,%d)\n", i, i + 1);
- C. for(i = 2; i < N / 2; i++) if(!(N % (i - 1)) && !(N % i)) printf("(%d,%d)\n", i - 1, i);
- D. for(i = 1; i < N / 2; i++) if(!(N % i) && !(N % (i + 1))) printf("(%d,%d)\n", i, i + 1);

---

## 二、判断题（每题2分，共20分）

16. C++表达式 -7 / 2 的值为整数 -3。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. C++表达式 2 * int('9') * 2 的值为 36。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. C++表达式 3 + 2 && 5 - 5 的值为 false。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 在C++代码中，执行 srand(0) 后连续两次执行 rand() 的结果相等。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. C++代码中 while(1) {...} 的判断条件不是逻辑值，将导致语法错误。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 执行以下C++代码后将输出0：

```cpp
Sum = 0;
for (i = -500; i < 500; i++)
    cout << Sum;
Sum += i;
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 在C++代码中，运算符只能处理相同的数据类型，不同类型之间必须转换为相同的数据类型。

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 在C++代码中，虽然变量都有数据类型，但同一个变量也可以先后用不同类型的值赋值。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 小杨用Dev C++练习程序，所以Dev C++也是一个小型操作系统。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 任何一个 while 循环都可以转化为等价的 for 循环。

{{ select(25) }}

- A. 正确
- B. 错误

---
