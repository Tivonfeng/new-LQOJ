/**
 * 2306-2 自幂数判断
 * 样例测试
 */
#include <iostream>
using namespace std;

int power(int x, int y) {
    int result = 1;
    for (int i = 0; i < y; i++) {
        result *= x;
    }
    return result;
}

bool isArmstrong(int n) {
    int t = n, l = 0;
    while (t > 0) {
        t /= 10;
        l++;
    }
    
    int sum = 0;
    t = n;
    while (t > 0) {
        int d = t % 10;
        t /= 10;
        sum += power(d, l);
    }
    
    return sum == n;
}

int main() {
    int m;
    cin >> m;
    
    for (int i = 0; i < m; i++) {
        int n;
        cin >> n;
        if (isArmstrong(n))
            cout << "T" << endl;
        else
            cout << "F" << endl;
    }
    
    return 0;
}
