/**
 * 2312-1 小杨做题
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    long long a, b, m, n;
    cin >> a >> b >> m >> n;
    
    long long ans = a + b;
    long long c;
    
    for (long long i = 3; i <= n; i++) {
        c = a + b;
        ans += c;
        a = b;
        b = c;
        if (c >= m) break;
    }
    
    cout << ans << endl;
    return 0;
}
