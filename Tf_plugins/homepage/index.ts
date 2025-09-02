import {
    Context,
    RecordModel,
    STATUS,
    Time,
    UserModel,
} from 'hydrooj';

async function getPersonal(domainId: string, userId: number, ctx: Context) {
    try {
        const tfUdoc = await UserModel.getById(domainId, userId);
        console.log('getPersonal - user found:', tfUdoc?.uname || 'no user');

        // 获取用户积分(绿旗币)
        let userScore = 0;
        try {
            const scoreDoc = await ctx.db.collection('score.users' as any).findOne({
                domainId,
                uid: userId,
            });
            userScore = scoreDoc?.totalScore || 0;
        } catch (scoreError) {
            console.log('Score system not available or error:', scoreError.message);
        }

        // 计算今日AC数量
        let todayAccept = 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            todayAccept = await RecordModel.coll.countDocuments({
                uid: userId,
                domainId,
                status: STATUS.STATUS_ACCEPTED,
                _id: {
                    $gte: Time.getObjectID(today),
                    $lt: Time.getObjectID(tomorrow),
                },
            });
        } catch (recordError) {
            console.log('Today AC calculation error:', recordError.message);
        }

        // 将积分数据和今日AC添加到用户对象中
        const enhancedUdoc = {
            ...tfUdoc,
            greenFlagCoins: userScore, // 绿旗币数量
            todayAccept, // 今日AC数量
        };

        return [enhancedUdoc, domainId];
    } catch (error) {
        console.error('getPersonal error:', error);
        return [null, domainId];
    }
}

async function getSwiderpic(domainId: string, info: any) {
    return [domainId, info, []];
}

// async function getTimeRanking(domainId: string, userId: number) {
//     const countMap = (docs) => {
//         const map: Map<number, number> = new Map();
//         for (const doc of docs) {
//             const { uid } = doc;
//             if (map.has(uid)) {
//                 map.set(uid, map.get(uid)! + 1);
//             } else {
//                 map.set(uid, 1);
//             }
//         }
//         return map;
//     };
//     // console.log('rdocs------->', rdocs);
//     const rdocs = await RecordModel.getMyTimeSort(domainId);
//     const recentDayDocs = await rdocs.day.toArray();
//     const recentWeekDocs = await rdocs.week.toArray();
//     const recentMonthDocs = await rdocs.month.toArray();
//     const sortedRanking = (map: Map<number, number>) => Array.from(map, ([uid, count]) => ({ uid, count })).sort((a, b) => b.count - a.count);
//     const getTopRankingWithTies = (ranking: { uid: number; count: number }[], topN: number) => {
//         const topRanking: { uid: number; count: number, rank: number }[] = [];
//         let lastCount = -1;
//         let rank = 0;
//         let actualRank = 0; // 用于保存实际的排名，考虑到并列的情况
//         for (const record of ranking) {
//             actualRank++; // 每遍历到一个新记录，实际排名加1
//             if (record.count !== lastCount) {
//                 rank = actualRank;
//                 lastCount = record.count;
//             }
//             // 注意：这里我们只在记录数不同的时候更新rank变量的值
//             if (rank > topN) break; // 如果排名超过了topN，则停止添加
//             topRanking.push({ ...record, rank }); // 将排名添加到记录中
//         }
//         return topRanking;
//     };
//     const sortedDayRanking = getTopRankingWithTies(sortedRanking(countMap(recentDayDocs)), 10);
//     const sortedWeekRanking = getTopRankingWithTies(sortedRanking(countMap(recentWeekDocs)), 10);
//     const sortedMonthRanking = getTopRankingWithTies(sortedRanking(countMap(recentMonthDocs)), 10);

//     // console.log('sortedDayRanking------->', sortedDayRanking);
//     const [udictDay, udictWeek, udictMonth] = await Promise.all([
//         UserModel.getList(this.domain._id, recentDayDocs.map((doc) => doc.uid)),
//         UserModel.getList(this.domain._id, recentWeekDocs.map((doc) => doc.uid)),
//         UserModel.getList(this.domain._id, recentMonthDocs.map((doc) => doc.uid)),
//     ]);
//     return [[sortedDayRanking, sortedWeekRanking, sortedMonthRanking], [udictDay, udictWeek, udictMonth], this.domain._id];
//     // return [sortedDayRanking, udictDay, sortedWeekRanking, udictWeek, sortedMonthRanking, udictMonth];
// }

export async function apply(ctx: Context) {
    // 使用 withHandlerClass 正确扩展 HomeHandler
    ctx.withHandlerClass('HomeHandler', (HomeHandler) => {
        // 扩展HomeHandler添加首页数据获取功能
        HomeHandler.prototype.getSwiderpic = async (domainId: string, info: any) => await getSwiderpic(domainId, info);

        HomeHandler.prototype.getPersonal = async function (domainId: string) {
            return await getPersonal(domainId, this.user._id, ctx);
        };

        console.log('Homepage methods added to HomeHandler');
    });

    console.log('Homepage plugin loaded successfully!');
}
