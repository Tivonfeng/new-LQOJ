#include <iostream>
#include <map>
#include <algorithm>
#include <cctype>
#include <cassert>
using namespace std;
int main() {
    int n; 
    cin >> n; 
    assert(1 <= n && n <= 100);
    map<string, int> cnt;
    int mx = -1;
    for (int i = 1; i <= n; i ++) {
        string s; 
        cin >> s; 
        assert(s.length() <= 30);
        transform(s.begin(), s.end(), s.begin(), ::tolower); 
        if (!cnt.count(s))
            cnt[s] = 0;
        mx = max(mx, ++cnt[s]);
    }
    int mx_num = 0;
    for (auto it = cnt.begin(); it != cnt.end(); it++) {
        if ((it->second) == mx) { 
            cout << (it->first) << '\n';
            mx_num ++;
        }
    }
    assert(mx_num == 1); 
    return 0;
}
