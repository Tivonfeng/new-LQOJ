# 2023年3月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 下列说法正确的是？

{{ select(1) }}

- A. {123:'a','a123':...}不是一个合法的字典
- B. 数字、字符串、列表和元组都可以作为字典的键
- C. {(12,34,'a'):'a',56:78}是一个合法的字典
- D. 字典中的内容一经创建就不能再修改

---

2. 下列程序的运行结果是？

```python
d1=dict(age=18)
print(d1)
```

{{ select(2) }}

- A. (age=18)
- B. [age=18]
- C. age=18
- D. {'age':18}

---

3. `datas=('Name','XiaoMing','No','1001','Age',14,'School','ShiYan XueXiao')`，表达式`len(datas)`的值是？

{{ select(3) }}

- A. 8
- B. 6
- C. 4
- D. 2

---

4. 下列哪个是一个合法的列表？

{{ select(4) }}

- A. (191,98,1,0)
- B. "1919,810"
- C. [19,19,8,10]
- D. (19,19,8,10)

---

5. 运行下列程序，输出的结果是？

```python
list4=['1','3','5','7','2','3']
list4.append('7')
print(len(list4))
```

{{ select(5) }}

- A. 4
- B. 5
- C. 6
- D. 7

---

6. 已知列表`list7=[-3,6,3,7,5,-4,10]`，执行`sort()`方法对此列表排序之后，list7列表的第二个元素是？

{{ select(6) }}

- A. -2
- B. -3
- C. 2
- D. 5

---

7. 已知列表`list9=[11,4,514,191,9,81.0]`，下列说法错误的是？

{{ select(7) }}

- A. `print(min(list9))`可以输出列表的最小值，输出结果为0
- B. `print(max(list9))`可以输出列表的最大值，输出结果为514
- C. `print(list9.index(191))`可以输出数值191第一个匹配项的索引位置，输出结果为3
- D. `list9.pop()`可以移除列表中的最后一个元素

---

8. 下列说法正确的是？

{{ select(8) }}

- A. '0123456'是一个长度为6的字符串
- B. 在Python中，可以用乘号"*"把两个字符串连接起来
- C. 'What's this?'是一个合法的字符串
- D. '**'是一个合法的字符串

---

9. 下列说法错误的是？

{{ select(9) }}

- A. while语句通常用于重复执行某一段程序
- B. break语句可以跳出for和while的循环体
- C. 在Python中可以使用do..while循环
- D. if语句通常用于执行条件判断

---

10. 运行下列程序，共计输出了几个"banana"？

```python
for i in range(3,9,3):
    print("banana")
```

