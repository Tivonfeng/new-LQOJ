#include <iostream>
#include <algorithm>
#include <cassert>
using namespace std;
const int N = 2e5 + 5;
int n;
long long b[N], c[N], d[N];
long long ans;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> n)) return 0;
    assert(1 <= n && n <= 1e5);
    for (int i = 1; i <= 2 * n; i++) {
        cin >> b[i];
        assert(0 <= b[i] && b[i] <= 1e9);
    }
    for (int i = 1; i <= 2 * n; i++) {
        cin >> c[i];
        assert(0 <= c[i] && c[i] <= 1e9);
    }
    ans = 0;
    for (int i = 1; i <= 2 * n; i++) {
        ans += b[i];
        d[i] = c[i] - b[i];
    }
    sort(d + 1, d + 2 * n + 1);
    for (int i = n + 1; i <= 2 * n; i++) {
        ans += d[i];
    }
    cout << ans << "\n";
    return 0;
}
