#include <iostream>
using namespace std;
int main(){int n;cin>>n;for(int i=1;i<2*n;i++){cout<<(i%2==1?'*':'#');if(i<2*n-1)cout<<'\n';}return 0;}