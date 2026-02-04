#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    vector<int> perfect;
    for (int i = 1; i <= n; i++) {
        int sum = 0;
        for (int j = 1; j < i; j++) {
            if (i % j == 0) sum += j;
        }
        if (sum == i) perfect.push_back(i);
    }
    
    if (perfect.empty()) {
        cout << "None" << endl;
    } else {
        for (int x : perfect) {
            cout << x << endl;
        }
    }
    return 0;
}
