#include <iostream>
using namespace std;
int main(){int n;cin>>n;int cnt=0;for(int a=1;a<=n;a++)for(int b=a;b<=n;b++)if((a*b)%2==0)cnt++;cout<<cnt;return 0;}