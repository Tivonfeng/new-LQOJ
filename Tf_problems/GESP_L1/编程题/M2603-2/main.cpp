#include <iostream>
#include <vector>
using namespace std;

int main() {
    int m, n;
    if (!(cin >> m >> n)) return 0;
    
    vector<int> result;
    for (int i = m; i <= n; i++) {
        int num = i;
        int temp = i;
        int digitCount = 0;
        while (temp > 0) {
            digitCount++;
            temp /= 10;
        }
        
        temp = i;
        int sum = 0;
        while (temp > 0) {
            int digit = temp % 10;
            int power = 1;
            for (int j = 0; j < digitCount; j++) power *= digit;
            sum += power;
            temp /= 10;
        }
        
        if (sum == num) result.push_back(num);
    }
    
    if (result.empty()) {
        cout << "None" << endl;
    } else {
        for (int x : result) {
            cout << x << endl;
        }
    }
    return 0;
}
