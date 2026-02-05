#include <iostream>
#include <string>
using namespace std; 
int main(){
    int n;
    cin>>n;
    for(int i=1;i<=n;i++){
        string s;
        cin>>s;
        int m = s.length(); 
        int flag = 0;
        for(int j=2;j<=m-2;j++){ // 分割点j，前半部分长度j，后半部分长度m-j，均≥2
            string s1=s.substr(0,j); 
            string s2=s.substr(j,m-j);
            string t1="",t2="";
            for(int k=(int)s1.size()-1;k>=0;k--)t1+=s1[k]; 
            for(int k=(int)s2.size()-1;k>=0;k--)t2+=s2[k]; 
            if(t1==s1&&t2==s2){
                flag=1; 
                break;
            }
        }
        if(flag)cout<<"Yes\n"; 
        else cout<<"No\n";
    }
    return 0;
}
