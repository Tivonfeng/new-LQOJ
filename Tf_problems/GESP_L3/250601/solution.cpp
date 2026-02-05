#include <cstdio>
using namespace std;
int n, v = 0;
int main() {
    scanf("%d", &n); 
    for (int i = 1; i <= n; i++) {
        int c;
        scanf("%d", &c);
        while (c) { 
            v += c & 1;
            c >>= 1;
        }
    }
    printf("%d %d\n", v, v & 1); 
    return 0;
}
