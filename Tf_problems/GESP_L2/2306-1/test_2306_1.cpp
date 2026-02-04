/**
 * 2306-1 找素数
 * 样例测试
 */
#include <iostream>
#include <cmath>
using namespace std;

bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int a, b, cnt = 0;
    cin >> a >> b;
    
    for (int n = a; n <= b; n++) {
        if (isPrime(n)) cnt++;
    }
    
    cout << cnt << endl;
    return 0;
}
