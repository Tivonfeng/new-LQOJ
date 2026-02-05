#include <iostream>
using namespace std;
int main(){int n;cin>>n;int maxSum=0;for(int i=0;i<n;i++){long long a;cin>>a;int sum=0;while(a>0){sum+=a%10;a/=10;}maxSum=max(maxSum,sum);}cout<<maxSum;return 0;}