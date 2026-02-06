# 2025年12月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 请问执行以下语句后，列表shi的值为？
```python
shi=["春望","将进酒","咏柳","悯农"]
shi[2]="春夜喜雨"
```

{{ select(1) }}

- A. ["春望","将进酒","咏柳","悯农"]
- B. ["春望","将进酒","春夜喜雨"]
- C. ["春望","将进酒","春夜喜雨","悯农"]
- D. ["春望","春夜喜雨","咏柳","悯农"]

---

2. 小园将体育项目放在元组中：`play=("足球","篮球","蝶泳","自由泳","仰泳","跑步","跳绳")`，希望只访问第2个和第3个元素，正确的是？

{{ select(2) }}

- A. play[:4]
- B. play[:3]
- C. play[0:3]
- D. play[1:3]

---

3. 运行下面的程序，输入88，得到的输出结果是？

```python
score=int(input("请输入考试成绩:"))
if(score>=90):
    print("你的等级是A")
elif(score>=75):
    print("你的等级是B")
else:
    print("你的等级是C")
```

{{ select(3) }}

- A. 你的等级是A
- B. 你的等级是B
- C. 你的等级是C
- D. 无输出

---

4. 下面代码的输出结果是？

```python
num_list =[2, 4, 6, 8]
print(num_list[-1])
```

{{ select(4) }}

- A. 2
- B. 4
- C. 8
- D. 10

---

5. 有一个字典`my_dict={'a':1,'b':2}`，现在想获取键'a'对应的值，以下哪种方式正确？

{{ select(5) }}

- A. my_dict['a']
- B. my_dict('a')
- C. my_dict'a'
- D. my_dict[a]

---

6. Python中执行以下代码后输出是？

```python
a=15
if a>10:
    print("A", end="")
elif a > 5:
    print("B", end="")
else:
    print("C")
```

{{ select(6) }}

- A. A
- B. B
- C. C
- D. 无输出

---

7. 请问下列程序运行后，输出结果应该是？

```python
s="我爱Python"
for i in s:
    print(i)
```

{{ select(7) }}

- A. 我爱Python
- B. 我
  爱
  P
  y
  t
  h
  o
  n
- C. 我爱
  Python
- D. 无规律输出

---

8. 诗句列表`poem=["黄河","白云间"]`漏掉了"远上"，需插入后得到["黄河","远上","白云间"]，下列哪个代码可以实现？

{{ select(8) }}

- A. poem.append(2,"远上")
- B. poem.insert(2,"远上")
- C. poem.insert(1,"远上")
- D. poem[1]="白日"

---

9. 年级所有学生的名字都记录在了列表names中，下列哪段代码可以获取年级的总人数？

{{ select(9) }}

- A. len(names)
- B. names.count()
- C. names.append()
- D. sorted(names)

---

10. 老师用字典记录同学的英文名和学号：`stu_info={'Alice':101, 'Bob':102,'Cathy':103}`，老师想要查询Bob的学号，应该选哪个代码？

{{ select(10) }}

- A. stu_info[1]
- B. stu_info['Bob']
- C. stu_info.pop('Bob')
- D. stu_info.get(102)

---

11. 想要打印三次"好好学习"，正确的代码是？

{{ select(11) }}

- A. for i in range(3):
      print("好好学习")
- B. for i in range(4):
      print("好好学习")
- C. while i <3:
      print("好好学习")
- D. while i <3:
      print("好好学习")
      i +=1

---

12. 已知列表`ls=[1,2,3,4,5,6,7,8,9,10]`，以下哪个语句输出的结果是[2,4,6,8,10]？

{{ select(12) }}

- A. print(ls[1:10:2])
- B. print(ls[0:2])
- C. print(ls[1:10:-2])
- D. print(ls[:-2])

---

13. 以下对于元组`tp=(1,2,3,4,5)`的操作，不正确的是？

{{ select(13) }}

- A. print(tp*3)
- B. print(tp+(4,5,6))
- C. print(tp[1:3])
- D. print(tp.remove(2))

---

14. 以下创建字典的方法，错误的是？

{{ select(14) }}

- A. d={}
- B. d={'数学':100,'语文':95,'英语':97}
- C. d={1:100}
- D. d={'数学':100,['语文']:95}

---

15. 阿宝打算用Python程序写温控装置控制程序，当温度t>35为"高温"，t<=18为"寒冷"，其他为"舒适"。以下哪个程序是错误的？

{{ select(15) }}

- A. t=int(input())
      if t>=35:
          print("高温")
      elif t >18:
          print("舒适")
      else:
          print("寒冷")
- B. t=int(input())
      if t<=18:
          print("寒冷")
      elif t<35:
          print("舒适")
      else:
          print("高温")
