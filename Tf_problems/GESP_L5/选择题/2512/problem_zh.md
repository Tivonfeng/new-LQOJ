# 2025年12月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 循环单链表遍历输出，横线处应填？

```cpp
struct Node {
    int data; Node* next;
    Node(int d) : data(d), next(nullptr) {}
};

Node* createList(int value) {
    Node* head = new Node(value);
    head->next = head;
    return head;
}

void printList(Node* head) {
    if (head == nullptr) return;
    Node* p = head;
    ___; // 横线处
    cout << endl;
}
```

{{ select(1) }}

- A. while(p!=nullptr){ cout<<p->data<<" "; p=p->next; }
- B. while(p->next!=nullptr){ cout<<p->data<<" "; p=p->next; }
- C. do{ cout<<p->data<<" "; p=p->next; }while(p!=head);
- D. for(;p;p=p->next){ cout<<p->data<<" "; }

---

2. 区块链插入新区块，横线处应填？

```cpp
struct Block {
    int index; string data; Block* prev;
    Block(int idx, const string& d, Block* p): index(idx), data(d), prev(p) {}
};

struct Blockchain {
    Block* tail;
    void init() { tail = new Block(0, "Genesis Block", nullptr); }
    void addBlock(const string& data) {
        ___; // 横线处
    }
};
```

{{ select(2) }}

- A. Block* newBlock = new Block(tail->index+1, data, tail); tail = newBlock->prev;
- B. Block* newBlock = new Block(tail->index+1, data, tail); tail = newBlock;
- C. Block* newBlock = new Block(tail->index+1, data, tail->prev); tail = newBlock;
- D. Block* newBlock = new Block(tail->index+1, data, tail->prev); tail = newBlock->prev;

---

3. 单链表和双链表删除指定节点的时间复杂度说法正确的是？

{{ select(3) }}

- A. 双链表O(1)，单链表O(1)
- B. 双链表O(N)，单链表O(1)
- C. 双链表O(1)，单链表O(N)
- D. 双链表O(N)，单链表O(N)

---

4. a=38和b=14对模m同余（a≡b mod m），下列哪个m不可能？

{{ select(4) }}

- A. 3
- B. 4
- C. 6
- D. 9

---

5. 关于欧几里得算法gcd1和gcd2的说法错误的是？

```cpp
int gcd1(int a, int b) { return b==0 ? a : gcd1(b, a%b); }

int gcd2(int a, int b) {
    while(b!=0) {
        int temp = b;
        b = a%b;
        a = temp;
    }
    return a;
}
```

{{ select(5) }}

- A. gcd1是递归实现
- B. gcd2是迭代实现
- C. 大数据时gcd1需较多辅助空间
- D. 大数据时gcd1执行效率更高

---

6. 唯一分解定理描述的内容是？

{{ select(6) }}

- A. 任何正整数可表示为两个素数之和
- B. 任何大于1的合数可唯一分解为有限个质数的乘积
- C. 最大公约数=最小公倍数/两数乘积
- D. 所有素数都是奇数

---

7. 线性筛代码，横线处应填？

```cpp
vector<int> linear_sieve(int n) {
    vector<bool> is_prime(n+1, true);
    vector<int> primes;
    is_prime[0] = is_prime[1] = 0;
    for (int i=2; i<=n; ++i) {
        if (is_prime[i]) primes.push_back(i);
        ___; // 横线处
        is_prime[i*primes[j]] = 0;
        if (i%primes[j] ==0) break;
    }
    return primes;
}
```

{{ select(7) }}

- A. for(int j=0;j<primes.size()&&i*primes[j]<=n;j++)
- B. for(int j=sqrt(n);j<=n&&i*primes[j]<=n;j++)
- C. for(int j=1;j<=sqrt(n);j++)
- D. for(int j=1;j<n&&i*primes[j]<=n;j++)

---

8. 关于排序的说法正确的是？

{{ select(8) }}

- A. 快速排序是稳定排序
- B. 归并排序通常是稳定的
- C. 插入排序是不稳定排序
- D. 冒泡排序不是原地排序

---

9. 关于归并排序的说法不正确的是？

{{ select(9) }}

- A. 平均时间复杂度O(NlogN)
- B. 需要O(N)额外空间
- C. 最坏时间复杂度O(N²)
- D. 适合大规模数据

---

10. 快速排序最坏情况的时间复杂度是？

