# 2025年9月 C++一级考试真题

## 一、单项选择题（每题2分，共30分）

1. 人工智能中的"大模型"最贴切的是指( )。

{{ select(1) }}

- A. 大电脑模型
- B. 大规模智能
- C. 智能的单位
- D. 大语言模型

---

2. 计算1到10001之间所有偶数的和，最不合适的控制结构说法是( )。

{{ select(2) }}

- A. 使用循环结构
- B. 使用循环和分支的组合
- C. 仅使用顺序结构
- D. 不使用分支结构

---

3. 对代码`cout << "请输入您的姓名:"; string XingMing; cin >> XingMing; cout << XingMing;`正确的说法是( )。

{{ select(3) }}

- A. XingMing是汉语拼音，不能作为变量名
- B. 可改为Xing Ming
- C. 可改为xingming
- D. 可改为Xing-Ming

---

4. 代码`b=5; a=13; a*b; cout << a / b << a %// b << a % b;`（a、b为整型）执行结果是( )。

{{ select(4) }}

- A. 2 3
- B. 23
- C. 20
- D. 以上都不准确

---

5. C++表达式3 * 4 % 5 / 6 的值是( )。

{{ select(5) }}

- A. 10
- B. 5
- C. 2
- D. 0

---

6. 代码`scanf("%d", &N); scanf("%d", &M); printf("{%d}",N+M);`输入10+制表符+20+回车，输出是( )。

{{ select(6) }}

- A. {30}
- B. 1020
- C. {N+M}
- D. 不输出，继续等待输入

---

7. 当前是9月，求N个月后的月份，横线处应填入( )。

```cpp
int N, M; cin >> N;
M = _____________;
if (M == 0) printf("%d个月后12月", N);
else printf("%d个月后是%d月", N, M);
```

{{ select(7) }}

- A. N % 12
- B. 9 + N % 12
- C. (9 + N) / 12
- D. (9 + N) % 12

---

8. 代码执行后输出是( )。

```cpp
int n = 0;
for (int i =0; i < 100; i++)
    cout << n; n += i % 2;
```

{{ select(8) }}

- A. 5050
- B. 4950
- C. 50
- D. 49

---

9. 代码执行后输出是( )。

```cpp
int N = 0, i;
for (i = -100; i < 100; i++)
    cout << N; N += i % 10;
```

{{ select(9) }}

- A. 900
- B. 100
- C. 0
- D. -100

---

10. 代码执行后输出是( )。

```cpp
int i;
for(i = 1; i < 5; i++){
    if(i % 3 == 0) break;
    printf("%d#",i);
    if(i > 5) printf("END\n");
}
```

{{ select(10) }}

- A. 1#2#
- B. 1#2#END
- C. 1#2
- D. 1#2#3#4#END

---

11. 求N的镜面数（如1234→4321、120→21），错误的循环条件是( )。

```cpp
cin >> N; rst = 0;
while (______________){
    rst = rst * 10 + N % 10;
    N = N / 10;
}
cout << rst;
```

{{ select(11) }}

- A. N != 0
- B. not (N == 0)
- C. N = 0
- D. N > 0

---

12. 不能实现交换两个正整数a、b的代码是( )。

{{ select(12) }}

- A. temp = a; a = b; b = temp;
- B. a = a - b; b = a + b; a = b - a;
- C. b = a - b; a = a + b; a = a - b;
- D. a, b = b, a;

---

13. 求正整数N的第M位（个位为第1位），横线处应填入( )。

```cpp
int N, M, div=1;
cin >> N >> M;
for (int i =0; i < M-1; i++) div *= 10;
cout << (______________);
```

{{ select(13) }}

- A. N % div / 10
- B. N / div / 10
- C. N % div % 10
- D. N / div % 10

---

14. 代码执行后输出是( )。

```cpp
num = 0;
while (num <= 5){
    num += 1;
    if (num == 3) { printf("%d#", num); continue; }
    printf("%d#", num);
}
```

{{ select(14) }}

- A. 1#2#4#5#6#
- B. 1#2#4#5#6
- C. 1#2#3#4#5#6#
- D. 1#2#3#4#5#6

---

15. 记录输入数的最大/最小值（输入-999结束），错误的说法是( )。

```cpp
cin >> now_num;
min_num = max_num = now_num;
while (now_num != -999){
    if (max_num < now_num) max_num = now_num;
    if (min_num > now_num) min_num = now_num;
    cin >> now_num;
}
cout << min_num << ' ' << max_num;
```

{{ select(15) }}

- A. 第一个输入-999，输出-999 -999
- B. 无-999输入，能求出最大/最小值
- C. 输入考试成绩（无-999），能求出最高/最低分
- D. 把cin >> now_num移到while内，结果不变

---

## 二、判断题（每题2分，共20分）

16. 集成开发环境调试时不能修改源程序，否则需终止调试、关闭文件重新打开才能再次调试。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 执行C++表达式10 % 0.5 将报错，因为0.5所在位置只能是整数。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 代码`for (i = 0; i < 10; i++) cout << i; break;`执行后输出9。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 代码`n = 0; for (int i = 0; i > -10; i--) n = n + i * -1; cout << n;`执行后输出55。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 将代码`cnt = 0; for (int i = 0; i < 100; i++) cnt += i;`中i=0改为i=1，输出相同。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 将代码`n=i=0; while(i<10){n+=i; i+=1;}`中i<10改为i<=10，执行后输出相同。

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 代码`int n,i; n=i=0; while(i<10){i+=1; n +=i;}`执行后输出45。

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 执行cout << (12 + 12.12) 将报错，因int和float类型不能直接运算。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 代码`int count=0; while (count<5){count +=1; if(count==3) {cout << count <<' '; continue;} cout << count <<' ';}`将导致死循环。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 代码`cin>>n; a=0,b=1; for (int j=0;j<n;j++){cout << a<<""; b=b+a; a=b-a;}`能输出斐波那契数列（第1个0、第2个1，后续为前两数之和）。

{{ select(25) }}

- A. 正确
- B. 错误
