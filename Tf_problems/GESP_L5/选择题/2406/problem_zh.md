# 2024年6月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 以下斐波那契数列代码中，函数fibo()属于哪种算法？

```cpp
int fibo(int n) {
    if (n <= 0) return 0;
    if (n == 1 || n == 2) return 1;
    int a = 1, b = 1, next;
    for (int i = 3; i <= n; i++) {
        next = a + b;
        a = b;
        b = next;
    }
    return next;
}
```

{{ select(1) }}

- A. 枚举算法
- B. 贪心算法
- C. 迭代算法
- D. 递归算法

---

2. 以下最少币种组合代码的实现算法是？

```cpp
#include <iostream>
using namespace std;

#define N_COINS 7
int coins[N_COINS] = {100, 50, 20, 10, 5, 2, 1};
int coins_used[N_COINS];

void find_coins(int money) {
    for (int i = 0; i < N_COINS; i++) {
        coins_used[i] = money / coins[i];
        money = money % coins[i];
    }
}

int main() {
    int money; cin >> money;
    find_coins(money);
    for (int i = 0; i < N_COINS; i++)
        cout << coins_used[i] << endl;
    return 0;
}
```

{{ select(2) }}

- A. 枚举算法
- B. 贪心算法
- C. 迭代算法
- D. 递归算法

---

3. 双链表查找歌曲的时间复杂度是？

```cpp
struct dl_node {
    string song;
    dl_node* prev;
    dl_node* next;
};

dl_node* search(dl_node* head, string my_song) {
    dl_node* temp = head;
    while (temp != nullptr) {
        if (temp->song == my_song)
            return temp;
        temp = temp->next;
    }
    return nullptr;
}
```

{{ select(3) }}

- A. O(1)
- B. O(N)
- C. O(logN)
- D. O(NlogN)

---

4. 双链表头部插入歌曲，横线处应填？

```cpp
void insert(dl_node *head, string my_song) {
    dl_node* p = new dl_node;
    p->song = my_song;
    p->prev = nullptr;
    p->next = head;
    if (head != nullptr) {
        ___; // 横线处
    }
    head = p;
}
```

{{ select(4) }}

- A. head->next->prev = p;
- B. head->next = p;
- C. head->prev = p;
- D. 触发异常

---

5. 欧几里得算法函数计算的是？

```cpp
int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```

{{ select(5) }}

- A. 最小公倍数
- B. 最大公共质因子
- C. 最大公约数
- D. 最小公共质因子

---

6. 递归版gcd()的说法错误的是？

```cpp
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}
```

{{ select(6) }}

- A. 递归实现
- B. 代码量少，易理解
- C. 大数据时需较多辅助空间
- D. 大数据时执行效率更高

---

7. 线性筛代码，横线处应填？

```cpp
vector<int> linear_sieve(int n) {
    vector<bool> is_prime(n + 1, true);
    vector<int> primes;
    is_prime[0] = is_prime[1] = 0;
    for (int i = 2; i <= n; ++i) {
        if (is_prime[i]) {
            primes.push_back(i);
        }
        ___; // 横线处
        is_prime[i * primes[j]] = 0;
        if (i % primes[j] == 0)
            break;
    }
    return primes;
}
```

{{ select(7) }}

- A. for (int j=0;j<primes.size()&&i*primes[j]<=n;j++)
- B. for (int j=0;j<=sqrt(n)&&i*primes[j]<=n;j++)
- C. for (int j=0;j<=n;j++)
- D. for (int j=1;j<=sqrt(n);j++)

---

8. 上述线性筛的时间复杂度是？

{{ select(8) }}

- A. O(N)
- B. O(NlogN)
- C. O(NloglogN)
- D. O(√N)

---

9. 快速排序代码，横线处应填？

```cpp
void qsort(vector<int>& arr, int left, int right) {
    int i = left, j = right, mid;
    int pivot;
    mid = (left + right) / 2;
    pivot = arr[mid];
    do {
        while (arr[i] < pivot) i++;
        while (arr[j] > pivot) j--;
        if (i <= j) {
            swap(arr[i], arr[j]);
            i++;
            j--;
        }
    } ___; // 横线处
    if (left < j) qsort(arr, left, j);
    if (i < right) qsort(arr, i, right);
}
```

{{ select(9) }}

- A. while (i <= mid)
- B. while (i < mid)
- C. while (i < j)
- D. while (i <= j)

---

10. 分治算法的正确说法是？

{{ select(10) }}

- A. 将大问题分解为子问题，解决后合并
- B. 归并排序不是分治应用
- C. 用于小规模问题
- D. 时间复杂度优于O(NlogN)

---

11. 二分查找82，比较的元素是？

数组：[1,3,6,9,17,31,39,52,61,79,81,90,96]

{{ select(11) }}

- A. 52,61,81,90
- B. 52,79,90,81
- C. 39,79,90,81
- D. 39,79,90

---

12. 高精度减法借位，横线处应填？

```cpp
vector<int> minus(vector<int> a, vector<int> b) {
    vector<int> c;
    int len1 = a.size(), len2 = b.size();
    for (int i = 0; i < len2; i++) {
        if (a[i] < b[i]) {
            ___; // 借位代码
            a[i] += 10;
        }
        int t = a[i] - b[i];
        c.push_back(t);
    }
    for (; i < len1; i++)
        c.push_back(a[i]);
    while (c.size() > 1 && c.back() == 0)
        c.pop_back();
    return c;
}
```

{{ select(12) }}

- A. a[i+1]--;
- B. a[i]--;
- C. b[i+1]--;
- D. b[i]--;

---

13. 两个长度为n的有序数组合并，最坏情况最少比较次数？

{{ select(13) }}

- A. n
- B. 2n-1
- C. n-1
- D. 2n

---

14. fun(7)的返回值是？

```cpp
int fun(int n) {
    if (n == 1) return 1;
    if (n == 2) return 2;
    return fun(n-2) - fun(n-1);
}
```

{{ select(14) }}

- A. 0
- B. 1
- C. 21
- D. -11

---

15. fun(4)的输出序列是？

```cpp
int fun(int n) {
    cout << n << " ";
    if (n == 1) return 1;
    if (n == 2) return 2;
    return fun(n-2) - fun(n-1);
}
```

{{ select(15) }}

- A. 4 3 2 1
- B. 1 2 3 4
- C. 4 2 3 1 2
- D. 4 2 3 2 1

---

## 二、判断题（每题2分，共20分）

16. 双向链表首尾相接构成循环链表。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 链表的优点是插入删除不移动元素，且能随机查找。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 链表的存储空间物理上可连续或不连续。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 埃氏筛法比线性筛法效率更高。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 唯一分解定理表明大于1的整数可唯一分解为质数乘积。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 贪心算法的局部最优解不一定是全局最优解。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 归并排序和快速排序都是不稳定排序。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 插入排序有时比快速排序时间复杂度更低。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 全国人口普查按省市县乡分解，是分治策略。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 删除ptr后输出ptr会报错。( )

```cpp
int* ptr = new int(10);
cout << *ptr << endl;
delete ptr;
cout << ptr << endl;
```

{{ select(25) }}

- A. 正确
- B. 错误
