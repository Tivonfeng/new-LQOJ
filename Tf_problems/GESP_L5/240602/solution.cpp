#include <iostream>
#include <algorithm>
#include <map>
#include <set>
using namespace std;
int calc(int x) {
    set<int> s;
    for (int i = 2; i * i <= x; i++) {
        if (x % i == 0) {
            s.insert(i);
            while (x % i == 0)
                x /= i;
        }
    }
    if (x != 1)
        s.insert(x);
    return (int)s.size();
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    if(!(cin >> n)) return 0;
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        int result = calc(x);
        if (result == 2)
            cout << "1\n";
        else
            cout << "0\n";
    }
    return 0;
}
