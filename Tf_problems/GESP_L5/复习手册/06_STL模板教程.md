# GESP C++ 五级 STL 标准模板库教程

> **适用对象**：GESP C++ 五级考生
> **编译器标准**：C++11
> **目标**：掌握考试中常用的 STL 容器和算法

---

## 目录

1. [vector 动态数组](#一vector-动态数组)
2. [map 映射容器](#二map-映射容器)
3. [pair 与 make_pair](#三pair-与-make_pair)
4. [sort 排序算法](#四sort-排序算法)
5. [stable_sort 稳定排序](#五stable_sort-稳定排序)
6. [lower_bound/upper_bound 二分查找](#六lower_boundupper_bound-二分查找)
7. [其他常用 STL](#七其他常用-stl)
8. [综合应用示例](#八综合应用示例)

---

## 一、vector 动态数组

### 1.1 基本概念

`vector` 是动态数组，可以在运行时自动扩容。

```cpp
#include <vector>
using namespace std;

int main() {
    // 1. 创建空 vector
    vector<int> v1;              // 空 vector
    vector<int> v2(10);          // 10 个元素，初始值为 0
    vector<int> v3(10, -1);      // 10 个元素，初始值为 -1
    vector<int> v4 = {1, 2, 3};  // 初始化列表（C++11）
    vector<int> v5(v4);           // 复制构造
    
    return 0;
}
```

### 1.2 常用操作

```cpp
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v;
    
    // 添加元素
    v.push_back(10);  // 尾部添加：v = {10}
    v.push_back(20);  // 尾部添加：v = {10, 20}
    v.push_back(30);  // 尾部添加：v = {10, 20, 30}
    
    // 访问元素
    cout << v[0] << endl;      // 下标访问：10
    cout << v.front() << endl; // 首元素：10
    cout << v.back() << endl;  // 尾元素：30
    
    // 获取大小
    cout << v.size() << endl;      // 3
    cout << v.empty() << endl;     // false (0)
    
    // 删除元素
    v.pop_back();  // 删除尾元素：v = {10, 20}
    
    // 清空
    v.clear();     // v = {}
    
    return 0;
}
```

### 1.3 遍历方式

```cpp
vector<int> v = {1, 2, 3, 4, 5};

// 方式1：下标遍历
for (size_t i = 0; i < v.size(); i++) {
    cout << v[i] << " ";
}
cout << endl;

// 方式2：迭代器遍历
for (vector<int>::iterator it = v.begin(); it != v.end(); it++) {
    cout << *it << " ";
}
cout << endl;

// 方式3：范围 for 循环（C++11）
for (int x : v) {
    cout << x << " ";
}
cout << endl;

// 方式4：反向遍历
for (vector<int>::reverse_iterator it = v.rbegin(); it != v.rend(); it++) {
    cout << *it << " ";
}
cout << endl;
```

### 1.4 重要技巧

```cpp
vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};

// 排序
sort(v.begin(), v.end());  // v = {1, 1, 2, 3, 4, 5, 6, 9}

// 去重（需先排序）
v.erase(unique(v.begin(), v.end()), v.end());  // v = {1, 2, 3, 4, 5, 6, 9}

// 查找
int target = 5;
vector<int>::iterator it = find(v.begin(), v.end(), target);
if (it != v.end()) {
    cout << "找到 " << target << "，位置：" << it - v.begin() << endl;
} else {
    cout << "未找到 " << target << endl;
}

// 统计
int cnt = count(v.begin(), v.end(), 1);  // 统计 1 出现的次数
```

### 1.5 二维 vector

```cpp
// 创建 3x4 的二维矩阵
vector<vector<int> > matrix(3, vector<int>(4, 0));

// 赋值
matrix[0][0] = 1;
matrix[1][2] = 5;

// 遍历
for (size_t i = 0; i < matrix.size(); i++) {
    for (size_t j = 0; j < matrix[i].size(); j++) {
        cout << matrix[i][j] << " ";
    }
    cout << endl;
}
```

### 1.6 vector 作为函数参数

```cpp
// 方式1：传引用（推荐，避免拷贝）
void func1(vector<int>& v) {
    v.push_back(100);
}

// 方式2：传 const 引用（只读）
void func2(const vector<int>& v) {
    // v.push_back(100);  // 错误！只读
    int sum = 0;
    for (size_t i = 0; i < v.size(); i++) {
        sum += v[i];
    }
}

// 方式3：传指针（C 风格，不推荐）
void func3(vector<int>* v) {
    if (v) {
        v->push_back(100);
    }
}
```

---

## 二、map 映射容器

### 2.1 基本概念

`map` 是关联容器，按 key 排序存储 key-value 对。

```cpp
#include <map>
using namespace std;

int main() {
    // 创建空 map
    map<string, int> scores;
    
    // 添加元素
    scores["张三"] = 90;
    scores["李四"] = 85;
    scores["王五"] = 92;
    
    // 访问元素
    cout << scores["张三"] << endl;  // 90
    
    // 遍历
    for (map<string, int>::iterator it = scores.begin(); it != scores.end(); it++) {
        cout << it->first << ": " << it->second << endl;
    }
    
    return 0;
}
```

### 2.2 常用操作

```cpp
map<int, string> m;

// 添加/修改
m[1] = "一";
m[2] = "二";
m[3] = "三";

// 查找
if (m.count(2)) {          // 检查 key 是否存在
    cout << "2 存在，值为 " << m[2] << endl;
}

// 方式2：find（推荐，不会插入新元素）
map<int, string>::iterator it = m.find(2);
if (it != m.end()) {
    cout << "找到：" << it->first << " -> " << it->second << endl;
}

// 删除
m.erase(2);        // 按 key 删除
m.erase(it);       // 按迭代器删除

// 获取元素数量
cout << m.size() << endl;

// 清空
m.clear();
```

### 2.3 map 遍历的高级方式

```cpp
map<string, int> scores = {{"张三", 90}, {"李四", 85}, {"王五", 92}};

// 方式1：迭代器遍历（按 key 升序）
for (map<string, int>::iterator it = scores.begin(); it != scores.end(); it++) {
    cout << it->first << " -> " << it->second << endl;
}

// 方式2：范围 for 循环（C++11）
for (auto& p : scores) {
    cout << p.first << " -> " << p.second << endl;
}

// 方式3：只遍历 value
for (auto& p : scores) {
    cout << p.second << " ";
}
cout << endl;

// 方式4：反向遍历
for (map<string, int>::reverse_iterator it = scores.rbegin(); 
     it != scores.rend(); it++) {
    cout << it->first << " -> " << it->second << endl;
}
```

### 2.4 multimap（可重复 key）

```cpp
#include <map>
using namespace std;

int main() {
    multimap<string, int> scores;  // key 可重复
    
    scores.insert(make_pair("张三", 90));
    scores.insert(make_pair("张三", 85));  // 另一个 85
    scores.insert(make_pair("李四", 92));
    
    // 遍历（相同 key 的会相邻）
    for (auto& p : scores) {
        cout << p.first << ": " << p.second << endl;
    }
    
    // 查找范围
    pair<multimap<string, int>::iterator, 
         multimap<string, int>::iterator> range = 
         scores.equal_range("张三");
    
    for (auto it = range.first; it != range.second; it++) {
        cout << "张三的分数：" << it->second << endl;
    }
    
    return 0;
}
```

### 2.5 unordered_map（哈希表）

```cpp
#include <unordered_map>
using namespace std;

int main() {
    unordered_map<string, int> hash;
    
    hash["apple"] = 1;
    hash["banana"] = 2;
    hash["orange"] = 3;
    
    // 查找
    if (hash.find("banana") != hash.end()) {
        cout << "banana 存在" << endl;
    }
    
    // 注意：unordered_map 不保证顺序
    // unordered_map 的 key 访问顺序不确定
    
    return 0;
}
```

**map vs unordered_map**：

| 特性 | map | unordered_map |
|------|-----|---------------|
| 顺序 | 按 key 排序 | 无序 |
| 查找复杂度 | O(logN) | O(1) 平均 |
| 适用场景 | 需要有序遍历 | 需要快速查找 |
| 内存 | 较小 | 较大（哈希表） |

---

## 三、pair 与 make_pair

### 3.1 pair 的基本使用

```cpp
#include <utility>
#include <iostream>
using namespace std;

int main() {
    // 创建 pair
    pair<int, string> p1;              // 默认构造
    pair<int, string> p2(1, "一");     // 直接初始化
    pair<int, string> p3 = p2;         // 复制构造
    pair<int, string> p4 = make_pair(2, "二");  // 使用 make_pair
    
    // 访问元素
    cout << p1.first << ", " << p1.second << endl;   // 访问第一个、第二个元素
    p1.first = 10;
    p1.second = "十";
    
    // 比较（按 first 升序，再按 second 升序）
    pair<int, string> a = make_pair(1, "a");
    pair<int, string> b = make_pair(1, "b");
    pair<int, string> c = make_pair(2, "a");
    
    // 交换
    a.swap(b);  // 交换两个 pair
    
    return 0;
}
```

### 3.2 pair 在排序中的应用

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

// 学生结构体转 pair
struct Student {
    string name;
    int score;
    int math;
};

int main() {
    vector<Student> students = {
        {"张三", 180, 90},
        {"李四", 175, 85},
        {"王五", 182, 92}
    };
    
    // 创建 pair 向量用于排序
    vector<pair<int, int> > v;  // {总分, 索引}
    for (size_t i = 0; i < students.size(); i++) {
        int total = students[i].score;
        v.push_back(make_pair(total, (int)i));
    }
    
    // 按总分降序排序
    sort(v.begin(), v.end(), [](const pair<int, int>& a, 
                                  const pair<int, int>& b) {
        return a.first > b.first;  // 降序
    });
    
    // 输出排序结果
    for (size_t i = 0; i < v.size(); i++) {
        int idx = v[i].second;
        cout << students[idx].name << ": " << v[i].first << endl;
    }
    
    return 0;
}
```

### 3.3 pair 在贪心中的应用

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

struct Task {
    int deadline;
    int reward;
};

bool rewardCmp(const Task& a, const Task& b) {
    return a.reward > b.reward;  // 奖励降序
}

int main() {
    vector<Task> tasks = {{4, 70}, {2, 60}, {4, 50}, {3, 40}};
    
    // 使用 pair 存储 {奖励, 截止时间}
    vector<pair<int, int> > taskPairs;
    for (size_t i = 0; i < tasks.size(); i++) {
        taskPairs.push_back(make_pair(tasks[i].reward, tasks[i].deadline));
    }
    
    // 按奖励降序排序
    sort(taskPairs.begin(), taskPairs.end(), 
         [](const pair<int, int>& a, const pair<int, int>& b) {
             return a.first > b.first;
         });
    
    // 倒序填坑
    int n = 7;  // 总时间段数
    vector<bool> used(n + 1, false);
    int total = 0;
    
    for (size_t i = 0; i < taskPairs.size(); i++) {
        int reward = taskPairs[i].first;
        int deadline = taskPairs[i].second;
        
        for (int d = min(deadline, n); d >= 1; d--) {
            if (!used[d]) {
                used[d] = true;
                total += reward;
                break;
            }
        }
    }
    
    cout << "最大奖励：" << total << endl;
    
    return 0;
}
```

---

## 四、sort 排序算法

### 4.1 基本使用

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3};
    
    // 升序排序（默认）
    sort(v.begin(), v.end());  // v = {1, 2, 3, 5, 8, 9}
    
    // 降序排序
    sort(v.begin(), v.end(), greater<int>());  // v = {9, 8, 5, 3, 2, 1}
    
    // 自定义比较函数（降序）
    bool descCmp(int a, int b) {
        return a > b;
    }
    sort(v.begin(), v.end(), descCmp);  // v = {9, 8, 5, 3, 2, 1}
    
    return 0;
}
```

### 4.2 多关键字排序

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

struct Student {
    string name;
    int total;      // 总分
    int cm;         // 语文+数学
    int max_cm;     // 最高分
};

bool multiKeyCmp(const Student& a, const Student& b) {
    // 规则1：总分降序
    if (a.total != b.total) return a.total > b.total;
    // 规则2：语文+数学降序
    if (a.cm != b.cm) return a.cm > b.cm;
    // 规则3：最高分降序
    return a.max_cm > b.max_cm;
}

int main() {
    vector<Student> students = {
        {"张三", 430, 280, 150},
        {"李四", 420, 290, 150},
        {"王五", 430, 270, 160},
        {"赵六", 410, 280, 150}
    };
    
    // 多关键字排序
    sort(students.begin(), students.end(), multiKeyCmp);
    
    // 输出结果
    for (size_t i = 0; i < students.size(); i++) {
        cout << students[i].name << ": " 
             << students[i].total << endl;
    }
    
    return 0;
}
```

### 4.3 lambda 表达式排序（C++11）

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3};
    
    // 升序
    sort(v.begin(), v.end(), [](int a, int b) {
        return a < b;
    });
    
    // 降序
    sort(v.begin(), v.end(), [](int a, int b) {
        return a > b;
    });
    
    // 复杂排序：先按奇偶，再按大小
    vector<int> v2 = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    sort(v2.begin(), v2.end(), [](int a, int b) {
        // 偶数在前，奇数在后
        if ((a % 2) != (b % 2)) {
            return (a % 2 == 0);
        }
        // 同奇偶时，按大小排序
        return a < b;
    });
    // 结果：2, 4, 6, 8, 1, 3, 5, 7, 9
    
    return 0;
}
```

### 4.4 部分排序

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3, 7, 4, 6};
    
    // 获取前 3 名（部分排序）
    partial_sort(v.begin(), v.begin() + 3, v.end(), greater<int>());
    // v.begin() 到 v.begin()+3 是最大的 3 个：9, 8, 7
    // 其余元素无序
    
    // nth_element：使第 n 小的元素在正确位置
    vector<int> v2 = {5, 2, 8, 1, 9, 3, 7, 4, 6};
    nth_element(v2.begin(), v2.begin() + 4, v2.end());
    // v2[4] 是第 5 小的元素（即中位数）
    
    return 0;
}
```

### 4.5 排序稳定性说明

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    vector<Student> v = {
        {"张三", 90},
        {"李四", 85},
        {"王五", 90},  // 同分
        {"赵六", 85}   // 同分
    };
    
    // stable_sort 保持相等元素的相对顺序
    stable_sort(v.begin(), v.end(), [](const Student& a, const Student& b) {
        return a.score > b.score;  // 按分数降序
    });
    
    // 输出：
    // 张三: 90
    // 王五: 90  （李四在前，王五也在前）
    // 李四: 85
    // 赵六: 85  （赵六在最后）
    
    return 0;
}
```

**sort vs stable_sort**：

| 函数 | 稳定性 | 时间复杂度 | 适用场景 |
|------|--------|-----------|---------|
| sort | 不稳定 | O(NlogN) | 一般排序 |
| stable_sort | 稳定 | O(NlogN) | 需要保持相等元素顺序 |

---

## 五、stable_sort 稳定排序

### 5.1 基本使用

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

struct Item {
    string name;
    int priority;
    int id;  // 原始顺序标记
};

int main() {
    vector<Item> items = {
        {"A", 1, 1},
        {"B", 2, 2},
        {"C", 2, 3},  // 同 priority
        {"D", 1, 4}
    };
    
    // 使用 stable_sort 按 priority 排序
    stable_sort(items.begin(), items.end(), 
                [](const Item& a, const Item& b) {
                    return a.priority > b.priority;  // 降序
                });
    
    // 输出：
    // B: 2 (id=2)
    // C: 2 (id=3)  ← 注意：C 保持原始相对顺序，在 B 之后
    // A: 1 (id=1)
    // D: 1 (id=4)
    
    for (size_t i = 0; i < items.size(); i++) {
        cout << items[i].name << ": " << items[i].priority 
             << " (id=" << items[i].id << ")" << endl;
    }
    
    return 0;
}
```

### 5.2 排名并列处理

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

struct Student {
    string name;
    int total;
};

bool scoreCmp(const Student& a, const Student& b) {
    return a.total > b.total;  // 总分降序
}

int main() {
    vector<Student> students = {
        {"张三", 180},
        {"李四", 175},
        {"王五", 180},  // 与张三同分
        {"赵六", 170}
    };
    
    stable_sort(students.begin(), students.end(), scoreCmp);
    
    // 生成排名（并列排名）
    vector<int> ranks(students.size());
    for (size_t i = 0; i < students.size(); i++) {
        if (i == 0) {
            ranks[i] = 1;
        } else {
            if (students[i].total == students[i-1].total) {
                ranks[i] = ranks[i-1];  // 并列
            } else {
                ranks[i] = i + 1;
            }
        }
    }
    
    // 输出排名
    for (size_t i = 0; i < students.size(); i++) {
        cout << students[i].name << ": " 
             << students[i].total << " → 排名" << ranks[i] << endl;
    }
    
    return 0;
}
```

---

## 六、lower_bound/upper_bound 二分查找

### 6.1 lower_bound（第一个 >= x）

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 3, 5, 7, 9, 11, 13, 15};
    
    // lower_bound：第一个 >= 5 的位置
    vector<int>::iterator it = lower_bound(v.begin(), v.end(), 5);
    int pos = it - v.begin();  // pos = 2 (v[2] = 5)
    
    // 如果不存在，返回 end()
    it = lower_bound(v.begin(), v.end(), 6);
    if (it == v.end()) {
        cout << "没有 >= 6 的元素" << endl;
    } else {
        cout << "第一个 >= 6 的是 " << *it << endl;  // 7
    }
    
    return 0;
}
```

### 6.2 upper_bound（第一个 > x）

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 3, 5, 5, 5, 7, 9};
    
    // upper_bound：第一个 > 5 的位置
    vector<int>::iterator it = upper_bound(v.begin(), v.end(), 5);
    int pos = it - v.begin();  // pos = 3 (v[3] = 7)
    
    // 查找等于 5 的范围
    pair<vector<int>::iterator, vector<int>::iterator> range;
    range = equal_range(v.begin(), v.end(), 5);
    
    // range.first 指向第一个 5
    // range.second 指向第一个 > 5
    cout << "5 出现的范围：" << (range.first - v.begin()) 
         << " ~ " << (range.second - v.begin() - 1) << endl;
    
    return 0;
}
```

### 6.3 二分查找应用

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> scores = {60, 70, 80, 85, 90, 95, 100};
    
    // 查找分数 >= 85 的第一个位置
    int target = 85;
    vector<int>::iterator it = lower_bound(scores.begin(), scores.end(), target);
    
    if (it != scores.end() && *it == target) {
        cout << "找到 " << target << "，位置：" << (it - scores.begin()) << endl;
    } else {
        cout << "未找到 " << target << endl;
    }
    
    // 统计 >= 85 的学生人数
    int count = scores.end() - lower_bound(scores.begin(), scores.end(), 85);
    cout << ">= 85 的人数：" << count << endl;
    
    // 统计 > 85 的学生人数
    count = scores.end() - upper_bound(scores.begin(), scores.end(), 85);
    cout << "> 85 的人数：" << count << endl;
    
    return 0;
}
```

### 6.4 自定义比较的二分查找

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    vector<Student> students = {
        {"张三", 90},
        {"李四", 85},
        {"王五", 92},
        {"赵六", 88}
    };
    
    // 按分数升序排序
    sort(students.begin(), students.end(), 
         [](const Student& a, const Student& b) {
             return a.score < b.score;
         });
    
    // 查找分数 >= 90 的第一个学生
    Student target = {"", 90};
    vector<Student>::iterator it = lower_bound(
        students.begin(), students.end(), target,
        [](const Student& a, const Student& b) {
            return a.score < b.score;
        }
    );
    
    if (it != students.end()) {
        cout << "第一个 >= 90 的是：" << it->name << endl;
    }
    
    return 0;
}
```

---

## 七、其他常用 STL

### 7.1 find 查找

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 3, 5, 7, 9, 11};
    
    // 查找元素
    vector<int>::iterator it = find(v.begin(), v.end(), 7);
    if (it != v.end()) {
        cout << "找到 7，位置：" << (it - v.begin()) << endl;
    }
    
    // 查找条件
    vector<int>::iterator it2 = find_if(v.begin(), v.end(), [](int x) {
        return x > 8;  // 第一个 > 8 的元素
    });
    cout << "第一个 > 8 的元素：" << *it2 << endl;
    
    return 0;
}
```

