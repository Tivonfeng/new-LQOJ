#include <iostream>
#include <algorithm>
using namespace std;
const int N = 1e5 + 5;
int n, q, a[N], g;
int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> n >> q)) return 0;
    for (int i = 1; i <= n; i++)
        cin >> a[i];
    sort(a + 1, a + n + 1);
    g = 0;
    for (int i = 2; i <= n; i++)
        g = gcd(g, a[i] - a[i - 1]);
    for (int i = 1; i <= q; i++)
        cout << gcd(g, a[1] + i) << "\n";
    return 0;
}
