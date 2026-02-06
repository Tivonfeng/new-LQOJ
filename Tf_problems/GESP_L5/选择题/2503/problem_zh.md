# 2025年3月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 链表不具备的特点是？

{{ select(1) }}

- A. 可随机访问任意元素
- B. 插入删除不移动元素
- C. 无需预估存储空间
- D. 存储空间与元素个数成正比

---

2. 双向链表删除节点p（前后均非空），错误的操作是？

{{ select(2) }}

- A. p->next->prev = p->next; p->prev->next = p->prev; delete p;
- B. p->prev->next = p->next; p->next->prev = p->prev; delete p;
- C. p->next->prev = p->prev; p->next->prev->next = p->next; delete p;
- D. p->prev->next = p->next; p->prev->next->prev = p->prev; delete p;

---

3. 双向循环链表初始化空链表，横线处应填？

```cpp
template <typename T>
struct ListNode {
    T data;
    ListNode* prev;
    ListNode* next;
    ListNode(const T& val = T()) : data(val), prev(nullptr), next(nullptr) {}
};

struct LinkedList {
    ListNode<T>* head;
    ListNode<T>* tail;
};

void InitLinkedList(LinkedList* list) {
    list->head = new ListNode<T>;
    list->tail = new ListNode<T>;
    ___; // 横线处
}
```

{{ select(3) }}

- A. list->head->prev = list->head; list->tail->prev = list->head;
- B. list->head->next = list->tail; list->tail->prev = list->head;
- C. list->head->next = list->tail; list->tail->next = list->head;
- D. list->head->next = list->tail; list->tail->next = nullptr;

---

4. gcd(84,60)的第二步计算的数是？

{{ select(4) }}

- A. 84和60
- B. 60和24
- C. 24和12
- D. 12和0

---

5. 唯一分解正确的是？

{{ select(5) }}

- A. 18=3×6
- B. 28=4×7
- C. 36=2×3×6
- D. 30=2×3×5

---

6. 线性筛代码，横线处应填？

```cpp
vector<int> sieve_linear(int n) {
    vector<bool> is_prime(n+1, true);
    vector<int> primes;
    if (n<2) return primes;
    is_prime[0] = is_prime[1] = false;
    for (int i=2; i<=n/2; i++) {
        if (is_prime[i]) primes.push_back(i);
        for (int j=0, ___; j++) {
            is_prime[i*primes[j]] = false;
            if (i%primes[j] ==0) break;
        }
    }
    for (int i=n/2+1; i<=n; i++)
        if (is_prime[i]) primes.push_back(i);
    return primes;
}
```

{{ select(6) }}

- A. j<primes.size()
- B. i*primes[j] <=n
- C. j<primes.size()&&i*primes[j]<=n
- D. j<=n

---

7. 递归调用层数过多引发错误的原因是？

{{ select(7) }}

- A. 栈空间溢出
- B. 堆空间溢出
- C. 队列空间溢出
- D. 链表空间溢出

---

8. 关于factorialA和factorialB的说法错误的是？

```cpp
int factorialA(int n) {
    if (n <=1) return 1;
    return n * factorialA(n-1);
}

int factorialB(int n) {
    if (n <=1) return 1;
    int res=1;
    for (int i=2; i<=n; i++) res *=i;
    return res;
}
```

{{ select(8) }}

- A. 功能相同
- B. 时间复杂度均O(N)
- C. factorialA是递归方式
- D. factorialB是递归方式

---

9. 不稳定的排序是？

{{ select(9) }}

- A. 选择排序
- B. 插入排序
- C. 归并排序
- D. 冒泡排序

---

10. 快速排序partition函数，横线处应填？

```cpp
int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low -1;
    for (int j=low; j<high; j++) {
        ___; // 横线处
    }
    swap(arr[i+1], arr[high]);
    return i+1;
}
```

{{ select(10) }}

- A. if (arr[j]>pivot) { i++; swap(arr[i], arr[j]); }
- B. if (arr[j]<pivot) { i++; swap(arr[i], arr[j]); }
- C. if (arr[j]<pivot) { swap(arr[i], arr[j]); i++; }
- D. if (arr[j]==pivot) { i++; swap(arr[i], arr[j]); }

---

11. 二分法在[1,100]内猜数，最多需要猜多少次？

{{ select(11) }}

- A. 100
- B. 10
- C. 7
- D. 5

---

12. 二分查找mid计算，最佳代码是？

```cpp
int binarySearch(int arr[], int left, int right, int target) {
    while (left <= right) {
        ___; // 横线处
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid+1;
        else right = mid-1;
    }
    return -1;
}
```

{{ select(12) }}

- A. int mid = left + (right-left)/2;
- B. int mid = left;
- C. int mid = (left+right)/2;
- D. int mid = right;

---

13. 贪心算法的核心特征是？

{{ select(13) }}

- A. 总是选择当前最优解
- B. 回溯尝试所有可能
- C. 分阶段解决子问题
- D. 总能找到最优解

---

14. 分治思想求数组最大值，正确代码是？

{{ select(14) }}

- A. if (low==high) return arr[low]; int mid=(low+high)/2; return arr[mid];
- B. if (low>=high) return arr[low]; int mid=(low+high)/2; int leftMax=findMax(arr,low,mid-1); int rightMax=findMax(arr,mid,high); return leftMax+rightMax;
- C. if (low>high) return 0; int mid=(low+high)/2; int leftMax=findMax(arr,low,mid); int rightMax=findMax(arr,mid+1,high); return leftMax*rightMax;
- D. if (low==high) return arr[low]; int mid=(low+high)/2; int leftMax=findMax(arr,low,mid); int rightMax=findMax(arr,mid+1,high); return leftMax>rightMax ? leftMax : rightMax;

---

15. 高精度乘法处理进位，横线处应填？

```cpp
vector<int> multiply(vector<int>& a, vector<int>& b) {
    int m=a.size(), n=b.size();
    vector<int> c(m+n, 0);
    for (int i=0; i<m; i++)
        for (int j=0; j<n; j++)
            c[i+j] += a[i]*b[j];
    int carry=0;
    for (int k=0; k<c.size(); k++) {
        ___; // 横线处
        c[k] = temp%10;
        carry = temp/10;
    }
    while (c.size()>1 && c.back()==0) c.pop_back();
    return c;
}
```

{{ select(15) }}

- A. int temp = c[k];
- B. int temp = c[k] + carry;
- C. int temp = c[k] - carry;
- D. int temp = c[k] * carry;

---

## 二、判断题（每题2分，共20分）

16. 单链表删除非尾节点p（未知头节点），可拷贝p->next数据并删除p->next。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 链表存储要求内存地址连续。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 线性筛效率高于埃氏筛。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 贪心算法的当前最优解必为全局最优解。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 递归函数必须有终止条件。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 快速排序时间复杂度与输入是否有序无关，始终O(NlogN)。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 归并排序时间复杂度与输入是否有序无关，始终O(NlogN)。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 二分查找适用于有序和无序数组。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 100元买最多商品，选最便宜的，体现分治思想。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 归并排序体现分治思想。( )

{{ select(25) }}

- A. 正确
- B. 错误