### 7.2 count 计数

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 2, 3, 1, 2, 1, 4, 5};
    
    // 统计元素出现次数
    int cnt1 = count(v.begin(), v.end(), 1);  // 3 次
    int cnt2 = count(v.begin(), v.end(), 2);  // 2 次
    
    // 统计满足条件的元素个数
    int cntOdd = count_if(v.begin(), v.end(), [](int x) {
        return x % 2 == 1;  // 奇数个数
    });
    
    cout << "1 出现 " << cnt1 << " 次" << endl;
    cout << "奇数有 " << cntOdd << " 个" << endl;
    
    return 0;
}
```

### 7.3 accumulate 求和

```cpp
#include <numeric>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 2, 3, 4, 5};
    
    // 求和
    int sum = accumulate(v.begin(), v.end(), 0);  // 15
    cout << "和：" << sum << endl;
    
    // 乘积
    int product = accumulate(v.begin(), v.end(), 1, [](int a, int b) {
        return a * b;
    });  // 120
    cout << "乘积：" << product << endl;
    
    return 0;
}
```

### 7.4 max/min/abs

```cpp
#include <algorithm>
#include <iostream>
using namespace std;

int main() {
    int a = 5, b = 3;
    
    // 最大值
    int mx = max(a, b);           // 5
    int mxv = max({1, 2, 3, 4});  // 4（C++11）
    
    // 最小值
    int mn = min(a, b);           // 3
    int mnv = min({1, 2, 3, 4}); // 1（C++11）
    
    // 绝对值
    int x = -10;
    int absx = abs(x);            // 10
    long long y = -100LL;
    long long abs_y = llabs(y);  // 100
    
    // 交换
    swap(a, b);  // a=3, b=5
    
    cout << "max=" << mx << " min=" << mn << endl;
    
    return 0;
}
```

### 7.5 reverse 逆序

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 2, 3, 4, 5};
    
    // 逆序
    reverse(v.begin(), v.end());  // v = {5, 4, 3, 2, 1}
    
    // 复制到另一个容器
    vector<int> v2(v.size());
    reverse_copy(v.begin(), v.end(), v2.begin());
    
    return 0;
}
```

