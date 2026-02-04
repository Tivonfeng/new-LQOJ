/**
 * 2309-2 小明的幸运数
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int k, L, R, sum = 0;
    cin >> k >> L >> R;
    
    for (int n = L; n <= R; n++) {
        if (n % 10 == k || n % k == 0) {
            sum += n;
        }
    }
    
    cout << sum << endl;
    return 0;
}
