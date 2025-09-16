import{_ as s}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as i,d as a,o as e}from"./app-CeA3Z9s4.js";const l={};function p(d,n){return e(),i("div",null,[...n[0]||(n[0]=[a(`<h1 id="枚举法" tabindex="-1"><a class="header-anchor" href="#枚举法"><span>枚举法</span></a></h1><h2 id="〽️-什么是枚举法" tabindex="-1"><a class="header-anchor" href="#〽️-什么是枚举法"><span>〽️ 什么是枚举法</span></a></h2><p>枚举法也称作穷举法，指一一列举所有可能的答案。</p><p>啥意思呢？比如请问1-10中，所有的偶数有哪些？那么我们从1数到10，把是偶数的数字2、4、6、8一一写下来，这样解决问题的方法就叫做枚举法。</p><h2 id="〽️-枚举法的解题思路-步骤" tabindex="-1"><a class="header-anchor" href="#〽️-枚举法的解题思路-步骤"><span>〽️ 枚举法的解题思路（步骤）</span></a></h2><ol><li><p>确定求解问题答案的范围</p></li><li><p>枚举（一一列举）所有可能的答案</p></li><li><p>从列举出所有可能的答案中，筛选出最终的答案</p></li><li><p>（可选）考虑枚举和筛选过程的优化加速</p></li></ol><h1 id="〽️-枚举法的优缺点" tabindex="-1"><a class="header-anchor" href="#〽️-枚举法的优缺点"><span>〽️ 枚举法的优缺点</span></a></h1><p>优点：</p><ul><li>思路不复杂，甚至可以说是简单，整个过程就是一一列举，然后选出符合条件的答案</li></ul><p>缺点：</p><ul><li><p>数据量提升时，易产生超时现象</p></li><li><p>为了解决超时，常规思路是借助数据结构、设置一些约束条件、数学公式运算等进行优化</p></li></ul><h2 id="〽️-例题" tabindex="-1"><a class="header-anchor" href="#〽️-例题"><span>〽️ 例题</span></a></h2><h3 id="_4-1-经典找质数" tabindex="-1"><a class="header-anchor" href="#_4-1-经典找质数"><span>4.1 经典找质数</span></a></h3><p>信息学奥赛一本通：2040</p><p><a href="http://ybt.ssoier.cn:8088/problem_show.php?pid=2040" target="_blank" rel="noopener noreferrer">http://ybt.ssoier.cn:8088/problem_show.php?pid=2040</a></p><p>【题目描述】</p><p>求出<em>n</em>(2≤<em>n</em>≤1000)以内的全部质数。</p><p>【输入格式】</p><p>输入<em>n</em>。</p><p>【输出格式】</p><p>输出包含多行：</p><p>由小到大的质数。</p><p>【样例输入】</p><p>10</p><p>【样例输出】</p><p>2</p><p>3</p><p>5</p><p>7</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">//判断是不是质数 </span>
<span class="line">//4. 可考虑优化（选做）</span>
<span class="line">bool check(int num){</span>
<span class="line">    for(int i = 2; i &lt; num; i++){</span>
<span class="line">        if(num % i == 0){</span>
<span class="line">            return false;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return true;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">int main(){</span>
<span class="line">    //1. 确定求解问题答案的范围 </span>
<span class="line">    int n = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    //2. 枚举所有可能的答案 </span>
<span class="line">    for(int i = 2; i &lt; n; i++){</span>
<span class="line">        //3. 从列举出所有可能的答案中，筛选出最终的答案</span>
<span class="line">        if(check(i)){</span>
<span class="line">            cout &lt;&lt; i &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-2-猜猜父亲今年多少岁" tabindex="-1"><a class="header-anchor" href="#_4-2-猜猜父亲今年多少岁"><span>4.2 猜猜父亲今年多少岁</span></a></h3><p>【题目描述】</p><p>小明的父亲说：”我的年龄是一个两位数，我的儿子比我小27岁。如果把我年龄的数字交换位置，恰好就是我儿子的年龄“。请问小明的父亲和小明所有可能的年龄是多少？</p><p>【输入格式】</p><p>无</p><p>【输出格式】</p><p>所有可能的父亲年龄和儿子年龄</p><p>输出包含多行：</p><p>后续多行，一行两个数字，第一个为父亲的年龄，第二个为儿子的年龄，用空格隔开</p><p>最后一行一个数字，表示总共多少种可能</p><p>【样例输入】</p><p>无</p><p>【样例输出】</p><p>无</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int one = 0;</span>
<span class="line">    int ten = 0;</span>
<span class="line">    int sonAge = 0;</span>
<span class="line">    int count = 0;</span>
<span class="line">    for(int fatherAge = 27; fatherAge &lt; 100; fatherAge++){</span>
<span class="line">        one = fatherAge % 10;</span>
<span class="line">        ten = fatherAge / 10;</span>
<span class="line">        if((fatherAge - 27) == (one * 10 + ten)){</span>
<span class="line">            count++;</span>
<span class="line">            sonAge = one * 10 + ten;</span>
<span class="line">            cout &lt;&lt; fatherAge &lt;&lt; &quot; &quot; &lt;&lt; sonAge &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; count;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-3-数字拼接" tabindex="-1"><a class="header-anchor" href="#_4-3-数字拼接"><span>4.3 数字拼接</span></a></h3><p>【题目描述】</p><p>输入一个整数n（3≤n≤9），从0到n中任意选择三个整数（包括0和n），组成一个三位数（0不能作为百位），三位数各位数字不能重复，请问这个三位数是奇数有多少种可能？</p><p>【输入格式】</p><p>输入<em>n</em>。</p><p>【输出格式】</p><p>输出包含一行：</p><p>一行一个数字，表示总共多少种可能</p><p>【样例输入】</p><p>3</p><p>【样例输出】</p><p>8</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int count = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 1; i &lt;= n; i++){</span>
<span class="line">        for(int j = 0; j &lt;= n; j++){</span>
<span class="line">            if(j != i){</span>
<span class="line">                for(int k = 0; k &lt;= n; k++){</span>
<span class="line">                    if((k != i) &amp;&amp; (k != j)){</span>
<span class="line">                        if(k % 2 == 1){</span>
<span class="line">                            count++;</span>
<span class="line">                        }</span>
<span class="line">                    }</span>
<span class="line">                }</span>
<span class="line">                //优化 </span>
<span class="line">//              for(int k = 1; k &lt;= n; k += 2){</span>
<span class="line">//                  if((k != i) &amp;&amp; (k != j)){</span>
<span class="line">//                      count++;</span>
<span class="line">//                  }</span>
<span class="line">//              }</span>
<span class="line">            }</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; count;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-4-特殊的自然数" tabindex="-1"><a class="header-anchor" href="#_4-4-特殊的自然数"><span>4.4 特殊的自然数</span></a></h3><p>【题目描述】</p><p>一个十进制自然数，它的七进制和九进制表示都是三位数，且七进制表示倒过来就是九进制表示，请问十进制自然数是多少？</p><p>【输入格式】</p><p>无</p><p>【输出格式】</p><p>输出可能包含多行，依次输出十进制、七进制、九进制</p><p>【样例输入】</p><p>无</p><p>【样例输出】</p><p>无</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int sevenOne, sevenTen, sevenHundred;</span>
<span class="line">    int nineOne, nineTen, nineHundred;</span>
<span class="line">    for(int i = 81; i &lt;= 342; i++){</span>
<span class="line">        sevenOne = i % 7;</span>
<span class="line">        sevenTen = (i / 7) % 7;</span>
<span class="line">        sevenHundred = i / 7 / 7;</span>
<span class="line">        nineOne = i % 9;</span>
<span class="line">        nineTen = (i / 9) % 9;</span>
<span class="line">        nineHundred = i / 9 / 9;</span>
<span class="line">        if((sevenOne == nineHundred) &amp;&amp; (sevenTen == nineTen) &amp;&amp; (sevenHundred == nineOne)){</span>
<span class="line">            cout &lt;&lt; i &lt;&lt; endl;</span>
<span class="line">            cout &lt;&lt; sevenHundred &lt;&lt; sevenTen &lt;&lt; sevenOne &lt;&lt; endl;</span>
<span class="line">            cout &lt;&lt; nineHundred &lt;&lt; nineTen &lt;&lt; nineOne &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_5-课后习题" tabindex="-1"><a class="header-anchor" href="#_5-课后习题"><span>5 课后习题</span></a></h2><h3 id="_5-1-合数" tabindex="-1"><a class="header-anchor" href="#_5-1-合数"><span>5.1 合数</span></a></h3><p>【题目描述】</p><p>合数指除了1和其自身还有其他的因子，输入一个整数n，找出n以内的所有的合数。</p><p>【输入格式】</p><p>输入<em>n</em>。</p><p>【输出格式】</p><p>输出包含多行：</p><p>一行一个数字，表示不同的合数。</p><p>【样例输入】</p><p>10</p><p>【样例输出】</p><p>4</p><p>6</p><p>8</p><p>9</p><p>10</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">bool check(int num){</span>
<span class="line">    for(int i = 2; i &lt; num; i++){</span>
<span class="line">        if(num % i == 0){</span>
<span class="line">            return true;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return false;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 2; i &lt; n; i++){</span>
<span class="line">        if(check(i)){</span>
<span class="line">            cout &lt;&lt; i &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_5-2-完数" tabindex="-1"><a class="header-anchor" href="#_5-2-完数"><span>5.2 完数</span></a></h3><p>【题目描述】</p><p>完数指除了其自身，所有其他的因子的和，输入一个整数n，找出n以内的所有的完数。</p><p>【输入格式】</p><p>输入<em>n</em>。</p><p>【输出格式】</p><p>输出包含多行：</p><p>一行一个数字，表示不同的完数。</p><p>【样例输入】</p><p>100</p><p>【样例输出】</p><p>6</p><p>28</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">bool check(int num){</span>
<span class="line">    int sum = 0; </span>
<span class="line">    for(int i = 1; i &lt; num; i++){</span>
<span class="line">        if(num % i == 0){</span>
<span class="line">            sum += i;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    if(sum == num){</span>
<span class="line">        return true;</span>
<span class="line">    }</span>
<span class="line">    return false;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 2; i &lt;= n; i++){</span>
<span class="line">        if(check(i)){</span>
<span class="line">            cout &lt;&lt; i &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line">//6 = 1 + 2 + 3</span>
<span class="line">//28 = 1 + 2 + 4 + 7 + 14</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_5-3-经典之水仙花数" tabindex="-1"><a class="header-anchor" href="#_5-3-经典之水仙花数"><span>5.3 经典之水仙花数</span></a></h3><p>【题目描述】</p><p>水仙花数是一个三位数，它的各位数字的三次方之和等于其自身，找出所有的水仙花数。</p><p>【输入格式】</p><p>无。</p><p>【输出格式】</p><p>输出包含多行：</p><p>一行一个数字，表示不同的水仙花数。</p><p>【样例输入】</p><p>无。</p><p>【样例输出】</p><p>153</p><p>370</p><p>371</p><p>407</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">bool check(int num){</span>
<span class="line">    int one = num % 10;</span>
<span class="line">    int ten = ((num - one) / 10) % 10;</span>
<span class="line">    int hundred = num / 100;</span>
<span class="line">    if((pow(one, 3) + pow(ten, 3) + pow(hundred, 3)) == num){</span>
<span class="line">        return true;</span>
<span class="line">    }</span>
<span class="line">    return false;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line">int main(){</span>
<span class="line">    for(int i = 100; i &lt; 1000; i++){</span>
<span class="line">        if(check(i)){</span>
<span class="line">            cout &lt;&lt; i &lt;&lt; endl;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_6-真题指引" tabindex="-1"><a class="header-anchor" href="#_6-真题指引"><span>6 真题指引</span></a></h2><p>【CSP-J 2021】分糖果：洛谷 P7909</p><p>【CSP-J 2022】解密：洛谷 P8814</p>`,121)])])}const v=s(l,[["render",p]]),t=JSON.parse('{"path":"/docs/csp/csp_level3/csp_02_enum/","title":"枚举法","lang":"zh-CN","frontmatter":{},"git":{"createdTime":1704437042000,"updatedTime":1704437042000,"contributors":[{"name":"Tivonfeng","username":"Tivonfeng","email":"tivonfeng@163.com","commits":1,"url":"https://github.com/Tivonfeng"}]},"readingTime":{"minutes":5.01,"words":1503},"filePathRelative":"docs/csp/csp_level3/csp_02_enum/index.md","excerpt":"\\n<h2>〽️ 什么是枚举法</h2>\\n<p>枚举法也称作穷举法，指一一列举所有可能的答案。</p>\\n<p>啥意思呢？比如请问1-10中，所有的偶数有哪些？那么我们从1数到10，把是偶数的数字2、4、6、8一一写下来，这样解决问题的方法就叫做枚举法。</p>\\n<h2>〽️ 枚举法的解题思路（步骤）</h2>\\n<ol>\\n<li>\\n<p>确定求解问题答案的范围</p>\\n</li>\\n<li>\\n<p>枚举（一一列举）所有可能的答案</p>\\n</li>\\n<li>\\n<p>从列举出所有可能的答案中，筛选出最终的答案</p>\\n</li>\\n<li>\\n<p>（可选）考虑枚举和筛选过程的优化加速</p>\\n</li>\\n</ol>"}');export{v as comp,t as data};
