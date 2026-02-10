#include <iostream>
#include <vector>
#include <algorithm>
#include <string>
using namespace std;
const int N = 110;
int sum[N][N];
int n, m;
int getSum(int r1, int c1, int r2, int c2) {
    return sum[r2][c2] - sum[r1-1][c2] - sum[r2][c1-1] + sum[r1-1][c1-1];
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int k;
    if(!(cin >> n >> m >> k)) return 0;
    for (int i = 1; i <= n; i++) {
        string s;
        cin >> s;
        for (int j = 1; j <= m; j++) {
            sum[i][j] = sum[i-1][j] + sum[i][j-1] - sum[i-1][j-1] + (s[j-1] - '0');
        }
    }
    int ans = 0;
    for (int r1 = 1; r1 <= n; r1++) {
        for (int r2 = r1; r2 <= n; r2++) {
            for (int c1 = 1; c1 <= m; c1++) {
                for (int c2 = c1; c2 <= m; c2++) {
                    int black = getSum(r1, c1, r2, c2);
                    if (black >= k) {
                        int area = (r2 - r1 + 1) * (c2 - c1 + 1);
                        ans = ans == 0 ? area : min(ans, area);
                    }
                }
            }
        }
    }
    cout << ans << "\n";
    return 0;
}
