# 2025年9月 C++三级考试真题

## 一、单选题（每题2分，共30分）

1. 执行以下C++代码后，c的数值是( )｡

```cpp
int a = 10, b = 3;
double c = a / b;
```

{{ select(1) }}

- A. 3.33333
- B. 3.333
- C. 3.0
- D. 3.3

---

2. 下列C++表达式的结果为true的是( )｡

{{ select(2) }}

- A. (5 <= 5) && (7 < 5)
- B. !(10 > 5)
- C. (10 != 10) || (5 >= 3)
- D. (5 == 3) && (4 > 2)

---

3. 以下关于C++数组的说法，错误的是( )｡

{{ select(3) }}

- A. 数组的下标通常从0开始
- B. int arr[5]; 声明了一个包含5个整数的数组
- C. 数组的大小必须在编译时确定，不能使用变量定义大小
- D. 可以通过arr[5]来访问int arr[5];数组的最后一个元素

---

4. 执行以下C++代码后，变量sum的值是( )｡

```cpp
int sum=0;
for (int i = 1; i <= 5; i += 2) {
    sum += i;
}
```

{{ select(4) }}

- A. 6
- B. 9
- C. 15
- D. 死循环

---

5. 要正确定义一个返回两个整数中较大值的函数max，应该使用( )｡

{{ select(5) }}

- A. void max(int a, int b) { return a > b ? a : b; }
- B. int max(int a, int b) { if (a > b) return a; else return b; }
- C. int max(a, b) { if (a > b) return a; else return b; }
- D. void max(a, b) { cout << (a > b ? a : b); }

---

6. 执行以下C++代码后，数组arr的内容是( )｡

```cpp
int arr[4] = {1, 2, 3};
arr[3] = arr[0] + arr[2];
```

{{ select(6) }}

- A. {1, 2, 3, 3}
- B. {1, 2, 3, 4}
- C. {1, 2, 3, 5}
- D. {1, 2, 3, 6}

---

7. 以下关于C++函数的描述，正确的是( )｡

{{ select(7) }}

- A. 函数必须要有参数
- B. 函数通过return语句只能返回一个值，但若想返回多个值，可以通过很多间接的方式
- C. main函数可以被其他函数调用
- D. 函数的定义可以直接嵌套，即一个函数内部可以真正定义另一个函数

---

8. 以下C++代码count++执行的次数是( )｡

```cpp
int i = 10, count=0;
while (i > 0) {
    i -= 3;
    continue;
    count++;
}
```

{{ select(8) }}

- A. 2
- B. 3
- C. 4
- D. 0

---

9. 以下C++代码段的输出是( )｡

```cpp
for (int i = 0; i < 4; i++) {
    for (int j = 0; j <= i; j++) {
        cout << "#";
    }
    cout << j;
}
```

{{ select(9) }}

- A. 0#01#012#0123#
- B. 1#12#123#1234#
- C. 0#1#2#3#
- D. 0#01#012#01243#

---

10. 以下关于C++变量作用域的说法，错误的是( )｡

{{ select(10) }}

- A. 在for循环语句中声明的变量，其作用域仅限于该循环体内
- B. 在函数内部声明的变量（局部变量），仅在函数内部有效
- C. 在所有函数外部声明的变量，在整个程序中都有效
- D. 不同函数中的局部变量可以同名，它们代表不同的内存单元

---

11. 关于以下代码的说法正确的是( )｡

```cpp
int reversed = 0;
while (x != 0) {
    int digit = x % 10;
    x /= 10;
    reversed = reversed * 10 + digit;
}
```

{{ select(11) }}

- A. 能够反转任何位数的整数
- B. 能够反转的最大位数正整数是2147483647
- C. 能够反转的最大位数正整数是2147483648
- D. 能够反转的最大位数正整数是1463847412

---

12. 以下C++代码试图查找数组中的最大值，划线处应填入( )｡

```cpp
#include <iostream>
using namespace std;
int findMax(int arr[], int size) {
    int maxVal = ________; // 划线处
    for (int i = 1; i < size; i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }
    return maxVal;
}
```

{{ select(12) }}

- A. 0
- B. arr[-1]
- C. arr[0]
- D. size

---

13. 以下关于C++函数的说法，正确的是( )｡

{{ select(13) }}

- A. 函数参数传递只有值传递一种方式
- B. 函数的形参在函数调用结束后依然占用内存空间
- C. 没有返回值的函数必须声明为void类型，且不能包含return语句
- D. C++11及之后标准要求函数必须显式声明返回类型，不允许默认返回int

---

14. 以下C++代码中存在几处错误( )｡

```cpp
#include <iostream>
using namespace std;
int main() {
    const int SIZE = 5;
    int arr[SIZE];
    for (int i = 0; i <= SIZE; i++) {
        arr[i] = i * 2;
    }
    cout << arr[SIZE] << endl;
    return 0;
}
```

{{ select(14) }}

- A. 0处
- B. 1处
- C. 2处
- D. 3处

---

15. 以下关于C++中string类和字符数组（char[]）的说法，错误的是( )｡

{{ select(15) }}

- A. string对象可以使用=进行赋值，而字符数组需要使用strcpy
- B. string对象的长度可以使用length()成员函数获取，而字符数组需要使用strlen()函数
- C. string对象在内存中是动态分配空间的，因此可以自动处理字符串长度的变化
- D. string对象和字符数组都可以使用==运算符来直接比较两个字符串的内容是否相同

---

## 二、判断题（每题2分，共20分）

16. 表达式sizeof('a')的结果总是1，因为'a'是一个字符｡( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 在C++中，所有全局变量如果没有显式初始化，都会被自动初始化为0｡( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. do { ... } while (false); 循环体内的语句至少会被执行一次｡( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 在C++中，++i是一个左值表达式，而i++是一个右值表达式｡( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 对于enum Color { RED, GREEN, BLUE };，RED的类型是int｡( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. #define SQUARE(x) x * x 是一个安全的宏定义，SQUARE(2+3)会正确计算出25｡( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 在C++中，char类型的取值范围总是-128到127｡( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 表达式a > b ? a : b = 10; 一定是合法的C++代码｡( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. #include "file.h" 和 #include <file.h> 在编译器查找头文件时的搜索策略是完全相同的｡( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 在同一个作用域内，extern声明的变量可以多次定义｡( )

{{ select(25) }}

- A. 正确
- B. 错误
