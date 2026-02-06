# 2024年3月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. 整数-5的16位补码表示是( )｡

{{ select(1) }}

- A. 1005
- B. 1006
- C. FFFA
- D. FFFB

---

2. 如果16位短整数-2的二进制是"FFFE"，则短整数-4的十六进制是( )｡

{{ select(2) }}

- A. FF04
- B. FFFA
- C. FFFC
- D. FFFH

---

3. 下面C++代码执行后的输出是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    cout << (3|16) << endl;
    return 0;
}
```

{{ select(3) }}

- A. 3
- B. 16
- C. 19
- D. 48

---

4. 定义整数int x=-5，则执行C++代码`cout << (x == (x<<1>>1))`输出是( )｡

{{ select(4) }}

- A. 0
- B. 1
- C. -5
- D. 5

---

5. 已知字符'0'的ASCII编码十进制为48，执行下面C++代码后输出是( )｡

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string s="316";
    int n=s.length();
    int x=0;
    for(int i=0; i<n; i++)
        x += s[i];
    cout << x << endl;
    return 0;
}
```

{{ select(5) }}

- A. 10
- B. 58
- C. 154
- D. 316

---

6. 下面C++代码执行后数组中大于0的数的特征是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int a[20],i;
    for(i=0; i<20; i++)
        a[i] = i+1;
    for(int i=0; i<20; i++)
        if((a[i]%2)&&(a[i]%3))
            a[i] = 0;
    for(i=0; i<20; i++)
        if(a[i]) cout << a[i] << " ";
    cout << endl;
    return 0;
}
```

{{ select(6) }}

- A. 2的倍数
- B. 3的倍数
- C. 能被2或3整除的数
- D. 能被2和3同时整除的数

---

7. 执行下面C++代码后输出的第一个数是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int a[20],i;
    for(i=0; i<20; i++)
        a[i] = i+1;
    for( ; i>0; i--)
        cout << a[i-1] << " ";
    cout << endl;
    return 0;
}
```

{{ select(7) }}

- A. 20
- B. 19
- C. 1
- D. 不确定

---

8. 在下列代码的横线处填写( )，可以使得输出是`GESP IS INTERESTING`｡

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string str="gEsP is Interesting";
    int x = str.length();
    for(int i=0; i<x; i++)
        if ((str[i]>='a') && (str[i]<='z'))
            ____; // 横线处
    cout << str << endl;
    return 0;
}
```

{{ select(8) }}

- A. str[i]+='a'-'A'
- B. str[i]+=20
- C. str[i]+='A'-'a'
- D. 无法实现

---

9. 下面C++代码统计输出的词数是( )｡

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string str="gEsP is Interesting !";
    int x = str.length();
    int nwords = 0;
    for(int i=0; i<x; i++)
        if (str[i]==' '){
            while(str[++i]==' ') ;
            nwords++;
        }
    cout << nwords << endl;
    return 0;
}
```

{{ select(9) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

10. C++的字符变量的码值是整数，下面字面量形式的字符码值最大的是( )｡

{{ select(10) }}

- A. 100
- B. 075
- C. 0x70
- D. 0x60

---

11. 下面C++程序执行的结果是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int a[20],i; int cnt=0;
    for(i=0; i<20; i++)
        a[i] = i+1;
    for( ; i>1; i--)
        if((a[i-1]+a[i-2])%3)
            cnt++;
    cout << cnt << endl;
    return 0;
}
```

{{ select(11) }}

- A. 5
- B. 6
- C. 10
- D. 12

---

12. 定义字符数组`char str[20] = {'G', 'E', 'S', 'P'};`，则str的字符串长度为( )｡

{{ select(12) }}

- A. 4
- B. 5
- C. 19
- D. 20

---

13. 定义整型变量int a=3，b=16，则a|b的值和a+b的关系是( )｡

{{ select(13) }}

- A. 大于
- B. 等于
- C. 小于
- D. 等于或小于

---

14. 华为手表上的鸿蒙是( )｡

{{ select(14) }}

- A. 小程序
- B. 计时器
- C. 操作系统
- D. 神话人物

---

15. 王选先生的重大贡献是( )｡

{{ select(15) }}

- A. 制造自动驾驶汽车
- B. 创立培训学校
- C. 发明汉字激光照排系统
- D. 成立方正公司

---

## 二、判断题（每题2分，共20分）

16. 任意整数a的二进制反码与补码都有1位不同｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 对整型变量int a=3，执行C++代码a<<2将把2输出到a中｡( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 下面C++代码计算1到100的累加和，采用的是穷举法｡( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int i,sum=0;
    for(int i=1; i<=100; i++)
        sum += i;
    cout << sum << endl;
    return 0;
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 一个int类型变量a，执行操作(a<<2>>2)后的值一定是a｡( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 在C++语言中，(010<<1)执行结果是100｡( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 执行下面C++代码后将输出2｡( )

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string str="gEsP is Interesting";
    int x = str.find("s");
    cout << x << endl;
    return 0;
}
```

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 在C++语言中，字符数组被定义时，它的大小可以调整｡( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 对定义的数组int a[7]={2,0,2,4,3,1,6}，可以用简单循环就找到其中最小的整数｡( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 奶奶家的数字电视需设置IP地址并接入WIFI盒子才能收看节目，该WIFI盒子具有路由器的功能｡( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 任何一个for循环都可以转化为等价的while循环( )｡

{{ select(25) }}

- A. 正确
- B. 错误
