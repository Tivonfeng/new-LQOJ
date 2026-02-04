# 2025年12月 C++一级考试真题

## 一、单项选择题（每题2分，共30分）

1. 空客A320系列飞机的飞行控制系统执行判断的部件最可能是( )。

{{ select(1) }}

- A. 辐射传感器
- B. 处理器
- C. 内存单元
- D. 输出设备

---

2. 代码编译提示"Invalid Character"错误，可能的原因是( )。

```cpp
int a, b; a=3,b = 4; // L1
cout << a; // L2
cout << b; // L3
```

{{ select(2) }}

- A. L1行逗号是中文逗号，应改为英文逗号
- B. L1行应分为两行（a=3和b=4）
- C. 代码未保存到文件
- D. L2和L3需合并为一行

---

3. 有关C++变量的说法正确的是( )。

{{ select(3) }}

- A. 不可用for作为变量名，因for是关键字
- B. _tnt不可作为变量名，因首字符必须是英文字母
- C. _tnt_不可作为变量名，因最后一个字符易与减号混淆
- D. 可用printf作为变量名，因printf是关键字

---

4. X是整型变量，执行cout << (X=3, X++, ++X); 输出是( )。

{{ select(4) }}

- A. 3
- B. 4
- C. 5
- D. 不确定

---

5. C++表达式2 + 3 * 4 % 5 的值为( )。

{{ select(5) }}

- A. 0
- B. 4
- C. 14
- D. 50

---

6. 代码执行后输出是( )。

```cpp
a = 3; b = a = 4; printf("%d %d", a, b);
```

{{ select(6) }}

- A. 4 4
- B. 3 3
- C. 3 4
- D. 4 3

---

7. 输入10回车+20回车，代码输出是( )。

```cpp
int N,M; printf("第一个数:");
scanf("%d", &N);
printf("第二个数:");
scanf("%d", &M);
printf("%%(N+M)=%d", N+M, int(N+M));
```

{{ select(7) }}

- A. 30=30
- B. 10+20=30
- C. %(N+M)=30
- D. 错误提示

---

8. 数字规律123212321……，判断第N位数，横线处应填入( )。

```cpp
cout << "请输入编号:"; int N, M;
cin >> N;
M = _____________;
if (M != 0) cout << M;
else cout << 2;
```

{{ select(8) }}

- A. N % 4
- B. N / 4
- C. N % 3
- D. N / 3

---

9. 代码执行后输出是( )。

```cpp
int i, tnt = 0; for (i = 0; i < 100; i++)
    cout << tnt << ' ' << i; tnt += 1;
```

{{ select(9) }}

- A. 99 99
- B. 100 99
- C. 99 100
- D. 100 100

---

10. 有关代码的说法错误的是( )。

```cpp
int tnt = 0; for (int i = 1; i < 10; i += 2) // L1
    cout << tnt; tnt += i; // L2
```

{{ select(10) }}

- A. L1的i<10改为i<11结果相同
- B. L1的i=1改为i=0结果相同
- C. tnt += i与tnt = tnt + i效果相同
- D. tnt += i与tnt = i + tnt效果相同

---

11. 代码执行后输出是( )。

```cpp
int i; for (i = 10; i < 100; i += 10){
    if (i % 10 == 0) continue;
    printf("%d#",i);
}
if(i >= 100) printf("%d END",i);
```

{{ select(11) }}

- A. 10#20#…90#100 END
- B. 100#100 END
- C. 100 END
- D. 没有输出

---

12. 两正整数不等时，最大数减最小数迭代至相等，横线处应填入( )。

```cpp
int N,M; cin >>N>>M;
while (N!=M){
    if(N>M) _____________;
    else _____________;
}
cout <<N;
```

{{ select(12) }}

- A. N=N-M；M=M-N
- B. M=M-N；N=N-M
- C. M=N-M；N=M-N
- D. N,M=M,N；M,N=N,M

---

13. 判断"漂亮数"（能被3整除或某一位能被3整除），L1行应填入( )。

```cpp
int N,Flag=0;
cin>>N;
if(N%3==0) Flag=1;
else while (N!=0){
    if(______________) {//L1
        Flag=1; break;
    }
    N/=10;
}
cout<<(Flag?"漂亮数":"非漂亮数");
```

{{ select(13) }}

- A. N%10==0
- B. N%3%10==0
- C. N%10%3
- D. N%10%3==0

---

14. 判断"27的神秘数"（所有奇因数和是27的倍数），横线处应填入( )。

```cpp
int i,N,cnt=0; cin>>N;
for(i=1;i <=N;i++){
    if(______________) cnt+=i;
}
if(cnt%27==0) cout <<'Y';
```

{{ select(14) }}

- A. (N%i) &&(i%2)
- B. (N%i==0)&&(i%2==0)
- C. (N%i==0)&&(i%2)
- D. (N%i)&(i%2==0)

---

15. 找出千位+个位=中间两位的四位数，横线处应填入( )。

```cpp
int count=0; int a,bc,d,tmp;
for (int i=1000;i<=9999;i++) {
    a=(tmp=i)/1000;
    ______________;
    bc=tmp/10;
    d=tmp-bc*10;
    if(a+d==bc) count++;
}
cout << count;
```

{{ select(15) }}

- A. tmp=i/10;
- B. tmp=i%100;
- C. tmp-=a*1000;
- D. tmp=i-i%1000;

---

## 二、判断题（每题2分，共20分）

16. 鸿蒙是华为开发的操作系统，能将正确源程序翻译成目标程序并运行。

{{ select(16) }}

- A. 正确
- B. 错误

---

17. C++表达式10*4%6和10*2%3的结果相同。

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 代码`for(i=0;i<10;i++) if(i%3==0) continue; else break; cout <<<i;`执行后输出0。

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 代码`int tnt=0; for(int i=0;i>-10;i--){if(i<0)i=-i; tnt+=i;}`中i>-10;i--改为i<10;i++，执行结果相同。

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 代码`int cnt=0; for(int i=0;i<100;i++) cout << cnt; cnt+=1;`执行后输出99，因i<100不包括100。

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 代码`int n,new_number; cin>>n; new_number=0; while(n!=0){new_number=new_number*10+n%10; n/=10;} if(n==new_number) cout<<"对称数"; else cout<<"非对称数";`能判断对称数。

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 代码`int tnt=0; for(int i=-100;i<100;i++) cout << tnt; tnt+=i;`执行后输出0。

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 执行printf("%g\n", 3+3.1415926535)输出6.14159而非完整小数，表明计算机故障需重装C++软件。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. x是double型变量，执行cout << (x? 1227 : 12.27); 编译报错，因1227（int）和12.27（double）类型混乱。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 不可将变量命名为keyword，因它是C++关键字。

{{ select(25) }}

- A. 正确
- B. 错误
