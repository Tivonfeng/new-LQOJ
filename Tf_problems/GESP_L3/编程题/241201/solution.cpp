#include <iostream>
#include <algorithm>
using namespace std;
int a[100010]; 
int main() { 
    int n, k;
    cin >> n >> k; 
    for (int i = 1; i <=n; i++) { 
        cin >> a[i];
    }
    int max_value = a[1], min_value = a[1];
    for (int i = 1; i <=n; i++) { 
        max_value = max(max_value, a[i]);
        min_value = min(min_value, a[i]);
    }
    for (int i = 1; i <=n; i++) { 
        if (a[i] > k) { 
            a[i] = max_value;
        } else if (a[i] < k) {
            a[i] = min_value;
        }
        if (i != n) { 
            cout << a[i] << " ";
        } else {
            cout << a[i] << endl;
        }
    }
    return 0;
}
