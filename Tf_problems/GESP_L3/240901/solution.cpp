#include <iostream>
using namespace std;
int a[10010];
int main(){
    int t;
    cin>>t;
    while(t--){
        int n;
        cin>>n;
        int sum=0;
        for(int i=1;i<=n;i++){
            cin>>a[i];
            sum+=a[i];
        }
        int tot=0, flag=0;
        for(int i=1;i<n;i++){
            tot+=a[i];
            if(tot*2==sum){
                flag=1;
                break;
            }
        }
        if(flag)cout<<"Yes\n";
        else cout<<"No\n";
    }
    return 0;
}
