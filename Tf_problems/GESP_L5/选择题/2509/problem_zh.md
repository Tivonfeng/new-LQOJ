# 2025年9月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 以下哪种情况使用链表比数组更合适？

{{ select(1) }}

- A. 数据量固定且读多写少
- B. 需要频繁在中间或开头插入、删除元素
- C. 需要高效随机访问元素
- D. 存储空间必须连续

---

2. 函数removeElements删除单链表中所有结点值等于val的结点，横线处应填？

```cpp
struct Node {
    int val; Node* next;
    Node() : val(0), next(nullptr) {}
    Node(int x) : val(x), next(nullptr) {}
    Node(int x, Node *next) : val(x), next(next) {}
};

Node* removeElements(Node* head, int val) {
    Node dummy(0, head);
    Node* cur = &dummy;
    while (cur->next) {
        if (cur->next->val == val) {
            ___; // 横线处
        } else {
            cur = cur->next;
        }
    }
    return dummy.next;
}
```

{{ select(2) }}

- A. Node* del = cur; cur = del->next; delete del;
- B. Node* del = cur->next; cur->next = del; delete del;
- C. Node* del = cur->next; cur->next = del->next; delete del;
- D. Node* del = cur->next; delete del; cur->next = del->next;

---

3. Floyd快慢指针判断链表环，横线处应填？

```cpp
bool hasCycle(Node* head) {
    if (!head || !head->next) return false;
    Node* slow = head;
    Node* fast = head->next;
    while (fast && fast->next) {
        if (slow == fast) return true;
        ___; // 横线处
    }
    return false;
}
```

{{ select(3) }}

- A. slow = slow->next; fast = fast->next->next;
- B. slow = fast->next; fast = slow->next->next;
- C. slow = slow->next; fast = slow->next->next;
- D. slow = fast->next; fast = fast->next->next;

---

4. 函数isPerfectNumber判断完全数，横线处应填？

```cpp
bool isPerfectNumber(int n) {
    if(n <= 1) return false;
    int sum = 1;
    for(int i = 2; ______; i++) {
        if(n % i == 0) {
            sum += i;
            if(i != n/i) sum += n/i;
        }
    }
    return sum == n;
}
```

{{ select(4) }}

- A. i <= n
- B. i*i <= n
- C. i <= n/2
- D. i < n

---

5. 求最大公约数，横线处应填？

```cpp
int gcd0(int a, int b) {
    if (a < b) swap(a, b);
    while(b != 0) {
        int temp = a % b;
        a = b;
        b = temp;
    }
    return ______; // 横线处
}
```

{{ select(5) }}

- A. b
- B. a
- C. temp
- D. a * b

---

6. 埃氏筛代码，横线处应填？

```cpp
vector<bool> sieve(int n) {
    vector<bool> is_prime(n+1, true);
    is_prime[0] = is_prime[1] = false;
    for(int i = 2; i <= n; i++) {
        if(is_prime[i]) {
            for(int j = ______; j <= n; j += i)
                is_prime[j] = false;
        }
    }
    return is_prime;
}
```

{{ select(6) }}

- A. i
- B. i+1
- C. i*2
- D. i*i

---

7. 线性筛代码，横线处应填？

```cpp
vector<int> linearSieve(int n) {
    vector<bool> is_prime(n+1, true);
    vector<int> primes;
    for (int i=2;i <= n; i++) {
        if (is_prime[i]) primes.push_back(i);
        for (int p:primes){
            if(p * i >n) break;
            is_prime[p*i] = false;
            if(____) break;
        }
    }
    return primes;
}
```

{{ select(7) }}

- A. i%p == 0
- B. p%i == 0
- C. i==p
- D. i*p ==n

---

8. 关于埃氏筛和线性筛的比较，下列说法错误的是？

{{ select(8) }}

- A. 埃氏筛可能会对同一个合数进行多次标记
- B. 线性筛的理论时间复杂度更优，所以线性筛的速度往往优于埃氏筛
- C. 线性筛保证每个合数只被其最小质因子筛到一次
- D. 对于常见范围（n ≤10⁷），埃氏筛因实现简单，常数较小，其速度往往优于线性筛

---

9. 唯一分解定理描述的是？

{{ select(9) }}

- A. 每个整数都能表示为任意素数的乘积
- B. 每个大于1的整数能唯一分解为素数幂乘积（忽略顺序）
- C. 合数不能分解为素数乘积
- D. 素数只有两个因子：1和自身

---

10. n×n有序矩阵找第k小元素，两处横线应填？

