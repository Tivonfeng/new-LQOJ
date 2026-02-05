#include <iostream>
#include <string>
using namespace std;
int main(){int n,k;cin>>n>>k;int cnt=0;for(int i=1;i<=n;i++){string s=to_string(i);for(char c:s)if(c-'0'==k)cnt++;}cout<<cnt;return 0;}