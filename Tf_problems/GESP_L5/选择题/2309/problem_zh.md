# 2023年9月 C++五级考试真题

## 一、单选题（每题2分，共30分）

1. 近年来线上授课常用的手写板属于哪类设备？

{{ select(1) }}

- A. 输入
- B. 输出
- C. 控制
- D. 记录

---

2. 若a、b为int类型（b≠0），能正确判断"a是b的3倍"的表达式是？

{{ select(2) }}

- A. (a > 3=b)
- B. (a-b)%3==0
- C. (a/b=3)
- D. (a==3*b)

---

3. 变量a（double）、b（int），表达式`a=6, b=3*(7+8)/2, b+=a`的计算结果为？

{{ select(3) }}

- A. 6
- B. 21
- C. 28
- D. 不确定

---

4. 以下代码用于求1到N之和，说法错误的是？

```cpp
#include<iostream>
using namespace std;

int sumA(int n){
    int sum=0;
    for(int i=1;i<n+1;i++)
        sum+=i;
    return sum;
}

int sumB(int n){
    if(n==1)
        return 1;
    else
        return n + sumB(n-1);
}

int main(){
    int n=0; cin >>n;
    cout << sumA(n) << " " << sumB(n) << endl;
    return 0;
}
```

{{ select(4) }}

- A. sumA()循环实现，sumB()递归实现
- B. 输入1000可正常计算
- C. 输入100000可正常计算
- D. sumA()效率高于sumB()

---

5. 递归实现字符串反序，横线处应填代码？

```cpp
#include <iostream>
#include<string>
using namespace std;

string sReverse(string sIn){
    if(sIn.length()<=1){
        return sIn;
    }else{
        return ___; // 横线处
    }
}

int main(){
    string sIn; cin>>sIn;
    cout << sReverse(sIn)<<endl;
    return 0;
}
```

{{ select(5) }}

- A. sIn[sIn.length()-1] + sReverse(sIn.substr(0, sIn.length()-1));
- B. sIn[0] + sReverse(sIn.substr(1, sIn.length()-1));
- C. sReverse(sIn.substr(0, sIn.length()-1)) + sIn[sIn.length()-1];
- D. sReverse(sIn.substr(1, sIn.length()-1)) + sIn[sIn.length()-1];

---

6. 递归实现汉诺塔，横线处应填代码？

```cpp
#include<iostream>
using namespace std;

// 将N个圆盘从A通过B移动到C
void Hanoi(string A,string B,string C,int N){
    if(N==1){
        cout << A << "->" << C << endl;
    } else {
        Hanoi(A, C, B, N-1);
        cout << A << "->" << C << endl;
        ___; // 横线处
    }
}

int main(){
    Hanoi("甲","乙","丙",3);
    return 0;
}
```

{{ select(6) }}

- A. Hanoi(B, C, A, N-2)
- B. Hanoi(B, A, C, N-1)
- C. Hanoi(A, B, C, N-2)
- D. Hanoi(C, B, A, N-1)

---

7. 排序向量并筛选奇数，两个横线处应填？

```cpp
#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;

bool isOdd(int N){ return N%2==1; }

bool compare(int a, int b) {
    if (a%2==0 && b%2==1)
        return true;
    return false;
}

int main(){
    vector<int> lstA;
    for(int i=1;i<100; i++)
        lstA.push_back(i);
    // 按比较函数排序
    sort(lstA.begin(), lstA.end(), ___); // 代码1

    vector<int> lstB;
    for(int i=0;i<lstA.size();i++){
        if(___) // 代码2
            lstB.push_back(lstA[i]);
    }
    // 输出部分省略
    return 0;
}
```

{{ select(7) }}

- A. compare 和 isOdd(lstA[i])
- B. compare(x1,y1) 和 isOdd
- C. compare 和 isOdd
- D. compare(x1,y1) 和 isOdd(lstA[i])

---

8. 以下函数指针作为参数的代码，正确的是？

```cpp
#include<iostream>
using namespace std;

bool isEven(int N){ return N%2==0; }

bool checkNum(bool(*Fx)(int),int N){
    return Fx(N);
}

int main(){
    cout << checkNum(isEven,10) << endl;
    return 0;
}
```

{{ select(8) }}

- A. checkNum()定义错误
- B. 传入isEven会导致错误
- C. 执行后输出1
- D. 运行时触发异常

---

9. 以下代码正确的是？

```cpp
#include<iostream>
using namespace std;

bool isOdd(int N){ return N%2==1; }
int Square(int N){ return N*N; }

bool checkNum(bool(*Fx)(int),int x) { return Fx(x); }

int main(){
    cout << checkNum(isOdd,10) << endl; // 输出行A
    cout << checkNum(Square,10) << endl; // 输出行B
    return 0;
}
```

{{ select(9) }}

- A. checkNum()定义错误
- B. 输出行A编译错误
- C. 输出行B编译错误
- D. 无编译错误

