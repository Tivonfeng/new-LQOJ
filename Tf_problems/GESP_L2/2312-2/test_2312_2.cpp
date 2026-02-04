/**
 * 2312-2 小杨的H字矩阵
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    int mid = (n + 1) / 2;
    
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= n; j++) {
            if (j == 1 || j == n) {
                cout << "|";
            } else if (i == mid && j > 1 && j < n) {
                cout << "-";
            } else {
                cout << "a";
            }
        }
        cout << endl;
    }
    
    return 0;
}
