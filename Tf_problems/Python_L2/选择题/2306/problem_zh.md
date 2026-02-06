# 2023年5月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 运行以下程序，如果通过键盘先后输入的数是1和3，输出的结果是？

```python
a=int(input())
b=int(input())
if a < b:
    a = b
print(a)
```

{{ select(1) }}

- A. 31
- B. 13
- C. 1
- D. 3

---

2. 运行以下程序，输出的结果是？

```python
n=10
s=0
m=1
while m<=n:
    s = s + m
    m = m + 1
print(s)
```

{{ select(2) }}

- A. 45
- B. 50
- C. 55
- D. 60

---

3. 以下代码的输出结果是？

```python
vlist = list(range(5))
for e in vlist:
    print(e, end=",")
```

{{ select(3) }}

- A. 0,1,2,3,4,
- B. [0,1,2,3,4]
- C. 01234
- D. 0;1;2,3:4;

---

4. 以下程序的输出结果是？

```python
n=0
while n<10:
    n = n + 2
    if n==6:
        continue
    print(n)
```

{{ select(4) }}

- A. 5
- B. 10
- C. 6
- D. 8

---

5. 运行以下程序，输出的结果是？

```python
numbers=[1,2,3,4]
numbers.append([5,6,7,8])
print(len(numbers))
```

{{ select(5) }}

- A. 4
- B. 5
- C. 8
- D. 12

---

6. 以下代码的输出结果是？

```python
s=[4,2,9,1]
s.insert(3,3)
print(s)
```

{{ select(6) }}

- A. [4,2,9,1,2,3]
- B. [4,3,2,9,1]
- C. [4,2,9,2,1]
- D. [4,2,9,3,1]

---

7. 关于下列程序，说法正确的是？

```python
num=0
while num<10:
    print("=")
```

{{ select(7) }}

- A. 在while代码块中无论加什么都不能改变死循环
- B. 在while代码块中加一行代码`num-=1`可以改变死循环
- C. 这个while循环是一个死循环，会一直打印"="
- D. 运行结果打印输出10个"="语句

---

8. 运行以下程序，输出的结果是？

```python
list5=['1','2','4','6','9']
print(list5[2])
```

{{ select(8) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

9. 下列说法正确的是？

{{ select(9) }}

- A. 元组的元素值可以随意修改
- B. 可以用del语句删除元组中的某个元素
- C. `tup1=(5)`是一个合法的元组
- D. `tup1=('turtle','fish',65536)`是一个合法的元组

---

10. 在Python语言中，表达式`[1,2] * 2`的值是？

{{ select(10) }}

- A. [0]
- B. 1
- C. True
- D. False

---

11. `d={"王明":178,"张华":158,"于飞":189,"刘英":164}`，则`d["于飞"]`的值是？

{{ select(11) }}

- A. -2
- B. 2
- C. '于飞'
- D. 189

---

12. 下列说法正确的是？

{{ select(12) }}

- A. 字典只能存储字符串，不能存储其他类型的对象
- B. `dict1={}`可以创建一个空字典
- C. `(123:456)`是一个合法的字典
- D. 字典的值必须是唯一的，键不必是唯一的

---

13. 运行以下程序，共计输出了几个"hello"？

```python
for i in range(3):
    print("hello")
```

{{ select(13) }}

- A. 1
- B. 2
- C. 3
- D. 4

---

14. 下列程序的运行结果是？

```python
lis1=["cat","tomato","dog","apple","dog","dog"]
print(lis1.index("dog"))
```

{{ select(14) }}

- A. 0
- B. 1
- C. 2
- D. 3

---

15. 运行以下程序，当从键盘输入1，程序运行结果是？

```python
str1='一二三四五六日'
strid=int(input('请输入1-7的数字:'))
print('星期'+str1[strid-1])
```

{{ select(15) }}

- A. 星期一
- B. 星期+一
- C. 星期二
- D. 星期+二

---

16. 下列程序的运行结果是？

```python
zd1={'name':'Tom', 'color':'blue'}
zd1['name']='Mike'
print(zd1)
```

{{ select(16) }}

- A. {'name': 'Mike', 'color':'blue'}
- B. 'name': 'Mike', 'color': 'blue', 'name':'Tom'}
- C. {'name': 'Tom','color': 'blue'}
- D. {'name': 'Tom','name': 'Mike','color': 'blue'}

---

17. 若`a=(1,2,3)`，执行下列哪个命令会报错？

{{ select(17) }}

- A. `a[1]`
- B. `list(a)`
- C. `a[1]=4`
- D. `a*5`

---

18. 运行以下代码的结果是？

```python
s='happy birthday'
print(s[13:-15:-2])
```

{{ select(18) }}

- A. 运行会报错
- B. ydti pa
- C. ydtipa
- D. yadhtrib yppa

---

19. 下列程序执行的结果是？

```python
yz=(1,5,7,3,9)
list1=sorted(yz)
print(list1)
```

{{ select(19) }}

- A. 报错
- B. 1,3,5,7,9
- C. (1,3,5,7,9)
- D. [1,3,5,7,9]

---

20. 以下哪个函数可以对字符串中的内容进行替换（注意：不是格式化输出）？

{{ select(20) }}

- A. `replace()`
- B. `format()`
- C. `split()`
- D. `join()`

---

21. 运行以下程序，输出的结果是？

```python
list3=['11','4',5,1,4]
print(len(list3))
```

{{ select(21) }}

- A. 1
- B. 4
- C. 5
- D. 8

---

22. 下列说法错误的是？

{{ select(22) }}

- A. 字典一旦创建就不能被修改
- B. `a={}`是一个空字典
- C. `{123:123}`是一个合法的字典
- D. 在同一个字典中，字典的键具有唯一性

---

23. 列表`ls=['H','a','p','p','y','']`，下列说法错误的是？

{{ select(23) }}

- A. `ls[:6]`的值是['H','a','p','p','y','']
- B. `ls[:-6]`的值是[]
- C. `ls[6]`的值是''
- D. `ls[2:-2]`的值是['p','p']

---

24. 使用`tuple`函数创建元组错误的是？

{{ select(24) }}

- A. `tuple(20,30)`
- B. `tuple('你好')`
- C. `tuple([2,0,1,3])`
- D. `tuple('12345')`

---

## 二、判断题（每题2分，共20分）

25. `append()`方法可以在列表末尾添加一个元素。

{{ select(25) }}

- A. 正确
- B. 错误

---

26. 下列程序写法是正确的：

```python
score=50
if score>=60:
    print("合格")
else:
    print("不合格")
```

{{ select(26) }}

- A. 正确
- B. 错误

---

27. 判断语句是否正确：

```python
book=("格林童话":1001,"安徒生童话":1002)
```

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 判断语句是否正确：

```python
if 5>3
    print("5大于3")
```

{{ select(28) }}

- A. 正确
- B. 错误

---

29. 在while循环中，如果想返回到循环的开头处，可以使用break语句。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 执行以下程序，运行结果是：3、33

```python
for i in range(1,5,2):
    print(3)
```

{{ select(30) }}

- A. 正确
- B. 错误

---

31. 执行`print("e" in "hello")`的输出结果为True。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. `(3) in (1,2,3)`的结果是True。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 执行`print("{:02d}".format(20))`的输出结果是20。

{{ select(33) }}

- A. 正确
- B. 错误

---

34. 字典的`keys()`方法可以返回字典中所有的值。

{{ select(34) }}

- A. 正确
- B. 错误
