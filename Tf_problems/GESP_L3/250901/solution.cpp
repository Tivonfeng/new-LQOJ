#include <algorithm>
#include <cstdio>
using namespace std;
const int N = 105;
int n;
int a[N];
int cnt = 0;
int main() { 
    scanf("%d", &n); 
    for (int i = 1; i <= n; i++) 
        scanf("%d", &a[i]);
    while (1) {
        // 找最大值及其最大下标
        int mx_idx = n;
        for (int i = 1; i <= n; i++) {
            if (a[i] >= a[mx_idx]) {
                mx_idx = i;
            }
        }
        if (a[mx_idx] == 0) break; // 所有元素均为0
        // 找非零最小值
        int mn_val = a[mx_idx];
        for (int i = 1; i <= n; i++) {
            if (a[i] > 0 && a[i] < mn_val) {
                mn_val = a[i];
            }
        }
        a[mx_idx] -= mn_val;
        cnt++;
    }
    printf("%d\n", cnt);
    return 0;
}
