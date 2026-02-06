# 2023年12月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 以下斐波那契数列代码说法错误的是？

```cpp
int fiboA(int N){
    if(N==1 || N==2)
        return 1;
    else
        return fiboA(N-1) + fiboA(N-2);
}

int fiboB(int N){
    if(N==1 || N==2)
        return 1;
    int last2=1, last1=1, nowVal=0;
    for(int i=2;i<N;i++){
        nowVal=last1 + last2;
        last2=last1;
        last1=nowVal;
    }
    return nowVal;
}
```

{{ select(1) }}

- A. fiboA递归，fiboB循环
- B. fiboA更符合数学定义，易理解
- C. fiboA代码量少且执行效率更高
- D. fiboB执行效率更高

---

2. 递归实现归并排序，横线处应填代码？

```cpp
void mergeSort(int SList[],int TList[],int s,int t,int len){
    if(s==t){
        TList[s] = SList[s];
        return;
    }
    int* T2=new int[len];
    int m=(s+t)/2;
    ___; // 横线处：两次mergeSort调用
    merge(T2, SList, s, m, t);
    delete T2;
    return;
}
```

{{ select(2) }}

- A. mergeSort(SList, T2, s, m, len)，mergeSort(SList, T2, m, t, len)
- B. mergeSort(SList, T2, s, m-1, len)，mergeSort(SList, T2, m+1, t, len)
- C. mergeSort(SList, T2, s, m, len)，mergeSort(SList, T2, m+1, t, len)
- D. mergeSort(SList, T2, s, m-1, len)，mergeSort(SList, T2, m-1, t, len)

---

3. 以下代码执行后的输出是？

```cpp
#include<iostream>
using namespace std;

int stepCount=0;

int fracA(int N){
    stepCount +=1;
    cout << stepCount << "->";
    int rtn=1;
    for(int i=1;i<=N;i++)
        rtn*=i;
    return rtn;
}

int fracB(int N){
    stepCount +=1;
    cout << stepCount << "->";
    if(N==1)
        return 1;
    return N * fracB(N-1);
}

int main(){
    cout << fracA(5) << "<===>";
    cout << fracB(5) << endl;
    return 0;
}
```

{{ select(3) }}

- A. 1->120<===>2->120
- B. 1->120<===>1->120
- C. 1->120<===>1->2->3->4->5->120
- D. 1->120<===>2->3->4->5->6->120

---

4. 排序数组使偶数在前奇数在后，横线处应填？

```cpp
bool isEven(int N){ return N%2==0; }

void swap(int &a,int &b){
    int t=a;a=b;b=t;
}

void sortA(int lstA[],int n){
    for(int i=n-1;i>0;i--)
        for(int j=0;j<i;j++)
            if(___) // 横线处
                swap(lstA[j], lstA[j+1]);
}
```

{{ select(4) }}

- A. !isEven(lstA[j]) && isEven(lstA[j+1])
- B. isEven(lstA[j]) && !isEven(lstA[j+1])
- C. lstA[j] > lstA[j+1]
- D. lstA[j] < lstA[j+1]

---

5. 双向链表插入重复字符串并移至链头，横线处应填？

```cpp
typedef struct Node{
    string str;
    int ref;
    struct Node *next,*prev;
}Node;

Node* Insert(Node *pHead, string s){
    Node *p = pHead->next;
    while(p){
        if(p->str == s){
            p->ref++;
            // 移除p并移至链头
            p->prev->next = p->next;
            if(p->next)
                p->next->prev = p->prev;
            ___; // 横线处：插入链头
            break;
        }
        p=p->next;
    }
    // 新节点创建逻辑省略
    return pHead;
}
```

{{ select(5) }}

- A. if(pHead) {p->next=pHead->next; pHead->next->prev=p;}
- B. if(pHead->next) {p->next=pHead->next; pHead->next->prev=p;}
- C. p->next=pHead->next; pHead->next->prev=p;
- D. 触发异常

---

6. 以下foo函数说法正确的是？

```cpp
int rc=0;

int foo(int x,int y){
    int r;
    if(y==0)
        r=x;
    else{
        r=foo(y, x%y);
        rc++;
    }
    return r;
}
```

{{ select(6) }}

- A. x<10时rc不超过20
- B. 可能无限递归
- C. 求x和y的最大公共质因子
- D. 求x和y的最小公倍数

---

7. 快速排序代码的返回语句应为？

```cpp
vector<int> operator+(vector<int> lA, vector<int> lB){
    vector<int> lst;
    for(int i=0;i<lA.size();i++)
        lst.push_back(lA[i]);
    for(int i=0;i<lB.size();i++)
        lst.push_back(lB[i]);
    return lst;
}

vector<int> qSort(vector<int> lst){
    if(lst.size()<2)
        return lst;
    int pivot=lst[0];
    vector<int> less, greater;
    for(int i=1;i<lst.size();i++){
        if(lst[i] <= pivot)
            less.push_back(lst[i]);
        else
            greater.push_back(lst[i]);
    }
    return ___; // 横线处
}
```

{{ select(7) }}