### 7.6 unique 去重

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v = {1, 1, 2, 2, 2, 3, 3, 3, 3};
    
    // 去重前必须先排序
    sort(v.begin(), v.end());  // v = {1, 1, 2, 2, 2, 3, 3, 3, 3}
    
    // unique 返回去重后的新 end 位置
    vector<int>::iterator newEnd = unique(v.begin(), v.end());
    v.erase(newEnd, v.end());   // v = {1, 2, 3}
    
    return 0;
}
```

### 7.7 copy 复制

```cpp
#include <algorithm>
#include <vector>
#include <iostream>
using namespace std;

int main() {
    vector<int> v1 = {1, 2, 3, 4, 5};
    vector<int> v2(v1.size());
    
    // 复制
    copy(v1.begin(), v1.end(), v2.begin());
    
    // 输出
    for (size_t i = 0; i < v2.size(); i++) {
        cout << v2[i] << " ";
    }
    cout << endl;
    
    // 选择性复制（复制偶数）
    vector<int> v3;
    copy_if(v1.begin(), v1.end(), back_inserter(v3), [](int x) {
        return x % 2 == 0;
    });
    // v3 = {2, 4}
    
    return 0;
}
```

---

## 八、综合应用示例

### 8.1 成绩排名系统

```cpp
#include <vector>
#include <algorithm>
#include <map>
#include <iostream>
using namespace std;

