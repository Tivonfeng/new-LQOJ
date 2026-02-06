#include <iostream>
using namespace std;
int main() {
    int X,Y,Z,n,m; if(!(cin>>X>>Y>>Z>>n>>m)) return 0;
    int cnt=0;
    for(int x=0;x<=m;x++){
        for(int y=0;y<=m-x;y++){
            int z=m-x-y;
            if(z%Z!=0) continue;
            if(X*x+Y*y+z*1.0/Z==n) cnt++;
        }
    }
    cout<<cnt; return 0;
}