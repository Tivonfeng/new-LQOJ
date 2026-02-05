#include <iostream>
using namespace std;
const int N = 1e5+10;
int a[N];
int main(){
    int t;
    cin>>t;
    while(t--){
        int n;
        cin>>n;
        int max_val = 0;
        for(int i=1;i<=n;i++){
            cin>>a[i];
            max_val = max(max_val, a[i]);
        }
        int flag = 0;
        for(int i=1;i<=n;i++){
            if(max_val % a[i] != 0){
                flag = 1;
                break;
            }
        }
        if(flag)cout<<"No\n";
        else cout<<"Yes\n";
    }
    return 0;
}