---

10. 以下代码执行后的输出是？

```cpp
#include<iostream>
using namespace std;

int jumpFloor(int N){
    cout << N << "#";
    if(N==1 || N==2){
        return N;
    }else{
        return jumpFloor(N-1) + jumpFloor(N-2);
    }
}

int main(){
    cout << jumpFloor(4) << endl;
    return 0;
}
```

{{ select(10) }}

- A. 4#3#2#2#4
- B. 4#3#2#2#1#5
- C. 4#3#2#1#2#4
- D. 4#3#2#1#2#5

---

11. isPrimeA和isPrimeB判断素数，时间复杂度说法正确的是？

```cpp
#include<iostream>
#include<cmath>
using namespace std;

bool isPrimeA(int N){
    if(N<2) return false;
    for(int i=2;i<N;i++)
        if(N%i==0) return false;
    return true;
}

bool isPrimeB(int N){
    if(N<2) return false;
    int endNum=int(sqrt(N));
    for(int i=2;i<=endNum;i++)
        if(N%i==0) return false;
    return true;
}
```

{{ select(11) }}

- A. isPrimeA() O(N)，isPrimeB() O(logN)，B更优
- B. isPrimeA() O(N)，isPrimeB() O(√N)，B更优
- C. isPrimeA() O(√N)，isPrimeB() O(N)，A更优
- D. isPrimeA() O(logN)，isPrimeB() O(N)，A更优

---

12. 归并排序中merge()函数被调用次数为？

```cpp
#include<iostream>
using namespace std;

void mergeSort(int* listData,int start,int end);
void merge(int* listData, int start,int middle,int end);

void mergeSort(int* listData, int start, int end) {
    if(start>=end) return;
    int middle=(start+end)/2;
    mergeSort(listData, start, middle);
    mergeSort(listData, middle+1, end);
    merge(listData, start, middle, end);
}

void merge(int* listData, int start,int middle,int end) {
    // 合并逻辑省略
}

int main(){
    int lstA[]={1,3,2,7,11,5,3};
    int size=sizeof(lstA)/sizeof(lstA[0]);
    mergeSort(lstA,0,size-1);
    return 0;
}
```

{{ select(12) }}

- A. 3
- B. 1
- C. 6
- D. 7

---

13. 归并排序的mergeSort调用涉及的算法是？

{{ select(13) }}

- A. 搜索算法
- B. 分治算法
- C. 贪心算法
- D. 递推算法

---

14. 归并排序的基本思想是？

{{ select(14) }}

- A. 将数组分成两个子数组，分别排序后合并
- B. 随机选枢轴划分数组
- C. 从末尾开始与前一个元素比较交换
- D. 比较相邻元素，顺序错误则交换

---

15. 以下链表代码构成哪种链表？

```cpp
#include<iostream>
using namespace std;

class Node {
public:
    int Value;
    Node* Next;
    Node(int Val, Node* Nxt=nullptr) {
        Value=Val;
        Next=Nxt;
    }
};

int main(){
    Node* firstNode = new Node(10);
    firstNode->Next = new Node(100);
    firstNode->Next->Next = new Node(111, firstNode);
    return 0;
}
```

{{ select(15) }}

- A. 单向链表
- B. 双向链表
- C. 循环链表
- D. 指针链表

---

## 二、判断题（每题2分，共20分）

16. TCP/IP传输层的两个协议是UDP和TCP。( )

{{ select(16) }}

- A. 正确
- B. 错误

---

17. 特殊情况下流程图中可以出现三角框和圆形框。( )

{{ select(17) }}

- A. 正确
- B. 错误

---

18. 找N以内质数的埃氏筛法比线性筛法效率更高。( )

{{ select(18) }}

- A. 正确
- B. 错误

---

19. C++中可以用二分法查找链表中的元素。( )

{{ select(19) }}

- A. 正确
- B. 错误

---

20. 恰当实现可将链表首尾相接形成循环链表。( )

{{ select(20) }}

- A. 正确
- B. 错误

---

21. 贪心算法的解可能不是最优解。( )

{{ select(21) }}

- A. 正确
- B. 错误

---

22. 冒泡排序算法优于归并排序。( )

{{ select(22) }}

- A. 正确
- B. 错误

---

23. C++的qsort库函数是不稳定排序。( )

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 质数判定和筛法目的不同：判定判断单个数字，筛法筛选范围内所有质数。( )

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 以下代码执行后输出0 5 1 6 2 3 4。( )

```cpp
#include<iostream>
#include<algorithm>
using namespace std;

bool compareModulo5(int a,int b){
    return a%5 < b%5;
}

int main(){
    int lst[7];
    for(int i=0;i<7;i++) lst[i]=i;
    sort(lst, lst+7, compareModulo5);
    for(int i=0;i<7;i++) cout << lst[i] << " ";
    cout << endl;
    return 0;
}
```

{{ select(25) }}

- A. 正确
- B. 错误
