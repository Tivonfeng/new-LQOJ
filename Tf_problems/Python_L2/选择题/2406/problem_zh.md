# 2024年6月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 列表`fruit=['西瓜','菠萝','哈密瓜','葡萄']`，以下哪个选项可获取列表最后一个元素？

{{ select(1) }}

- A. fruit[len(fruit)]
- B. fruit[len(fruit)-1]
- C. fruit[len(fruit)+1]
- D. fruit[0]

---

2. 初唐四杰是王勃、杨炯、卢照邻、骆宾王，列表`names=['王勃','杨炯','白居易','卢照邻','骆宾王']`多了一位诗人，以下哪个选项可删除该诗人？

{{ select(2) }}

- A. names.pop()
- B. names.pop(1)
- C. names.pop(2)
- D. names.pop(3)

---

3. 执行以下语句，终端会打印什么内容？

```python
idiom='从善如流'
for i in idiom:
    print(i)
```

{{ select(3) }}

- A. 从善如流（4次重复打印）
- B. 从
  善
  如
  流（每行一个字符）
- C. 从善如（3行字符）
- D. 流
  如
  善
  从（反向每行一个字符）

---

4. 代码`my_tuple = (1, 2, 3, 4, 5)`，`print(my_tuple[::-2])`的输出是？

{{ select(4) }}

- A. (1,3,5)
- B. (1,2,3,4,5)
- C. (5,3,1)
- D. (5,4,3,2,1)

---

5. 代码`tuple =('q','i','n','g','d','a','o','1024')`，`print(max(tuple) + min(tuple))`的输出是？

{{ select(5) }}

- A. 1024q
- B. q1024
- C. q 1024
- D. 1024 q

---

6. 代码`for var in ______: print(var)`，哪个选项不符合空白处的语法要求？

{{ select(6) }}

- A. range(0,10)
- B. (1,2,3)
- C. a>5（表达式，非可迭代对象）
- D. "Wulaoshi"

---

7. 执行以下代码后，列表`ls`的元素个数是多少？

```python
ls=[1,2,3,['a','b']]
ls.append(5)
ls[3].append(6)
```

{{ select(7) }}

- A. 6
- B. 5
- C. 4
- D. 7

---

8. 已知`xs=(5,'女','北京大学')`，定义字符串`geshi`，执行`print(geshi % xs)`后输出"学号:000005 性别:女 学校名称:北京大学"，正确的`geshi`是？

{{ select(8) }}

- A. geshi='学号:%6d\t性别:%s\t学校名称:%s'
- B. geshi='学号:%06s\t性别:%s\t学校名称:%s'
- C. geshi='学号:%06d\t性别:%s\t学校名称:%s'
- D. geshi='学号:%6d\t性别:%d\t学校名称:%d'

---

9. 小圆想创建空列表`P`，正确的语句是？

{{ select(9) }}

- A. P=0（整数）
- B. P=()（元组）
- C. P=[]（空列表）
- D. P=*（语法错误）

---

10. 列表`ls1=[5,2,0,1,4,11,66,38]`，实现元素从大到小排序的操作是？

{{ select(10) }}

- A. ls1.sort()（默认升序）
- B. ls1.sort(reverse=True)（降序排序）
- C. sorted(ls1)（返回新列表，不修改原列表）
- D. ls1.reverse()（仅反转顺序，非排序）

---

11. 存储账号和密码的对应关系（一一对应），最佳数据结构是？

{{ select(11) }}

- A. 元组（不可变，无对应关系）
- B. 字典（键值对，适合映射关系）
- C. 列表（无映射关系）
- D. 字符串（无法存储键值对）

---

12. 假设`month={1:'Jan',2:'Feb',3:'Mar',...,12:'Dec'}`，`month[2]`的值是？

{{ select(12) }}

- A. 'Mar'
- B. 3:'Mar'
- C. 'Feb'
- D. 2:'Feb'

---

13. 执行以下代码，结果是？

```python
tp=('牢记历史','不忘过去','珍爱和平','开创未来')
tq='山河已无恙,吾辈当自强'
new=tp+tq
print(new)
print(len(new))
```

{{ select(13) }}

- A. 拼接成功
- B. 输出字典格式
- C. 输出元组格式
- D. 程序运行出错

---

14. 下列哪个程序不会陷入死循环？

{{ select(14) }}

- A. `false='false'; while false: print('死循环')`
- B. `while U: print('死循环')`
- C. `while 1<2: print('死循环')`
- D. `while 1: print('死循环')`

---

15. 以下代码绘制的图形是？

