#include <iostream>
#include <cmath>
using namespace std;
int main(){int n;cin>>n;vector<long long>a(n);for(int i=0;i<n;i++)cin>>a[i];for(int i=0;i<n;i++){bool ok=false;for(int x=1;x*x<=a[i];x++){long long y2=a[i]-1LL*x*x;long long y=sqrt(y2);if(y>0&&y*y==y2){ok=true;break;}}cout<<(ok?"Yes":"No");if(i<n-1)cout<<'\n';}return 0;}