# 2025年9月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 已知列表`st=['a','b','cdef']`，请问`len(st)`的值为？

{{ select(1) }}

- A. 4
- B. 6
- C. 2
- D. 3

---

2. 运行以下代码后，输出的最小整数和最大整数分别是？

```python
num = range(5)
for i in num:
    print(i)
```

{{ select(2) }}

- A. 0 4
- B. 0 5
- C. 1 4
- D. 1 5

---

3. 要删除列表`nums=[5,2,8,4]`中的元素8，正确的操作是？

{{ select(3) }}

- A. nums.remove(8)
- B. nums.pop(8)
- C. del nums[8]
- D. nums.delete(8)

---

4. 执行`sorted([5,1,9,3], reverse=True)`的结果是？

{{ select(4) }}

- A. [1,3,5,9]
- B. [9,5,3,1]
- C. [5,1,9,3]
- D. [1,5,3,9]

---

5. 下列代码的输出是？

```python
s=0
for k in range(3):
    if k==1:
        break
    s+=k
print(s)
```

{{ select(5) }}

- A. 0
- B. 1
- C. 3
- D. 6

---

6. 以下创建列表的方式中，错误的是？

{{ select(6) }}

- A. P=[20,'Hello','world',11,13]
- B. P=[10,]
- C. P=(20,10,15,35)
- D. P=list('hello')

---

7. 已知`data=[2021,'False','无',2022,'闰六月']`，执行`xm=data[4]; print(xm)`的运行结果是？

{{ select(7) }}

- A. 闰六月
- B. False
- C. 无
- D. True

---

8. 以下创建元组的方式，错误的是？

{{ select(8) }}

- A. tup=(2025,2024)
- B. tup=(2025,)
- C. tup=tuple([2025,2023])
- D. tup=(2025)

---

9. 请问下列程序运行后，输出结果应该是？

```python
s1="spring,summer,autumn,winter"
s2=s1.split(',')
print(s2)
```

{{ select(9) }}

- A. ['spring','summer','autumn','winter']
- B. {'spring','summer','autumn','winter'}
- C. ('spring','summer','autumn','winter')
- D. "spring,summer,autumn,winter"

---

10. 小鸣用字典存储四季养生情况：`ys={'春':'养心','夏':'养肝','秋':'养肺','冬':'养肾'}`，需修改"春"为"养肝"、"夏"为"养心"，能达成目的的是？

{{ select(10) }}

- A. `ys={'春':'养心','夏':'养肝','秋':'养肺','冬':'养肾'}`
      `ys['春']='养肝'`
      `ys['夏']='养心'`
      `print(ys)`
- B. `ys={'春':'养心','夏':'养肝','秋':'养肺','冬':'养肾'}`
      `ys['春']=ys['夏']`
      `ys['夏']=ys['春']`
      `print(ys)`
- C. `ys={'春':'养心','夏':'养肝','秋':'养肺','冬':'养肾'}`
      `ys['夏']=ys.pop('春')`
      `ys['春']=ys.pop('夏')`
      `print(ys)`
- D. `ys={'春':'养心','夏':'养肝','秋':'养肺','冬':'养肾'}`
      `ys['夏']=ys.pop('春')`
      `print(ys)`

---

11. 字符串`s`存储"两个黄鹂鸣翠柳,一行白鹭上青天。窗含西岭千秋雪,门泊东吴万里船。"，哪段代码能得到第二句"一行白鹭上青天"？

{{ select(11) }}

- A. s[7:15]
- B. s.split('。')[1]
- C. s.split(',')[1]
- D. s[8:15]

---

12. 用字典`word={'apple':'苹果','box':'箱子'}`存储单词，添加"child-孩子"的正确代码是？

{{ select(12) }}

- A. word['child']='孩子'
- B. word.append({'child':'孩子'})
- C. word.update(child='孩子')
- D. word.add('child','孩子')

---

13. 以下定义列表的方法，不正确的是？

{{ select(13) }}

- A. a=[]
- B. a=list(range(10))
- C. a=[0,1]
- D. a=(0,1,3)

---

14. 以下程序中，循环运行了多少次？

