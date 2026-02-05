#include <iostream>
#include <cmath>
using namespace std;
const int N = 1010;
int a[N]; 
int main(){
    int n;
    cin >> n;
    for(int i=1;i<=n;i++){
        cin>>a[i];
    }
    int ans=0;
    for(int i=1;i<=n;i++){
        for(int j=i+1;j<=n;j++){
            int m = a[i] + a[j];
            int t = sqrt(m + 1e-7); 
            if(t * t == m)
                ans++;
        }
    }
    cout<<ans<<"\n";
    return 0;
}
