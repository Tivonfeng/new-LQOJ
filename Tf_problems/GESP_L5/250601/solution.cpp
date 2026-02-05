#include <iostream>
#include <algorithm>
using namespace std;
int n, m, a, b;
int l, r;
int check(int v) {
    long long x, y, t;
    x = 1LL * v * a;
    y = 1LL * v * b;
    if (y > m) {
        t = (y - m + (b - a) - 1) / (b - a);
        y -= t * (b - a);
        x += t * (b - a);
    }
    return x <= n && y <= m;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> n >> m)) return 0;
    cin >> a >> b;
    if (n > m)
        swap(n, m);
    if (a > b)
        swap(a, b);
    if (a == b) {
        cout << n / a << "\n";
        return 0;
    }
    l = 0;
    r = n;
    while (l < r) {
        int mid = (l + r + 1) >> 1;
        if (check(mid))
            l = mid;
        else
            r = mid - 1;
    }
    cout << r << "\n";
    return 0;
}
