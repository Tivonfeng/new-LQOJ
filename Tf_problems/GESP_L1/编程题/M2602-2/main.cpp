#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int a, b;
    if (!(cin >> a >> b)) return 0;
    
    int cnt = 0;
    for (int i = 1; i <= min(a, b); i++) {
        if (a % i == 0 && b % i == 0) cnt++;
    }
    
    cout << cnt << endl;
    return 0;
}
