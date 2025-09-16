import{_ as s}from"./plugin-vue_export-helper-DlAUqK2U.js";import{c as i,d as a,o as l}from"./app-CeA3Z9s4.js";const e={};function p(d,n){return l(),i("div",null,[...n[0]||(n[0]=[a(`<h1 id="二分法" tabindex="-1"><a class="header-anchor" href="#二分法"><span>二分法</span></a></h1><h2 id="_1-什么是二分搜索算法" tabindex="-1"><a class="header-anchor" href="#_1-什么是二分搜索算法"><span>1 什么是二分搜索算法</span></a></h2><p>二分搜索算法和他的名字一样就是用来搜索的，不是什么高大上的概念。</p><p>比较官方一点的说法是在有序列表中查找特定元素的方法，算法的时间复杂度为O(logn)，而顺序查找的时间复杂度为O(n)。</p><p>举个例子吧，若干年前有过这样一个游戏，由A、B双方猜1-1000范围内的一个数，A、B轮流报数，主持人只会告诉你，当前报的数比答案大，还是比答案小。</p><p>这个时候我们就可以借用二分搜索算法的思想，比如先报1-1000中间那个数500，如果比答案大，那么答案就在1-499之间。然后再报1-499中间的那个数250，不断取一个范围的中间值，然后再缩小这个范围，直至找到答案。</p><p>二分就在这里体现，二分就是分成两部分，然后再去掉其中一部分，从而加快查找的速度。</p><h2 id="_2-二分搜索算法的解题步骤" tabindex="-1"><a class="header-anchor" href="#_2-二分搜索算法的解题步骤"><span>2 二分搜索算法的解题步骤</span></a></h2><ol><li><p>前提是这一个序列或者数组是有序排列的，这一点很重要</p></li><li><p>确定区间的范围，找到下标左边界 left 和右边界 right，写出while循环的终止条件</p></li><li><p>计算下标<em>mid</em> = (left + right)，判断去掉[left, mid)还是(mid, right]，更新左右边界</p></li><li><p>循环执行步骤3，直至下标mid处的值等于目标值，表示找到目标值。</p></li></ol><p>或者到达while循环的终止条件，没有找到目标值。</p><p>![Alt text](index.assets/image.png =200x)</p><h2 id="_3-二分搜索算法的优缺点" tabindex="-1"><a class="header-anchor" href="#_3-二分搜索算法的优缺点"><span>3 二分搜索算法的优缺点</span></a></h2><p>没啥特别的优缺点，就是能加快查找的时间，仅此而已</p><h2 id="_4-例题" tabindex="-1"><a class="header-anchor" href="#_4-例题"><span>4 例题</span></a></h2><h3 id="_4-1-查找特定的值" tabindex="-1"><a class="header-anchor" href="#_4-1-查找特定的值"><span>4.1 查找特定的值</span></a></h3><p>【题目描述】</p><p>在一个序列（下标从 0 开始）中查找一个给定的值，输出第一次出现的位置。</p><p>【输入格式】</p><p>第一行包含一个正整数 n，表示序列中元素个数。1≤n≤10000。</p><p>第二行包含 n个整数，依次给出序列的每个元素，相邻两个整数之间用单个空格隔开。元素的绝对值不超过 10000。</p><p>第三行包含一个整数 x，为需要查找的特定值。x 的绝对值不超过 10000。</p><p>【输出格式】</p><p>若序列中存在 x，输出 x 第一次出现的下标； 否则输出 -1。</p><p>【样例输入】</p><p>5</p><p>2 3 6 7 8</p><p>3</p><p>【样例输出】</p><p>1</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int x = 0;</span>
<span class="line">    int arr[10010] = {0};</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        cin &gt;&gt; arr[i];</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; x;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        if(arr[i] == x){</span>
<span class="line">            cout &lt;&lt; i;</span>
<span class="line">            return 0;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; -1;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int x = 0;</span>
<span class="line">    int arr[10010] = {0};</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        cin &gt;&gt; arr[i];</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; x;</span>
<span class="line">    int left = 0;</span>
<span class="line">    int right = n - 1;</span>
<span class="line">    while(left &lt;= right){</span>
<span class="line">        int mid = (left + right) / 2;</span>
<span class="line">        if(arr[mid] &lt; x){</span>
<span class="line">            left = mid + 1;</span>
<span class="line">        }</span>
<span class="line">        else if(arr[mid] &gt; x){</span>
<span class="line">            right = mid - 1;</span>
<span class="line">        }</span>
<span class="line">        else{</span>
<span class="line">            cout &lt;&lt; mid;</span>
<span class="line">            return 0;</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; -1;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-2-两数之和1" tabindex="-1"><a class="header-anchor" href="#_4-2-两数之和1"><span>4.2 两数之和1</span></a></h3><p>【题目描述】</p><p>给定若干个整数，找出是否有两个数的和等于给定的和。</p><p>【输入格式】</p><p>第一行一个整数 n（0 &lt; n ≤ 100000）表示共有 n 个整数</p><p>第二行表示这 n 个整数，用空格隔开</p><p>第三行一个整数 m，表示给定的和</p><p>【输出格式】</p><p>若存在符合条件的，则输出一行两个数字，用空格隔开，小的在前，大的在后分别表示两个符合条件的整数</p><p>若有多个满足条件，输出较小的数最小的那一对数字</p><p>若不存在符合条件的，则输出 &#39;No&#39;</p><p>【样例输入】</p><p>4</p><p>2 5 1 4</p><p>6</p><p>【样例输出】</p><p>1 5</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int num[100010];</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int m = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        cin &gt;&gt; num[i];</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; m;</span>
<span class="line">    sort(num, num + n);</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        for(int j = i + 1; j &lt; n; j++){</span>
<span class="line">            if(num[i] + num[j] == m){</span>
<span class="line">                cout &lt;&lt; num[i] &lt;&lt; &quot; &quot; &lt;&lt; num[j];</span>
<span class="line">                return 0;</span>
<span class="line">            }</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; &quot;No&quot;;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int num[100010];</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int m = 0;</span>
<span class="line">    cin &gt;&gt; n;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        cin &gt;&gt; num[i];</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; m;</span>
<span class="line">    sort(num, num + n);</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        int left = i + 1;</span>
<span class="line">        int right = n - 1;</span>
<span class="line">        while(left &lt;= right){</span>
<span class="line">            int mid = (left + right) / 2;</span>
<span class="line">            if(num[i] + num[mid] &lt; m){</span>
<span class="line">                left = mid + 1;</span>
<span class="line">            }</span>
<span class="line">            else if(num[i] + num[mid] &gt; m){</span>
<span class="line">                right = mid - 1;</span>
<span class="line">            }</span>
<span class="line">            else{</span>
<span class="line">                cout &lt;&lt; num[i] &lt;&lt; &quot; &quot; &lt;&lt; num[mid];</span>
<span class="line">                return 0;</span>
<span class="line">            }</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    cout &lt;&lt; &quot;No&quot;;</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-3-两数之和2" tabindex="-1"><a class="header-anchor" href="#_4-3-两数之和2"><span>4.3 两数之和2</span></a></h3><p>【题目描述】</p><p>给定一个整数数组 <code>nums</code> 和一个整数目标值 <code>target</code>，请你在该数组中找出 <strong>和为目标值</strong> <em><code>target</code></em> 的那 <strong>两个</strong> 整数，并返回它们的数组下标。</p><p>你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。</p><p>你可以按任意顺序返回答案。</p><p>【输入格式】</p><p>第一行一个数字表示数组大小</p><p>第二行表示数组nums</p><p>第三行一个数字表示target</p><p>【输出格式】</p><p>一行两个数字，用空格隔开，分别表示两个整数的下标</p><p>【样例输入】</p><p>4</p><p>2 7 11 15</p><p>9</p><p>【样例输出】</p><p>0 1</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int main(){</span>
<span class="line">    int len = 0;</span>
<span class="line">    vector&lt;int&gt; nums;</span>
<span class="line">    int target = 0;</span>
<span class="line">    cin &gt;&gt; len;</span>
<span class="line">    for(int i = 0; i &lt; len; i++){</span>
<span class="line">        int temp = 0;</span>
<span class="line">        cin &gt;&gt; temp;</span>
<span class="line">        nums.push_back(temp);</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; target;</span>
<span class="line">    for(int i = 0; i &lt; len; i++){</span>
<span class="line">        for(int j = i + 1; j &lt; len; j++){</span>
<span class="line">            if(nums[i] + nums[j] == target){</span>
<span class="line">                cout &lt;&lt; i &lt;&lt; &quot; &quot; &lt;&lt; j;</span>
<span class="line">            }</span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">struct node{</span>
<span class="line">    int num;</span>
<span class="line">    int index;</span>
<span class="line">};</span>
<span class="line">bool cmp(node a, node b){</span>
<span class="line">    return a.num &lt; b.num;</span>
<span class="line">}</span>
<span class="line">int main(){</span>
<span class="line">    int len = 0;</span>
<span class="line">    vector&lt;int&gt; nums;</span>
<span class="line">    int target = 0;</span>
<span class="line">    cin &gt;&gt; len;</span>
<span class="line">    for(int i = 0; i &lt; len; i++){</span>
<span class="line">        int temp = 0;</span>
<span class="line">        cin &gt;&gt; temp;</span>
<span class="line">        nums.push_back(temp);</span>
<span class="line">    }</span>
<span class="line">    cin &gt;&gt; target;</span>
<span class="line">    </span>
<span class="line">    vector&lt;node&gt; vec;</span>
<span class="line">    for(int i = 0; i &lt; len; i++){</span>
<span class="line">        node n;</span>
<span class="line">        n.num = nums[i];</span>
<span class="line">        n.index = i;</span>
<span class="line">        vec.push_back(n);</span>
<span class="line">    }</span>
<span class="line">    sort(vec.begin(), vec.end(), cmp);</span>
<span class="line"></span>
<span class="line">    for(int i = 0; i &lt; vec.size(); i++){</span>
<span class="line">        int left = 0;</span>
<span class="line">        int right = vec.size() - 1;</span>
<span class="line">        while(left &lt;= right){</span>
<span class="line">            int mid = (left + right) / 2;</span>
<span class="line">            if((vec[i].num + vec[mid].num) &lt; target){</span>
<span class="line">                left = mid + 1;</span>
<span class="line">            }</span>
<span class="line">            else if((vec[i].num + vec[mid].num) &gt; target){</span>
<span class="line">                right = mid - 1;</span>
<span class="line">            }</span>
<span class="line">            else if((vec[i].num + vec[mid].num) == target &amp;&amp; i != mid){</span>
<span class="line">                cout &lt;&lt; vec[i].index &lt;&lt; &quot; &quot; &lt;&lt; vec[mid].index;</span>
<span class="line">                return 0;</span>
<span class="line">            }</span>
<span class="line"></span>
<span class="line">        }</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-4-贪吃的小明" tabindex="-1"><a class="header-anchor" href="#_4-4-贪吃的小明"><span>4.4 贪吃的小明</span></a></h3><p>【题目描述】</p><p>小明想吃汉堡，外出觅食，走到一条街上，在他面前有 n 家店铺。每家店铺汉堡的售价不同，但是小明只能买一个汉堡。</p><p>假设小明出来了 k 次，每次带了 m 元，问小明每次可以选择几家汉堡店购买汉堡。</p><p>【输入格式】</p><p>第一行两个数字 n，k，分别表示多少家店以及小明出来的次数</p><p>第二行 n 个整数，表示每家汉堡的售价</p><p>接下来 k 行，分别表示小明带了多少钱 m</p><p>【输出格式】</p><p>输出 k 行</p><p>一行一个数字，表示有几家店铺可以选择</p><p>【样例输入】</p><p>5 2</p><p>2 1 4 3 5</p><p>3</p><p>5</p><p>【样例输出】</p><p>3</p><p>5</p><div class="language-C++ line-numbers-mode" data-highlighter="prismjs" data-ext="C++"><pre><code class="language-C++"><span class="line">#include&lt;bits/stdc++.h&gt;</span>
<span class="line">using namespace std;</span>
<span class="line">int price[100010];</span>
<span class="line">int main(){</span>
<span class="line">    int n = 0;</span>
<span class="line">    int m = 0;</span>
<span class="line">    int k = 0;</span>
<span class="line">    cin &gt;&gt; n &gt;&gt; k;</span>
<span class="line">    for(int i = 0; i &lt; n; i++){</span>
<span class="line">        cin &gt;&gt; price[i];</span>
<span class="line">    }</span>
<span class="line">    sort(price, price + n);</span>
<span class="line">    for(int i = 0; i &lt; k; i++){</span>
<span class="line">        cin &gt;&gt; m;</span>
<span class="line">        cout &lt;&lt; upper_bound(price, price + n, m) - price &lt;&lt; endl;</span>
<span class="line">    }</span>
<span class="line">    return 0;</span>
<span class="line">}</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,89)])])}const r=s(e,[["render",p]]),t=JSON.parse('{"path":"/docs/csp/csp_level3/csp_04_dichotomy/","title":"二分法","lang":"zh-CN","frontmatter":{},"git":{"createdTime":1704437042000,"updatedTime":1704437042000,"contributors":[{"name":"Tivonfeng","username":"Tivonfeng","email":"tivonfeng@163.com","commits":1,"url":"https://github.com/Tivonfeng"}]},"readingTime":{"minutes":5.83,"words":1750},"filePathRelative":"docs/csp/csp_level3/csp_04_dichotomy/index.md","excerpt":"\\n<h2>1 什么是二分搜索算法</h2>\\n<p>二分搜索算法和他的名字一样就是用来搜索的，不是什么高大上的概念。</p>\\n<p>比较官方一点的说法是在有序列表中查找特定元素的方法，算法的时间复杂度为O(logn)，而顺序查找的时间复杂度为O(n)。</p>\\n<p>举个例子吧，若干年前有过这样一个游戏，由A、B双方猜1-1000范围内的一个数，A、B轮流报数，主持人只会告诉你，当前报的数比答案大，还是比答案小。</p>\\n<p>这个时候我们就可以借用二分搜索算法的思想，比如先报1-1000中间那个数500，如果比答案大，那么答案就在1-499之间。然后再报1-499中间的那个数250，不断取一个范围的中间值，然后再缩小这个范围，直至找到答案。</p>"}');export{r as comp,t as data};
