#include <iostream>
using namespace std;
int a, p;
int ans;
int fpw(int b, int e) {
    if (e == 0)
        return 1;
    int r = fpw(b, e >> 1);
    r = 1LL * r * r % p;
    if (e & 1)
        r = 1LL * r * b % p;
    return r;
}
void check(int e) {
    if (fpw(a, e) == 1)
        ans = 0;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    if(!(cin >> T)) return 0;
    while (T--) {
        cin >> a >> p;
        ans = 1;
        int phi = p - 1, r = phi;
        for (int i = 2; i * i <= phi; i++) {
            if (phi % i == 0) {
                check(phi / i);
                while (r % i == 0)
                    r /= i;
            }
        }
        if (r > 1)
            check(phi / r);
        cout << (ans ? "Yes\n" : "No\n");
    }
    return 0;
}
