#include <cstdio>
#include <algorithm>
using namespace std;
const int N = 1005;
int n, a[N];
long long ans = 0;
int main() { 
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) {
        scanf("%d", &a[i]); 
        if (i > 1)
            a[i] = max(a[i - 1] + 1, a[i]);
        ans += a[i];
    }
    printf("%lld\n", ans);
    return 0;
}
