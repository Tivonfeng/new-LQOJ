#include <iostream>
#include <cmath>
using namespace std;
bool isPrime(int x){if(x<2)return false;for(int i=2;i*i<=x;i++)if(x%i==0)return false;return true;}
int main(){int A,B;cin>>A>>B;int cnt=0;for(int i=max(2,A);i<=B;i++)if(isPrime(i))cnt++;cout<<cnt;return 0;}