```cpp
int countLE(const vector<vector<int>>& matrix, int x) {
    int n=(int)matrix.size(); int i=n-1,j=0,cnt=0;
    while(i>=0&&j<n){
        if (matrix[i][j]<=x){ cnt +=i+1; ++j; }
        else { --i; }
    }
    return cnt;
}

int kthSmallest(vector<vector<int>>& matrix, int k) {
    int n =(int)matrix.size();
    int lo=matrix[0][0]; int hi=matrix[n-1][n-1];
    while (lo < hi) {
        int mid = lo + (hi - lo)/2;
        if (countLE(matrix, mid) >= k) { ______ }
        else { ______ }
    }
    return lo;
}
```

{{ select(10) }}

- A. hi = mid-1；lo = mid+1
- B. hi = mid；lo = mid
- C. hi = mid；lo = mid+1
- D. hi = mid+1；lo = mid

---

11. 关于快速排序代码的说法错误的是？

{{ select(11) }}

- A. 快速排序平均情况下运行速度快，常数小、就地排序，实践中常比归并排序高效
- B. 平均时间复杂度O(NlogN)
- C. 最差时间复杂度O(N²)
- D. 划分函数中"从右往左查找"与"从左往右查找"顺序可交换

---

12. 归并排序merge函数，横线处应填？

```cpp
void merge(vector<int> &nums, int left, int mid, int right) {
    vector<int> tmp(right - left + 1);
    int i = left, j = mid + 1, k = 0;
    while (i <= mid && j <= right) {
        if (nums[i] <= nums[j]) tmp[k++] = nums[i++];
        else tmp[k++] = nums[j++];
    }
    while (i <= mid) { tmp[k++] = nums[i++]; }
    while (________) { // 横线处
        tmp[k++] = nums[j++];
    }
    for (k = 0; k < tmp.size(); k++) {
        nums[left + k] = tmp[k];
    }
}
```

{{ select(12) }}

- A. i < mid
- B. j < right
- C. i <= mid
- D. j <= right

---

13. 电影院最多安排不重叠电影，横线处应填？

```cpp
int maxMovies(vector<vector<int>>& movies) {
    if (movies.empty()) return 0;
    sort(movies.begin(), movies.end(), [](const vector<int>& a, const vector<int>& b) { ______ });
    int count = 1; int lastEnd = movies[0][1];
    for (int i = 1; i < movies.size(); i++) {
        if (movies[i][0] >= lastEnd) {
            count++;
            ______ = movies[i][1];
        }
    }
    return count;
}
```

{{ select(13) }}

- A. a[0] < b[0] 和 lastEnd
- B. a[1] < b[1] 和 lastEnd
- C. a[0] < b[0] 和 movies[i][0]
- D. a[1] < b[1] 和 movies[i][0]

---

14. 分治求最大子数组和，说法错误的是？

{{ select(14) }}

- A. 采用分治算法
- B. 采用贪心算法
- C. 时间复杂度O(NlogN)
- D. 采用递归方式

---

15. 数组表示的整数+1，横线处应填？

```cpp
vector<int> plusOne(vector<int>& digits) {
    for (int i = (int)digits.size() - 1; i >= 0; --i) {
        if (digits[i] < 9) {
            digits[i] += 1;
            return digits;
        }
        ___; // 横线处
    }
    digits.insert(digits.begin(), 1);
    return digits;
}
```

{{ select(15) }}

- A. digits[i] = 0;
- B. digits[i] = 9;
- C. digits[i] = 1;
- D. digits[i] = 10;

---

## 二、判断题（每题2分，共20分）

16. 基于函数isDivisibleBy9和isDigitSumDivisibleBy9，可验算"一个数能被9整除则各位数字之和能被9整除"。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 假设gcd()正确，findMusicalPattern(4,6)返回2。( )

```cpp
int findMusicalPattern(int rhythm1, int rhythm2) {
    int commonDivisor = gcd(rhythm1, rhythm2);
    int patternLength = (rhythm1*rhythm2)/commonDivisor;
    return patternLength;
}
```

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 递归实现的斐波那契数列时间复杂度为O(2ⁿ)。( )

```cpp
long long fib_memo(int n, long long memo[]) {
    if (n <=1) return n;
    if (memo[n] !=-1) return memo[n];
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo);
    return memo[n];
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 链表通过指针实现高效增删，但访问效率低、占用内存多，对缓存不友好。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 二分查找依赖数据有序性，通过缩减一半区间查找，仅适用于数组或基于数组的结构。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 线性筛的关键是"每个合数仅被最小质因子筛一次"，时间复杂度O(N)。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 快速排序和归并排序都是稳定的排序算法。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 分治算法求解汉诺塔，时间复杂度O(NlogN)。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 所有递归算法都可以转换为迭代算法。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 贪心算法总能得到全局最优解。( )

{{ select(25) }}

- A. 正确
- B. 错误
