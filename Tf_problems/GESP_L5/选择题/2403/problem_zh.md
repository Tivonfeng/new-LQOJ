# 2024年3月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 唯一分解定理的描述是？

{{ select(1) }}

- A. 任意整数可分解为素数乘积
- B. 每个合数可唯一分解为素数乘积
- C. 不同整数可分解为相同素数乘积
- D. 以上都不对

---

2. 贪心算法的核心思想是？

{{ select(2) }}

- A. 每一步做当前最优选择
- B. 每一步选局部最优解
- C. 每一步选全局最优解
- D. 以上都对

---

3. 递归计算阶乘，横线处应填？

```cpp
int factorial(int n) {
    if (n == 0 || n == 1) {
        return 1;
    } else {
        ___; // 横线处
    }
}
```

{{ select(3) }}

- A. return n * factorial(n-1);
- B. return factorial(n-1)/n;
- C. return n * factorial(n);
- D. return factorial(n/2)*factorial(n/2);

---

4. 双向链表删除节点，横线处应填？

```cpp
struct DoublyListNode{
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

void deleteNode(DoublyListNode*& head, int value) {
    DoublyListNode* current = head;
    while (current != nullptr && current->val != value) {
        current = current->next;
    }
    if (current != nullptr) {
        if (current->prev != nullptr) {
            ___; // 横线处：处理前驱节点
        } else {
            head = current->next;
        }
        if (current->next != nullptr) {
            current->next->prev = current->prev;
        }
        delete current;
    }
}
```

{{ select(4) }}

- A. if(current->next!=nullptr) current->next->prev=current->prev;
- B. current->prev->next = current->next;
- C. delete current->next;
- D. current->prev = current->next;

---

5. 辗转相除法又称？

{{ select(5) }}

- A. 高斯消元法
- B. 费马定理
- C. 欧几里德算法
- D. 牛顿迭代法

---

6. 递归斐波那契的时间复杂度是？

```cpp
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    } else {
        return fibonacci(n-1) + fibonacci(n-2);
    }
}
```

{{ select(6) }}

- A. O(N)
- B. O(logN)
- C. O(2ⁿ)
- D. O(N²)

---

7. 高精度加法，横线处应填？

```cpp
#include<string>
using namespace std;

string add(string num1, string num2) {
    string result;
    int carry = 0;
    int i = num1.size()-1, j = num2.size()-1;
    while (i >= 0 || j >= 0 || carry) {
        int x = (i >= 0) ? num1[i--]-'0' : 0;
        int y = (j >= 0) ? num2[j--]-'0' : 0;
        int sum = x + y + carry;
        carry = sum / 10;
        ___; // 横线处：添加当前位
    }
    return result;
}
```

{{ select(7) }}

- A. result = to_string(sum%10) + result;
- B. result = to_string(carry%10) + result;
- C. result = to_string(sum/10) + result;
- D. result = to_string(sum%10+carry) + result;

---

8. 二分查找序列[1,3,6,9,17,31,39,52,61,79,81,90,96]中的82，循环次数（times）为？

```cpp
#include<vector>
#include<iostream>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int left = 0;
    int times = 0;
    int right = arr.size()-1;
    while (left <= right) {
        times++;
        int mid = left + (right-left)/2;
        if (arr[mid] == target) {
            cout << times << endl;
            return mid;
        } else if (arr[mid] < target) {
            left = mid+1;
        } else {
            right = mid-1;
        }
    }
    cout << times << endl;
    return -1;
}
```

{{ select(8) }}

- A. 2
- B. 5
- C. 3
- D. 4

---

9. 判断素数代码需修改的是？

```cpp
bool isPrime(int num) {
    if (num < 2) {
        return false;
    }
    for (int i=2, ___; ++i) { // 横线处：循环条件
        if (num%i == 0) {
            return false;
        }
    }
    return true;
}
```

{{ select(9) }}

- A. num<2改为num<=2
- B. 循环条件i*i<num改为i*i<=num
- C. 循环条件i<=num
- D. 循环体if(num%i!=0)

---

10. 埃氏筛最外层循环范围是？

```cpp
#include<vector>
using namespace std;

vector<int> sieveOfEratosthenes(int n) {
    vector<bool> isPrime(n+1, true);
    vector<int> primes;
    ___; // 横线处：最外层循环
        if (isPrime[i]) {
            primes.push_back(i);
            for (int j=i*i; j<=n; j+=i) {
                isPrime[j] = false;
            }
        }
    for (int i=sqrt(n)+1; i<=n; ++i) {
        if (isPrime[i]) primes.push_back(i);
    }
    return primes;
}
```

{{ select(10) }}

- A. for(int i=2;i<=n;++i)
- B. for(int i=1;i<n;++i)
- C. for(int i=2;i<=sqrt(n);++i)
- D. for(int i=1;i<=sqrt(n);++i)

---

11. 素数的线性筛法时间复杂度为？

{{ select(11) }}

- A. O(N)
- B. O(NlogN)
- C. O(NloglogN)
- D. O(√N)

---

12. 归并排序的基本思想是？

{{ select(12) }}

- A. 动态规划
- B. 分治
- C. 贪心
- D. 回溯

---

13. 快速排序中，主元素影响？

{{ select(13) }}

- A. 不影响
- B. 时间复杂度
- C. 空间复杂度
- D. 时间和空间复杂度

---

14. 递归函数避免无限递归的条件是？

{{ select(14) }}

- A. 有终止条件
- B. 参数递减/递增
- C. 返回值固定
- D. 以上都对

---

15. 链表searchValue(head,5)的返回值是？

```cpp
struct ListNode{
    int val;
    ListNode* next;
};

int searchValue(ListNode* head, int target) {
    while (head != nullptr) {
        if (head->val == target) {
            return 1;
        }
        head = head->next;
    }
    return 0;
}
```

{{ select(15) }}

- A. 返回1
- B. 返回0
- C. 死循环
- D. 返回-1

---

## 二、判断题（每题2分，共20分）

16. 辗转相除法用于求两个整数的最大公约数。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 插入排序的时间复杂度是O(NlogN)。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 二分查找要求序列有序，否则无法保证正确性。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 贪心算法的局部最优解必导致全局最优解。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 分治算法将大问题分解为子问题，解决后合并结果。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 归并排序是分治算法应用，时间复杂度O(NlogN)。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 埃氏筛和线性筛的时间复杂度都是O(NloglogN)。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 贪心算法是通用解决方案。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 单链表和双链表都能在常数时间内增删头节点。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. C语言中递归通常占用更多栈空间，可能栈溢出。( )

{{ select(25) }}

- A. 正确
- B. 错误
