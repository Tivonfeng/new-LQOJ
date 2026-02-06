# 2023年9月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 已知列表`yyh=[2023, '杭州亚运会', '拱宸桥', '玉琼', '莲叶']`，执行`jxw=yyh[2]; print(jxw[1]*2)`的运行结果是？

{{ select(1) }}

- A. 宸宸
- B. 杭杭
- C. 玉玉
- D. 州州

---

2. 阿宝编写程序：

```python
monthdays=[0,31,28,31,30,31,30,31,31,30,31,30,31]
m=int(input())
print("2023年"+str(m)+"月有"+str(monthdays[m])+"天")
```

要获取2023年9月的天数，终端应输入的数字是？

{{ select(2) }}

- A. 11
- B. 10
- C. 9
- D. 8

---

3. 列表`list=['a', ['bb','cc','dd'], 'e', ['f','gg','h']]`，包含的元素个数是？

{{ select(3) }}

- A. 8个
- B. 5个
- C. 6个
- D. 4个

---

4. 要将列表`list1=['苹果','樱桃','西瓜','香蕉','葡萄','菠萝','芒果','火龙果']`变为`list2=['苹果','樱桃','西瓜','香蕉','葡萄','菠萝','桑葚','石榴']`，下列哪组命令可行？

{{ select(4) }}

- A. `del list1[6:8]; list1 += ['桑葚','石榴']`
- B. `del list1[6:7]; list1 += ['桑葚','石榴']`
- C. `list1.append('桑葚','石榴'); del list1[6:7]`
- D. `list1.append('桑葚','石榴'); del list1[6:8]`

---

5. 执行代码：`list=['华东','华西','华南','华北']; list.insert(2,'华中'); list.pop(); print(list)`的结果是？

{{ select(5) }}

- A. ['华东','华西','华中','华南']
- B. ['华东','华中','华西','华南','华北']
- C. ['华东','华西','华中','华南','华北']
- D. ['华西','华中','华南','华北']

---

6. 已知元组`t=('s','a','a','r',5)`，执行`print(t.index('a') + t.count('a'))`的结果是？

{{ select(6) }}

- A. 2
- B. 3
- C. 4
- D. 5

---

7. 列表`numbers=[1,2,3,4]`，以下哪项可访问第三个元素？

{{ select(7) }}

- A. numbers[1]
- B. numbers[2]
- C. numbers[3]
- D. numbers[4]

---

8. 字典`d={"山东":"青岛","浙江":"杭州","安徽":"芜湖"}`，删除"山东"对应数据的正确方法是？

{{ select(8) }}

- A. `del d['浙江']`
- B. `d.clear()`
- C. `del d['山东']`
- D. `d.pop('山东')`

---

9. 以下关于循环的说法，不正确的是？

{{ select(9) }}

- A. for循环可遍历列表所有元素
- B. while循环满足条件时运行，直到条件不满足
- C. Python中可以使用do...while循环
- D. break和continue可用于for和while循环

---

10. 执行代码：

```python
score = eval(input("请输入成绩:"))
if score >0 and score <60: print("不及格")
elif score >=60 and score <=100: print("及格")
else: print("请输入正确的成绩")
```

当输入60时，输出结果是？

{{ select(10) }}

- A. 及格
- B. 不及格
- C. 请输入正确的成绩
- D. 60

---

11. 下列说法不正确的是？

{{ select(11) }}

- A. 字典通过key访问，与列表、元组不同
- B. 字典无"头/尾下标"，仅通过key对应value
- C. Python中可通过重新给key赋值修改value，但不能新增key
- D. 内置函数可删除字典元素，也可清空/删除字典

---

12. 执行代码：

```python
s=1
for i in range(1,4,3):
    s = s + i
print(s)
```

的结果是？

{{ select(12) }}

- A. 2
- B. 6
- C. 1
- D. 5

---

13. 关于Python循环结构的说法，错误的是？

{{ select(13) }}

