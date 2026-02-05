#include <stdio.h>
int main(int argc, char **argv)
{
    long long n, i, j, k, ans;
    scanf("%lld%lld", &n, &i);
    bool flag;
    k = 1;
    while(true)
    {
        flag = true;
        ans = k * n + i;
        for(j = 1; j < n; j++)
        {
            if(ans % (n - 1) != 0)
            {
                flag = false;
                break;
            }
            ans = ans / (n - 1) * n + i;
        }
        if(flag) break;
        k++;
    }
    printf("%lld\n", ans);
    return 0;
}
