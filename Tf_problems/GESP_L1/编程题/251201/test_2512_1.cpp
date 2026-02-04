/**
 * 2512-1 手机电量显示
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int T;
    cin >> T;
    
    for (int i = 0; i < T; i++) {
        int P;
        cin >> P;
        if (P <= 10) {
            cout << "R" << endl;
        } else if (P <= 20) {
            cout << "L" << endl;
        } else {
            cout << P << endl;
        }
    }
    
    return 0;
}
