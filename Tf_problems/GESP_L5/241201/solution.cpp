#include <iostream>
#include <algorithm>
using namespace std;
using ll = long long;
ll calc(ll x) {
    int ans = 0;
    ll tmp = 1;
    while (x >= tmp) {
        ans++;
        tmp++;
    }
    return ans;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    ll n;
    if(!(cin >> n)) return 0;
    ll ans = 0;
    for (ll i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            int cnt = 0;
            while (n % i == 0) {
                n /= i;
                cnt++;
            }
            ans += calc(cnt);
        }
    }
    if (n != 1) {
        ans += calc(1);
    }
    cout << ans << "\n";
    return 0;
}
