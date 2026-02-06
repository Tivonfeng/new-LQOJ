#include <iostream> 
#include <string>
#include <cctype>
using namespace std;
int main() { 
    int T;
    cin >> T; 
    while (T--) { 
        string password;
        cin >> password;
        bool has_upper = false;
        bool has_digit = false;
        for (size_t i = 0; i < password.length(); ++i) {
            if (isupper(password[i])) { 
                has_upper = true;
            }
            if (isdigit(password[i])) {
                has_digit = true;
            }
        }
        if (password.length() >= 8 && has_upper && has_digit) {
            cout << "Y\n";
        } else { 
            cout << "N\n";
        }
    }
    return 0;
}
