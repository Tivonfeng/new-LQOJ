#include <iostream>
#include <vector>
#include <algorithm>
#include <cassert>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, B;
    if(!(cin >> n >> B)) return 0;
    assert(1 <= n && n <= 1e6);
    assert(1 <= B && B <= 1e6);
    vector<bool> vis(n + 5, false);
    vector<int> mx_prime_factor(n + 5, 0);
    vector<int> prime;
    mx_prime_factor[1] = 1;
    for (int i = 2; i <= n; i++) {
        if (!vis[i]) {
            mx_prime_factor[i] = i;
            prime.push_back(i);
        }
        for (int p : prime) {
            if (1LL * p * i > n)
                break;
            vis[i * p] = true;
            mx_prime_factor[i * p] = max(mx_prime_factor[i * p], max(mx_prime_factor[i], p));
            if (i % p == 0)
                break;
        }
    }
    int ans = 0;
    for (int i = 1; i <= n; i++)
        ans += (mx_prime_factor[i] <= B);
    cout << ans << "\n";
    return 0;
}
