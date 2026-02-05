#include <iostream>
#include <cmath>
using namespace std;
int main(){int t;cin>>t;for(int i=0;i<t;i++){long long a;cin>>a;long long b=round(pow(a,0.25));if(b>0&&pow(b,4)==a)cout<<b;else cout<<-1;if(i<t-1)cout<<'\n';}return 0;}