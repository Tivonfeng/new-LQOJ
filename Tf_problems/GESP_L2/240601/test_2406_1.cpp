/**
 * 2406-1 平方之和
 * 样例测试
 */
#include <iostream>
#include <cmath>
using namespace std;

bool isPerfectSquare(int x) {
    int y = (int)sqrt(x);
    return y * y == x;
}

int main() {
    int t;
    cin >> t;
    
    while (t--) {
        int n;
        cin >> n;
        bool found = false;
        
        for (int i = 1; i * i < n; i++) {
            int j = n - i * i;
            if (isPerfectSquare(j)) {
                found = true;
                break;
            }
        }
        
        if (found) cout << "Yes" << endl;
        else cout << "No" << endl;
    }
    
    return 0;
}
