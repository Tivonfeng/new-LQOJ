#include <iostream>
#include <cmath>
#include <algorithm>
using namespace std;
const int N = 1001 * 1001;
const double eps = 1e-8;
bool is_lucky[N + 5];
int next_lucky[N + 5];
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int a, T;
    if(!(cin >> a >> T)) return 0;
    for (int i = 1; i <= N; i++) {
        int t = int(sqrt(i) + eps);
        if (i >= a && t * t == i)
            is_lucky[i] = 1;
        if (!is_lucky[i])
            continue;
        for (int j = i + i; j <= N; j += i)
            is_lucky[j] = 1;
    }
    for (int i = N; i; i--)
        next_lucky[i] = is_lucky[i] ? i : next_lucky[i + 1];
    while (T--) {
        int x;
        cin >> x;
        if (is_lucky[x])
            cout << "lucky" << endl;
        else
            cout << next_lucky[x] << endl;
    }
    return 0;
}
