#include <iostream>
using namespace std;
int main() { 
    int jar[1000];
    int n = 0, d = 0;
    cin >> n >> d;
    for (int i = 0; i < n; i++)
        jar[i] = 0;
    for (int i = 1; i <= d; i++) {
        int a = 0;
        cin >> a;
        jar[a] += i;
    }
    cout << jar[0];
    for (int i = 1; i < n; i++)
        cout << " " << jar[i];
    cout << endl;
    return 0;
}
