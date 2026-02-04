#include <iostream>
using namespace std;
int main(){int n;cin>>n;for(int i=0;i<n;i++){long long a;cin>>a;int sum=0;while(a>0){sum+=a%10;a/=10;}cout<<(sum%7==0?"Yes":"No");if(i<n-1)cout<<'\n';}return 0;}