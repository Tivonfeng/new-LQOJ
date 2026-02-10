#include <iostream>
#include <utility>
using namespace std;
int l, r;
long long ans;
pair<int, long long> cal2(int n, int p) {
    if (n == 0)
        return {1 - p, 0};
    if (n == 1) {
        return {1, p};
    }
    return {(n + 1) / 2, 1LL * n * (n + 1) / 4};
}
pair<int, long long> cal(int n, int p) {
    if (n <= 1) {
        return cal2(n, p);
    }
    long long x = 1LL << (31 - __builtin_clz(n));
    auto l_res = cal2(x - 1, p);
    auto r_res = cal(n - x, 1 - p);
    return {l_res.first + r_res.first, l_res.second + r_res.second + x * r_res.first};
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> l >> r)) return 0;
    ans = cal(r, 1).second - cal(l - 1, 1).second;
    cout << ans << "\n";
    return 0;
}