{{ select(10) }}

- A. O(N)
- B. O(NlogN)
- C. O(N²)
- D. O(logN)

---

11. 查找第一个大于等于x的元素位置，代码逻辑正确的是？

```cpp
int lower_bound(vector<int>& arr, int x) {
    int l=0, r=arr.size();
    while(l<r) {
        int mid=l+(r-l)/2;
        if(arr[mid]>=x) r=mid;
        else l=mid+1;
    }
    return l;
}
```

{{ select(11) }}

- A. 逻辑正确
- B. 循环条件应改为l<=r
- C. mid计算错误
- D. 边界条件不对

---

12. 二分法找切割木头的最小x，横线处应填？

```cpp
bool check(int L,int K,int x) {
    int cuts=(L-1)/x;
    return cuts <= K;
}

int binary_cut(int L, int K) {
    int l=1, r=L;
    while(l<r) {
        int mid=l+(r-l)/2;
        ___; // 横线处
    }
    return l;
}
```

{{ select(12) }}

- A. if(check(L,K,mid)) r=mid; else l=mid+1;
- B. if(check(L,K,mid)) r=mid+1; else l=mid+1;
- C. if(check(L,K,mid)) r=mid+1; else l=mid-1;
- D. if(check(L,K,mid)) r=mid+1; else l=mid;

---

13. 阶乘计算的两种方式，说法正确的是？

{{ select(13) }}

- A. 时间复杂度均为O(N)
- B. 空间复杂度均为O(N)
- C. 空间复杂度均为O(1)
- D. factorial1时间复杂度O(2ⁿ)，factorial2为O(N)

---

14. 贪心算法安排任务求最大利润，横线处应填？

```cpp
struct Task { int deadline; int profit; };

void sortByProfit(vector<Task>& tasks) {
    sort(tasks.begin(), tasks.end(), [](const Task& a, const Task& b) {
        return a.profit > b.profit;
    });
}

int maxProfit(vector<Task>& tasks) {
    sortByProfit(tasks);
    int maxTime=0;
    for(auto& t:tasks) maxTime=max(maxTime, t.deadline);
    vector<bool> slot(maxTime+1, false);
    int totalProfit=0;
    for(auto& task:tasks) {
        for(int t=task.deadline;t>=1;t--) {
            if(!slot[t]) {
                ___; // 横线处
                break;
            }
        }
    }
    return totalProfit;
}
```

{{ select(14) }}

- A. slot[t] = true; totalProfit += task.profit;
- B. slot[t] = false; totalProfit += task.profit;
- C. slot[t] = true; totalProfit = task.profit;
- D. slot[t] = false; totalProfit = task.profit;

---

15. 高精度加法（数组低位在前），横线处应填？

```cpp
vector<int> add(vector<int> a, vector<int> b) {
    vector<int> c;
    int carry=0;
    for(int i=0;i<a.size()||i<b.size();i++) {
        if(i<a.size()) carry +=a[i];
        if(i<b.size()) carry +=b[i];
        ___; // 横线处
    }
    if(carry) c.push_back(carry);
    return c;
}
```

{{ select(15) }}

- A. c.push_back(carry/10); carry%=10;
- B. c.push_back(carry%10); carry/=10;
- C. c.push_back(carry%10);
- D. c.push_back(carry); carry/=10;

---

## 二、判断题（每题2分，共20分）

16. 数组和链表都是线性表，链表的优点是插入删除不移动元素，且能随机查找。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 假设gcd()正确，lcm(a,b)=a/gcd(a,b)*b能正确求最小公倍数。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 单链表中已知非尾节点p，可通过拷贝p->next数据并删除p->next实现删除p。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 求解不大于n的素数，线性筛应优先于埃氏筛，因线性筛时间复杂度O(N)更低。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 二分查找仅适用于有序数据，无序数据单次查找时排序再二分不划算。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 快速排序选择"首、中、尾"中间值作为基准，可降低最坏情况概率。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 贪心算法不回溯，分治算法分解子问题再合并。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. fib函数计算斐波那契数，时间复杂度O(2ⁿ)。( )

```cpp
int fib(int n) {
    if(n<=1) return n;
    return fib(n-1)+fib(n-2);
}
```

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 递归函数必须有终止条件，否则可能栈溢出。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 贪心算法的局部最优解必为全局最优解。( )

{{ select(25) }}

- A. 正确
- B. 错误
