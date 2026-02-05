#include <cstdio>
using namespace std;
int x;
int main() {
    scanf("%d", &x);
    for (int i = 1; i <= 2025; i++) {
        if ((x & i) + (x | i) == 2025) { 
            printf("%d\n", i);
            return 0;
        }
    }
    printf("-1\n");
    return 0;
}
