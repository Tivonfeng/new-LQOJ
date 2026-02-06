# 2024年6月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. 小杨报名GESP一级，可选择的认证语言有( )种｡

{{ select(1) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

2. 流程图输入yr=2024判定为闰年（输出2月29天），菱形框应填入( )｡

{{ select(2) }}

- A. (yr%400==0) || (yr%4==0)
- B. (yr%400==0) || (yr%4==0 && yr%100!=0)
- C. (yr%400==0) && (yr%4==0)
- D. (yr%400==0) && (yr%4==0 && yr%100!=0)

---

3. 32位int类型能表示的数据范围是( )｡

{{ select(3) }}

- A. 0~2³¹-1
- B. 0~2³²-1
- C. -2³¹~2³¹-1
- D. -2⁶³~2⁶³-1

---

4. 十进制转八进制代码，横线处应填入( )｡

```cpp
void decimal2octal(int decimal) {
    int i=0; int oct_number[100];
    while(decimal>0){
        ____; // 横线处
    }
    for(int j=i-1;j>=0;j--) cout<<oct_number[j];
}
```

{{ select(4) }}

- A. oct_number[i] = decimal%8; decimal /=8;
- B. oct_number[i] = decimal/8; decimal%=8;
- C. oct_number[i++] = decimal%8; decimal /=8;
- D. oct_number[i++] = decimal/8; decimal%=8;

---

5. 二进制数101.11对应的十进制数是( )｡

{{ select(5) }}

- A. 6.5
- B. 5.5
- C. 5.75
- D. 5.25

---

6. 下列流程图的输出结果是( )

开始→sum=0,i=0→i<5（是）→j=0→j<i（是则sum+1，j+1；否则i+1）→循环结束输出sum

{{ select(6) }}

- A. 5
- B. 10
- C. 20
- D. 30

---

7. 下列代码的输出结果是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int a=12; int result = a>>2;
    cout << result << endl;
    return 0;
}
```

{{ select(7) }}

- A. 12
- B. 6
- C. 3
- D. 1

---

8. 下列代码的输出结果是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int a=5, b=10;
    b = a^b; a = a^b; a = a^b;
    cout << "a=" <<a<<", b="<<b<<endl;
    return 0;
}
```

{{ select(8) }}

- A. a=5, b=10
- B. a=5, b=5
- C. a=10, b=5
- D. a=10, b=10

---

9. 如果字符串定义为`char str[] = "GESP";`，则字符数组str的长度为( )｡

{{ select(9) }}

- A. 0
- B. 4
- C. 5
- D. 6

---

10. 在下列代码的横线处填写( )，可使得输出是"7"｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int array[5]={3,7,5,2,4}; int max=0;
    for(int i=0;i<5;i++)
        if(____) max=array[i];
    cout << max << endl;
    return 0;
}
```

{{ select(10) }}

- A. max > array[i]
- B. max < array[i]
- C. max = array[i]
- D. 以上均不对

---

11. 找出1-35中能被7整除的数字存入数组，横线处应填入( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int arr[35], count=0;
    for(int i=1;i<=35;i++){
        if(i%7==0) ____; // 横线处
    }
    for(int i=0;i<count;i++) cout<<arr[i]<<endl;
    return 0;
}
```

{{ select(11) }}

- A. arr[count++] = i;
- B. arr[i] = count++;
- C. arr[i] = count;
- D. arr[count] = count++;

---

12. 已知字符'0'的ASCII码为48，执行下面C++代码后输出是( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    string s="0629"; int n=s.length(), x=0;
    for(int i=0;i<n;i++) x += s[i];
    cout << x << endl;
    return 0;
}
```

{{ select(12) }}

- A. 17
- B. 158
- C. 209
- D. 316

---

13. 统计10人中身高>135厘米的人数，横线处应填入( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    int arr[10]={125,127,136,134,137,138,126,135,140,145};
    int count=0;
    for(int i=0;i<10;i++) ____; // 横线处
    cout << count << endl;
    return 0;
}
```

{{ select(13) }}

- A. count = arr[i]>135? 1:0;
- B. count += arr[i]>135? 1:0;
- C. count++;
- D. 以上都不对

---

14. 下面可以正确输出`They're planning a party for their friend's birthday.`的C++语句是( )｡

{{ select(14) }}

- A. cout << 'They\'re planning a party for their friend'\s birthday." << endl;
- B. cout << "They\'re planning a party for their friend's birthday.'<< endl;
- C. cout << 'They're planning a party for their friend's birthday.'<< endl;
- D. cout << "They\'re planning a party for their friend\'s birthday." << endl;

---

15. 执行代码后输出`gesp ccf org cn `，横线处应填入( )｡

```cpp
#include<iostream>
using namespace std;
int main() {
    string str="gesp.ccf.org.cn", delimiter=".", result="";
    size_t found = str.find(delimiter);
    while(found!=string::npos){
        token = str.substr(0, found);
        result += token + " ";
        ____; // 横线处
        found = str.find(delimiter);
    }
    result += str + " ";
    cout << result << endl;
    return 0;
}
```

{{ select(15) }}

- A. str = str.substr(found + delimiter.length(), str.length() - 1);
- B. str = str.substr(found, str.length());
- C. str = str.substr(found, str.length() -1);
- D. 以上都不对

---

## 二、判断题（每题2分，共20分）

16. GESP测试是对认证者的编程能力进行等级认证，同一级别的能力基本上与编程语言无关｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 整数-6的16位补码可用十六进制表示为FFFA｡( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 补码的优点是可以将减法运算转化为加法运算，从而简化计算机的硬件设计｡( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 字符常量'\0'常用来表示字符串结束，和字符常量'0'相同｡( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 数组的所有元素在内存中可以不连续存放｡( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. C++中可以对数组和数组的每个基础类型的元素赋值｡( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 如果a为int类型变量，且表达式`((a | 3) == 3)`的值为true，则说明a在0到3之间（可能为0、3）｡( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 执行下面C++代码后，输出的结果是8｡( )

```cpp
int a=0b1010, b=01100;
int c = a & b; cout << c << endl;
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 执行下面C++代码后，输出的结果不可能是89781｡( )

```cpp
#include<iostream>
#include<cstdlib>
#include<ctime>
using namespace std;
int main() {
    srand(time(NULL)); int i=1, s[5];
    while(i<=5){
        int a=rand()%10;
        if(a%3==(i+1)%3) s[i++]=a;
    }
    for(int i=1;i<=5;i++) cout<<s[i];
    cout<<endl;
    return 0;
}
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 把整数3025剪开为30和25，两数之和的平方等于原数（(30+25)²=3025），这样的数叫"雷劈数"。可以使用枚举法求出所有符合条件的四位数｡( )

{{ select(25) }}

- A. 正确
- B. 错误
