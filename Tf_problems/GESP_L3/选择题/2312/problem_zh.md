# 2023年12月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. 下面C++数组的定义中，会丢失数据的是( )｡

{{ select(1) }}

- A. char dict_key[] = {'p','t','o'};
- B. int dict_value[] = {33,22,11};
- C. char dict_name[]={'chen','wang','zhou'};
- D. float dict_value[]={3,2,1};

---

2. 在下列编码中，不能够和二进制"1101 1101"相等的是( )｡

{{ select(2) }}

- A. (221)₁₀进制
- B. (335)₈进制
- C. (dd)₁₆进制
- D. (5d)₁₆进制

---

3. 下面C++代码执行后不能输出"GESP"的是( )｡

{{ select(3) }}

- A. string str("GESP"); cout<<str<<endl;
- B. string str="GESP"; cout<<str<<endl;
- C. string str("GESP"); cout<<str[1]<<str[2]<<str[3]<<str[4]<<endl;
- D. string str{"GESP"}; cout<<str<<endl;

---

4. 执行下面C++代码输出是( )｡

```cpp
int temp=0;
for(int i=1;i<7;i++)
    for(int j=1;j<5;j++)
        if(i/j==2) temp++;
cout<<temp<<endl;
```

{{ select(4) }}

- A. 10
- B. 8
- C. 4
- D. 3

---

5. 执行下面C++代码后，输出是( )｡

```cpp
string str=("chen"); int x=str.length(); int temp=0;
for(int i=0;i<=x;i++) temp++;
cout<<temp<<endl;
```

{{ select(5) }}

- A. 4
- B. 2
- C. 5
- D. 3

---

6. 执行下面C++代码后输出的是( )｡

```cpp
string str=("chen"); int x=str.length();
cout<<x<<endl;
```

{{ select(6) }}

- A. 4
- B. 3
- C. 2
- D. 5

---

7. 执行下面C++代码后输出的是( )｡

```cpp
string str=("chen");
cout<<str[5]<<endl;
```

{{ select(7) }}

- A. 输出未知的数
- B. 输出'n'
- C. 输出'\0'
- D. 输出空格

---

8. 下面C++代码执行后的输出是( )｡

```cpp
char ch[10]={'1'};
cout<<ch[2]<<endl;
```

{{ select(8) }}

- A. 0
- B. 1
- C. 输出空格
- D. 什么也不输出

---

9. 下面C++代码用于统计每种字符出现的次数，当输出为3时，横线上不能填入的代码是( )｡

```cpp
string str="GESP is a good programming test";
int x=0;
for(int i=0;i<str.length();i++)
    if(____) x++;
cout<<x<<endl;
```

{{ select(9) }}

- A. str[i]=='o'
- B. str[i]=='a'+14
- C. str[i]==115
- D. str[i]==111

---

10. 32位计算机中，C++的整型变量int能够表示的数据范围是( )｡

{{ select(10) }}

- A. 2³¹~(2³¹)-1
- B. 2³²
- C. -2³¹~+(2³¹)-1
- D. -(2³¹)+1~2³¹

---

11. 下面C++程序执行的结果是( )｡

```cpp
int cnt=0;
for(int i=0;i<=20;i++)
    if(i%3==0 && i%5==0) cnt++;
cout<<cnt;
```

{{ select(11) }}

- A. 2
- B. 3
- C. 5
- D. 4

---

12. C++的数据类型转换，下列代码输出的值是( )｡

```cpp
int a=3; int b=2;
cout<<a/b*1.0<<endl;
```

{{ select(12) }}

- A. 1.5
- B. 1
- C. 2
- D. 1.50

---

13. C++代码用于抽取字符串中的电话号码（纯数字），有关代码说法正确的是( )｡

```cpp
string strSrc="红十子:01084025890火警电话:119急救电话:120紧急求助:110";
string tel="";
for(int i=0;i<=strSrc.length();i++)
    if(strSrc[i]>='0'&&strSrc[i]<='9')
        tel=tel+strSrc[i];
    else if(tel!="") { cout<<tel<<endl; tel=""; }
```

{{ select(13) }}

- A. 换行输出各个电话号码
- B. 不换行输出，号码无分隔
- C. 不换行输出，号码有分隔
- D. 不能输出电话号码

---

14. 无人驾驶汽车声控驾驶系统选路不需要的是( )｡

{{ select(14) }}

- A. 麦克风
- B. 扬声器
- C. 油量表
- D. 传感器

---

15. 现代计算机基于的体系结构是( )｡

{{ select(15) }}

- A. 艾伦·图灵
- B. 冯·诺依曼
- C. 阿塔纳索夫
- D. 埃克特-莫克利

---

## 二、判断题（每题2分，共20分）

16. 执行C++代码`cout<<(5&&2)<<endl;`后将输出1｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. C++程序执行后，输入`chen a dai`输出应为`chen`｡( )

```cpp
string str; cin>>str; cout<<str;
```

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 执行C++代码`cout<<(5||2);`后将输出1｡( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 执行下面C++代码后将输出"China"｡( )

```cpp
string a="china"; a.replace(0,1,"C"); cout<<a<<endl;
```

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 执行C++代码将输出`0 5 `（5之后还有一个空格）｡( )

```cpp
int list[10]={1,2,3,4,5,6,7,8,9,10};
for(int i=0;i<10;i++)
    if(i%5==0) cout<<list[i]<<" ";
```

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 下面C++代码将输出1｡( )

```cpp
int list[10]={1}; cout<<list<<endl;
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 下面C++程序将输出1｡( )

```cpp
int arr[10]={1}; cout<<arr[0]<<endl;
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 执行C++代码，将输出`1 3 5 7 9 `（9之后还有一个空格）｡( )

```cpp
int list[10]={1,2,3,4,5,6,7,8,9,10};
for(int i=0;i<10;i+=2)
    cout<<list[i]<<" ";
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 小杨用Dev C++练习程序，所以Dev C++也是一个小型操作系统｡( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 任何一个while循环都可以转化为等价的for循环( )｡

{{ select(25) }}

- A. 正确
- B. 错误
