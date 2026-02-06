# 2023年12月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 给定字符串s，下列表示s最后一个字符的是？

{{ select(1) }}

- A. s[:-1]
- B. s[1]
- C. s[0:-1]
- D. s[-1]

---

2. 运行下列代码，终端区打印的结果是？

```python
nums = [1,2,3,4]
nums.append(nums[4])
print(nums)
```

{{ select(2) }}

- A. [1,2,3,4,5]
- B. [1,2,3,4,4]
- C. [1,2,3,4]
- D. 终端区会报错

---

3. 下列哪个选项是元组类型的数据？

{{ select(3) }}

- A. [1,2,3]
- B. (1,2,3)
- C. [1,2,3]
- D. (1:小明,2:小李)

---

4. 下列代码片段执行的结果是？

```python
poet=[["唐",["李白","王维","孟浩然"],"宋",["苏轼","陆游","王安石"],"618年-907年","960年-1279年"]]
print(len(poet))
```

{{ select(4) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

5. 下列代码运行的结果是？

```python
ls=['富强','民主','文明','和谐','自由','平等','公正','法治']
print(ls[:2])
```

{{ select(5) }}

- A. ['富强','民主','文明','和谐']
- B. ['自由','平等','公正','法治']
- C. ['法治','平等','和谐','民主']
- D. ['富强','文明','自由','公正']

---

6. 阿宝想打印"我的名字叫阿宝，我今年10岁了，我的爱好是编程。"，已定义`name='阿宝'`、`age=10`、`hobby='编程'`，下列输出语句错误的是？

{{ select(6) }}

- A. `print("我的名字叫{1}，我今年{0}岁了，我的爱好是{2}。".format(age,name,hobby))`
- B. `print("我的名字叫{0}，我今年{1}岁了，我的爱好是{2}。".format(name,hobby,age))`
- C. `print("我的名字叫%s，我今年%d岁了，我的爱好是%s。"%(name,age,hobby))`
- D. `print("我的名字叫%s，我今年%s岁了，我的爱好是%s。"%(name,age,hobby))`

---

7. 运行下列代码，打印结果是？

```python
ls=[3,7,2,1]
for i in range(3,0,-1):
    for j in range(i):
        if ls[j]>ls[j+1]:
            ls[j],ls[j+1]=ls[j+1],ls[j]
print(ls)
```

{{ select(7) }}

- A. [1,3,2,7]
- B. [1,2,3,7]
- C. [3,2,1,7]
- D. [1,7,3,2]

---

8. 下列程序运行后，输出的结果是？

```python
list=['春季','夏季','秋季','冬季','1+1','6+1','ab']
print(list[0])
print(list[5])
print(list[6])
print(list[4])
```

{{ select(8) }}

- A. 春季
  7
  ab
  1+1
- B. 春季
  ?
  ab
  1+1
- C. 春季
  6+1
  ab
  1+1
- D. 春季
  7
  ab
  1

---

9. 运行下列程序，输出的结果是？

```python
s1="Good \n"
s2="Morning."
print(s1 + s2)
print(len(s1))
```

{{ select(9) }}

- A. Good Morning.
  Good
- B. Morning.
  6
- C. Good Morning.
  5
- D. Good\nMorning.
  6

---

10. 请问下列程序运行后，输出结果应该是？

```python
t1=(2,3,4,5)
t2=t1*2
print(min(t2)+max(t2)+len(t2))
```

{{ select(10) }}

- A. 15
- B. 14
- C. 13
- D. 12

---

11. `ls=["cat","dog","tiger","pig"]`，下列哪个选项可以向ls的末尾添加新元素"monkey"？

{{ select(11) }}

- A. ls.append('monkey')
- B. ls.insert('monkey')
- C. ls.extend('monkey')
- D. ls.add('monkey')

---

12. 下列选项不属于分支结构语句的是？

{{ select(12) }}

- A. if
- B. elif
- C. else
- D. then

---

13. 执行下列程序代码，得到的输出结果是？

```python
i=1
while i < 10:
    i += 1
    print(i)
```

{{ select(13) }}

- A. 1
- B. 9
- C. 10
- D. 11

---

14. 下列语句创建了一个Python字典的是？

{{ select(14) }}

- A. ()
- B. {a:'bb','ccc':'dd'}
- C. [a,'bb','ccc']
- D. (a,'bb','ccc')

---

15. 下列哪个语句，是用来告诉Python跳过当前循环的剩余语句，然后继续进行下一轮循环？

{{ select(15) }}

- A. exit
- B. pass
- C. break
- D. continue

---

16. 在下列选项中，哪个选项可以正确地从字典里，获取"西瓜"这个字符串？

```python
name_dict = {1:'西瓜',2:'南瓜'}
```

{{ select(16) }}

- A. name_dict['西瓜']
- B. name_dict['南瓜']
- C. name_dict[1]
- D. name_dict[2]

---

17. 下列选项中，对下面程序的打印结果描述正确的是？

```python
a = [0,1,2,3]
i = len(a) - 1
while i>0:
    print(a[i])
    i -= 1
```

{{ select(17) }}

- A. 3
  2
  1
- B. 1
  2
  3
- C. 0
  1
  2
- D. 2
  1
  0

---

18. 下列选项中，不能从字典中删掉"xiaoming"的是？

```python
dic = {'name':'xiaoming','age':8}
```

{{ select(18) }}

- A. del dic['name']
- B. dic['name']='clever'
- C. dic.clear()
- D. dic.pop('name')

---

19. 执行下列语句后，输出是？

```python
dict0 = {"apple":3, "banana":5, "orange":2}
dict0["banana"] += 2
dict0["grape"]=4
dict0["grape"] += 4
print(dict0["grape"])
```

{{ select(19) }}

- A. 2
- B. 4
- C. 6
- D. 8

---

20. 执行下列程序，输入10，则y的值是？

```python
x = int(input())
if x!=0:
    if x>0:
        y=-1
    else:
        y=1
else:
    y=0
```

{{ select(20) }}

- A. 0
- B. 1
- C. -1
- D. 10

---

21. 下列代码执行后的输出是？

```python
mylist= [1,2,3,4,5]
newlist = mylist[1:4]
newlist.append(6)
print(newlist)
```

{{ select(21) }}

- A. [1,2,3,4,6]
- B. [1,2,3,6]
- C. [2,3,4,6]
- D. [2,3,4,5,6]

---

## 二、判断题（每题2分，共20分）

22. 可以使用[]创建列表。

{{ select(22) }}

- A. 正确
- B. 错误

---

23. break语句执行后，程序就会跳出本次循环，继续进行下一轮循环。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 字符串、列表和元组都是有序的，它们的区别是字符串和列表都可以切片而元组不可以切片。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 定义元组后，可以像访问列表那样，通过索引的方式访问元组元素。

{{ select(25) }}

- A. 正确
- B. 错误

---

26. `a="%s!第%d名!"%('Python',1)`

`print(a)`运行后，显示的输出结果是：Python!第1名!

{{ select(26) }}

- A. 正确
- B. 错误

---

27. 字典是Python语言中的一种数据结构，用来存储键值对。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. for循环一般用于循环次数已知的情况，所有的for循环都可以用while循环写。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. Python中的双分支结构必须要有elif才能实现。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. if语句中可以嵌套while，while语句中可以嵌套if。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. str1和str2分别是字符串类型，则str1+str2表示str1与str2两个字符串连接，str1-str2表示从str1中减去str2的字符串。

{{ select(31) }}

- A. 正确
- B. 错误