{{ select(10) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

11. 运行下列程序，输出的结果是？

```python
x=0; y=0; a=2023
for i in range(a):
    if((i%2)==0): x=x-1
    else: y=y+1
print(x+y)
```

{{ select(11) }}

- A. -1
- B. 1
- C. 0
- D. 2023

---

12. 已知`ls=[20,30,50,10,90]`，以下选项中，不能删除元素90的是？

{{ select(12) }}

- A. `ls.pop(-1)`
- B. `del ls[-1]`
- C. `ls.remove(ls[-1])`
- D. `ls.remove(-1)`

---

13. 下列代码的输出结果是？

```python
ls=[2023, 'Happy', ['Good','Luck']]
print(ls[2][1])
```

{{ select(13) }}

- A. Happy
- B. Good
- C. Luck
- D. o

---

14. 下列程序的输出结果是？

```python
ls=[0,'',0,None,'','empty']
print(len(ls))
```

{{ select(14) }}

- A. 4
- B. 5
- C. 6
- D. 3

---

15. 下列选项中，哪个不能实现字符串拼接？

{{ select(15) }}

- A. '字'+'符'+'串'
- B. '字符串'.join('运算')
- C. '字符串运算'*1
- D. '字符串'-'运算'

---

16. Python解释器中执行如下代码：

```python
'{2},{0},{1}'.format('You','need','Python')
```

{{ select(16) }}

- A. 'Python,need,You'
- B. 'Python,You,need'
- C. 'need,You,Python'
- D. 'need,Python,You'

---

17. 下列代码执行的结果是？

```python
dic={'聊天机器人':'ChatGPT','搜索引擎':'百度','浏览器':'Google'}
for x in dic:
    print(x,end='')
```

{{ select(17) }}

- A. ChatGPT百度Google
- B. 聊天机器人搜索引擎浏览器
- C. ['ChatGPT','百度','Google']
- D. [('聊天机器人','ChatGPT'),('搜索引擎','百度'),('浏览器','Google')]

---

18. 不能输出0-10之间所有奇数的程序是？

{{ select(18) }}

- A. `a=0; while a<10: if a%2==0: a+=1; continue; print(a,end=''); a+=1`
- B. `for a in range(0,11): if a%2!=1: continue; print(a,end='')`
- C. `for a in range(0,11): if a%2==0: continue; print(a,end='')`
- D. `a=0; while a<10: if a%2==1: break; a+=1; print(a)`

---

19. 运行下列程序，输入60，程序执行的结果是？

```python
a=int(input())
if a<10: res=a+2
elif a<50: res=a-2
elif a<80: res=a*2
else: res=a//2
print(res)
```

{{ select(19) }}

- A. 62
- B. 58
- C. 120
- D. 30

---

20. 运行下列代码，t的值是？

```python
n,t=10,0
while n!=0:
    n=n-1
    t=t+n
```

{{ select(20) }}

- A. 36
- B. 45
- C. 50
- D. 55

---

21. 已知元组`tup2=(114,5,14,191,9810)`，下列说法错误的是？

{{ select(21) }}

- A. `print(tup2[1:-2])`输出(5,14)
- B. `print(tup2[2:])`输出(5,14,191,9810)
- C. `print(tup2[2:3])`输出(14,)
- D. `print(tup2[3])`输出191

---

22. 下列哪个选项是合法的字典创建方式？

{{ select(22) }}

- A. `dict1={123:456,'abc':'def'}`
- B. `dict1=(123:456,'abc':'def')`
- C. `dict1=[123:456,'abc':'def']`
- D. `dict1=123:456,'abc':'def'`

---

23. 运行下列程序，输出结果是？

```python
s='Python'; print(s[1:4])
```

{{ select(23) }}

- A. Pyt
- B. yth
- C. hon
- D. Pyth

---

24. 下列说法正确的是？

{{ select(24) }}

- A. 列表的`append()`方法可以添加多个元素
- B. 元组的`extend()`方法可以扩展元素
- C. 字典的`keys()`方法返回所有键
- D. 字符串的`remove()`方法可以删除指定字符

---

25. 已知`list1=[1,2,3,4,5]`，执行`list1.insert(2,6)`后，list1的值是？

{{ select(25) }}

- A. [1,2,6,3,4,5]
- B. [1,6,2,3,4,5]
- C. [1,2,3,6,4,5]
- D. [6,1,2,3,4,5]

---

## 二、判断题（每题2分，共20分）

26. `pop()`方法可以清空列表。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. 元组要用方括号[]括起来。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. (152,4.06,20&#*3,'4...$57)是一个合法的元组。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. 执行`print("\'he" in "\'hello world\'")`的输出结果为True。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. if语句的条件后面要使用花括号{}表示接下来是满足条件后要执行的语句块。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. break语句不能在循环体之外使用。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. 字符串和元组是不可变对象，列表和字典是可变对象。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 下列程序段中循环一共执行了6次：

```python
for i in range(10,-1,-2): print(i)
```

{{ select(33) }}

- A. 正确
- B. 错误

---

34. if语句的表达式为空字符串、空列表、空元组、空字典和数字0都等价于False。

{{ select(34) }}

- A. 正确
- B. 错误

---

35. 字典值可以是任何的Python对象，既可以是标准的对象，也可以是用户定义的，但键不行。

{{ select(35) }}

- A. 正确
- B. 错误
