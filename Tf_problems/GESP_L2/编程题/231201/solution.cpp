#include <iostream>
using namespace std;
int main(){
    long long a,b,m;
    int N;
    cin>>a>>b>>m>>N;
    long long total=a+b;
    long long ca=a,cb=b;
    for(int i=3;i<=N;i++)
    {
        long long nxt=ca+cb;
        if(nxt>=m)break;
        total+=nxt;
        ca=cb;
        cb=nxt;
    }
    cout<<total;
    return 0;
}