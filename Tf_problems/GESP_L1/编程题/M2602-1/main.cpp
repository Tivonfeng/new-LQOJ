#include <iostream>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    
    int a = n / 1000;
    int b = (n / 100) % 10;
    int c = (n / 10) % 10;
    int d = n % 10;
    
    a = (a + 7) % 10;
    b = (b + 7) % 10;
    c = (c + 7) % 10;
    d = (d + 7) % 10;
    
    swap(a, c);
    
    int result = a * 1000 + b * 100 + c * 10 + d;
    cout << result << endl;
    return 0;
}
