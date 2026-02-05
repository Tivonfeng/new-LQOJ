# 2024年3月 C++二级考试真题

## 一、单项选择题（每题2分，共30分）

1. 下列流程图的输出结果是？

```
开始→cj=75→判断cj≥90（否）→判断cj≥60（是）→输出"良好"→结束
```

{{ select(1) }}

- A. 优秀
- B. 良好
- C. 不及格
- D. 没有输出

---

2. 以下选项中不符合C++变量命名规则的是？

{{ select(2) }}

- A. student
- B. 2_from
- C. _to
- D. Text

---

3. 以下选项中，不能用于表示分支结构的C++保留字是？

{{ select(3) }}

- A. switch
- B. return
- C. else
- D. if

---

4. 下列说法错误的是？

{{ select(4) }}

- A. while循环满足条件时持续运行，直到条件不满足
- B. if语句通常用于条件判断
- C. 在C++中可以使用foreach循环
- D. break和continue可用于for和while循环

---

5. 下列4个表达式中，答案不是整数8的是？

{{ select(5) }}

- A. abs(-8)
- B. min(max(8, 9), 10)
- C. int(8.88)
- D. sqrt(64)

---

6. 下面C++代码执行后的输出是？

```cpp
int n, a, m, i;
n = 3, a = 5;
m = (a - 1) * 2;
for (i = 0; i < n - 1; i++)
    m = (m - 1) * 2;
cout << m;
```

{{ select(6) }}

- A. 8
- B. 14
- C. 26
- D. 50

---

7. 下面C++代码执行后的输出是？

```cpp
int n, i, result;
n = 81;
i = 1, result = 1;
while (i * i <= n) {
    if (n % (i * i) == 0)
        result = i * i;
    i += 1;
}
cout << result;
```

{{ select(7) }}

- A. 16
- B. 36
- C. 49
- D. 81

---

8. 下面C++代码执行后的输出是？

```cpp
int s, t, ans;
s = 2, t = 10;
ans = 0;
while (s != t) {
    if (t % 2 == 0 && t / 2 >= s)
        t /= 2;
    else
        t -= 1;
    ans += 1;
}
cout << ans;
```

{{ select(8) }}

- A. 2
- B. 3
- C. 4
- D. 5

---

9. 下面C++代码执行后的输出是？

```cpp
int n, masks, days, cur;
n = 17, masks = 10, days = 0;
cur = 2;
while (masks != n) {
    if (cur == 0 || cur == 1)
        masks += 7;
    masks -= 1;
    days += 1;
    cur = (cur + 1) % 7;
}
cout << days;
```

{{ select(9) }}

- A. 5
- B. 6
- C. 7
- D. 8

---

10. 以下C++代码判断正整数N的各个数位是否都是偶数（是则输出"是"，否则"否"），横线处应填入？

```cpp
int N, Flag;
cin >> N;
Flag = true;
while (N != 0) {
    if (N % 2 != 0) {
        Flag = false;
        ____;
    }
    else
        N /= 10;
}
if (Flag)
    cout << "是";
else
    cout << "否";
```

{{ select(10) }}

- A. break
- B. continue
- C. N = N / 10
- D. N = N % 10

---

11. "三天打渔，两天晒网"，判断第n天小杨是否打渔，横线处应填写？

```cpp
int n, i;
cin >> n;
i = n % 5;
if (____)
    cout << "晒网";
else
    cout << "打鱼";
```

{{ select(11) }}

- A. i == 0
- B. i == 4
- C. i == 0 & i == 4
- D. i == 0

---

12. 判断一个数是否为回文数（倒序后大小不变），横线处应填写？

```cpp
int n, a, k;
cin >> n;
a = 0;
k = n;
while (n > 0) {
    a = ____;
    n /= 10;
}
if (a == k)
    cout << "是回文数";
else
    cout << "不是回文数";
```

{{ select(12) }}

- A. 10 * a + n % 10
- B. a + n % 10
- C. 10 * a + n / 10
- D. a + n / 10

---

13. 打印栅栏图形（n段，段内k个'-'，段间间隔'+'），横线处应填写？

```cpp
int n, k, i, j;
n = 5, k = 6;
for (i = 0; i < n; i++) {
    for (j = 1; j < k; j++)
        cout << '-';
    ____;
}
```

{{ select(13) }}

- A. cout << '+' << endl;
- B. cout << '+' << ' ' << endl;
- C. cout << '+';
- D. cout << '+' << ' ';

---

14. 华为手表上的鸿蒙是？

{{ select(14) }}

- A. 小程序
- B. 计时器
- C. 操作系统
- D. 神话人物

---

15. 王选先生的重大贡献是？

{{ select(15) }}

- A. 制造自动驾驶汽车
- B. 创立培训学校
- C. 发明汉字激光照排系统
- D. 成立方正公司

---

## 二、判断题（每题2分，共20分）

16. 代码：double s; int t; s = 18.5; t = int(s) + 10; 则cout << t 的结果为28.5。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. Xyz、xYz、xyZ是三个不同的变量。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. cout << (8 < 9 < 10) 的输出结果为true。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. for (i = 0; i < 100; i += 2); 语句中变量i的取值范围是0到99。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. C++中cout << float(2022) 与cout << float('2022') 运行后的输出结果均为2022。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 已知A的ASCII码值为65，表达式int('C') + abs(-5.8) 的值为72.8。

{{ select(21) }}

- A. 正确
- B. 错误

---

22. bool()函数用于将参数转换为布尔类型，语句bool(-1)返回false值。

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 如果变量a的值使得C++表达式sqrt(a) == abs(a)，则a的值为0。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 奶奶家的数字电视需设置IP地址并接入WIFI盒子才能收看，该WIFI盒子具有路由器功能。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 任何一个for循环都可以转化为等价的while循环。

{{ select(25) }}

- A. 正确
- B. 错误

---
