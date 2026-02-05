#include <iostream>
#include <ctime>
using namespace std;
int main(){int y,m,d,h,k;cin>>y>>m>>d>>h>>k;tm start={0};start.tm_year=y-1900;start.tm_mon=m-1;start.tm_mday=d;start.tm_hour=h;time_t t=mktime(&start);t+=k*3600;tm* r=localtime(&t);cout<<r->tm_year+1900<<'\n'<<r->tm_mon+1<<'\n'<<r->tm_mday<<'\n'<<r->tm_hour;return 0;}