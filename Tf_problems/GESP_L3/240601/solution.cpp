#include <iostream>
using namespace std; 
int main(){
    int n;
    cin>>n;
    for(int i=0;i<26;i++){ 
        int j = (i+n)%26;
        char ch = 'A'+j;
        cout<<ch;
    }
    cout<<"\n";
    return 0;
}
