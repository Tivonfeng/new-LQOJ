#include <iostream>
using namespace std;
char line[101]; 
char pwd[101];
// 检查从str开始、长度为l的密码是否合规
bool check(char * str, int l) {
    if (l < 6 || l > 12)
        return false;
    bool hasC = false, hasL = false, hasD = false, hasS = false;
    for (int i = 0; str[i] != '\0'; i++) {
        if ('A' <= str[i] && str[i] <= 'Z') {
            hasC = true;
        } else if ('a' <= str[i] && str[i] <= 'z') {
            hasL = true;
        } else if ('0' <= str[i] && str[i] <= '9') {
            hasD = true;
        } else if (str[i] == '!' || str[i] == '@' ||
                   str[i] == '#' || str[i] == '$') {
            hasS = true;
        } else
            return false;
    }
    if (!hasS)
        return false;
    if (hasC + hasL + hasD < 2)
        return false;
    return true;
}
int main() {
    cin >> line;
    // 按逗号对输入进行切分，并依次判断
    int len = 0;
    for (int i = 0; line[i] != '\0'; i++) {
        if (line[i] != ',') {
            pwd[len] = line[i]; 
            len++;
        } else {
            pwd[len] = '\0';
            if (check(pwd, len))
                cout << pwd << endl;
            len = 0;
        }
    } 
    if (len > 0) {
        pwd[len] = '\0';
        if (check(pwd, len))
            cout << pwd << endl;
    }
    return 0;
}
