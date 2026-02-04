/**
 * 2303-1 画三角形
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    int ch = 0;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) {
            cout << (char)('A' + (ch++) % 26);
        }
        cout << endl;
    }
    
    return 0;
}
