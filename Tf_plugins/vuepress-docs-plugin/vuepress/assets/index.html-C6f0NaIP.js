import{_ as s}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as a,d as e,o as l}from"./app-By3Qqt_-.js";const i={};function p(c,n){return l(),a("div",null,[...n[0]||(n[0]=[e(`<h1 id="常用的内置关键字与内置方法" tabindex="-1"><a class="header-anchor" href="#常用的内置关键字与内置方法"><span>常用的内置关键字与内置方法</span></a></h1><h2 id="常用的内置关键字" tabindex="-1"><a class="header-anchor" href="#常用的内置关键字"><span>常用的内置关键字</span></a></h2><h2 id="常用的内置函数方法" tabindex="-1"><a class="header-anchor" href="#常用的内置函数方法"><span>常用的内置函数方法</span></a></h2><h3 id="运算类" tabindex="-1"><a class="header-anchor" href="#运算类"><span>运算类</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">abs</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># abs函数用来返回一个数值的绝对值，输入的参数x可以是整数浮点数，也可以是复数。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">max</span><span class="token punctuation">(</span>x，key<span class="token operator">=</span><span class="token boolean">None</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#max函数的参数x是可迭代对象或者是多个参数，返回其中的最大的元素。max函数可以通过指定关键参数key，来返回最大值。如果有多个最大值时，则返回第一个值。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">min</span><span class="token punctuation">(</span>x<span class="token punctuation">,</span>key<span class="token operator">=</span><span class="token boolean">None</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#min函数同max函数的用法是一致的，min函数返回的是可迭代对象或者是多个参数中的最小值。</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span class="token builtin">pow</span><span class="token punctuation">(</span>x<span class="token punctuation">,</span>y<span class="token punctuation">,</span> mod<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#pow函数当只有x和y两个参数时，它的作用是返回x的y次幂，当存在第三个参数mod存在时，pow函数是在x的y次幂基础上对mod进行取余。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">round</span><span class="token punctuation">(</span>number<span class="token punctuation">,</span>ndigits<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#返回 number舍入到小数点后 ndigits位精度的值。如果 ndigits被省略， 则返回最接近number的整数。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">sum</span><span class="token punctuation">(</span>x<span class="token punctuation">,</span> start<span class="token operator">=</span><span class="token number">0</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#sum函数是将x中的数值进行从左向右的求和，然后加上start的数值，求和并返回总值。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">divmod</span><span class="token punctuation">(</span>a<span class="token punctuation">,</span> b<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#divmod函数将a, b两个数值作为实参，返回a/b的商值和余数。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="转换类型" tabindex="-1"><a class="header-anchor" href="#转换类型"><span>转换类型</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">int</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 对于输入的数字或者是字符串x，返回x的整数形式，如果x数值为空时，则返回0。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">float</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 对于输入的数字或者是字符串x，返回x的浮点数形式，如果x数值为空时，则返回0.0。</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span class="token builtin">bool</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 判断参数x是否为真，并返回True或者False。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">str</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 将输入值x转换为字符串类型，并将结果进行返回。</span></span>
<span class="line"></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="进制转换" tabindex="-1"><a class="header-anchor" href="#进制转换"><span>进制转换</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">bin</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 将输入的整数x转变为一个前缀为“0b”的二进制字符串。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">oct</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 将输入的整数x转变为一个前缀为“0o”的八进制字符串。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">hex</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 将输入的整数x转变为一个前缀为“0x”的十六进制字符串。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">ord</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 对于输入的单个Unicode 字符，返回它对应的Unicode 码整数。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">chr</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># chr函数是ord函数的逆函数，其作用是对于输入的整数值x，返回其对应的单个Unicode 字符。</span></span>
<span class="line"></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="数组操作" tabindex="-1"><a class="header-anchor" href="#数组操作"><span>数组操作</span></a></h3><p>Python的内置函数，除了数值，字符串等操作，还包括了tuple、list、set等一系列的数组操作。</p><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">list</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># list函数将传入的参数改变为新的列表并进行返回，除此之外，list本身也是一个可变对象。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">dict</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># dict函数将传入的参数值x改变成新的字典对象并进行返回，字典对象为不可变类型。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">set</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># set函数用来将输入的参数x，改变为新的集合对象，并进行返回，set对象为可变对象，同时它内部的元素都是不可重复的。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">frozenset</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 从名字上可以看出，frozenset函数同样可以完成set函数的功能，但是frozenset对象属于不可变对象。因此无法向frozenset对象中插入数值。</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span class="token builtin">tuple</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># tuple函数将传入的参数值x改变成新的元组对象并进行返回，元组对象为不可变类型。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">enumerate</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># enumerate函数返回的是一个枚举对象，输入的参数x是一个可迭代对象。返回的枚举对象通过__next__()方法来返回一个元组，包含了计数值和通过迭代获取得到的x中的数值。</span></span>
<span class="line"></span>
<span class="line"> <span class="token builtin">range</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment">#range函数通过输入值x生成不可变的数字序列，通常用于在 for 循环中循环指定的次数。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="排序操作" tabindex="-1"><a class="header-anchor" href="#排序操作"><span>排序操作</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">sorted</span><span class="token punctuation">(</span>x<span class="token punctuation">,</span> key<span class="token operator">=</span><span class="token boolean">None</span><span class="token punctuation">,</span> reverse<span class="token operator">=</span><span class="token boolean">False</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 对可迭代对象x进行排序，并返回一个排序后的新的对象，key参数可以规定按照何种方式进行比较，而reverse为True时，表示按照递减的方式进行排序</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">reversed</span><span class="token punctuation">(</span>seq <span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 对于输入的序列seq进行反转，生成新的可迭代对象并返回。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="对象元素操作" tabindex="-1"><a class="header-anchor" href="#对象元素操作"><span>对象元素操作</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token builtin">help</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 通过help函数可以帮助用户来查询不同对象的信息，包括内置方法、属性等信息。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">id</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 返回object对象的标识值，这个标识值是一个整数，且在对象的生命周期中保持唯一。</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span class="token builtin">hash</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 如果object对象有对应的哈希值则返回对应的哈希值。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">type</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># type函数用来返回object对象的所属类型。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">dir</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 如果没有实参object，则dir函数返回的是当前本地作用域中的名称列表。如果有实参object，函数会尝试返回该对象的有效属性列表。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">len</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 返回object对象的长度或者是所包含的元素个数。</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span class="token builtin">repr</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># repr函数返回包含一个对象的可打印表示形式的字符串。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">ascii</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># ascii函数与repr的功能相似，ascii函数返回包含一个对象的可打印表示形式的字符串，，但是与repr函数不同的是，ascii() 比 repr() 多一个对于非 ASCII 编码的字符的转义处理。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">format</span><span class="token punctuation">(</span>value <span class="token punctuation">,</span>format_spec<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># format函数将 value 转换为 由format_spec参数控制的“格式化”表示形式，多用在字符串的格式化处理中。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">vars</span><span class="token punctuation">(</span><span class="token builtin">object</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 函数返回模块、类、实例等具有 _dict__属性的对象的 _dict__属性。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="人机交互操作" tabindex="-1"><a class="header-anchor" href="#人机交互操作"><span>人机交互操作</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"><span class="token keyword">print</span><span class="token punctuation">(</span><span class="token operator">*</span>objects<span class="token punctuation">,</span> end<span class="token operator">=</span><span class="token string">&#39;\\n&#39;</span><span class="token punctuation">,</span> <span class="token builtin">file</span><span class="token operator">=</span>sys<span class="token punctuation">.</span>stdout<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 将objects的内容打印到file指定的文本流当中，末尾以end作为结束。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">input</span><span class="token punctuation">(</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 用来读取用户的输入值。</span></span>
<span class="line"></span>
<span class="line"><span class="token builtin">open</span><span class="token punctuation">(</span><span class="token builtin">file</span><span class="token punctuation">,</span> mode<span class="token operator">=</span><span class="token string">&#39;r&#39;</span><span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># 打开 file 并返回对应的 file object对象，mode对应的是向file文件进行读或者是写等操作。如果该文件不能被打开，那么程序会引发 OSError报错。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="编译操作" tabindex="-1"><a class="header-anchor" href="#编译操作"><span>编译操作</span></a></h3><div class="language-python line-numbers-mode" data-highlighter="prismjs" data-ext="py"><pre><code class="language-python"><span class="line"></span>
<span class="line"><span class="token builtin">eval</span><span class="token punctuation">(</span>expression<span class="token punctuation">)</span></span>
<span class="line"></span>
<span class="line"><span class="token comment"># eval函数会将字符串expression当成有效的表达式来求值并返回计算结果。eval函数只能单个运算表达式，而不能是复杂的代码逻辑或者是赋值运算。</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,20)])])}const d=s(i,[["render",p]]),u=JSON.parse('{"path":"/docs/python/python_level2/python_08_inner/","title":"常用的内置关键字与内置方法","lang":"zh-CN","frontmatter":{"feed":false,"seo":false,"head":[]},"git":{"createdTime":1698335100000,"updatedTime":1719213200000,"contributors":[{"name":"Tivonfeng","username":"Tivonfeng","email":"tivonfeng@163.com","commits":8,"url":"https://github.com/Tivonfeng"}]},"readingTime":{"minutes":5.22,"words":1565},"filePathRelative":"docs/python/python_level2/python_08_inner/index.md"}');export{d as comp,u as data};
