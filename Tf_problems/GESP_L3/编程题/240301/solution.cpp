#include <iostream>
#include <assert.h>
#include <cstdio>
#include <cstring>
using namespace std;
const int N = 100005;
char str[N];
int main() {
    int n;
    cin >> n;
    cin >> str;
    assert(n == strlen(str));
    int ans = 0;
    for (int i = 0; i < n; i++) { 
        if (str[i] >= 'a' && str[i] <= 'z')
            ans += str[i] - 'a' + 1;
        else if (str[i] >= 'A' && str[i] <= 'Z')
            ans -= str[i];
        else
            assert(false);
    }
    cout << ans << endl;
    return 0;
}
