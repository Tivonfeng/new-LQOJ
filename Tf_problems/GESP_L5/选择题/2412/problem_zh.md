# 2024年12月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 关于链表和数组的描述，错误的是？

{{ select(1) }}

- A. 数据量不确定时链表更省空间
- B. 链表访问节点效率O(N)
- C. 链表插入删除效率低
- D. 链表节点内存分散

---

2. 循环单链表最后一个节点的next指针指向？

{{ select(2) }}

- A. 当前节点
- B. nullptr
- C. 第一个节点
- D. 上一个节点

---

3. 虚拟头节点删除链表元素，横线处应填？

```cpp
void removeElements(LinkedNode* head, int val) {
    if (head == nullptr) return;
    LinkedNode* dummyHead = new LinkedNode(0);
    ___; // 横线处
    while (cur->next != nullptr) {
        if (cur->next->val == val) {
            LinkedNode* tmp = cur->next;
            cur->next = cur->next->next;
            delete tmp;
        } else {
            cur = cur->next;
        }
    }
    head = dummyHead->next;
    delete dummyHead;
}
```

{{ select(3) }}

- A. dummyHead->next = head; cur = dummyHead;
- B. dummyHead->next = head->next; cur = dummyHead;
- C. dummyHead->next = head; cur = dummyHead->next;
- D. dummyHead->next = head->next; cur = dummyHead->next;

---

4. 关于fibA和fibB的说法错误的是？

```cpp
int fibA(int n) {
    if (n <=1) return n;
    int f1=0, f2=1;
    for (int i=2; i<=n; i++) {
        int temp = f2;
        f2 = f1 + f2;
        f1 = temp;
    }
    return f2;
}

int fibB(int n) {
    if (n <=1) return n;
    return fibB(n-1) + fibB(n-2);
}
```

{{ select(4) }}

- A. 功能相同
- B. fibA是递推方式
- C. fibB是递归方式
- D. fibA时间复杂度O(N)，fibB O(N²)

---

5. gcd(24,36)的调用顺序是？

```cpp
int gcd(int a, int b) {
    int big = a>b ? a:b;
    int small = a<b ? a:b;
    if (big%small ==0) return small;
    return gcd(small, big%small);
}
```

{{ select(5) }}

- A. gcd(24,36)→gcd(24,12)→gcd(12,0)
- B. gcd(24,36)→gcd(12,24)→gcd(0,12)
- C. gcd(24,36)→gcd(24,12)
- D. gcd(24,36)→gcd(12,24)

---

6. 唯一分解定理求质因子，横线处应填？

```cpp
vector<int> get_prime_factors(int n) {
    vector<int> factors;
    if (n<=1) { cout<<"输入需大于1"<<endl; return factors; }
    while (n%2 ==0) { factors.push_back(2); n/=2; }
    ___; // 横线处
    while (n%i ==0) { factors.push_back(i); n/=i; }
    if (n>2) factors.push_back(n);
    return factors;
}
```

{{ select(6) }}

- A. for (int i=3;i<=n;i++)
- B. for (int i=3;i*i<=n;i++)
- C. for (int i=3;i<=n;i+=2)
- D. for (int i=3;i*i<=n;i+=2)

---

7. 埃氏筛代码的正确说法是？

{{ select(7) }}

- A. 时间复杂度O(N√N)
- B. 从i*i开始标记，减少重复
- C. 输出所有小于等于n的奇数
- D. sieve_Eratosthenes(10)返回[2,3,5,7,9]

---

8. 线性筛代码的正确说法是？

{{ select(8) }}

- A. 时间复杂度O(N)
- B. 每个合数被所有质因子标记
- C. 与埃氏筛思路完全相同
- D. 以上都不对

---

9. 关于快速排序的正确说法是？

{{ select(9) }}

- A. 递归求解子问题
- B. 最坏时间复杂度O(NlogN)
- C. 稳定排序
- D. 最优时间复杂度O(N)

---

10. 关于归并排序的正确描述是？

{{ select(10) }}

- A. 不稳定排序
- B. 最优、最差、平均时间复杂度均O(NlogN)
- C. 额外空间O(1)
- D. 输入{12,11,13,5,6,7}输出{7,6,5,13,12,11}

---

11. 关于二分查找函数的描述不正确的是？

```cpp
int binarySearch(vector<int>& nums, int target, int left, int right) {
    if (left > right) return -1;
    int middle = left + (right-left)/2;
    if (nums[middle] == target) return middle;
    else if (nums[middle] < target)
        return binarySearch(nums, target, middle+1, right);
    else
        return binarySearch(nums, target, left, middle-1);
}
```

{{ select(11) }}

- A. 每次排除一半搜索区间
- B. 递归求解，规模减半
- C. 无target时递归不终止
- D. 时间复杂度O(logN)

---

12. 查找target左边界，横线处应填？

```cpp
int getLeftBoundary(vector<int>& nums, int target) {
    int left=0, right=nums.size()-1;
    while (left < right) {
        int middle = left + (right-left)/2;
        if (target <= nums[middle])
            ___; // 横线处
        else
            left = middle+1;
    }
    return nums[left]==target ? left : -1;
}
```

{{ select(12) }}

- A. right = middle-1
- B. right = middle
- C. right = middle+1
- D. 以上都不对

---

13. 贪心算法分饼干，横线处应填？

```cpp
int cookie4children(vector<int>& g, vector<int>& s) {
    sort(g.begin(), g.end());
    sort(s.begin(), s.end());
    int index = s.size()-1, result=0;
    for (int i=g.size()-1; i>=0; i--) {
        if (index >=0 && s[index] >= g[i]) {
            ___; // 横线处
        }
    }
    return result;
}
```

{{ select(13) }}

- A. result++; index--;
- B. result--; index--;
- C. result--; index++;
- D. result++; index++;

---

14. 关于分治算法的不正确说法是？

{{ select(14) }}

- A. 分解子问题、解决后合并
- B. 归并排序采用分治
- C. 快速排序采用分治
- D. 冒泡排序采用分治

---

15. 关于高精度减法函数的正确说法是？

{{ select(15) }}

- A. a<b时返回负数
- B. 输入数字正序存储（如500存储为{5,0,0}）
- C. 时间复杂度O(a.size()+b.size())
- D. 结果为0时仍有多个元素

---

## 二、判断题（每题2分，共20分）

16. 单链表只支持在表头插入和删除。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 线性筛每个合数仅被最小质因子筛一次，效率更高。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 大于1的自然数可分解为若干不同质数的乘积，且唯一。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 贪心算法的局部最优解必为全局最优解。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 递归算法必须有终止条件，否则可能栈溢出。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 快速排序和归并排序平均时间复杂度均O(NlogN)，且都是稳定排序。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 快速排序时间复杂度总比插入排序低。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 二分查找仅适用于数组，不适用于链表。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 二分查找19（数组{5,13,19,21,37,56,64,75,88,92,100}）的比较次数是2。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 递归比迭代更耗费内存空间。( )

{{ select(25) }}

- A. 正确
- B. 错误
