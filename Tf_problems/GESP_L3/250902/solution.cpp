#include <algorithm>
#include <cstdio>
using namespace std;
int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}; // 2025年各月天数
int main(){
    int m;
    scanf("%d", &m);
    printf("MON TUE WED THU FRI SAT SUN\n");
    int total_days = days[m];
    // 计算2025年m月1日是星期几（已知2025年9月1日是周一）
    int week = 1; // 9月1日是周一（1表示周一，7表示周日）
    if (m > 9) {
        for (int i = 9; i < m; i++) {
            week = (week + days[i]) % 7;
            if (week == 0) week = 7;
        }
    } else if (m < 9) {
        for (int i = 8; i >= m; i--) {
            week = (week - 1 + 7) % 7;
            if (week == 0) week = 7;
        }
    }
    // 输出前置空格
    for (int i = 1; i < week; i++) {
        printf("    ");
    }
    // 输出日期
    for (int i = 1; i <= total_days; i++) {
        printf("%3d ", i);
        week++;
        if (week > 7) {
            printf("\n");
            week = 1;
        }
    }
    if (week != 1) printf("\n");
    return 0;
}