- A. for和while可实现遍历与循环功能
- B. break跳出所在整个循环
- C. continue结束整个循环，执行后续语句
- D. 遍历结构可为字符串或range()

---

14. 下列有关流程控制的说法，错误的是？

{{ select(14) }}

- A. 条件永远为true时，循环无限执行
- B. 判断条件为false时，循环结束
- C. while语句中"判断条件"不可以是常值
- D. 执行语句可为单个语句或语句块

---

15. 执行代码：

```python
name1='玛卡巴卡'; name2='依古比古'; name3='唔西迪西'
print('晚安'+name2)
```

的结果是？

{{ select(15) }}

- A. 晚安玛卡巴卡
- B. 晚安依古比古
- C. 晚安唔西迪西
- D. 晚安name2

---

16. 下列代码中，不能创建字典的是？

{{ select(16) }}

- A. `d=0`
- B. `d={'葡萄':20}`
- C. `d={葡萄:20}`
- D. `d={'葡萄':20,'西瓜':12}`

---

17. 字典`d={"苹果":"apple","香蕉":"banana","橘子":"orange","桃子":"peach"}`，仅输出水果英文名的语句是？

{{ select(17) }}

- A. `print(d.values())`
- B. `print(d.keys())`
- C. `d.reverse()`
- D. `print(d[-1])`

---

18. 关于Python元组的描述，错误的是？

{{ select(18) }}

- A. 元组不可修改
- B. 元组用小括号和逗号表示
- C. 元组元素要求相同类型
- D. 元组可作为另一个元组的元素，支持多级索引

---

19. 对`s="www.baidu.com"`执行`s.split(".")`后的结果是？

{{ select(19) }}

- A. www.baidu.com
- B. ["www","baidu","com"]
- C. "www.baidu.com"
- D. wwwbaiducom

---

20. 执行代码：

```python
s=0
for i in range(10):
    s +=1
    if i*i <50: break
print(s)
```

的结果是？

{{ select(20) }}

- A. 0
- B. 1
- C. 7
- D. 3

---

21. 执行代码：

```python
list0=[5,4,3,2,2]
list0.remove(2)
list0.insert(2,6)
print(list0)
```

的结果是？

{{ select(21) }}

- A. [5,4,3,6,2]
- B. [5,4,3,2,6]
- C. [5,4,3,2,6,2]
- D. [5,4,6,3,2]

---

22. 执行`text1="Good work"; text2=text1[-1]*3`后，`text2`的值是？

{{ select(22) }}

- A. Good workGood workGood work
- B. workworkwork
- C. work work work
- D. kkk

---

## 二、判断题（每题2分，共18分）

23. 元组一旦被创建就不能被修改。

{{ select(23) }}

- A. 正确
- B. 错误

---

24. 元组和列表都属于序列类型，它们的元素都有下标，可以调用sort函数对元组和列表中的元素重新排列。

{{ select(24) }}

- A. 正确
- B. 错误

---

25. 列表是有序的，列表中可以放多个不同类型的元素。列表也可以是空的，[,]都是空列表。

{{ select(25) }}

- A. 正确
- B. 错误

---

26. 代码：

```python
dic_1={'键值1':'苹果','键值2':'葡萄','键值3':[11,22,33]}
dic_1['键值4']='西瓜'
print(dic_1)
```

功能是在字典中添加键值对`'键值4':'西瓜'`，输出`{'键值1':'苹果','键值2':'葡萄','键值3':[11,22,33],'键值4':'西瓜'}`。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. 代码：`for i in range(5): print(i)`运行结果是1、2、3、4、5。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 代码：`s="Python"; for i in s: print(i);`运行后输出横排的"Python"。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. `input()`语句输入的内容，一定是字符串类型。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 程序：`for i in range(5): print(i)`变量`i`的值不可能是5。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. `'abc'-'a'`的结果是`'bc'`。

{{ select(31) }}

- A. 正确
- B. 错误
