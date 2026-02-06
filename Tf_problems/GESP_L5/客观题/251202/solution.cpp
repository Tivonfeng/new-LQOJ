#include <iostream>
#include <cstdlib>
using namespace std;
const int N = 100010;
int num[N][20];
int n, a[N];
void calc_prime_factor(int x) {
    for (int i = 2; i * i <= x; i++) {
        if (x % i == 0) {
            int cnt = 0;
            while (x % i == 0) {
                x /= i;
                cnt++;
            }
            num[i][cnt]++;
        }
    }
    if (x > 1) {
        num[x][1]++;
    }
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    if(!(cin >> n)) return 0;
    for (int i = 1; i <= n; i++) {
        cin >> a[i];
        calc_prime_factor(a[i]);
    }
    long long ans = 0;
    for (int i = 2; i < 100001; i++) {
        int pos = 0;
        for (int j = 0; j < 20; j++) {
            pos += num[i][j];
        }
        num[i][0] = n - pos;
        int median_exponent = 0;
        pos = 0;
        for (int j = 0; j < 20; j++) {
            pos += num[i][j];
            if (pos * 2 >= n) {
                median_exponent = j;
                break;
            }
        }
        for (int j = 0; j < 20; j++) {
            ans += (long long)num[i][j] * abs(j - median_exponent);
        }
    }
    cout << ans << "\n";
    return 0;
}
