# 2025年6月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. 8位二进制原码能表示的最小整数是( )

{{ select(1) }}

- A. -127
- B. -128
- C. -255
- D. -256

---

2. 反码表示中，零的表示形式有( )种

{{ select(2) }}

- A. 1种
- B. 2种
- C. 8种
- D. 16种

---

3. 补码10111011对应的真值是( )

{{ select(3) }}

- A. -69
- B. -59
- C. -68
- D. -58

---

4. 若X的8位补码为00001010，则X/2的补码是( )｡

{{ select(4) }}

- A. 00000101
- B. 10000101
- C. 00000101或10000101
- D. 算术右移后结果取决于符号位

---

5. 二进制数1101.101对应的十进制数是( )

{{ select(5) }}

- A. 13.625
- B. 12.75
- C. 11.875
- D. 14.5

---

6. 补码加法中，若符号位无进位而次高位有进位，则说明( )

{{ select(6) }}

- A. 结果正确
- B. 发生上溢
- C. 发生下溢
- D. 结果符号位错误

---

7. 八进制数35.6对应的十进制数是( )

{{ select(7) }}

- A. 29.75
- B. 28.5
- C. 27.625
- D. 30.25

---

8. 二进制数1101 | 1100的结果是( )

{{ select(8) }}

- A. 1000
- B. 1110
- C. 1010
- D. 1100

---

9. 以下哪个位运算可以交换两个变量的值（无需临时变量）( )

{{ select(9) }}

- A. a = a ^ b; b = a ^ b; a = a ^ b;
- B. a = a & b; b = a & b; a = a & b;
- C. a = a | b; b = a ^ b; a = a ^ b;
- D. a = ~a; b = ~b; a = ~a;

---

10. 如何正确定义一个长度为5的整型数组( )

{{ select(10) }}

- A. int array = new int[5];
- B. array int[5];
- C. int[] array = {1,2,3,4,5};
- D. int array[5];

---

11. 以下程序用枚举法求解满足a²+b²=c²的三位数，横线处应填入( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int count=0;
    for(int i=100;i<=999;i++){
        int a=i/100;
        ____; // 横线处
        int c=i%10;
        if(a*a + b*b == c*c) count++;
    }
    cout<<count<<endl;
    return 0;
}
```

{{ select(11) }}

- A. int b = (i/10)/10;
- B. int b = (i/10)%10;
- C. int b = (i%10)/10;
- D. int b = (i%10)%10;

---

12. 以下程序模拟小球反弹（5次落地），横线处应填入( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int height=10, distance=0;
    for(int i=1;i<=5;i++){
        height /=2;
        ____; // 横线处
    }
    cout<<distance<<endl;
    return 0;
}
```

{{ select(12) }}

- A. distance += height/2;
- B. distance += height;
- C. distance += height*2;
- D. distance += height+1;

---

13. C++代码`string s = "GESP考试";`，s占据的字节数是( )

{{ select(13) }}

- A. 10
- B. 8
- C. 8或10
- D. 取决于计算机采用的编码

---

14. C++语句`string s="Gesp Test";`执行`s.rfind("e")`后，输出是( )

{{ select(14) }}

- A. 1
- B. 2
- C. 6
- D. 3

---

15. 字符串"Gesp考试"的字符数是( )

{{ select(15) }}

- A. 10
- B. 8
- C. 6
- D. 取决于编码

---

## 二、判断题（每题2分，共20分）

16. C++中string的==运算符比较的是字符串的内存地址，而非内容｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. string的substr(1, 3)返回从下标1开始的3个字符的子串｡( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. x是浮点数，(x >> 1)等价于x/2｡( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. string("hello") == "hello"的比较结果为true｡( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. sort可以直接用于排序set中的元素｡( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. (x & 1) == 0可以判断整数x是否为偶数｡( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. string的substr(2, 10)在字符串长度不足时会抛出异常｡( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 数学中pow(2,3)=8，但C++中浮点数类型的pow(2,3)不一定正确｡( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 在C++中，枚举的底层类型可以是非整型（如float或double）｡( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 函数声明double f();返回int时，会自动转换为double｡( )

{{ select(25) }}

- A. 正确
- B. 错误
