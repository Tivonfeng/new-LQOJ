#include <iostream>
#include <cmath>
#include <algorithm>
using namespace std;

int main() {
    int H, M;
    if (!(cin >> H >> M)) return 0;
    
    // 计算时针角度（相对于12点）
    double hour_angle = (H % 12) * 30 + M * 0.5;
    // 计算分针角度（相对于12点）
    double minute_angle = M * 6;
    
    // 计算夹角
    double diff = abs(hour_angle - minute_angle);
    // 取最小夹角
    diff = min(diff, 360 - diff);
    
    cout << (int)diff << endl;
    return 0;
}
