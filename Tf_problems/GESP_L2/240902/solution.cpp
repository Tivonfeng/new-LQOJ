#include <iostream>
using namespace std;
int main(){
    int n; if(!(cin>>n)) return 0;
    for(int i=1;i<=n;i++){
        for(int j=1;j<=n;j++){
            if(j==1 || j==n || i==j) cout << '+';
            else cout << '-';
        }
        if(i<n) cout << '\n';
    }
    return 0;
}
