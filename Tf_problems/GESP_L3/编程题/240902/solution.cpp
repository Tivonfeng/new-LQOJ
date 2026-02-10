#include <iostream>
#include <string>
using namespace std;

// 回文判断：双指针法，直接操作原字符串
bool isPalindrome(string s, int start, int end) {
    while (start < end) {
        if (s[start] != s[end]) return false;
        start++;
        end--;
    }
    return true;
}

int main(){
    int n;
    cin>>n;
    for(int i=1;i<=n;i++){
        string s;
        cin>>s;
        int m = s.length();
        bool flag = false;
        // 分割点 j：前部分 [0,j)，后部分 [j,m)，长度均≥2
        for(int j=2;j<=m-2;j++){
            if(isPalindrome(s, 0, j-1) && isPalindrome(s, j, m-1)){
                flag = true;
                break;
            }
        }
        if(flag) cout<<"Yes\n";
        else cout<<"No\n";
    }
    return 0;
}
