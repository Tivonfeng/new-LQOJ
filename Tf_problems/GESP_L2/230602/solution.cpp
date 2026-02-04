#include <iostream>
#include <string>
#include <cmath>
using namespace std;
int main(){int M;cin>>M;for(int i=0;i<M;i++){long long x;cin>>x;string s=to_string(x);int p=s.size();long long sum=0;for(char c:s)sum+=pow(c-'0',p);cout<<(sum==x?"T":"F");if(i<M-1)cout<<'\n';}return 0;}