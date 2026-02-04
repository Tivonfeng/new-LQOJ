/**
 * 2503-2 四舍五入
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        // 四舍五入到整十数
        int result = (a + 5) / 10 * 10;
        cout << result << endl;
    }
    
    return 0;
}
