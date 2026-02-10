#include <iostream>
#include <algorithm>
using namespace std;
const int N = 100010;
int a[N], c[N];
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    if(!(cin >> n >> m)) return 0;
    int mx = -10000;
    for (int i = 1; i <= n; ++i) {
        cin >> c[i];
        mx = max(mx, c[i]);
    }
    for (int i = 1; i <= m; ++i) {
        cin >> a[i];
    }
    for (int i = 1; i <= m; ++i) {
        if (n == 1 || a[i] > 0) {
            mx += a[i];
        }
    }
    cout << mx << "\n";
    return 0;
}
