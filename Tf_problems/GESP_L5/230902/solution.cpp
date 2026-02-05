#include <iostream>
#include <algorithm>
using namespace std;
int n = 0;
struct game_t { int T, R; } games[500];
bool game_cmp(game_t x, game_t y) { return x.R > y.R; }
bool arrange[500];
int main() {
    cin >> n;
    for (int i = 0; i < n; i++)
        arrange[i] = false;
    for (int i = 0; i < n; i++)
        cin >> games[i].T;
    for (int i = 0; i < n; i++)
        cin >> games[i].R;
    sort(games, games + n, game_cmp);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        for (int t = games[i].T - 1; t >= 0; t--) {
            if (!arrange[t]) {
                arrange[t] = true;
                sum += games[i].R;
                break;
            }
        }
    }
    cout << sum << endl;
    return 0;
}
