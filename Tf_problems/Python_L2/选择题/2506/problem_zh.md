# 2025年6月 Python二级考试真题

## 一、单选题（每题2分，共50分）

1. 已知列表`gra=["小一3","小二3","小四3","小六"]`，灵珠在"小二3"班，哪个命令可获得他的班级？

{{ select(1) }}

- A. gra[3]
- B. gra[2]
- C. gra[-2]
- D. gra[-1]

---

2. 已知列表`num=[1,2,3,4,5,6,7,8,9,10]`，可通过什么命令获得`[3,5,7]`？

{{ select(2) }}

- A. num[3:7:1]
- B. num[3:8:2]
- C. num[2:7:2]
- D. num[2:8:1]

---

3. 代码中`length`的值为多少？

```python
str1="我命由我不由天,Yes or No?"
length=len(str1)
```

{{ select(3) }}

- A. 16
- B. 17
- C. 18
- D. 11

---

4. 运行代码后，输出结果是？

```python
name={"袁隆平":"科学家","杨红樱":"作家","姚明":"运动员"}
print(name)
```

{{ select(4) }}

- A. {"袁隆平","杨红樱","姚明":"袁隆平","杨红樱","姚明"}
- B. {"袁隆平""杨红樱""姚明"}""袁隆平""杨红樱","姚明"
- C. {'袁隆平:"科学家,杨红樱][作家','姚明:'运动员'
- D. {'袁隆平':'科学家','杨红樱':'作家','姚明':'运动员'}

---

5. 下列程序会输出多少个"#"？

```python
for tt in range(1,6):
    print("#"*tt)
```

{{ select(5) }}

- A. 15
- B. 21
- C. 14
- D. 20

---

6. 列表`scores=[88,92,77,90]`，将分数从小到大排序的正确操作是？

{{ select(6) }}

- A. scores.sort()
- B. scores.sorted()
- C. scores.reverse()
- D. scores.max()

---

7. 代码输出结果是？

```python
lst = [1,2,3]
lst.remove(2)
print(lst)
```

{{ select(7) }}

- A. [1,3]
- B. [1,2,3]
- C. [2,3]
- D. 报错

---

8. 关于Python元组的描述，正确的是？

{{ select(8) }}

- A. 元组创建后可通过`tup[索引]=值`修改元素
- B. 元组支持`append()`和`insert()`方法
- C. 元组一旦创建不可修改
- D. 代码`t=(1,2);t[1]=3`能将元组改为(1,3)

---

9. 字典`my_dict={"name":"Tom","age":10,"city":"New York"}`，获取所有键的操作是？

{{ select(9) }}

- A. my_dict.values()
- B. my_dict.items()
- C. my_dict.keys()
- D. my_dict.get_keys()

---

10. 代码输出结果是？

```python
data = [10,20,30]
total = 0
for value in data:
    if value==20:
        continue
    total += value
print(total)
```

{{ select(10) }}

- A. 40
- B. 60
- C. 20
- D. 30

---

11. 列表`moon_temp=[-180,125,-95,70]`，获取"125"的正确索引是？

{{ select(11) }}

- A. moon_temp[0]
- B. moon_temp[1]
- C. moon_temp[2]
- D. moon_temp[4]

---

12. 列表`summer=['立夏','小满','芒种','白露','夏至','小暑','大暑']`，将"白露"移到`autumn`列表"处暑"之后，正确程序是？

{{ select(12) }}

- A. summer.remove('白露'); autumn.insert(2,'白露')
- B. summer.pop('白露'); autumn.append('白露')
- C. summer.pop(summer.index('白露')); autumn.append('白露')
- D. del summer[3]; autumn.extend(['白露'])

---

13. 字符串`s1="it was the best of times"`，输出"best"的正确选项是？

{{ select(13) }}

- A. print(s1[12:16])
- B. print(s1[11:15])
- C. print(s1[11:16])
- D. print(s1[4])

---

14. 字典`province={"浙江省":"杭州","福建省":"厦门","江西省":"南昌"}`，执行`province['福建省']='福州'`后，`print(province)`的结果是？

{{ select(14) }}

- A. {"浙江省":"杭州","福建省":"福州","江西省":"南昌"}
- B. {"浙江省":"杭州","福建省":"厦门","江西省":"南昌","福建省":"福州"}
- C. "福建省":"福州","浙江省":"杭州","福建省":"厦门","江西省":"南昌"
- D. "浙江省":"杭州","福建省":"厦门","福州","江西省":"南昌"

---

15. 字典`books={'西游记':'小电','水浒传':'小宇','三国演义':'小会'}`，删除小会的借阅记录，正确操作是？

{{ select(15) }}

- A. del books['小会']
- B. del books['三国演义']
- C. books.clear()
- D. books.remove('三国演义')

---

16. 天气提醒程序：判断是否下雨，下雨在家玩，否则出去玩，用哪种流程控制结构？

{{ select(16) }}

- A. 单分支if
- B. 二分支if-else
- C. 多分支if-elif-else
- D. for循环

---

17. 列表`long=['游科互动','深度求索','云深处','宇树科技','强脑科技','群核科技']`，获取"宇树科技"的正确语句是？

{{ select(17) }}

- A. long[1]
- B. long[2]
- C. long[3]
- D. long[4]

---

18. 列表`ls=[2025,0,1,"python"]`的长度是？

{{ select(18) }}

- A. 5
- B. 6
- C. 7
- D. 4

---

19. 对元组`tp=(10,20,30,5,60)`的操作，错误的是？

{{ select(19) }}

- A. new=list(tp); print(new)
- B. new=sorted(tp); print(new)
- C. print(tp.sort())
- D. new=list(tp); new.sort(); print(new)

---

20. 猜数字游戏：`n=5`，输入15、8、9后，输出结果是？

```python
while n>0:
    num = int(input())
    n -=1
    if num ==10:
        print("猜对了"); break
    elif num>10:
        print("太大了")
    else:
        print("太小了")
    print(f"你还有{n}次机会")
```

{{ select(20) }}

- A. 太大了
  你还有3次机会
  太小了
  你还有2次机会
  太小了
  你还有1次机会
- B. 太大了
  你还有3次机会
  太小了
  你还有2次机会
  太小了
  你还有1次机会
- C. 太大了
  你还有2次机会
  太小了
  你还有1次机会
  太小了
  你还有0次机会
- D. 太大了
  你还有3次机会
  太小了
  你还有1次机会
  太小了
  你还有0次机会

---

21. 代码`print("低空经济 脑控万物 量子计算 大模型".split())`的输出是？

{{ select(21) }}

- A. ['低空经济','脑控万物',',','量子计算','大模型']
- B. ['低空经济脑控万物量子计算大模型']
- C. 报错
- D. ['低空经济','脑控万物','量子计算','大模型']

---

22. 成绩判断代码：90≥sc→A，80≤sc<90→B，70≤sc<80→C，60≤sc<70→D，sc<60→E。小明语文79.9、数学90、英语89.9，等级分别是？

{{ select(22) }}

- A. A,B,C
- B. C,A,B
- C. B,C,B
- D. C,A,A

---

23. 存储列表类型数据的变量是？

{{ select(23) }}

- A. L=(1,2,3)
- B. L="1,2,3"
- C. L={"num":'1,2,3'}
- D. L=[1,2,3]

---

24. 元组`t=(1,3,4,5,6)`，`t[2:]`的结果是？

{{ select(24) }}

- A. (4,5,6)
- B. [4,5,6]
- C. (4,5)
- D. (3,4,5,6)

---

25. 代码描述错误的是？

```python
age = input()
if int(age)<12:
    print("小学生")
```

{{ select(25) }}

- A. input()功能是输入
- B. if是分支结构关键字
- C. print()功能是输出
- D. 输入10，结果什么都不会输出

---

## 二、判断题（每题2分，共20分）

26. 双重循环中，continue可以退出所有层级的循环。

{{ select(26) }}

- A. 正确
- B. 错误

---

27. 执行`s="Python";print(s*3.5)`会输出重复3.5次的"Python"字符串。

{{ select(27) }}

- A. 正确
- B. 错误

---

28. 元组中的元素必须是相同类型的数据。

{{ select(28) }}

- A. 正确
- B. 错误

---

29. 运行代码`nums=["白日","依山尽","黄河","入海流"];print(nums.index("黄河"))`，最终打印结果是3。

{{ select(29) }}

- A. 正确
- B. 错误

---

30. 元组`colors=('红色','蓝色','绿色')`创建后，可用`colors[1]='黄色'`修改第二个元素。

{{ select(30) }}

- A. 正确
- B. 错误

---

31. 在多分支语句`if-elif-else`中，else不可以省略。

{{ select(31) }}

- A. 正确
- B. 错误

---

32. `while`属于循环结构语句的关键字，变量命名时不可使用。

{{ select(32) }}

- A. 正确
- B. 错误

---

33. 执行代码`s="abcdefg";sub_str = s[1:4]`，`sub_str`的值为"bcd"。

{{ select(33) }}

- A. 正确
- B. 错误

---

34. 执行代码`d={1:2,2:2,3:2,4:2};print(d[0])`，运行结果为2。

{{ select(34) }}

- A. 正确
- B. 错误

---

35. 执行单分支语句`a=90;else a>60:print('90大于60')`，程序不会报错。

{{ select(35) }}

- A. 正确
- B. 错误
