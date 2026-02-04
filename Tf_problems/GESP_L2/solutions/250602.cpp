#include <iostream>
#include <set>
using namespace std;
int main(){int l,r;cin>>l>>r;set<int> powers;for(int x=0;x<15;x++)for(int y=0;y<=x;y++)powers.insert((1<<x)+(1<<y));int cnt=0;for(int i=l;i<=r;i++)if(powers.count(i))cnt++;cout<<cnt;return 0;}