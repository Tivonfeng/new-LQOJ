/**
 * 2503-1 图书馆里的老鼠
 * 样例测试
 */
#include <iostream>
using namespace std;

int main() {
    int n, x, y;
    cin >> n >> x >> y;
    
    // 完整吃完的书籍数量
    int eaten = y / x;
    
    // 剩余完整书籍
    int remaining = n - eaten;
    if (y % x != 0) {
        // 正在吃下一本，这本书还算完整
        remaining--;
    }
    
    cout << remaining << endl;
    
    return 0;
}
