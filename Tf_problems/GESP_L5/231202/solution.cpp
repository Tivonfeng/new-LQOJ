#include <iostream>
#include <algorithm>
using namespace std;
const int MAX_N = int(1e6) + 100;
int a[MAX_N];
int sort_partition(int l, int r, int k) {
    while (l <= r) {
        while ((l <= r) && (a[l] >> k & 1)) l++;
        while ((l <= r) && (!(a[r] >> k & 1))) r--;
        if (l <= r) swap(a[l++], a[r--]);
    }
    return r;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, j, ans = 0;
    if(!(cin >> n)) return 0;
    for (int i = 1; i <= n; i++)
        cin >> a[i];
    for (int i = 31; i >= 0; i--) {
        j = sort_partition(1, n, i);
        if (j >= 2) {
            ans |= 1 << i;
            n = j;
        }
    }
    cout << ans << "\n";
    return 0;
}
