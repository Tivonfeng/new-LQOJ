#include <iostream>
#include <algorithm>
#include <tuple>
using namespace std;
const int MAX_N = 10005;
tuple<int, int, int, int> students[MAX_N];
int main() {
    ios::sync_with_stdio(false);
    int N;
    cin >> N;
    for (int i = 0; i < N; ++i) {
        int c, m, e;
        cin >> c >> m >> e;
        students[i] = make_tuple(c + m + e, c + m, max(c, m), i);
    }
    sort(students, students + N, greater<tuple<int, int, int, int>>());
    int rank[MAX_N];
    tuple<int, int, int> last_student = make_tuple(-1, -1, -1);
    int curr_rank = 0;
    for (int i = 0; i < N; ++i) {
        auto curr = make_tuple(get<0>(students[i]), get<1>(students[i]), get<2>(students[i]));
        if (curr != last_student) {
            curr_rank = i + 1;
            last_student = curr;
        }
        rank[get<3>(students[i])] = curr_rank;
    }
    for (int i = 0; i < N; ++i) {
        cout << rank[i] << endl;
    }
    return 0;
}
