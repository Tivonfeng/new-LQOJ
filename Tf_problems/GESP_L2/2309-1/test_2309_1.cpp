/**
 * 2309-1 买文具
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int x, y, z, q;
    cin >> x >> y >> z >> q;
    
    int total = x * 2 + y * 5 + z * 3;
    
    if (q >= total) {
        cout << "Yes " << q - total << endl;
    } else {
        cout << "No " << total - q << endl;
    }
    
    return 0;
}
