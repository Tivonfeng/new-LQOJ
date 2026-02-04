/**
 * 2403-2 小杨的日字矩阵
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    int mid = (n + 1) / 2;
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (j == 0 || j == n - 1) {
                cout << "|";
            } else if (i == 0 || i == n - 1 || i == mid) {
                cout << "-";
            } else {
                cout << "x";
            }
        }
        cout << endl;
    }
    
    return 0;
}
