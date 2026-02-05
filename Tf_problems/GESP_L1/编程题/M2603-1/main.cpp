#include <iostream>
#include <string>
using namespace std;

int main() {
    int W, H;
    if (!(cin >> W >> H)) return 0;
    
    double height_m = H / 100.0;
    double bmi = W / (height_m * height_m);
    
    string result;
    if (bmi < 18.5) result = "under";
    else if (bmi < 24) result = "normal";
    else if (bmi < 28) result = "over";
    else result = "obese";
    
    cout << result << endl;
    return 0;
}