struct Student {
    int id;           // 学号
    int chinese;      // 语文
    int math;         // 数学
    int english;      // 英语
};

int main() {
    vector<Student> students = {
        {1, 85, 90, 88},
        {2, 92, 88, 90},
        {3, 78, 85, 82},
        {4, 90, 92, 89},
        {5, 88, 85, 90}
    };
    
    // 计算总分和最高单科
    struct Result {
        int id;
        int total;
        int cm;      // 语文+数学
        int max_cm;  // 单科最高分
    };
    
    vector<Result> results;
    for (size_t i = 0; i < students.size(); i++) {
        const Student& s = students[i];
        int total = s.chinese + s.math + s.english;
        int cm = s.chinese + s.math;
        int max_cm = max(s.chinese, max(s.math, s.english));
        results.push_back({s.id, total, cm, max_cm});
    }
    
    // 多关键字排序：总分 → 语文+数学 → 单科最高
    sort(results.begin(), results.end(), 
         [](const Result& a, const Result& b) {
             if (a.total != b.total) return a.total > b.total;
             if (a.cm != b.cm) return a.cm > b.cm;
             return a.max_cm > b.max_cm;
         });
    
    // 生成排名
    vector<int> rank(students.size());
    for (size_t i = 0; i < results.size(); i++) {
        if (i == 0) {
            rank[i] = 1;
        } else {
            if (results[i].total == results[i-1].total &&
                results[i].cm == results[i-1].cm &&
                results[i].max_cm == results[i-1].max_cm) {
                rank[i] = rank[i-1];  // 并列
            } else {
                rank[i] = i + 1;
            }
        }
    }
    
    // 输出排名表
    cout << "排名\t学号\t总分\t语文+数学\t最高分" << endl;
    for (size_t i = 0; i < results.size(); i++) {
        cout << rank[i] << "\t" 
             << results[i].id << "\t"
             << results[i].total << "\t"
             << results[i].cm << "\t\t"
             << results[i].max_cm << endl;
    }
    
    return 0;
}
```

### 8.2 任务调度系统（贪心）

```cpp
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

