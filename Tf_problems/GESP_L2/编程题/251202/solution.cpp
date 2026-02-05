#include <iostream>
#include <cmath>
using namespace std;
int main(){int H,W,x;cin>>H>>W>>x;int cnt=0;for(int r=1;r<=H;r++)for(int c=1;c<=W;c++){double d=sqrt(r*r+c*c);if(d<=x+r-c)cnt++;}cout<<cnt;return 0;}