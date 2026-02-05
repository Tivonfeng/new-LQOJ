#include <iostream>
using namespace std;
int main() {
    int n; if(!(cin>>n)) return 0;
    int current = 0;
    for(int i=1;i<=n;i++){
        for(int j=1;j<=i;j++){
            char c = 'A' + (current % 26);
            cout << c;
            current++;
        }
        if(i<n) cout << '\n';
    }
    return 0;
}
