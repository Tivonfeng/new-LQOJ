# 2025年6月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 与数组相比，链表效率更高的操作是？

{{ select(1) }}

- A. 随机访问
- B. 查找指定元素
- C. 已知位置插入/删除
- D. 遍历所有元素

---

2. 双向链表is_empty()不能填写的是？

```cpp
struct DoubleLink {
    Node* head;
    Node* tail;
    int size;
    bool is_empty() const {
        ___; // 横线处
    }
}
```

{{ select(2) }}

- A. return head == nullptr;
- B. return tail == nullptr;
- C. return head.data == 0;
- D. return size == 0;

---

3. 双向链表尾部添加节点，横线处应填？

```cpp
void append(int data) {
    Node* newNode = new Node{data, nullptr, nullptr};
    if (is_empty()) {
        head = tail = newNode;
    } else {
        ___; // 横线处
    }
    ++size;
}
```

{{ select(3) }}

- A. tail->next = newNode;
- B. newNode->prev = tail; tail = newNode;
- C. tail = newNode; newNode->prev = tail; tail->next = newNode;
- D. tail->next = newNode; newNode->prev = tail; tail = newNode;

---

4. 循环链表解决约瑟夫问题，横线处应填？

```cpp
int findLastSurvival(int n, int k) {
    Node* head = createCircularList(n);
    Node* p = head; Node* prev = nullptr;
    while (p->next != p) {
        for (int count=1; count<k; count++) {
            prev = p;
            p = p->next;
        }
        ___; // 横线处
    }
    cout << p->data << endl;
    delete p;
    return 0;
}
```

{{ select(4) }}

- A. prev->next = p->next; delete p; p = prev->next;
- B. prev->next = p->next; delete p; p = prev->next;
- C. p = prev->next; delete p; prev->next = p->next;
- D. prev->next = p->next; p = prev->next; delete p;

---

5. 关于is_prime函数的正确说法是？

```cpp
bool is_prime(int n) {
    if (n <=1) return false;
    if (n==2||n==3||n==5) return true;
    if (n%2==0||n%3==0||n%5==0) return false;
    int i=7, step=4;
    int finish_number = sqrt(n)+1;
    while (i <= finish_number) {
        if (n%i ==0) return false;
        i += step;
        step = 6 - step;
    }
    return true;
}
```

{{ select(5) }}

- A. 5会返回false
- B. finish_number应为n/2
- C. 依赖大于3的质数符合6k±1
- D. 与for循环i从2到finish_number效果相同

---

6. 关于gcd0和gcd1的说法错误的是？

```cpp
int gcd0(int big, int small) {
    if (big < small) swap(big, small);
    if (big%small ==0) return small;
    return gcd0(small, big%small);
}

int gcd1(int big, int small) {
    if (big < small) swap(big, small);
    for (int i=small; i>=1; i--)
        if (big%i==0 && small%i==0) return i;
    return 1;
}
```

{{ select(6) }}

- A. gcd0时间复杂度O(logN)
- B. gcd1时间复杂度O(N)
- C. gcd0效率更高
- D. gcd1的循环应改为i>1

---

7. 关于is_prime函数的错误说法是？

```cpp
bool is_prime(int n) {
    if (n <=1) return false;
    int finish_number = sqrt(n)+1;
    for (int i=2; i<finish_number; i++)
        if (n%i ==0) return false;
    return true;
}
```

{{ select(7) }}

- A. 埃氏筛效率更高
- B. 线性筛效率更高
- C. 筛选连续质数时重复计算多
- D. 埃氏筛比线性筛效率高

---

8. 唯一分解定理描述的是？

{{ select(8) }}

- A. 任何正整数可表示为两个素数之和
- B. 大于1的合数可唯一分解为质数乘积
- C. 最大公约数=最小公倍数/两数乘积
- D. 所有素数都是奇数

---

9. 求最大值算法的错误说法是？

