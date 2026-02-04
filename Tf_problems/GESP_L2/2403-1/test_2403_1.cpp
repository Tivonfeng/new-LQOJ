/**
 * 2403-1 乘法问题
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    long long product = 1;
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        
        if (product * a > 1000000) {
            cout << ">1000000" << endl;
            return 0;
        }
        product *= a;
    }
    
    cout << product << endl;
    return 0;
}
