#include <iostream>
using namespace std;
int main(){int n;cin>>n;long long prod=1;for(int i=0;i<n;i++){long long a;cin>>a;prod*=a;}if(prod>1000000)cout<<prod<<"\noverflow";else cout<<prod;return 0;}