```python
sum=0
for i in range(1,10):
    sum=1+sum
print(sum)
```

{{ select(14) }}

- A. 4次
- B. 9次
- C. 6次
- D. 7次

---

15. 执行下面的程序，会输出几个"金奖"？

```python
name=['张一','李二','王三']
for n in name:
    print('金奖')
```

{{ select(15) }}

- A. 0
- B. 1
- C. 2
- D. 3

---

16. 对于元组`tup=('苹果','香蕉','橙子','草莓','西瓜')`，以下操作正确的是？

{{ select(16) }}

- A. tup[1:3]=('芒果','葡萄')
- B. tup[3]='蓝莓'
- C. del tup[2]
- D. tup+('菠萝','榴莲')

---

17. 给定字符串`s="Artificial Intelligence"`，利用负索引获取子字符串"Intelligence"的正确方式是？

{{ select(17) }}

- A. s[-12:]
- B. s[-11:]
- C. s[-10:]
- D. s[-9:]

---

18. 下列选项中，存储字典类型数据的变量是？

{{ select(18) }}

- A. L=[[1,1],[0]]
- B. food='元气森林'
- C. nums=(886)
- D. user={'name':'大脸猫爱吃鱼'}

---

19. 已知字典`stu={'小明':['001','18610234***','男'],'小红':['002','18510824***','女'],'小张':['003','18579936***','男']}`，能打印小明信息的代码是？

{{ select(19) }}

- A. print(stu*'小明')
- B. print(stu['小明'])
- C. print(stu小明)
- D. print(stu[3])

---

20. 下面哪个程序可以实现：用for循环打印1-100内能被2整除的数字？

{{ select(20) }}

- A. `for i in range(1,100,2):`
      `print(i)`
- B. `for i in range(1,100):`
      `print(i)`
- C. `for i in range(1,101):`
      `if i%2==0:`
      `print(i)`
- D. `for i in range(1,101,2):`
      `print(i)`

---

21. 下列说法中，错误的是？

{{ select(21) }}

- A. break语句可以跳出当前层级的for或while循环体
- B. break语句可以跳出所有循环
- C. continue语句跳过当前循环剩余部分，继续下一次循环
- D. break和continue均适用于for和while循环

---

22. 以下程序运行后，会输出多少行内容？

```python
count=0
while count <8:
    count +=1
    if count%3==0:
        continue
    if count ==6:
        break
    print(count)
```

{{ select(22) }}

- A. 3行
- B. 4行
- C. 5行
- D. 6行

---

23. 已知`dizhi=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]`，执行`print(dizhi[3:-5])`的输出是？

{{ select(23) }}

- A. ['辰','巳']
- B. ['卯','辰','巳']
- C. ['卯','辰','巳','午']
- D. ['卯','辰','巳','午','未']

---

24. 下面哪个选项无法创建列表？

{{ select(24) }}

- A. L=[]
- B. L=[1,2]
- C. L=[1;2]
- D. L=list([1,2])

---

25. 关于元组的描述，正确的是？

{{ select(25) }}

- A. 元组中的元素必须是相同数据类型
- B. 元组是无序不重复的
- C. 元组一旦创建就不能修改
- D. 元组和列表都属于可变序列类型

---

## 二、判断题（每题2分，共18分）

26. `unt=[happy,15,"岁","4年级学生"]`定义的列表是正确的。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. if语句可以单独使用，不是必须和else配对；else语句也可以单独使用。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 元组`colors=("红","黄","绿")`，`colors[:2]`会截取到"红""黄"。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. `list(range(5,1,-1))`生成的序列是`[5,4,3,2]`。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 除空字典外，字典中的每个元素必须由一个键和一个值组成。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. 元组`numbers=(1,3,5,7,9)`，切片`numbers[1:4:2]`的结果是`(3,7)`。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. 在Python中，break和continue都可以和for、while循环配合，控制程序流程。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 列表和元组可以切片操作，字符串不能切片操作。

{{ select(33) }}

- A. 正确
- B. 错误

---

34. for循环一般用于计数循环，所有for循环都可以用while循环改写。

{{ select(34) }}

- A. 正确
- B. 错误