struct Task {
    int deadline;  // 截止时间
    int reward;    // 奖励
};

bool rewardCmp(const Task& a, const Task& b) {
    return a.reward > b.reward;  // 奖励降序
}

int main() {
    int n = 7;  // 7 个时间段
    
    vector<Task> tasks = {
        {4, 70},   // 任务1：截止第4天，奖励70
        {2, 60},   // 任务2：截止第2天，奖励60
        {4, 50},   // 任务3：截止第4天，奖励50
        {3, 40},   // 任务4：截止第3天，奖励40
        {1, 30},   // 任务5：截止第1天，奖励30
        {4, 20},   // 任务6：截止第4天，奖励20
        {6, 10}    // 任务7：截止第6天，奖励10
    };
    
    // 按奖励降序排序
    sort(tasks.begin(), tasks.end(), rewardCmp);
    
    // 倒序填坑：优先完成奖励高的任务
    vector<bool> used(n + 1, false);
    int totalReward = 0;
    
    for (size_t i = 0; i < tasks.size(); i++) {
        int deadline = tasks[i].deadline;
        // 从截止日期往前找空位
        for (int d = min(deadline, n); d >= 1; d--) {
            if (!used[d]) {
                used[d] = true;
                totalReward += tasks[i].reward;
                break;
            }
        }
    }
    
    cout << "最大奖励：" << totalReward << endl;
    
    // 输出调度结果
    cout << "\n调度安排：" << endl;
    for (int day = 1; day <= n; day++) {
        cout << "第 " << day << " 天：";
        // 查找该天的任务
        for (size_t i = 0; i < tasks.size(); i++) {
            // 模拟查找（实际需要额外数据结构）
        }
        cout << endl;
    }
    
    return 0;
}
```

### 8.3 分数统计系统

```cpp
#include <vector>
#include <algorithm>
#include <map>
#include <iostream>
using namespace std;

