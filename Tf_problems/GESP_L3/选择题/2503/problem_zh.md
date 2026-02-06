# 2025年3月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. Base64编码将每3字节输入编码为4字节输出，输入长度非3的倍数用=填充。输入字符串长度为10字节，编码后长度是( )

{{ select(1) }}

- A. 12字节
- B. 13字节
- C. 14字节
- D. 16字节

---

2. 下列哪个字节序列是合法的UTF-8编码？（UTF-8规则：1字节0xxxxxxx；2字节110xxxxx 10xxxxxx；3字节1110xxxx 10xxxxxx 10xxxxxx；4字节11110xxx 10xxxxxx 10xxxxxx 10xxxxxx）

{{ select(2) }}

- A. 0xC0 0x80
- B. 0xF0 0x90 0x80 0x80
- C. 0x80 0x80 0x80
- D. 0xFF 0xFE 0xFD

---

3. 在8位二进制原码表示中，八进制数-5的二进制形式是( )

{{ select(3) }}

- A. 10000101
- B. 11111010
- C. 11111011
- D. 00000101

---

4. 十进制数111.111的二进制表示可以是( )｡

{{ select(4) }}

- A. 1101111.0001110001
- B. 1101110.1001110001
- C. 1101111.1001110001
- D. 1101111.0011110001

---

5. 在C++中，补码的主要作用是( )

{{ select(5) }}

- A. 提高浮点数的精度
- B. 简化整数的加减法运算
- C. 增加整数的表示范围
- D. 优化内存分配

---

6. 在C++中，一个8位有符号整数（补码表示）的范围是( )

{{ select(6) }}

- A. -128到127
- B. -127到128
- C. -256到255
- D. 0到255

---

7. 在C++中，以下代码的输出是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int a = -5;
    unsigned int b = a;
    cout << b;
    return 0;
}
```

{{ select(7) }}

- A. -5
- B. 5
- C. 4294967291
- D. 编译错误

---

8. 下列程序的作用是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int decimal = 25;
    cout << oct << decimal;
    return 0;
}
```

{{ select(8) }}

- A. 将十进制数转换成八进制数
- B. 将八进制数转换成十进制数
- C. 将二进制数转换成八进制数
- D. 将八进制数转换成十六进制数

---

9. 下面程序是将十进制转十六进制，横线处应该填入的是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int decimal = 255;
    ____; // 横线处
    cout << decimal;
    return 0;
}
```

{{ select(9) }}

- A. cout << oct << decimal;
- B. cout << decimal << decimal;
- C. cout << hex << decimal;
- D. 不能正确执行

---

10. 以下代码的说法正确的是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int a = 0b1101;
    int b = 0b1011;
    cout << (a ^ b);
    return 0;
}
```

{{ select(10) }}

- A. 进行的是整体异或运算
- B. 进行的是按位同或运算
- C. 进行的是按位与运算
- D. 进行的是按位异或运算

---

11. 下面枚举法查找最大值索引程序中，横线处应该填写的是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int arr[] = {3,7,2,9,5}; int maxIndex = 0;
    for (int i = 1; i < 5; i++) {
        ____ // 横线处
        maxIndex = i;
    }
    cout << maxIndex;
    return 0;
}
```

{{ select(11) }}

- A. if (arr[maxIndex] > arr[i])
- B. if (arr[i]-1 > arr[maxIndex])
- C. if (arr[i]+1 > arr[maxIndex])
- D. if (arr[i] > arr[maxIndex])

---

12. 以下代码的功能是将数组中的奇数和偶数分别放在数组的前半部分和后半部分，横线处应该填入的是( )

```cpp
#include<iostream>
using namespace std;
int main() {
    int arr[] = {1,2,3,4,5}; int left = 0, right = 4;
    while (left < right) {
        while (arr[left] % 2 == 1 && left < right) left++;
        ____; // 横线处
        if (left < right) swap(arr[left], arr[right]);
    }
    for (int i = 0; i < 5; i++) cout << arr[i] << " ";
    return 0;
}
```

{{ select(12) }}

- A. while (arr[left] % 2 == 0 && left < right) right--;
- B. while (arr[right] % 2 == 0 && left < right) left--;
- C. while (arr[right] % 2 != 0 && left < right) right--;
- D. while (arr[right] % 2 == 0 && left < right) right--;

---

13. 下面程序最后能够得到"HelloC++"的是( )

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string str = "HelloWorld";
    ____; // 横线处
    cout << str;
    return 0;
}
```

{{ select(13) }}

- A. str.replace(0, 5, "C++");
- B. str.replace(5, 5, "C++");
- C. str.replace(1, 5, "C++");
- D. str.replace(4, 5, "C++");

---

14. 想要得到字符串"World"，下面程序横线处应该填入的是( )

```cpp
#include<iostream>
#include<string>
using namespace std;
int main() {
    string str = "HelloC++";
    ____; // 横线处
    cout << str.substr(5, 5);
    return 0;
}
```

{{ select(14) }}

- A. str.insert(4, "World");
- B. cout << str.substr(5, 5);
- C. str.insert("World"); cout << str.substr(5, 5);
- D. str.insert(5, "World");

---

15. 有n个正整数，"美丽数字"是9的倍数但不是8的倍数，统计美丽数字的数量，横线处应该填入的是( )

```cpp
int n, a, cnt=0;
cin >> n;
for (int i = 1; i <= n; i++) {
    cin >> a;
    if (____) cnt++;
}
cout << cnt;
```

{{ select(15) }}

- A. if (a % 9 != 0 && a % 8 != 0)
- B. if (a % 9 == 0 & a % 8 == 0)
- C. if (a % 9 == 0 && a % 8 != 0)
- D. if (a % 9 == 0 & a % 8 != 0)

---

## 二、判断题（每题2分，共20分）

16. 判断一个三角形是否成立的条件只有：任意两边长度之和大于第三条边的长度｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 这段程序判断输入字符的ASCII是否为奇数，若是输出YES，否则输出NO：

```cpp
#include<iostream>
using namespace std;
int main() {
    char x; scanf("%c", &x);
    int ASCII = (int)x;
    cout << (x & 1 ? "YES" : "NO") << '\n';
    return 0;
}
```

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 闰年判断程序正确：

```cpp
#include<iostream>
using namespace std;
int main() {
    int n; cin>>n;
    cout<<((n%4==0&&n%100!=0)||(n%400==0))?1:0;
    return 0;
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. C++语句`cout<<(n%15==0? "YES":"NO");`能够判断一个整数能否被3和5同时整除｡( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 有n个同学，从中抽取任意个人数参加大合唱，共有2的n次幂个方法｡( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 2025化为二进制后1的个数为偶数，是A类数（1的个数偶数为A类，奇数为B类）｡( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 该段程序将n不停地除以2，输出商和余数，直到n=0为止：

```cpp
#include<iostream>
using namespace std;
int main() {
    long long n; cin >> n;
    while(n != 0) {
        cout << n/2 << ' ' << n%2 << '\n';
        n /= 2;
    }
    return 0;
}
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 13进制数A（10）和B（11）相加，和是13进制数18｡( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. k进制中，逢k进第二位，k²进百位，k³进千位｡( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 十九进制CCF = 十三进制21AC（不区分大小写）｡( )

{{ select(25) }}

- A. 正确
- B. 错误
