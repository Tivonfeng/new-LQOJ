#include <iostream>
#include <string>
using namespace std;
int main(){int n;cin>>n;int cnt=0;for(int i=1;i<=n;i++){string s=to_string(i);bool ok=s.size()==1;if(!ok){ok=true;for(char c:s)if(c!=s[0]){ok=false;break;}}if(ok)cnt++;}cout<<cnt;return 0;}