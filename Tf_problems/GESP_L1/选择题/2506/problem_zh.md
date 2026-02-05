# 2025年6月 C++一级考试真题

## 一、单项选择题（每题2分，共30分）

1. 人形机器人的传感器反馈数据调整姿态，这类传感器类似于计算机的( )。

{{ select(1) }}

- A. 处理器
- B. 存储器
- C. 输入设备
- D. 输出设备

---

2. 调试代码时设置断点和检查局部变量，错误的说法是( )。

```cpp
int i,N = 0; // L1
cin >> N; // L2
for (i = 1; i < 9; i++) if (N % i == 0) break; // L3
if (i < 9) printf("N不能大于9\n"); // L4
```

{{ select(2) }}

- A. 断点不可以设在L1标记的代码行
- B. 暂停在L2时可检测i的值
- C. 暂停在L3时可修改i的值
- D. 执行可能暂停在L4

---

3. 对代码`int first = 10; printf("{%d}\n", First)`描述准确的是( )。

{{ select(3) }}

- A. 输出10
- B. 输出{First}
- C. 输出"{First}"
- D. 编译报错，因First应为first

---

4. 在C++中，可作为变量名的是( )。

{{ select(4) }}

- A. X.cpp
- B. X-cpp
- C. X#cpp
- D. X_cpp

---

5. C++表达式14-3*3%2 的值是( )。

{{ select(5) }}

- A. 0
- B. 11
- C. 13
- D. -67

---

6. 代码执行后输出是( )。

```cpp
int x=10,y=20;
x=x+y;
y=x-y;
x=x-y;
cout << x << ' ' << y;
```

{{ select(6) }}

- A. 10 20
- B. 20 10
- C. 10 10
- D. 20 20

---

7. int a=16，执行++a +=3 后a的值是( )。

{{ select(7) }}

- A. 3
- B. 17
- C. 19
- D. 20

---

8. int X=8，执行cout << (++X)++; 输出和X的最终值是( )。

{{ select(8) }}

- A. 8 9
- B. 9 9
- C. 9 10
- D. 编译错误，无法执行

---

9. 代码执行后输出是( )。

```cpp
int a=3,b=4;
printf("a+b=%02d#a+b={a+b}", a+b, a+b);
```

{{ select(9) }}

- A. a+b=07#a+b={a+b}
- B. a+b= 7#a+b=7
- C. a+b=7#a+b={a+b}
- D. a+b=7#a+b=7

---

10. 求M天后是星期几（星期日为0），横线处应填入( )。

```cpp
int N,M,D;
cin >> N >> M;
D=____;
if(____) printf("星期日");
else printf("星期%d", D);
```

{{ select(10) }}

- A. (N+M)/7，D==0
- B. (N+M)%7，D==0
- C. (N+M)/7，D<=0
- D. (N+M)%7，D=0

---

11. 代码执行后输出是( )。

```cpp
int i;
for (i=1;i<11;i+=3){
    continue;
    if(i%2==0) printf("%d#",i);
    break;
}
if(i>=11) printf("END");
```

{{ select(11) }}

- A. END
- B. 1#
- C. 1#4#END
- D. 1#4#7#10#END

---

12. 求N的所有因数（倒序输出），横线处应填入( )。

```cpp
int i,N;
cin >> N;
i=N;
while(____){
    if(N%i==0) printf("%d,",i);
    i-=1;
}
printf("1");
```

{{ select(12) }}

- A. i -=1
- B. i==1
- C. i>1
- D. i>=1

---

13. 代码执行后输出是( )。

```cpp
int Sum=0;
for(int i=0;i<10;i++){
    if(i%2==0) continue;
    if(i%5==0) break;
    Sum +=i;
}
cout << Sum;
```

{{ select(13) }}

- A. 55
- B. 15
- C. 9
- D. 4

---

14. 代码`float x=101;x++;cout << ++x;`执行后输出是( )。

{{ select(14) }}

- A. 101
- B. 102
- C. 103
- D. 编译报错

---

15. 找出百位、十位、个位满足a²+b²=c²的三位数，横线处应填入( )。

```cpp
int count=0;
for(int i=100;i<=999;i++){
    int a=i/100;
    int c=i%10;
    if(a*a + b*b ==c*c) count++;
}
```

{{ select(15) }}

- A. int b=(i/10)/10;
- B. int b=(i/10)%10;
- C. int b=(i%10)/10;
- D. int b=(i%10)%10;

---

## 二、判断题（每题2分，共20分）

16. 智能手表因有嵌入式操作系统及通信功能，闭卷考试不允许随身携带。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. N是整型变量（值为5），表达式(N + !N)的值为4。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 删除代码中的break对执行结果无影响：

```cpp
for(int i=0;i<10;i++){
    continue;
    cout<<i<<"#";
    break;
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 删除代码中的continue后输出0#2#4#6#8#：

```cpp
for(int i=0;i<10;i++){
    if(i%2==0){
        cout<<i<<"#";
        continue;
    }
}
```

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 将for(int i=0;i<100;i++)改为i<200;i+=i+1，输出cnt值相同。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 交换while循环中i+=2和cnt+=1，输出相同：

```cpp
int i=0,cnt=0;
while(i<10){
    i+=2;
    cnt+=1;
}
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 代码执行后输出45：

```cpp
int cnt;
for(int i=0;i<10;i++)
    cout<<cnt;
cnt+=1;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. cout << (12 + 12.12) 报错，因int和float类型不能直接运算。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 不能将变量命名为false，因false是C++关键字。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. X是整型变量，表达式3<X<5的求值结果是4。

{{ select(25) }}

- A. 正确
- B. 错误