```python
import turtle as t
c=['red','yellow','blue','orange','green','pink']
t.left(180)
for i in range(6):
    t.fillcolor(c[i])
    t.begin_fill()
    for j in range(3):
        t.forward(200)
        t.left(120)
    t.end_fill()
    t.left(120)
t.hideturtle()
```

{{ select(15) }}

- A. 6个重叠三角形
- B. 6个围绕中心点的正三角形
- C. 1个六边形
- D. 6个分散三角形

---

16. 列表`fruits=['苹果','香蕉','樱桃']`，在"香蕉"和"樱桃"之间插入"桔子"，正确操作是？

{{ select(16) }}

- A. fruits.append('桔子')
- B. fruits.insert(1,'桔子')
- C. fruits.insert(2,'桔子')
- D. fruits.add('桔子')

---

17. 执行`print(list(range(1,5)))`的输出结果是？

{{ select(17) }}

- A. [1,2,3,4]
- B. [1,2,3,4,5]
- C. 1,2,3,4
- D. 1,2,3,4,5

---

18. 下列选项中，循环次数与其他不同的是？

{{ select(18) }}

- A. `for i in range(10): print(i)`（10次）
- B. `for i in range(10,0,-1): print(i)`（10次）
- C. `i=0; while (i<=10): print(i); i+=1`（11次）
- D. `i=10; while (i>0): print(i); i-=1`（10次）

---

19. 运行代码`s='抽刀断水水更流。'; print(s.replace('水','#'))`的输出是？

{{ select(19) }}

- A. 抽刀断水水更流。（未替换）
- B. 抽刀断##更流。（两个"水"替换为#）
- C. 抽刀断##更流。（同B）
- D. 抽刀断#水更流。（仅替换第一个"水"）

---

20. 运行代码：

```python
s=0
l=[1,2,3,4,5]
for i in l:
    if i==2: continue
    if i==4: break
    s+=i
print(s)
```

{{ select(20) }}

- A. 15
- B. 13
- C. 4
- D. 10

---

21. 将字符串`s='abc'`转换成列表类型，正确命令是？

{{ select(21) }}

- A. str(s)
- B. int(s)
- C. float(s)
- D. list(s)

---

22. 关于`sort()`和`sorted()`函数，说法错误的是？

{{ select(22) }}

- A. `sort()`在原列表排序，修改原列表
- B. `sorted()`在原列表排序，修改原列表
- C. `sorted()`生成新列表，不修改原列表
- D. `sort()`默认升序排序

---

23. 字典`dict1={'语文':90,'数学':95,'英语':98}`，修改数学成绩为97，正确操作是？

{{ select(23) }}

- A. dict1[1]=97
- B. dict1['数学']=97
- C. dict1[95]=97
- D. dict1[数学]=97

---

24. 字典`dict1={'姓名':'王小明','性别':'男','身高':'150cm','体重':'40kg'}`，执行`dict1['爱好']='篮球'`、`dict1['体重']='42kg'`、`del dict1['性别']`后，字典内容为？

{{ select(24) }}

- A. 包含'性别':'男'
- B. 包含'性别':'男'
- C. 格式错误
- D. {'姓名':'王小明','身高':'150cm','体重':'42kg','爱好':'篮球'}

---

25. 狗狗年龄转化程序：

```python
age=int(input("请输入狗狗年龄:"))
if age<0: print("请输入大于0的年龄!")
elif age==1: print("约等于人类年龄14岁")
elif age==2: print("约等于人类年龄22岁")
elif age>2: human=22+(age-2)*5; print("约等于人类年龄:",human)
```

狗狗4岁，相当于人类年龄？

{{ select(25) }}

- A.14
- B.22
- C.32
- D.31

---

## 二、判断题（每题2分，共20分）

26. 元组和列表都属于序列类型，它们的元素都有下标，元素和长度都是可变的。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. `while()`无限循环常常与`if`条件结构和`break`语句结合起来使用。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 元组的元素不能被修改。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. 在Python中，`for`循环与`while`循环都可以用于遍历序列（如列表、元组、字符串等）中的元素。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 已知`score=93.2`，代码`print("本次数学期末考试，本班平均分为%d"%(score))`的写法是正确的。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. 字典的主要操作是依据键来存储和读取值。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. `while`循环不断地运行，直到指定的条件满足为止。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 用`min()`函数可以找到字符串中最大的字符。

{{ select(33) }}

- A. 正确
- B. 错误

---

34. 列表（list）是一个存储空间，可以存储一个元素，也可以存储多个元素。

{{ select(34) }}

- A. 正确
- B. 错误

---

35. 要检查两个人的年龄都不小于21岁，代码`age_0=22; age_1=18; if age_0>=21 and age_1>=21:`的条件判断逻辑正确。

{{ select(35) }}

- A. 正确
- B. 错误
