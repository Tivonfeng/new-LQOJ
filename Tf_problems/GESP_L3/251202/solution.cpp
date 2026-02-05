#include <iostream> 
#include <cstring>
#include <algorithm>
using namespace std; 
int min_price[100005];
int main() {
    int M, N; 
    cin >> M >> N;
    for (int i = 0; i <= M; i++) {
        min_price[i] = 1000000000;
    }
    for (int i = 0; i < N; ++i) {
        int K, P; 
        cin >> K >> P;
        min_price[K] = min(min_price[K], P);
    }
    int total_cost = 0; 
    for (int k = 1; k <= M; ++k) { 
        total_cost += min_price[k];
    }
    cout << total_cost << endl;
    return 0;
}
