#include <iostream>
#include <algorithm>
using namespace std;
int a[100010];
int b[100010];
int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        cin >> a[i];
    }
    int left = 1, right = 100000, ans = 100000;
    while (left <= right) {
        int mid = (left + right) / 2;
        bool possible = true;
        int pos = 0;
        // 收集需要交换的数字（它们会导致相同数字不相邻）
        // 从后往前遍历，如果一个数字还能在后面找到相同的，就跳过
        // 否则它需要被交换
        vector<int> lastPos(100001, -1);
        for (int i = n - 1; i >= 0; i--) {
            if (lastPos[a[i]] != -1) {
                // 后面还有相同的数字，不需要交换
            } else {
                // 这是最后一个出现的，需要交换
                if (a[i] > mid) {
                    possible = false;
                    break;
                }
            }
            lastPos[a[i]] = i;
        }
        if (possible) {
            ans = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    cout << ans << endl;
    return 0;
}
