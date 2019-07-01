#include <iostream>
#include <pqxx/pqxx>
#include <ctime>
#include <cstdint>
#include <cmath>

float calculate(int firstDeposit, int months, int reinvestInterval) {

    pqxx::connection c("host=localhost port=5432 dbname=robofxtrading user=postgres password=2oW~d5m0");
    pqxx::work w(c);

    const char * open_date_str = "2019-04-29 18:20:21+00";

    tm open_date_tm;
    strptime(open_date_str, "%Y-%m-%d %H:%M:%S", &open_date_tm);
    time_t open_date = mktime(&open_date_tm);

    const char * close_date_str = w.exec("select \"order\".close_time as close_time from \"order\" order by close_time DESC")[0][0].as<const char *>();
    tm close_date_tm;
    strptime(close_date_str, "%Y-%m-%d %H:%M:%S", &close_date_tm);
    time_t close_date = mktime(&close_date_tm);

    //std::cout << open_date << " " << close_date << std::endl;

    float user_profit = w.exec("select sum(profit) from profit where type = '0'")[0][0].as<float>();
    float deposits_total = w.exec("select sum(amount) from deposit")[0][0].as<float>();
    float withdrawed_total = w.exec("select sum(amount) from withdrawal")[0][0].as<float>();
    time_t workingTime = close_date - open_date;

    //std::cout << user_profit << " " << deposits_total << " " << withdrawed_total << " " << workingTime << " " << std::endl;

    float income = powf(( user_profit + withdrawed_total ) / deposits_total + 1, 1814400 / (float) workingTime); 
    float workingDepo = (float)firstDeposit;
    float freeDepo = 0.f;

    //std::cout << income << std::endl;

    for (int i = 0; i < months; ++i) {
        //std::cout << freeDepo << " " << workingDepo << std::endl;
        freeDepo += workingDepo * (income - 1);

        if (freeDepo >= 50) {
            if (reinvestInterval == -1) {
                workingDepo += freeDepo;
                freeDepo = 0;
            } else {
                if (i % reinvestInterval == reinvestInterval - 1) {
                    workingDepo += 50;
                    freeDepo -= 50;
                }
            }
        }
    }

    freeDepo += workingDepo;

    return freeDepo;
}

int main(int argc, char **argv) {

    std::cout << calculate(std::stoi(argv[1]), std::stoi(argv[2]), std::stoi(argv[3])) << std::endl;

    return 0;

}