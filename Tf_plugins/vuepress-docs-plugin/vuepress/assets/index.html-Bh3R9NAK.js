import{_ as s}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as a,d as i,o as e}from"./app-By3Qqt_-.js";const l={};function p(d,n){return e(),a("div",null,[...n[0]||(n[0]=[i(`<h1 id="模拟法" tabindex="-1"><a class="header-anchor" href="#模拟法"><span>模拟法</span></a></h1><h2 id="_1-什么是模拟法" tabindex="-1"><a class="header-anchor" href="#_1-什么是模拟法"><span>1 什么是模拟法</span></a></h2><p>读完题目发现无法使用已学过的算法模型，如枚举、贪心、回溯等算法来解决当前问题。这个时候可以考虑使用模拟法，就是利用计算机对当前题目一次又一次的模拟或者说一遍又一遍执行题目所描述的过程。通过设置相应的变量参数，随着模拟过程不断变化，最终得到相应的答案。</p><h2 id="_2-模拟法的解题思路" tabindex="-1"><a class="header-anchor" href="#_2-模拟法的解题思路"><span>2 模拟法的解题思路</span></a></h2><p>大道至简，模拟法解决问题的方法就是题目怎么说，我们怎么做。用代码一步一步实现它，具体的计算过程交给计算机，它会给我们最终的答案。</p><h2 id="_3-模拟法的优缺点" tabindex="-1"><a class="header-anchor" href="#_3-模拟法的优缺点"><span>3 模拟法的优缺点</span></a></h2><p>没啥缺点，优点显著。</p><p>题目咋说，你就咋做，要啥自行车。</p><h2 id="_4-例题" tabindex="-1"><a class="header-anchor" href="#_4-例题"><span>4 例题</span></a></h2><h3 id="_4-1-金币总数" tabindex="-1"><a class="header-anchor" href="#_4-1-金币总数"><span>4.1 金币总数</span></a></h3><p>信息学奥赛一本通：1100</p><p><a href="http://ybt.ssoier.cn:8088/problem_show.php?pid=1100" target="_blank" rel="noopener noreferrer">http://ybt.ssoier.cn:8088/problem_show.php?pid=1100</a></p><p>【题目描述】</p><p>国王将金币作为工资，发放给忠诚的骑士。第1天，骑士收到一枚金币；之后两天(第2天和第3天)里，每天收到两枚金币；之后三天(第4、5、6天)里，每天收到三枚金币；之后四天(第7、8、9、10天)里，每天收到四枚金币……这种工资发放模式会一直这样延续下去：当连续n天每天收到n枚金币后，骑士会在之后的连续n+1天里，每天收到n+1枚金币(n为任意正整数)。</p><p>你需要编写一个程序，确定从第一天开始的给定天数内，骑士一共获得了多少金币。</p><p>【输入格式】</p><p>一个整数（范围1到10000），表示天数。</p><p>【输出格式】</p><p>骑士获得的金币数。</p><p>【样例输入】</p><p>6</p><p>【样例输出】</p><p>14</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int gold = 1;</span>
<span class="line">	int day = 0;</span>
<span class="line">    int count = 0;</span>
<span class="line">    int n = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 1; i &lt;= n; i++){</span>
<span class="line">        count += gold;</span>
<span class="line">        day++;</span>
<span class="line">        if(day == gold){</span>
<span class="line">            day = 0;</span>
<span class="line">            gold++;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">	cout &lt;&lt; count;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int day = 1;</span>
<span class="line">    int count = 0;</span>
<span class="line">    int n = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    while(n &gt;= day){</span>
<span class="line">        n -= day;</span>
<span class="line">        count += day * day;</span>
<span class="line">        day++;</span>
<span class="line">    }</span>
<span class="line">    count += n * day;</span>
<span class="line">    cout &lt;&lt; count;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-2-找出丢失的数" tabindex="-1"><a class="header-anchor" href="#_4-2-找出丢失的数"><span>4.2 找出丢失的数</span></a></h3><p>洛谷：6352</p><p>【题目描述】</p><p>你原本有 4 个数，它们从小到大排序后构成了等差数列。</p><p>但是现在丢失了一个数，并且其余的三个数的顺序也被打乱了。</p><p>请你找出第四个数。</p><p>【输入格式】</p><p>输入一行三个整数。保证这些数字在 −100∼100 之间。</p><p>【输出格式】</p><p>输出一行一个数，为第四个数。</p><p><strong>方案可能不是唯一的，但保证一定存在</strong></p><p>【样例输入】</p><p>4 6 8</p><p>【样例输出】</p><p>10</p><p>【样例输入】</p><p>10 1 4</p><p>【样例输出】</p><p>7</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int arr[3] = {0};</span>
<span class="line">    cin &gt;&gt; arr[0] &gt;&gt; arr[1] &gt;&gt; arr[2];</span>
<span class="line">    sort(arr, arr + 3);</span>
<span class="line">    if(arr[1] - arr[0] == arr[2] - arr[1]){</span>
<span class="line">        cout &lt;&lt; arr[2] + arr[2] - arr[1] &lt;&lt; endl;</span>
<span class="line">    }</span>
<span class="line">    else if(arr[1] - arr[0] &gt; arr[2] - arr[1]){</span>
<span class="line">        cout &lt;&lt; arr[0] + arr[2] - arr[1] &lt;&lt; endl;</span>
<span class="line">    }</span>
<span class="line">    else if(arr[1] - arr[0] &lt; arr[2] - arr[1]){</span>
<span class="line">        cout &lt;&lt; arr[1] + arr[1] - arr[0] &lt;&lt; endl;</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-3-约瑟夫环" tabindex="-1"><a class="header-anchor" href="#_4-3-约瑟夫环"><span>4.3 约瑟夫环</span></a></h3><p>信息学奥赛一本通：2037</p><p><a href="http://ybt.ssoier.cn:8088/problem_show.php?pid=2037" target="_blank" rel="noopener noreferrer">http://ybt.ssoier.cn:8088/problem_show.php?pid=2037</a></p><p>【题目描述】</p><p><em>N</em>个人围成一圈，从第一个人开始报数，数到<em>M</em>的人出圈；再由下一个人开始报数，数到<em>M</em>的人出圈；…输出依次出圈的人的编号。</p><p>【输入格式】</p><p>输入<em>N</em>和<em>M</em>。</p><p>对于所有数据，2≤<em>N</em>,<em>M</em>≤1000。</p><p>【输出格式】</p><p>输出一行，依次出圈的人的编号。</p><p>【样例输入】</p><p>8 5</p><p>【样例输出】</p><p>5 2 8 7 1 4 6 3</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">	int N = 0;</span>
<span class="line">	int M = 0;</span>
<span class="line">	int people[1010] = {0};</span>
<span class="line">	int index = 0;</span>
<span class="line">	cin &gt;&gt; N &gt;&gt; M;</span>
<span class="line">	for(int i = 1; i &lt;= N; i++){</span>
<span class="line">		people[i] = i;</span>
<span class="line">	}</span>
<span class="line">	while(N != 0){</span>
<span class="line">		index++;</span>
<span class="line">		int id = people[1];</span>
<span class="line">		for(int i = 2; i &lt;= N; i++){</span>
<span class="line">			people[i - 1] = people[i];</span>
<span class="line">		}</span>
<span class="line">		if(index == M){</span>
<span class="line">			cout &lt;&lt; id &lt;&lt; &quot; &quot;;</span>
<span class="line">			index = 0;</span>
<span class="line">			N--;</span>
<span class="line">		}</span>
<span class="line">		else{</span>
<span class="line">			people[N] = id;</span>
<span class="line">		}</span>
<span class="line">	}</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">	int N = 0;</span>
<span class="line">	int M = 0;</span>
<span class="line">	int index = -1;</span>
<span class="line">	int count = 0;</span>
<span class="line">	int people[1010] = {0};</span>
<span class="line">	cin &gt;&gt; N &gt;&gt; M;</span>
<span class="line"></span>
<span class="line">	while(count &lt; N){</span>
<span class="line">		int num = 0;</span>
<span class="line">		while(num &lt; M){</span>
<span class="line">			index = (index + 1) % N;</span>
<span class="line">			if(people[index] == 0){</span>
<span class="line">				num++;</span>
<span class="line">				if(num == M){</span>
<span class="line">                    //易错点，输出需要+1</span>
<span class="line">					cout &lt;&lt; index + 1 &lt;&lt; &quot; &quot;;</span>
<span class="line">					people[index] = -1;</span>
<span class="line">					count++;</span>
<span class="line">				}</span>
<span class="line">			}</span>
<span class="line">		}</span>
<span class="line">		</span>
<span class="line">	}</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">//链表有点绕，慢慢来</span>
<span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">struct Node{</span>
<span class="line">	int id;</span>
<span class="line">	Node* next;</span>
<span class="line">};</span>
<span class="line">int main(){</span>
<span class="line">	int N = 0;</span>
<span class="line">	int M = 0;</span>
<span class="line">	int index = 0;</span>
<span class="line">	cin &gt;&gt; N &gt;&gt; M;</span>
<span class="line">	Node* head = new Node();</span>
<span class="line">	head-&gt;id = 1;</span>
<span class="line">	</span>
<span class="line">	Node* p = head;</span>
<span class="line">	for(int i = 2; i &lt;= N; i++){</span>
<span class="line">		Node* temp = new Node();</span>
<span class="line">		temp-&gt;id = i;</span>
<span class="line">		p-&gt;next = temp;</span>
<span class="line">		p = temp;</span>
<span class="line">	}</span>
<span class="line">	p-&gt;next = head;</span>
<span class="line">	</span>
<span class="line">	p = head;</span>
<span class="line">	index = 1;</span>
<span class="line">	while(p-&gt;next != p){</span>
<span class="line">		if((index + 1) == M){</span>
<span class="line">			Node* temp = p-&gt;next;</span>
<span class="line">			cout &lt;&lt; temp-&gt;id &lt;&lt; &quot; &quot;;</span>
<span class="line">			p-&gt;next = temp-&gt;next;</span>
<span class="line">			p = temp-&gt;next;</span>
<span class="line">			delete(temp);</span>
<span class="line">			index = 1;</span>
<span class="line">		}</span>
<span class="line">		p = p-&gt;next;</span>
<span class="line">		index++;</span>
<span class="line"></span>
<span class="line">	}</span>
<span class="line">    //易错点，别漏了</span>
<span class="line">	cout &lt;&lt; p-&gt;id;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-4-子串包含" tabindex="-1"><a class="header-anchor" href="#_4-4-子串包含"><span>4.4 子串包含</span></a></h3><p>信息学奥赛一本通：2050</p><p><a href="http://ybt.ssoier.cn:8088/problem_show.php?pid=2050" target="_blank" rel="noopener noreferrer">http://ybt.ssoier.cn:8088/problem_show.php?pid=2050</a></p><p>【题目描述】</p><p>字符串移位包含问题。</p><p>对于一个字符串来说，定义一次循环移位操作为：将字符串的第一个字符移动到末尾形成新的字符串。</p><p>给定两个字符串<em>s</em>1和<em>s</em>2，要求判定其中一个字符串是否是另一字符串通过若干次循环移位后的新字符串的子串。例如<code>CDAA</code>是由<code>AABCD</code>两次移位后产生的新串<code>BCDAA</code>的子串，而<code>ABCD</code>与<code>ACBD</code>则不能通过多次移位来得到其中一个字符串是新串的子串。</p><p>【输入格式】</p><p>一行，包含两个字符串，中间由单个空格隔开。字符串只包含字母和数字，长度不超过30。</p><p>【输出格式】</p><p>如果一个字符串是另一字符串通过若干次循环移位产生的新串的子串，则输出<code>true</code>，否则输出<code>false</code>。</p><p>【样例输入】</p><p>AABCD CDAA</p><p>【样例输出】</p><p>true</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    string s1, s2;</span>
<span class="line">    cin &gt;&gt; s1 &gt;&gt; s2;</span>
<span class="line">    if(s1.size() &lt; s2.size()){</span>
<span class="line">        swap(s1, s2);</span>
<span class="line">    }</span>
<span class="line">    for(int i = 0; i &lt; s1.size(); i++){</span>
<span class="line">        char c = s1[0];</span>
<span class="line">        s1.erase(0, 1);</span>
<span class="line">        s1.push_back(c);</span>
<span class="line">        if(s1.find(s2) != -1){</span>
<span class="line">            cout &lt;&lt; &quot;true&quot;;</span>
<span class="line">            return 0;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; &quot;false&quot;;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    string s1, s2;</span>
<span class="line">    cin &gt;&gt; s1 &gt;&gt; s2;</span>
<span class="line">    if(s1.size() &lt; s2.size()){</span>
<span class="line">        swap(s1, s2);</span>
<span class="line">    }</span>
<span class="line">    s1 += s1;</span>
<span class="line">    if(s1.find(s2) != -1){</span>
<span class="line">        cout &lt;&lt; &quot;true&quot;;</span>
<span class="line">    }</span>
<span class="line">    else{</span>
<span class="line">        cout &lt;&lt; &quot;false&quot;;</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_5-课后习题" tabindex="-1"><a class="header-anchor" href="#_5-课后习题"><span>5 课后习题</span></a></h2><h3 id="_5-1-回文日期" tabindex="-1"><a class="header-anchor" href="#_5-1-回文日期"><span>5.1 回文日期</span></a></h3><p>信息学奥赛一本通：1974</p><p><a href="http://ybt.ssoier.cn:8088/problem_show.php?pid=1974" target="_blank" rel="noopener noreferrer">http://ybt.ssoier.cn:8088/problem_show.php?pid=1974</a></p><p>【题目描述】</p><p>日常生活中，通过年、月、日这三个要素可以表示出一个唯一确定的日期。</p><p>牛牛习惯用8位数字表示一个日期，其中，前4位代表年份，接下来2位代表月份，最后2位代表日期。显然:一个日期只有一种表示方法，而两个不同的日期的表示方法不会相同。</p><p>牛牛认为，一个日期是回文的，当且仅当表示这个日期的8位数字是回文的。现在，牛牛想知道:在他指定的两个日期之间(包含这两个日期本身)，有多少个真实存在的日期是回文的。</p><p>【提示】</p><p>一个8位数字是回文的，当且仅当对于所有的<em>i</em>(1&lt;<em>i</em>&lt;8)从左向右数的第<em>i</em>个数字和第9−<em>i</em>个数字(即从右向左数的第<em>i</em>个数字)是相同的。</p><p>例如:</p><p>·对于2016年11月19日，用8位数字20161119表示，它不是回文的。</p><p>·对于2010年1月2日，用8位数字20100102表示，它是回文的。</p><p>·对于2010年10月2日，用8位数字20101002表示，它不是回文的。</p><p>每一年中都有12个月份:</p><p>其中，1,3,5,7,8,10,12月每个月有31天;4,6,9,11月每个月有30天;而对于2月，闰年时有29天，平年时有28天。</p><p>一个年份是闰年当且仅当它满足下列两种情况其中的一种:</p><p>1.这个年份是4的整数倍，但不是100的整数倍;</p><p>2.这个年份是400的整数倍。</p><p>例如:</p><p>·以下几个年份都是闰年:2000 ,2012 ,2016</p><p>·以下几个年份是平年:1900,2011,2014</p><p>【输入格式】</p><p>输入包括两行，每行包括一个8位数字。</p><p>第一行表示牛牛指定的起始日期<em>d</em>a<em>te</em>1，第二行表示牛牛指定的终止日期<em>d</em>a<em>te</em>2</p><p>保证<em>d</em>a<em>te</em>1和<em>d</em>a<em>te</em>2都是真实存在的日期，且年份部分一定为4位数字，且首位数字不为0。</p><p>保证<em>d</em>a<em>te</em>1一定不晚于<em>d</em>a<em>te</em>2。</p><p>【输出格式】</p><p>输出一行，包含一个整数，表示在<em>d</em>a<em>te</em>1和<em>d</em>a<em>te</em>2之间，有多少个日期是回文的。</p><p>【样例输入】</p><p>20110101</p><p>20111231</p><p>【样例输出】</p><p>1</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int month[2][13] = {{0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31},</span>
<span class="line">                    {0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}};</span>
<span class="line">int main(){</span>
<span class="line">    int date1 = 0;</span>
<span class="line">    int date2 = 0;</span>
<span class="line">    int count = 0;</span>
<span class="line">    cin &gt;&gt; date1 &gt;&gt; date2;</span>
<span class="line">    int year1 = date1 / 10000;</span>
<span class="line">    int year2 = date2 / 10000;</span>
<span class="line">    int flag = 0;</span>
<span class="line">    int y = year1;</span>
<span class="line">    while(y &lt;= year2){</span>
<span class="line">        if((y % 4 == 0 &amp;&amp; y % 100 != 0) || y % 400 == 0){</span>
<span class="line">            flag = 1;</span>
<span class="line">        }</span>
<span class="line">        </span>
<span class="line">        int temp = y;</span>
<span class="line">        int ry = 0;</span>
<span class="line">        while(temp != 0){</span>
<span class="line">            ry = ry * 10 + temp % 10;</span>
<span class="line">            temp /= 10;</span>
<span class="line">        }</span>
<span class="line">        int m = ry / 100;</span>
<span class="line">        int d = ry % 100;</span>
<span class="line">        if(m &gt; 0 &amp;&amp; m &lt;= 12 &amp;&amp; d &gt; 0 &amp;&amp; d &lt;= month[flag][m]){</span>
<span class="line">            if(y == year1){</span>
<span class="line">                if(m == ((date1 % 10000) / 100) &amp;&amp; d &gt;= ((date1 % 10000) % 100)){</span>
<span class="line">                    count++;</span>
<span class="line">                }</span>
<span class="line">                else if(m &gt; ((date1 % 10000) / 100)){</span>
<span class="line">                    count++;</span>
<span class="line">                }</span>
<span class="line">            }</span>
<span class="line">            else if(year1 &lt; y &amp;&amp; y &lt; year2){</span>
<span class="line">                count++;</span>
<span class="line">            }</span>
<span class="line">            else if(y == year2){</span>
<span class="line">                if(m == ((date2 % 10000) / 100) &amp;&amp; d &lt;= ((date2 % 10000) % 100)){</span>
<span class="line">                    count++;</span>
<span class="line">                }</span>
<span class="line">                else if(m &lt; ((date2 % 10000) / 100)){</span>
<span class="line">                    count++;</span>
<span class="line">                }</span>
<span class="line">            }</span>
<span class="line">        }</span>
<span class="line">        y++;</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; count;</span>
<span class="line">    </span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,114)])])}const r=s(l,[["render",p]]),v=JSON.parse('{"path":"/docs/csp/csp_level3/csp_03_simulation/","title":"模拟法","lang":"zh-CN","frontmatter":{"feed":false,"seo":false,"head":[]},"git":{"createdTime":1704437042000,"updatedTime":1704437042000,"contributors":[{"name":"Tivonfeng","username":"Tivonfeng","email":"tivonfeng@163.com","commits":1,"url":"https://github.com/Tivonfeng"}]},"readingTime":{"minutes":7.73,"words":2320},"filePathRelative":"docs/csp/csp_level3/csp_03_simulation/index.md"}');export{r as comp,v as data};
