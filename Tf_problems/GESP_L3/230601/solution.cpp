#include <iostream>
using namespace std;
bool arrive[1000];
int main() {
    int n = 0, m = 0;
    cin >> n >> m;
    // 初始化arrive数组为所有同学均未报到
    for (int i = 0; i < n; i++)
        arrive[i] = false;
    // 依次处理m次报到
    for (int i = 0; i < m; i++) {
        int code = 0;
        cin >> code;
        arrive[code] = true;
    }
    // 依次检查n位同学是否到达
    bool all = true;
    for (int i = 0; i < n; i++) {
        if (!arrive[i]) {
            if (all) {
                cout << i;
                all = false;
            } else {
                cout << " " << i;
            }
        }
    }
    // 处理全部到达的特殊情况
    if (all)
        cout << n;
    cout << endl;
    return 0;
}