- C. t=int(input())
      if t <=18:
          print("寒冷")
      elif t <=35:
          print("舒适")
      else:
          print("高温")
- D. t=int(input())
      if t<=18:
          print("寒冷")
      if t>18 and t<35:
          print('舒适')
      if t=35:
          print("高温")

---

16. 在Python编程中，下面几个有关流程控制的说法，错误的是？

{{ select(16) }}

- A. 当有明确的循环退出条件时，优先考虑使用while语句
- B. 当强调循环的次数时候，优先考虑使用for语句
- C. 可以使用If-else-if语句实现多条件结构判断
- D. continue语句用于结束本次循环，跳过循环体中尚未执行的语句，继续进行下一次的循环判断

---

17. 关于Python中的列表，下列描述错误的是？

{{ select(17) }}

- A. 列表是Python中内置可变序列，是若干元素的有序集合
- B. 同一个Python列表中的数据类型可以不同
- C. 可以使用List[1]来获取List列表的首个元素
- D. 列表中的元素可以是列表，也就是列表的元素可以也是列表

---

18. 执行下方程序，输出结果是？

```python
L=['开始']
for num in range(4):
    L.append(num)
print(L)
```

{{ select(18) }}

- A. ['开始',0,1,2,3]
- B. ['开始',1,2,3]
- C. ['开始']
- D. [0, 1, 2,3]

---

19. 执行下方程序，输出结果是？

```python
M=[2,2,2,1,2,1]
for i in M:
    if i == 2:
        print('谢谢参与')
```

{{ select(19) }}

- A. 谢谢参与（1次）
- B. 谢谢参与（4次）
- C. 谢谢参与（3次）
- D. 无输出

---

20. 已知`t=(3,7,5,9)`执行下列哪项的代码，程序能够正确运行的是？

{{ select(20) }}

- A. t.sort()
- B. t.pop(3)
- C. t.append(2)
- D. a=t[1]

---

21. 执行代码：
```python
s = "Python,Java,Go, Rust,JavaScript"
print(s.split(','))
```
打印的结果是？

{{ select(21) }}

- A. ['Python','Java', 'Go', 'Rust', 'JavaScript']
- B. ['Python Java Go Rust JavaScript']
- C. ['Python',', Java',', Go',', Rust',', JavaScript']
- D. 报错

---

22. 要删除列表`nums=[5,2,8,4]`中的元素8，正确的操作是？

{{ select(22) }}

- A. nums.remove(8)
- B. nums.pop(8)
- C. del nums[8]
- D. nums.delete(8)

---

23. 已知列表`lst=[10, 3.14,"python",(5, 8,25)]`，执行`print(len(lst))`后，输出结果是？

{{ select(23) }}

- A. 4
- B. 5
- C. 6
- D. 7

---

24. 已知字符串`s="Programming123"`，若要获取子串"123"，正确选项是？

{{ select(24) }}

- A. s[11:14]
- B. s[13:10:-1]
- C. s[:-1]
- D. s[13:]

---

25. 已知字典`info = {'fruit': 'apple', 'price': 5, 'color': 'red'}`，执行`info['price']=6; info['weight']=0.3`后，字典的结果是？

{{ select(25) }}

- A. {'fruit': 'apple', 'price': 5,'color':'red', 'weight': 0.3}
- B. {'fruit':'apple','price': 6,'color':'red'}
- C. {'fruit':'apple', 'price': 6,'color':'red', 'weight': 0.3}
- D. {'fruit':'apple','price': 5,'color':'red'}

---

## 二、判断题（每题2分，共20分）

26. 使用sorted()函数对元组进行默认排序后，原元组的元素顺序会按升序排列。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. for语句内可以嵌套while语句使用，但while语句内不允许嵌套for语句使用。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 列表的sort()排序函数会改变原始列表顺序，而sorted()排序函数不会。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. "喜欢".format("小明","足球")会生成"小明喜欢足球"。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 字典中的元素必须是成对出现的，因此无法单独输出字典的键，也无法单独输出字典的值。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. 在Python中，如果while循环的条件始终为True，程序将陷入死循环，死循环在实际编程中没有用处。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. 在Python中分支结构可细分为单分支结构、双分支结构和多分支结构，可根据任务要求选择不同的分支结构。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 下列程序的输出结果为元组(1,2,3,4,5)：
```python
t =(1,2, 3,4)
t.append(5)
print(t)
```

{{ select(33) }}

- A. 正确
- B. 错误

---

34. `st="清泉石上流"; print(st[::-1])`代码会反序字符串，打印"流上石泉清"。

{{ select(34) }}

- A. 正确
- B. 错误

---

35. 运行如下程序：
```python
num =5
while num > 2:
    num=num-1
    print(num)
```
会打印出：4、3、2，该说法是否正确？

{{ select(35) }}

- A. 正确
- B. 错误
