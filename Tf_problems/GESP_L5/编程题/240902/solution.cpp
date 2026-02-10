#include <iostream>
#include <vector>
using namespace std;
vector<int> prime;
bool is_prime[100010];
void Eratosthenes(int n) {
    for (int i = 0; i <= n; i++) is_prime[i] = true;
    is_prime[0] = is_prime[1] = false;
    for (int i = 2; i <= n; ++i) {
        if (is_prime[i]) {
            prime.push_back(i);
            if ((long long)i * i > n)
                continue;
            for (int j = i * i; j <= n; j += i)
                is_prime[j] = false;
        }
    }
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    Eratosthenes(100000);
    int t;
    if(!(cin >> t)) return 0;
    while (t--) {
        int x;
        cin >> x;
        int ans = 0;
        int tmp = 1;
        while (1) {
            if (is_prime[x]) {
                ans++;
                break;
            }
            x -= tmp;
            ans++;
            if (x <= 0) {
                if (x < 0)
                    ans = -1;
                break;
            }
            tmp *= 2;
        }
        cout << ans << "\n";
    }
    return 0;
}
