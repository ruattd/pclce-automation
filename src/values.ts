import { Context } from "probot";

export const Labels = {
    /** 暂停 */ paused: 8990024418,
    /** 等待 */ waiting: 8990025257,
    /** 移交上游 */ upstream: 8990036378,
    /** 等待处理 */ waitprocess: 8990026009,
    /** 等待前置 */ waitdep: 8990026563,
    /** 在即 */ upnext: 8990027046,
    /** 正在处理 */ processing: 8990027493,
    /** 等待合并 */ waitmerge: 8990030321,
    /** 等待同步 */ waitsync: 8990030842,

    /** 完成 */ done: 8990031505,

    isProcessLabel: (number: number) =>
        number === Labels.paused ||
        number === Labels.waiting ||
        number === Labels.upstream ||
        number === Labels.waitprocess ||
        number === Labels.waitdep ||
        number === Labels.upnext ||
        number === Labels.processing ||
        number === Labels.waitmerge ||
        number === Labels.waitsync,
    isDoneLabel: (number: number) =>
        number === Labels.done,
    isPositiveLabel: (number: number) =>
        Labels.isProcessLabel(number) ||
        Labels.isDoneLabel(number),

    /** 重复 */ duplicate: 8990034941,

    /** 忽略 */ ignored: 8990032373,
    /** 拒绝/放弃 */ rejected: 8990033323,
    /** 暂无计划 */ noplan: 8990033902,
    /** 超时关闭 */ timeout: 8990034303,
    /** 第三方问题 */ thirdparty: 8990034664,

    /** 信息补充 */ needinfo: 8990036762,
    /** 需要复现 */ needreproduce: 8990037035,
    /** 需要帮助 */ needhelp: 8990037735,

    isDuplicateLabel: (number: number) =>
        number === Labels.duplicate,
    isNotPlannedLabel: (number: number) =>
        number === Labels.ignored ||
        number === Labels.rejected ||
        number === Labels.noplan ||
        number === Labels.timeout ||
        number === Labels.thirdparty,
    isNeedingLabel: (number: number) =>
        number === Labels.needinfo ||
        number === Labels.needreproduce ||
        number === Labels.needhelp,
    isNegativeLabel: (number: number) =>
        Labels.isNotPlannedLabel(number) ||
        Labels.isDuplicateLabel(number) ||
        Labels.isNeedingLabel(number),

    /** 高质量 */ highquality: 8990035596,
    /** 破坏性 */ breaking: 8990035900,

    isMarkupLabel: (number: number) =>
        number === Labels.highquality ||
        number === Labels.breaking,
}

declare module "probot" {
    interface Context {
        label: (...ids: number[]) => Promise<string[]>;
    }
}

Context.prototype.label = async function(...ids: number[]): Promise<string[]> {
    const context = this;
    const repoLabels = await context.octokit.issues.listLabelsForRepo(context.repo());
    const names = [];
    for (const label of repoLabels.data) {
        if (ids.includes(label.id)) {
            names.push(label.name);
            if (names.length === ids.length) break;
        }
    }
    return names;
};