- A. qSort(less) + qSort(greater) + (vector<int>){pivot}
- B. (vector<int>){pivot} + qSort(less) + qSort(greater)
- C. qSort(less) + (vector<int>){pivot} + qSort(greater)
- D. qSort(less) + pivot + qSort(greater)

---

8. isPrimeA和isPrimeB的时间复杂度说法正确的是？

```cpp
bool isPrimeA(int N){
    if(N<2) return false;
    for(int i=2;i<=N/2;i++)
        if(N%i==0) return false;
    return true;
}

bool isPrimeB(int N){
    if(N<2) return false;
    for(int i=2;i<=sqrt(N);i++)
        if(N%i==0) return false;
    return true;
}
```

{{ select(8) }}

- A. 前者O(N/2)，后者O(√N)，前者更优
- B. 前者O(N/2)，后者O(√N)，后者更优
- C. 前者O(√N)，后者O(N/2)，前者更优
- D. 前者O(N)，后者O(√N)，前者更优

---

9. 二分查找代码说法错误的是？

```cpp
#include<vector>
using namespace std;

int binarySearch(vector<int> lst,int Low,int High,int Target){
    if(Low>High) return -1;
    int Mid=(Low+High)/2;
    if(Target==lst[Mid]) return Mid;
    else if(Target < lst[Mid])
        return binarySearch(lst, Low, Mid-1, Target);
    else
        return binarySearch(lst, Mid+1, High, Target);
}

int bSearch(vector<int> lst,int val){
    return binarySearch(lst, 0, lst.size()-1, val);
}
```

{{ select(9) }}

- A. 采用二分法
- B. 采用分治算法
- C. 采用递归方式
- D. 采用动态规划算法

---

10. 上述binarySearch算法的时间复杂度是？

{{ select(10) }}

- A. O(N)
- B. O(logN)
- C. O(NlogN)
- D. O(N²)

---

11. 数组模拟大整数加法，横线处应填？

```cpp
#include<vector>
using namespace std;

vector<int> operator+(vector<int> a, vector<int> b){
    vector<int> c;
    int t=0;
    for(int i=0;i<a.size() || i<b.size();i++){
        if(i<a.size()) t += a[i];
        if(i<b.size()) t += b[i];
        ___; // 横线处：处理当前位和进位
    }
    if(t) c.push_back(t);
    return c;
}
```

{{ select(11) }}

- A. c.push_back(t%10)，t=t%10
- B. c.push_back(t/10)，t=t%10
- C. c.push_back(t/10)，t=t/10
- D. c.push_back(t%10)，t=t/10

---

12. 以下代码构成哪种链表？

```cpp
class Node{
public:
    int Value;
    Node* Prev;
    Node* Next;
    Node(int Val, Node* Prv=nullptr, Node* Nxt=nullptr){
        Value=Val;
        Prev=Prv;
        Next=Nxt;
    }
};

int main(){
    Node firstNode=Node(10);
    firstNode.Next=new Node(100, &firstNode);
    firstNode.Next->Next=new Node(111, firstNode.Next);
    return 0;
}
```

{{ select(12) }}

- A. 单向链表
- B. 双向链表
- C. 循环链表
- D. 指针链表

---

13. 通讯卫星在通信网络中的作用是？

{{ select(13) }}

- A. 信息过滤
- B. 信号中继
- C. 避免攻击
- D. 数据加密

---

14. 判断N是否为素数，不合适的方法是？

{{ select(14) }}

- A. 埃氏筛法
- B. 线性筛法
- C. 二分答案
- D. 枚举法

---

15. 哪种排序算法不能保证下一趟选出最大/最小数据？

{{ select(15) }}

- A. 选择排序
- B. 快速排序
- C. 堆排序
- D. 冒泡排序

---

## 二、判断题（每题2分，共20分）

16. 归并排序的时间复杂度是O(NlogN)。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 分H*W巧克力给K个小朋友，求最大边长可用二分法。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 以下代码能递归实现斐波那契数列（第1、2项为1）。( )

```cpp
int Fibo(int N){
    if(N==1 || N==2)
        return 1;
    else{
        int m=fiboA(N-1);
        int n=fiboB(N-2);
        return m+n;
    }
}
```

{{ select(18) }}

- A. 正确
- B. 错误

---

19. 贪心算法可以达到局部最优，但可能不是全局最优解。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 可设计程序将非质数自然数分解为若干质数乘积。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 插入排序有时比快速排序时间复杂度更低。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 以下代码能将十进制N转换为八进制并输出。( )

```cpp
#include<iostream>
#include<string>
using namespace std;

int main(){
    int N; cin >> N;
    string rst="";
    while(N!=0){
        char s= N%8 + '0';
        rst = s + rst;
        N/=8;
    }
    cout << rst << endl;
    return 0;
}
```

{{ select(22) }}

- A. 正确
- B. 错误

---

23. 对数组int arr[]={2,6,3,5,4,8,1,0,9,10}执行sort后结果为{0,1,2,3,4,5,6,8,9,10}。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 统计N的因数可通过不超过N/2的循环实现。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 单链表和双向链表的简单冒泡排序复杂度相同。( )

{{ select(25) }}

- A. 正确
- B. 错误