int main() {
    vector<int> scores = {85, 90, 78, 92, 88, 85, 90, 76, 95, 82};
    
    // 1. 排序
    vector<int> sorted = scores;
    sort(sorted.begin(), sorted.end());  // 升序
    
    // 2. 统计
    int sum = accumulate(scores.begin(), scores.end(), 0);
    int count = scores.size();
    double avg = (double)sum / count;
    
    // 3. 查找
    int minScore = *min_element(scores.begin(), scores.end());
    int maxScore = *max_element(scores.begin(), scores.end());
    
    // 4. 分数区间统计
    map<string, int> ranges;
    for (size_t i = 0; i < scores.size(); i++) {
        int s = scores[i];
        if (s >= 90) ranges["优秀(>=90)"]++;
        else if (s >= 80) ranges["良好(80-89)"]++;
        else if (s >= 70) ranges["中等(70-79)"]++;
        else ranges["及格(<70)"]++;
    }
    
    // 输出结果
    cout << "=== 成绩统计 ===" << endl;
    cout << "人数：" << count << endl;
    cout << "总分：" << sum << endl;
    cout << "平均分：" << avg << endl;
    cout << "最低分：" << minScore << endl;
    cout << "最高分：" << maxScore << endl;
    
    cout << "\n=== 分数段统计 ===" << endl;
    for (map<string, int>::iterator it = ranges.begin(); 
         it != ranges.end(); it++) {
        cout << it->first << "：" << it->second << " 人" << endl;
    }
    
    // 5. 及格人数
    int passCount = count_if(scores.begin(), scores.end(), [](int x) {
        return x >= 60;
    });
    cout << "\n及格人数：" << passCount << endl;
    
    return 0;
}
```

---

## 附录：常用 STL 速查表

### 容器

| 容器 | 头文件 | 特点 |
|------|--------|------|
| vector | `<vector>` | 动态数组，随机访问 O(1) |
| map | `<map>` | 有序映射，查找 O(logN) |
| set | `<set>` | 有序集合，不重复 |
| unordered_map | `<unordered_map>` | 哈希表，查找 O(1) |
| queue | `<queue>` | 先进先出 |
| stack | `<stack>` | 后进先出 |
| priority_queue | `<queue>` | 优先队列 |

### 算法

| 算法 | 功能 | 时间复杂度 |
|------|------|-----------|
| sort | 排序 | O(NlogN) |
| stable_sort | 稳定排序 | O(NlogN) |
| lower_bound | 二分查找 | O(logN) |
| upper_bound | 二分查找 | O(logN) |
| find | 查找 | O(N) |
| count | 计数 | O(N) |
| reverse | 逆序 | O(N) |
| unique | 去重 | O(N) |

### 实用函数

| 函数 | 功能 |
|------|------|
| accumulate | 求和 |
| max/min | 最大/最小值 |
| abs/llabs | 绝对值 |
| swap | 交换 |
| fill | 填充 |
| swap | 交换 |

---

> **学习建议**：
> 1. 多动手练习，尝试用不同 STL 解决同一问题
> 2. 理解容器的时间复杂度，选择合适的容器
> 3. 注意迭代器的使用边界（begin/end）
> 4. C++11 特性（auto、lambda、范围 for）可以简化代码