```cpp
int find_max_recursive(const vector<int>& nums, int left, int right) {
    if (left == right) return nums[left];
    int mid = (left+right)/2;
    int leftMax = find_max_recursive(nums, left, mid);
    int rightMax = find_max_recursive(nums, mid+1, right);
    return max(leftMax, rightMax);
}
```

{{ select(9) }}

- A. 分治算法
- B. 递归实现
- C. 贪心算法
- D. 非递推算法

---

10. 迭代求最大值的错误说法是？

```cpp
int find_max(const vector<int>& nums) {
    if (nums.empty()) throw invalid_argument("空数组");
    int max_val = nums[0];
    for (int num : nums)
        if (num > max_val) max_val = num;
    return max_val;
}
```

{{ select(10) }}

- A. 迭代算法
- B. 时间复杂度O(N)
- C. 无栈开销
- D. 与递归版空间复杂度相同

---

11. 二分查找最后一个target的正确说法是？

```cpp
int binary_search_last_occurrence(const vector<int>& lst, int target) {
    if (lst.empty()) return -1;
    int low=0, high=lst.size()-1;
    while (low < high) {
        int mid = (low+high+1)/2;
        if (lst[mid] <= target) low=mid;
        else high=mid-1;
    }
    return lst[low]==target ? low : -1;
}
```

{{ select(11) }}

- A. 重复target时返回最后一个
- B. target小于所有元素返回0
- C. 循环条件改为low<=high更准确
- D. mid计算改为(low+high)/2效果相同

---

12. 关于sqrt_binary的错误说法是？

{{ select(12) }}

- A. 阶段1找完全平方根
- B. 阶段2找小数平方根
- C. check_int处理浮点误差
- D. 阶段2循环条件导致死循环

---

13. 硬币找零代码的正确说法是？

{{ select(13) }}

- A. 贪心算法
- B. 总能找到最优解
- C. 枚举算法
- D. 分治算法

---

14. 关于快速排序的错误说法是？

{{ select(14) }}

- A. i记录大于基准值的边界
- B. 随机基准避免最坏情况
- C. 平均时间复杂度O(NlogN)
- D. 稳定排序

---

15. 高精度除法横线处应填？

```cpp
pair<BigInt, BigInt> div(BigInt a, BigInt b) {
    // 省略前导逻辑
    for (int i=a.len - b.len; i>=0; i--) {
        if (r.len>1 || r.d[0]!=0) {
            for (int j=r.len; j>0; j--)
                r.d[j] = r.d[j-1];
            ___; // 横线处
        } else {
            r.d[0] = a.d[i];
            r.len=1;
        }
        // 计算商逻辑
    }
    // 省略后续逻辑
}
```

{{ select(15) }}

- A. r.d[0] = a.d[i]; r.len++;
- B. r.d[i] = a.d[i]; r.len++;
- C. r.d[i] = a.d[i]; r.len=1;
- D. r.d[0] = a.d[i]; r.len=1;

---

## 二、判断题（每题2分，共20分）

16. 欧几里得算法适用于a大于或小于b。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. lcm(a,b)=a*b/gcd(a,b)能正确求最小公倍数。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 代码能输出质因数列表（如8:[2,2,2]）。( )

```cpp
int main() {
    int n,m; cin>>n>>m;
    if(n>m) swap(n,m);
    map<int, vector<int>> prime_factor;
    for(int i=n; i<=m; i++) {
        int j=2, k=i;
        while(k!=1) {
            if(k%j==0) {
                prime_factor[i].push_back(j);
                k/=j;
            } else j++;
        }
    }
    // 输出逻辑
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 归并排序merge函数仅被调用一次。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 归并排序的最好、最坏、平均时间复杂度均O(NlogN)。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 查字典按"中间页排除一半"属于二分查找。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. Dijkstra算法是贪心算法。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 分治算法效率通常比直接求解低。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 调用puzzle(7)会无限递归。( )

```cpp
int puzzle(int n) {
    if (n==1) return 1;
    if (n%2==0) return puzzle(n/2);
    else return puzzle(3*n+1);
}
```

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 线性筛时间复杂度O(N)。( )

{{ select(25) }}

- A. 正确
- B. 错误
