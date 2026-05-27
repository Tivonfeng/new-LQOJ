/**
 * Hydro 框架全局对象的类型声明
 * 使 global.Hydro.model.* 的引用具有类型推导
 */
declare global {
    namespace Hydro {
        namespace model {
            const user: typeof import('hydrooj').UserModel;
            const setting: {
                SystemSetting: (...args: any[]) => any;
                Setting: (...args: any[]) => any;
            };
            const system: {
                get: (key: string) => any;
            };
        }
    }
}

export {};
