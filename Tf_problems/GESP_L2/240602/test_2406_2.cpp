/**
 * 2406-2 计数
 * 样例测试
 */
#include <iostream>
using namespace std;

int countDigit(int x, int y) {
    int cnt = 0;
    while (x > 0) {
        if (x % 10 == y) cnt++;
        x /= 10;
    }
    return cnt;
}

int main() {
    int n, k;
    cin >> n >> k;
    
    int ans = 0;
    for (int i = 1; i <= n; i++) {
        ans += countDigit(i, k);
    }
    
    cout << ans << endl;
    return 0;
}
