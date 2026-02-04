/**
 * 2512-2 小杨的爱心快递
 * 样例测试
 */
#include <iostream>
#include <iomanip>
#include <algorithm>
using namespace std;

int main() {
    double V, G, M, N;
    cin >> V >> G >> M >> N;
    
    // 按体积计费
    double volume_price = 0.5 * V;
    
    // 按重量计费
    double weight_price = (G < 300) ? M : N;
    
    // 输出较小值，保留1位小数
    double result = min(volume_price, weight_price);
    cout << fixed << setprecision(1) << result << endl;
    
    return 0;
}
