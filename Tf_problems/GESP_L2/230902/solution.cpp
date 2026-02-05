#include <iostream>
using namespace std;
int main(){int k,L,R;cin>>k>>L>>R;long long sum=0;for(int i=L;i<=R;i++)if(i%10==k||i%k==0)sum+=i;cout<<sum;return 0;}