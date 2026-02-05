#include <iostream>
using namespace std;
int main(){
    int X,Y,Z,M; if(!(cin>>X>>Y>>Z>>M)) return 0;
    int cost = X*2 + Y*5 + Z*3;
    if(cost <= M) cout << "Yes " << (M - cost);
    else cout << "No " << (cost - M);
    return 0;
}
