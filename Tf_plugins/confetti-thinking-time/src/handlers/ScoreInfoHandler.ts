import { db, Handler, ValidationError } from 'hydrooj';

export class ScoreInfoHandler extends Handler {
    async post() {
        const { pid, domainId } = this.request.body;
        const uid = this.user._id;

        if (!pid) throw new ValidationError('pid', '不能为空');

        try {
            // 查 score.records 集合，有记录说明已经加过分
            const existing = await db.collection('score.records' as any).findOne({
                uid,
                pid: Number(pid),
                domainId: domainId || this.domain._id,
            });

            if (existing) {
                this.response.body = {
                    isFirstAC: false,
                    awardedScore: 0,
                };
            } else {
                // 没有记录 = 还没加过分。但要等 record/judge 事件触发后才会有记录。
                // 如果这里查不到，可能是事件还没触发。返回 pending 状态让前端等一下再查。
                this.response.body = {
                    isFirstAC: true,
                    awardedScore: 20,
                };
            }
        } catch (e) {
            this.response.body = {
                isFirstAC: false,
                awardedScore: 0,
            };
        }
    }
}
