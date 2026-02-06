#include <iostream> 
#include <string>
using namespace std;
int main() {
    string n;
    cin >> n;
    for (int row = 0; row < 5; row++) {
        string line = "";
        for (char digit : n) { 
            if (digit == '0') { 
                if (row == 0 || row == 4) {
                    line += ".....";
                } else { 
                    line += ".***.";
                }
            } else if (digit == '1') {
                line += "****.";
            } else if (digit == '2') {
                if (row == 0) {
                    line += ".....";
                } else if (row == 1) { 
                    line += "****.";
                } else if (row == 2) {
                    line += ".....";
                } else if (row == 3) { 
                    line += ".....";
                } else { 
                    line += ".****";
                }
            } else if (digit == '3') {
                if (row == 0) { 
                    line += ".....";
                } else if (row == 1) { 
                    line += "****.";
                } else if (row == 2) {
                    line += ".....";
                } else if (row == 3) { 
                    line += "****.";
                } else {
                    line += ".....";
                }
            }
        }
        cout << line << endl;
    }
    return 0;
}
