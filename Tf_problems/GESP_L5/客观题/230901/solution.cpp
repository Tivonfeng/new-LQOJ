#include <iostream>
using namespace std;
int main() {
    long long N = 0;
    cin >> N;
    bool first = true;
    for (long long p = 2; p * p <= N; p++) {
        if (N % p != 0)
            continue;
        int cnt = 0;
        while (N % p == 0) {
            cnt++;
            N /= p;
        }
        if (!first) {
            cout << " * ";
        } else {
            first = false;
        }
        cout << p;
        if (cnt > 1)
            cout << "^" << cnt;
    }
    if (N > 1) {
        if (!first) {
            cout << " * ";
        }
        cout << N;
    }
    cout << endl;
    return 0;
}
