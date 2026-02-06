# 2024年9月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 关于链表和数组的描述，错误的是？

{{ select(1) }}

- A. 数组大小固定，链表可动态调整
- B. 数组支持随机访问，链表仅顺序访问
- C. 存储相同整数，数组比链表占内存多
- D. 数组插入删除效率低，链表高

---

2. 双向循环链表p后插入s，正确操作是？

{{ select(2) }}

- A. p->next->prev=s; s->prev=p; p->next=s; s->next=p->next;
- B. p->next->prev=s; p->next=s; s->prev=p; s->next=p->next;
- C. s->prev=p; s->next=p->next; p->next=s; p->next->prev=s;
- D. s->next=p->next; p->next->prev=s; s->prev=p; p->next=s;

---

3. 关于sumA和sumB的说法错误的是？

```cpp
int sumA(int n) {
    int res = 0;
    for (int i=1; i<=n; i++) res += i;
    return res;
}

int sumB(int n) {
    if (n == 1) return 1;
    return n + sumB(n-1);
}
```

{{ select(3) }}

- A. sumA是迭代思想
- B. sumB是递归方式
- C. sumB时间效率更高
- D. 功能相同

---

4. fun(20,12)的返回值是？

```cpp
int fun(int a, int b) {
    if (a % b == 0) return b;
    else return fun(b, a % b);
}
```

{{ select(4) }}

- A. 20
- B. 12
- C. 4
- D. 2

---

5. 埃氏筛代码，横线处应填？

```cpp
vector<int> sieve_Eratosthenes(int n) {
    vector<bool> is_prime(n+1, true);
    vector<int> primes;
    for (int i=2; i*i<=n; i++) {
        if (is_prime[i]) {
            primes.push_back(i);
            ___; // 横线处
            is_prime[j] = false;
        }
    }
    for (int i=sqrt(n)+1; i<=n; i++)
        if (is_prime[i]) primes.push_back(i);
    return primes;
}
```

{{ select(5) }}

- A. for (int j=i; j<=n; j++)
- B. for (int j=i*i; j<=n; j++)
- C. for (int j=i*i; j<=n; j+=i)
- D. for (int j=i; j<=n; j+=i)

---

6. 线性筛代码，横线处应填？

```cpp
vector<int> sieve_linear(int n) {
    vector<bool> is_prime(n+1, true);
    vector<int> primes;
    for (int i=2; i<=n/2; i++) {
        if (is_prime[i]) primes.push_back(i);
        ___; // 横线处
        is_prime[i*primes[j]] = 0;
        if (i%primes[j] == 0) break;
    }
    for (int i=n/2+1; i<=n; i++)
        if (is_prime[i]) primes.push_back(i);
    return primes;
}
```

{{ select(6) }}

- A. for (int j=0;j<primes.size()&&i*primes[j]<=n;j++)
- B. for (int j=1;j<primes.size()&&i*j<=n;j++)
- C. for (int j=2;j<primes.size()&&i*primes[j]<=n;j++)
- D. 以上都不对

---

7. get_prime_factors的时间复杂度是？

```cpp
vector<int> get_prime_factors(int n) {
    vector<int> factors;
    while (n%2 == 0) { factors.push_back(2); n/=2; }
    for (int i=3; i*i<=n; i+=2) {
        while (n%i == 0) { factors.push_back(i); n/=i; }
    }
    if (n>2) factors.push_back(n);
    return factors;
}
```

{{ select(7) }}

- A. O(N²)
- B. O(√N)
- C. O(N)
- D. O(logN)

---

8. quick_power的时间复杂度是？

```cpp
double quick_power(double x, unsigned n) {
    if (n == 0) return 1;
    if (n == 1) return x;
    return quick_power(x, n/2) * quick_power(x, n/2) * (n&1 ? x : 1);
}
```

{{ select(8) }}

- A. O(logN)
- B. O(N)
- C. O(NlogN)
- D. O(N²)

---

9. 快速排序对已排序数组（选首元素为基准）的行为是？

{{ select(9) }}

- A. 表现最好
- B. 时间复杂度O(NlogN)
- C. 时间复杂度O(N²)
- D. 无法排序

---

10. 归并排序中merge函数的递归调用次数约为？

{{ select(10) }}

- A. N
- B. NlogN
- C. 2N
- D. logN

---

11. 过河船数代码采用的思想是？

```cpp
int count = 0;
for (int i=0, j=n-1; i<j; j--) {
    if (weight[i] + weight[j] <= 100) i++;
    count++;
}
```

{{ select(11) }}

- A. 枚举算法
- B. 贪心算法
- C. 迭代算法
- D. 递归算法

---

12. 分治算法的正确说法是？

{{ select(12) }}

- A. 将大问题分解为子问题，解决后合并
- B. 归并排序不是分治应用
- C. 用于小规模问题
- D. 时间复杂度优于O(NlogN)

---

13. 二分查找31，while循环执行次数？

数组：[1,3,6,9,17,31,39,52,61,79]

{{ select(13) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

14. 关于高精度运算的说法错误的是？

{{ select(14) }}

- A. 处理大整数或多位小数运算
- B. 大整数除小整数可逐位尝试
- C. 高精度乘法时间仅与较长数位数有关
- D. 加法关键是逐位相加和进位

---

15. fun(7)的返回值是？

```cpp
int fun(int n) {
    if (n == 1) return 1;
    else if (n >=5) return n * fun(n-2);
    else return n * fun(n-1);
}
```

{{ select(15) }}

- A. 105
- B. 840
- C. 210
- D. 420

---

## 二、判断题（每题2分，共20分）

16. 操作系统中进程循环调度可通过环形链表实现。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 线性筛法效率高于埃氏筛法。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 唯一分解定理表明大于1的整数可唯一分解为素数之和。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 贪心算法的局部最优解必为全局最优解。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 快速排序和归并排序都是稳定排序。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 插入排序时间复杂度总是比快速排序低。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 分治策略可提升算法效率，且利于并行优化。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 二分查找要求序列有序，否则无法保证正确性。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. C++中递归可能因栈空间溢出报错。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. sin(sin(x))是递归调用。( )

{{ select(25) }}

- A. 正确
- B. 错误
