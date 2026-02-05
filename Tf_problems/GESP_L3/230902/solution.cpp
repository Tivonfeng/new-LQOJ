#include <iostream>
using namespace std;
int main() {
    int n = 0;
    cin >> n;
    for (int i = 0; i < n; i++) {
        char str[11];
        cin >> str;
        char max = '0';
        for (int j = 0; str[j] != '\0'; j++)
            if (str[j] > max)
                max = str[j];
        cout << (max <= '1') << " " << (max <= '7') << " " << (max <= '9') << " " << (max <= 'F') << endl;
    }
    return 0;
}
