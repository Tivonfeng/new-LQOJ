#include <iostream>
using namespace std;
int main(){
    int N; if(!(cin>>N)) return 0;
    int mid = (N+1)/2;
    for(int i=1;i<=N;i++){
        for(int j=1;j<=N;j++){
            if(j==1 || j==N) cout << '|';
            else if(i==1 || i==N || i==mid) cout << '-';
            else cout << 'x';
        }
        if(i<N) cout << '\n';
    }
    return 0;
}
