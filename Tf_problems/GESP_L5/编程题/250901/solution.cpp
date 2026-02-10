#include <iostream>
#include <algorithm>
using namespace std;
const int N = 1e5 + 5;
int n, p[N], cnt;
bool np[N];
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> n)) return 0;
    for (int i = 2; i <= n; i++) {
        if (!np[i])
            p[++cnt] = i;
        for (int j = 1; j <= cnt && i * p[j] <= n; j++) {
            np[i * p[j]] = 1;
            if (i % p[j] == 0)
                break;
        }
    }
    cout << 1 + cnt << "\n";
    return 0;
}
